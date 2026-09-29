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
set search_path = pg_catalog, public
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

  perform pg_catalog.set_config('app.team_kanban_move_card_id', p_card_id::text, true);
  set constraints public.cards_board_column_position_unique deferred;
  if v_card.column_id = p_to_column_id then
    update public.cards as card
    set position = case
          when card.id = p_card_id then p_to_position
          when v_card.position > p_to_position
            and card.position >= p_to_position and card.position < v_card.position then card.position + 1
          when v_card.position < p_to_position
            and card.position > v_card.position and card.position <= p_to_position then card.position - 1
          else card.position
        end,
        version = card.version + case
          when card.id = p_card_id or (v_card.position > p_to_position
            and card.position >= p_to_position and card.position < v_card.position)
            or (v_card.position < p_to_position
            and card.position > v_card.position and card.position <= p_to_position) then 1 else 0 end,
        updated_at = case
          when card.id = p_card_id or (v_card.position > p_to_position
            and card.position >= p_to_position and card.position < v_card.position)
            or (v_card.position < p_to_position
            and card.position > v_card.position and card.position <= p_to_position) then now()
          else card.updated_at end
    where card.board_id = p_board_id and card.column_id = v_card.column_id
      and (card.id = p_card_id
        or (v_card.position > p_to_position and card.position >= p_to_position and card.position < v_card.position)
        or (v_card.position < p_to_position and card.position > v_card.position and card.position <= p_to_position));
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
