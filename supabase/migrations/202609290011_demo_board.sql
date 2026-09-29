alter table public.boards
  add column is_demo boolean not null default false;

create unique index boards_one_demo_per_owner
  on public.boards (created_by)
  where is_demo;

create function private.create_demo_board()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_board_id uuid;
  v_todo_id uuid := pg_catalog.gen_random_uuid();
  v_progress_id uuid := pg_catalog.gen_random_uuid();
  v_done_id uuid := pg_catalog.gen_random_uuid();
  v_created boolean := false;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 7112026)
  );

  select id into v_board_id
  from public.boards
  where created_by = v_user_id and is_demo
  limit 1;

  if v_board_id is null then
    insert into public.boards (name, created_by, is_demo)
    values ('Team Kanban Demo', v_user_id, true)
    returning id into v_board_id;

    insert into public.board_members (board_id, user_id, role)
    values (v_board_id, v_user_id, 'owner');

    insert into public.columns (id, board_id, name, position, default_status_key)
    values
      (v_todo_id, v_board_id, 'To Do', 0, 'to_do'),
      (v_progress_id, v_board_id, 'In Progress', 1, 'in_progress'),
      (v_done_id, v_board_id, 'Done', 2, 'done');

    insert into public.cards (
      board_id, column_id, title, description, assignee_user_id, position, created_by
    ) values
      (v_board_id, v_todo_id, 'Review the team backlog', 'Check priorities and agree on the next tasks.', v_user_id, 0, v_user_id),
      (v_board_id, v_todo_id, 'Write a short project update', 'Share the current status with the team.', v_user_id, 1, v_user_id),
      (v_board_id, v_progress_id, 'Prepare the weekly planning', 'Collect estimates and identify blockers.', v_user_id, 0, v_user_id),
      (v_board_id, v_done_id, 'Create the team workspace', 'The board is ready for your first planning session.', v_user_id, 0, v_user_id);

    v_created := true;
  end if;

  return pg_catalog.jsonb_build_object('id', v_board_id, 'created', v_created);
end;
$$;

revoke all on function private.create_demo_board() from public, anon;
grant execute on function private.create_demo_board() to authenticated;

create function public.create_demo_board()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_demo_board();
$$;

revoke all on function public.create_demo_board() from public, anon;
grant execute on function public.create_demo_board() to authenticated;

notify pgrst, 'reload schema';
