create or replace function public.create_column(
  p_board_id uuid,
  p_name text,
  p_position integer
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_name text := btrim(p_name);
  v_count integer;
  v_column_id uuid;
begin
  if not private.is_board_owner(p_board_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if v_name is null or char_length(v_name) not between 1 and 60 then
    raise exception using errcode = '22023', message = 'INVALID_COLUMN_NAME';
  end if;
  if p_position is null or p_position < 0 then
    raise exception using errcode = '22023', message = 'INVALID_POSITION';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_board_id::text, 0));
  select count(*)::integer into v_count from public.columns where board_id = p_board_id;
  if p_position > v_count then
    raise exception using errcode = '22023', message = 'INVALID_POSITION';
  end if;

  set constraints columns_board_position_unique deferred;
  update public.columns
    set position = position + 1, updated_at = now()
    where board_id = p_board_id and position >= p_position;
  insert into public.columns (board_id, name, position)
    values (p_board_id, v_name, p_position)
    returning id into v_column_id;
  return v_column_id;
end;
$$;

create or replace function public.reorder_column(
  p_board_id uuid,
  p_column_id uuid,
  p_position integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old_position integer;
  v_count integer;
begin
  if not private.is_board_owner(p_board_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if p_position is null or p_position < 0 then
    raise exception using errcode = '22023', message = 'INVALID_POSITION';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_board_id::text, 0));
  select position into v_old_position from public.columns
    where board_id = p_board_id and id = p_column_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'NOT_FOUND';
  end if;
  select count(*)::integer into v_count from public.columns where board_id = p_board_id;
  if p_position >= v_count then
    raise exception using errcode = '22023', message = 'INVALID_POSITION';
  end if;
  if p_position = v_old_position then return; end if;

  set constraints columns_board_position_unique deferred;
  update public.columns
  set position = case
    when id = p_column_id then p_position
    when p_position < v_old_position and position >= p_position and position < v_old_position then position + 1
    when p_position > v_old_position and position > v_old_position and position <= p_position then position - 1
    else position
  end,
  updated_at = case when id = p_column_id then now() else updated_at end
  where board_id = p_board_id;
end;
$$;

create or replace function public.update_column(
  p_board_id uuid,
  p_column_id uuid,
  p_name text default null,
  p_position integer default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old_position integer;
  v_count integer;
  v_name text := case when p_name is null then null else btrim(p_name) end;
begin
  if not private.is_board_owner(p_board_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if v_name is not null and char_length(v_name) not between 1 and 60 then
    raise exception using errcode = '22023', message = 'INVALID_COLUMN_NAME';
  end if;
  if p_position is not null and p_position < 0 then
    raise exception using errcode = '22023', message = 'INVALID_POSITION';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_board_id::text, 0));
  select position into v_old_position from public.columns
    where board_id = p_board_id and id = p_column_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'NOT_FOUND';
  end if;

  if p_position is not null then
    select count(*)::integer into v_count from public.columns where board_id = p_board_id;
    if p_position >= v_count then
      raise exception using errcode = '22023', message = 'INVALID_POSITION';
    end if;
  end if;

  if p_position is not null and p_position <> v_old_position then
    set constraints columns_board_position_unique deferred;
    update public.columns
    set position = case
      when id = p_column_id then p_position
      when p_position < v_old_position and position >= p_position and position < v_old_position then position + 1
      when p_position > v_old_position and position > v_old_position and position <= p_position then position - 1
      else position
    end,
    name = case when id = p_column_id and v_name is not null then v_name else name end,
    updated_at = case when id = p_column_id then now() else updated_at end
    where board_id = p_board_id;
  elsif v_name is not null then
    update public.columns set name = v_name, updated_at = now()
      where board_id = p_board_id and id = p_column_id;
  end if;
end;
$$;

