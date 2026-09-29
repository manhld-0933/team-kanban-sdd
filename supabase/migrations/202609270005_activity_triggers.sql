create function private.record_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_actor_email text;
  v_board_id uuid;
  v_entity_id uuid;
  v_entity_type text;
  v_action text;
  v_summary text := '';
  v_metadata jsonb := '{}'::jsonb;
  v_email text;
  v_card_title text;
begin
  if tg_table_name = 'boards' then
    v_board_id := case when tg_op = 'DELETE' then old.id else new.id end;
    v_entity_id := v_board_id;
    v_entity_type := 'board';
    if tg_op = 'INSERT' then
      v_action := 'board.create'; v_summary := new.name;
    elsif tg_op = 'UPDATE' and old.name is distinct from new.name then
      v_action := 'board.update'; v_summary := new.name;
    else
      if tg_op = 'DELETE' then return old; end if;
      return new;
    end if;
    v_metadata := jsonb_build_object('name', v_summary);
  elsif tg_table_name = 'columns' then
    v_board_id := case when tg_op = 'DELETE' then old.board_id else new.board_id end;
    v_entity_id := case when tg_op = 'DELETE' then old.id else new.id end;
    v_entity_type := 'column';
    if tg_op = 'INSERT' then
      v_action := 'column.create'; v_summary := new.name;
    elsif tg_op = 'DELETE' then
      v_action := 'column.delete'; v_summary := old.name;
    elsif old.name is distinct from new.name or old.position is distinct from new.position then
      v_action := 'column.update'; v_summary := new.name;
    else
      return new;
    end if;
    v_metadata := jsonb_build_object('name', v_summary);
  elsif tg_table_name = 'cards' then
    v_board_id := case when tg_op = 'DELETE' then old.board_id else new.board_id end;
    v_entity_id := case when tg_op = 'DELETE' then old.id else new.id end;
    v_entity_type := 'card';
    if tg_op = 'INSERT' then
      v_action := 'card.create'; v_summary := new.title;
      v_metadata := jsonb_build_object('title', new.title, 'columnId', new.column_id);
    elsif tg_op = 'DELETE' then
      v_action := 'card.delete'; v_summary := old.title;
      v_metadata := jsonb_build_object('title', old.title, 'columnId', old.column_id);
    elsif old.assignee_user_id is distinct from new.assignee_user_id then
      v_action := 'card.assignee_change'; v_summary := new.title;
      v_metadata := jsonb_build_object('title', new.title, 'assigneeUserId', new.assignee_user_id);
    elsif old.column_id is distinct from new.column_id or old.position is distinct from new.position then
      v_action := 'card.move'; v_summary := new.title;
      v_metadata := jsonb_build_object(
        'title', new.title,
        'fromColumnId', old.column_id,
        'toColumnId', new.column_id,
        'fromPosition', old.position,
        'toPosition', new.position
      );
    elsif old.title is distinct from new.title or old.description is distinct from new.description then
      v_action := 'card.update'; v_summary := new.title;
      v_metadata := jsonb_build_object('title', new.title);
    else
      return new;
    end if;
  elsif tg_table_name = 'board_members' then
    v_board_id := case when tg_op = 'DELETE' then old.board_id else new.board_id end;
    v_entity_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
    v_entity_type := 'member';
    v_action := case when tg_op = 'DELETE' then 'member.remove' else 'member.add' end;
    select email into v_email from public.user_profiles where id = v_entity_id;
    v_summary := coalesce(v_email, '');
    v_metadata := jsonb_build_object('email', v_summary);
  elsif tg_table_name = 'comments' then
    v_board_id := new.board_id;
    v_entity_id := new.id;
    v_entity_type := 'comment';
    v_action := 'comment.create';
    select title into v_card_title from public.cards where board_id = new.board_id and id = new.card_id;
    v_summary := coalesce(v_card_title, '');
    v_metadata := jsonb_build_object('cardId', new.card_id, 'cardTitle', v_summary);
  else
    return null;
  end if;

  select email into v_actor_email from public.user_profiles where id = v_actor;
  if v_actor_email is not null then
    v_metadata := v_metadata || jsonb_build_object('actorEmail', v_actor_email);
  end if;

  insert into public.activity_log (
    board_id, actor_user_id, entity_type, entity_id, action, summary, metadata
  ) values (
    v_board_id, v_actor, v_entity_type, v_entity_id, v_action, coalesce(v_summary, ''), v_metadata
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.record_activity() from public, anon, authenticated;
create trigger activity_from_boards
  after insert or update or delete on public.boards
  for each row execute function private.record_activity();
create trigger activity_from_columns
  after insert or update or delete on public.columns
  for each row execute function private.record_activity();
create trigger activity_from_cards
  after insert or update or delete on public.cards
  for each row execute function private.record_activity();
create trigger activity_from_members
  after insert or delete on public.board_members
  for each row execute function private.record_activity();
create trigger activity_from_comments
  after insert on public.comments
  for each row execute function private.record_activity();

create function private.prevent_activity_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using errcode = '42501', message = 'ACTIVITY_LOG_APPEND_ONLY';
end;
$$;

revoke all on function private.prevent_activity_mutation() from public, anon, authenticated;
create trigger activity_log_append_only
  before update or delete on public.activity_log
  for each row execute function private.prevent_activity_mutation();

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
  select * into v_card from public.cards where board_id = p_board_id and id = p_card_id;
  if not found then raise exception using errcode = 'P0002', message = 'NOT_FOUND'; end if;
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
    return jsonb_build_object('cardId', v_card.id, 'columnId', v_card.column_id,
      'position', v_card.position, 'version', v_card.version, 'updatedAt', v_card.updated_at);
  end if;

  set constraints cards_board_column_position_unique deferred;
  if v_card.column_id = p_to_column_id then
    with ranked as (
      select id,
        row_number() over (
          order by case when id = p_card_id then p_to_position
            else position + case when position >= p_to_position then 1 else 0 end end,
            case when id = p_card_id then 0 else 1 end, id
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
      from public.cards where board_id = p_board_id and column_id in (v_card.column_id, p_to_column_id)
    )
    update public.cards as card
    set column_id = ranked.next_column_id,
        position = ranked.next_position,
        version = card.version + case when card.column_id <> ranked.next_column_id
          or card.position <> ranked.next_position then 1 else 0 end,
        updated_at = case when card.column_id <> ranked.next_column_id
          or card.position <> ranked.next_position then now() else card.updated_at end
    from ranked where card.id = ranked.id;
  end if;

  select jsonb_build_object('cardId', id, 'columnId', column_id, 'position', position,
    'version', version, 'updatedAt', updated_at)
    into v_result from public.cards where id = p_card_id and board_id = p_board_id;
  return v_result;
end;
$$;
