-- Remove Auth identities created only to appear as sample board members.
do $$
declare
  v_demo_user_ids uuid[];
begin
  select array_agg(distinct u.id) into v_demo_user_ids
  from auth.users u
  left join public.user_profiles p on p.id = u.id
  where (p.user_type = 'test' or u.raw_app_meta_data ->> 'user_type' = 'test')
    and (
      u.raw_app_meta_data ? 'demo_owner_id'
      or u.raw_app_meta_data ->> 'demo_user_key' in ('demo_member_1', 'demo_member_2')
      or u.email in (
        'demo-shared-member-1@team-kanban.invalid',
        'demo-shared-member-2@team-kanban.invalid'
      )
      or u.email ~ '^demo-member-[12]\+.*@team-kanban\.invalid$'
    );

  if v_demo_user_ids is null then
    return;
  end if;

  -- Keep existing demo cards and make their owner responsible for them.
  update public.cards c
  set assignee_user_id = case when b.is_demo then b.created_by else null end,
      version = c.version + 1,
      updated_at = now()
  from public.boards b
  where c.board_id = b.id
    and c.assignee_user_id = any(v_demo_user_ids);

  delete from public.comments where author_user_id = any(v_demo_user_ids);
  delete from public.activity_log
  where board_id in (select id from public.boards where is_demo)
    and (
      actor_user_id = any(v_demo_user_ids)
      or (entity_type = 'member' and entity_id = any(v_demo_user_ids))
    );
  delete from public.board_members where user_id = any(v_demo_user_ids);
  delete from auth.users where id = any(v_demo_user_ids);
end;
$$;

drop function public.create_demo_board(uuid, uuid);
drop function private.create_demo_board(uuid, uuid);

alter table public.user_profiles
  drop constraint user_profiles_test_user_key_check,
  drop column test_user_key,
  drop column user_type;

create or replace function private.sync_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    insert into public.user_profiles (id, email, display_name, updated_at)
    values (
      new.id,
      new.email,
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      now()
    )
    on conflict (id) do update
      set email = excluded.email,
          display_name = excluded.display_name,
          updated_at = excluded.updated_at;
  end if;
  return new;
end;
$$;

revoke select on public.user_profiles from authenticated;
grant select (id, email, display_name) on public.user_profiles to authenticated;

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
  select id into v_board_id from public.boards
    where created_by = v_user_id and is_demo limit 1;

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
