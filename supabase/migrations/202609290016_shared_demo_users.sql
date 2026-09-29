-- Demo users are shared Auth identities, rather than one pair per board owner.
-- Detach legacy owner-scoped demo users before removing that ownership marker.
update public.cards
set assignee_user_id = null,
    version = version + 1,
    updated_at = now()
where assignee_user_id in (
  select id from public.user_profiles where user_type = 'test' and test_owner_id is not null
);

delete from public.board_members bm
using public.user_profiles up
where bm.user_id = up.id
  and up.user_type = 'test'
  and up.test_owner_id is not null;

alter table public.user_profiles drop constraint user_profiles_test_owner_check;
update public.user_profiles
set user_type = 'user', test_owner_id = null
where user_type = 'test';
alter table public.user_profiles drop column test_owner_id;

alter table public.user_profiles add column test_user_key text;
alter table public.user_profiles
  add constraint user_profiles_test_user_key_check
    check (
      (user_type = 'user' and test_user_key is null)
      or (user_type = 'test' and test_user_key in ('demo_member_1', 'demo_member_2'))
    );
create unique index user_profiles_test_user_key_unique
  on public.user_profiles (test_user_key)
  where test_user_key is not null;

create or replace function private.sync_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_test_user_key text := new.raw_app_meta_data ->> 'demo_user_key';
  v_type text := case
    when v_test_user_key in ('demo_member_1', 'demo_member_2') then 'test'
    else 'user'
  end;
begin
  if new.email is not null then
    insert into public.user_profiles (id, email, display_name, user_type, test_user_key, updated_at)
    values (
      new.id,
      new.email,
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      v_type,
      case when v_type = 'test' then v_test_user_key else null end,
      now()
    )
    on conflict (id) do update
      set email = excluded.email,
          display_name = excluded.display_name,
          user_type = excluded.user_type,
          test_user_key = excluded.test_user_key,
          updated_at = excluded.updated_at;
  end if;
  return new;
end;
$$;

create or replace function private.create_demo_board(p_demo_member_one_id uuid, p_demo_member_two_id uuid)
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
  if p_demo_member_one_id is null or p_demo_member_two_id is null
    or p_demo_member_one_id = p_demo_member_two_id
    or (select count(*) from public.user_profiles
      where user_type = 'test'
        and ((id = p_demo_member_one_id and test_user_key = 'demo_member_1')
          or (id = p_demo_member_two_id and test_user_key = 'demo_member_2'))) <> 2 then
    raise exception using errcode = '22023', message = 'INVALID_DEMO_USERS';
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
    values
      (v_board_id, v_user_id, 'owner'),
      (v_board_id, p_demo_member_one_id, 'member'),
      (v_board_id, p_demo_member_two_id, 'member');
    insert into public.columns (id, board_id, name, position, default_status_key)
    values
      (v_todo_id, v_board_id, 'To Do', 0, 'to_do'),
      (v_progress_id, v_board_id, 'In Progress', 1, 'in_progress'),
      (v_done_id, v_board_id, 'Done', 2, 'done');
    insert into public.cards (
      board_id, column_id, title, description, assignee_user_id, position, created_by
    ) values
      (v_board_id, v_todo_id, 'Review the team backlog', 'Check priorities and agree on the next tasks.', v_user_id, 0, v_user_id),
      (v_board_id, v_todo_id, 'Write a short project update', 'Share the current status with the team.', p_demo_member_one_id, 1, v_user_id),
      (v_board_id, v_progress_id, 'Prepare the weekly planning', 'Collect estimates and identify blockers.', p_demo_member_two_id, 0, v_user_id),
      (v_board_id, v_done_id, 'Create the team workspace', 'The board is ready for your first planning session.', v_user_id, 0, v_user_id);
    v_created := true;
  else
    insert into public.board_members (board_id, user_id, role)
    values
      (v_board_id, p_demo_member_one_id, 'member'),
      (v_board_id, p_demo_member_two_id, 'member')
    on conflict (board_id, user_id) do nothing;
    update public.cards set assignee_user_id = p_demo_member_one_id, version = version + 1, updated_at = now()
      where id = (select id from public.cards where board_id = v_board_id and title = 'Write a short project update' and assignee_user_id is null limit 1);
    update public.cards set assignee_user_id = p_demo_member_two_id, version = version + 1, updated_at = now()
      where id = (select id from public.cards where board_id = v_board_id and title = 'Prepare the weekly planning' and assignee_user_id is null limit 1);
  end if;
  return pg_catalog.jsonb_build_object('id', v_board_id, 'created', v_created);
end;
$$;

revoke all on function private.create_demo_board(uuid, uuid) from public, anon;
grant execute on function private.create_demo_board(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
