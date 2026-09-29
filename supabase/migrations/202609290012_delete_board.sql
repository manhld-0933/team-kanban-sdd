create or replace function private.prevent_activity_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and old.actor_user_id is not null
    and new.actor_user_id is null
    and (pg_catalog.to_jsonb(old) - 'actor_user_id')
      = (pg_catalog.to_jsonb(new) - 'actor_user_id') then
    return new;
  end if;

  -- Activity may be removed only as part of deleting its parent board.
  if tg_op = 'DELETE' and pg_catalog.pg_trigger_depth() > 1 then
    return old;
  end if;

  raise exception using errcode = '42501', message = 'ACTIVITY_LOG_APPEND_ONLY';
end;
$$;

create function private.delete_board(p_board_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_board_owner(p_board_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_board_id::text, 0)
  );

  if not exists (select 1 from public.boards where id = p_board_id) then
    raise exception using errcode = 'P0002', message = 'NOT_FOUND';
  end if;

  -- Clear restrictive references in dependency order before removing the board.
  delete from public.cards where board_id = p_board_id;
  delete from public.board_members where board_id = p_board_id;
  delete from public.columns where board_id = p_board_id;
  delete from public.boards where id = p_board_id;
end;
$$;

revoke all on function private.delete_board(uuid) from public, anon;
grant execute on function private.delete_board(uuid) to authenticated;

create function public.delete_board(p_board_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_board(p_board_id);
$$;

revoke all on function public.delete_board(uuid) from public, anon;
grant execute on function public.delete_board(uuid) to authenticated;

notify pgrst, 'reload schema';