create or replace function public.delete_column(
  p_board_id uuid,
  p_column_id uuid,
  p_move_cards_to_column_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old_position integer;
  v_card_count integer;
  v_target_count integer;
begin
  if not private.is_board_owner(p_board_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_board_id::text, 0));

  select position into v_old_position from public.columns
    where board_id = p_board_id and id = p_column_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'NOT_FOUND';
  end if;
  select count(*)::integer into v_card_count from public.cards
    where board_id = p_board_id and column_id = p_column_id;

  if v_card_count > 0 then
    if p_move_cards_to_column_id is null then
      raise exception using errcode = 'P0001', message = 'COLUMN_NOT_EMPTY';
    end if;
    if p_move_cards_to_column_id = p_column_id or not exists (
      select 1 from public.columns
      where board_id = p_board_id and id = p_move_cards_to_column_id
    ) then
      raise exception using errcode = '22023', message = 'INVALID_TARGET_COLUMN';
    end if;

    select count(*)::integer into v_target_count from public.cards
      where board_id = p_board_id and column_id = p_move_cards_to_column_id;
    set constraints cards_board_column_position_unique deferred;
    with source_cards as (
      select id, row_number() over (order by position, id)::integer - 1 as offset_position
      from public.cards where board_id = p_board_id and column_id = p_column_id
    )
    update public.cards as card
    set column_id = p_move_cards_to_column_id,
        position = v_target_count + source_cards.offset_position,
        version = card.version + 1,
        updated_at = now()
    from source_cards where card.id = source_cards.id;
  end if;

  delete from public.columns where board_id = p_board_id and id = p_column_id;
  set constraints columns_board_position_unique deferred;
  update public.columns set position = position - 1, updated_at = now()
    where board_id = p_board_id and position > v_old_position;
end;
$$;

create or replace function public.create_card(
  p_board_id uuid,
  p_column_id uuid,
  p_title text,
  p_description text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text := btrim(p_title);
  v_position integer;
  v_card_id uuid;
begin
  if v_user_id is null or not private.is_board_member(p_board_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if v_title is null or char_length(v_title) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'INVALID_CARD_TITLE';
  end if;
  if p_description is not null and char_length(p_description) > 5000 then
    raise exception using errcode = '22023', message = 'INVALID_CARD_DESCRIPTION';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_board_id::text, 0));
  if not exists (select 1 from public.columns where board_id = p_board_id and id = p_column_id) then
    raise exception using errcode = '22023', message = 'INVALID_COLUMN';
  end if;
  select coalesce(max(position) + 1, 0) into v_position
    from public.cards where board_id = p_board_id and column_id = p_column_id;
  insert into public.cards (board_id, column_id, title, description, position, created_by)
    values (p_board_id, p_column_id, v_title, p_description, v_position, v_user_id)
    returning id into v_card_id;
  return v_card_id;
end;
$$;

create or replace function public.delete_card(p_board_id uuid, p_card_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_column_id uuid;
  v_position integer;
begin
  if not private.is_board_member(p_board_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_board_id::text, 0));
  select column_id, position into v_column_id, v_position from public.cards
    where board_id = p_board_id and id = p_card_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'NOT_FOUND';
  end if;
  set constraints cards_board_column_position_unique deferred;
  delete from public.cards where board_id = p_board_id and id = p_card_id;
  update public.cards set position = position - 1, version = version + 1, updated_at = now()
    where board_id = p_board_id and column_id = v_column_id and position > v_position;
end;
$$;

create or replace function public.move_card(
  p_board_id uuid,
  p_card_id uuid,
  p_to_column_id uuid,
  p_to_position integer,
  p_expected_version integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
  v_target_count integer;
  v_max_position integer;
  v_result jsonb;
begin
  if not private.is_board_member(p_board_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if p_to_position is null or p_to_position < 0 then
    raise exception using errcode = '22023', message = 'INVALID_POSITION';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_board_id::text, 0));
  select * into v_card from public.cards
    where board_id = p_board_id and id = p_card_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'NOT_FOUND';
  end if;
  if v_card.version <> p_expected_version then
    raise exception using errcode = 'P0001', message = 'VERSION_CONFLICT';
  end if;
  if not exists (select 1 from public.columns where board_id = p_board_id and id = p_to_column_id) then
    raise exception using errcode = '22023', message = 'INVALID_TARGET_COLUMN';
  end if;

  select count(*)::integer into v_target_count from public.cards
    where board_id = p_board_id and column_id = p_to_column_id;
  v_max_position := v_target_count - case when v_card.column_id = p_to_column_id then 1 else 0 end;
  if p_to_position > v_max_position then
    raise exception using errcode = '22023', message = 'INVALID_POSITION';
  end if;
  if v_card.column_id = p_to_column_id and v_card.position = p_to_position then
    return jsonb_build_object(
      'cardId', v_card.id,
      'columnId', v_card.column_id,
      'position', v_card.position,
      'version', v_card.version,
      'updatedAt', v_card.updated_at
    );
  end if;

  set constraints cards_board_column_position_unique deferred;
  if v_card.column_id = p_to_column_id then
    with ranked as (
      select id,
        row_number() over (
          order by
            case when id = p_card_id then p_to_position
              else position + case when position >= p_to_position then 1 else 0 end
            end,
            case when id = p_card_id then 0 else 1 end,
            id
        )::integer - 1 as next_position
      from public.cards where board_id = p_board_id and column_id = v_card.column_id
    )
    update public.cards as card
    set position = ranked.next_position,
        version = card.version + case when card.position <> ranked.next_position then 1 else 0 end,
        updated_at = case when card.position <> ranked.next_position then now() else card.updated_at end
    from ranked where card.id = ranked.id;
  else
    with ranked as (
      select id,
        case
          when id = p_card_id then p_to_position
          when column_id = v_card.column_id and position > v_card.position then position - 1
          when column_id = p_to_column_id and position >= p_to_position then position + 1
          else position
        end as next_position,
        case when id = p_card_id then p_to_column_id else column_id end as next_column_id
      from public.cards
      where board_id = p_board_id and column_id in (v_card.column_id, p_to_column_id)
    )
    update public.cards as card
    set column_id = ranked.next_column_id,
        position = ranked.next_position,
        version = card.version + case
          when card.column_id <> ranked.next_column_id or card.position <> ranked.next_position then 1 else 0 end,
        updated_at = case
          when card.column_id <> ranked.next_column_id or card.position <> ranked.next_position then now()
          else card.updated_at end
    from ranked where card.id = ranked.id;
  end if;

  select jsonb_build_object(
    'cardId', id,
    'columnId', column_id,
    'position', position,
    'version', version,
    'updatedAt', updated_at
  ) into v_result from public.cards where id = p_card_id and board_id = p_board_id;
  return v_result;
end;
$$;

revoke all on function public.create_column(uuid, text, integer) from public, anon;
revoke all on function public.reorder_column(uuid, uuid, integer) from public, anon;
revoke all on function public.update_column(uuid, uuid, text, integer) from public, anon;
revoke all on function public.delete_column(uuid, uuid, uuid) from public, anon;
revoke all on function public.create_card(uuid, uuid, text, text) from public, anon;
revoke all on function public.delete_card(uuid, uuid) from public, anon;
revoke all on function public.move_card(uuid, uuid, uuid, integer, integer) from public, anon;
grant execute on function public.create_column(uuid, text, integer) to authenticated;
grant execute on function public.reorder_column(uuid, uuid, integer) to authenticated;
grant execute on function public.update_column(uuid, uuid, text, integer) to authenticated;
grant execute on function public.delete_column(uuid, uuid, uuid) to authenticated;
grant execute on function public.create_card(uuid, uuid, text, text) to authenticated;
grant execute on function public.delete_card(uuid, uuid) to authenticated;
grant execute on function public.move_card(uuid, uuid, uuid, integer, integer) to authenticated;
