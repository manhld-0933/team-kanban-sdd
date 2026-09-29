-- Demo-only identities live outside Supabase Auth and cannot access a session.
create table public.demo_members (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  email text not null,
  created_at timestamptz not null default now(),
  constraint demo_members_board_id_id_unique unique (board_id, id)
);

alter table public.demo_members enable row level security;
revoke all on public.demo_members from public, anon, authenticated;
grant select on public.demo_members to authenticated;
create policy demo_members_select_board_member on public.demo_members
  for select to authenticated
  using (private.is_board_member(board_id));

alter table public.cards add column demo_assignee_id uuid;
alter table public.cards
  add constraint cards_board_demo_assignee_fk
    foreign key (board_id, demo_assignee_id)
    references public.demo_members (board_id, id) on delete restrict,
  add constraint cards_one_assignee_kind
    check (assignee_user_id is null or demo_assignee_id is null);
grant update (demo_assignee_id) on public.cards to authenticated;

create or replace function private.record_activity()
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
  v_move_card_id text;
  v_reindex_only text;
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
    elsif old.assignee_user_id is distinct from new.assignee_user_id
      or old.demo_assignee_id is distinct from new.demo_assignee_id then
      v_action := 'card.assignee_change'; v_summary := new.title;
      v_metadata := jsonb_build_object(
        'title', new.title,
        'assigneeUserId', new.assignee_user_id,
        'demoAssigneeId', new.demo_assignee_id
      );
    elsif old.column_id is distinct from new.column_id or old.position is distinct from new.position then
      v_move_card_id := nullif(pg_catalog.current_setting('app.team_kanban_move_card_id', true), '');
      v_reindex_only := nullif(pg_catalog.current_setting('app.team_kanban_reindex_only', true), '');
      if v_move_card_id is not null and v_move_card_id <> new.id::text then return new; end if;
      if v_reindex_only = 'true' and old.column_id = new.column_id then return new; end if;
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
    v_metadata := jsonb_build_object('email', v_summary, 'isDemo', false);
  elsif tg_table_name = 'demo_members' then
    v_board_id := new.board_id;
    v_entity_id := new.id;
    v_entity_type := 'member';
    v_action := 'member.add';
    v_summary := new.name;
    v_metadata := jsonb_build_object('name', new.name, 'email', new.email, 'isDemo', true);
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

create trigger activity_from_demo_members
  after insert on public.demo_members
  for each row execute function private.record_activity();

create or replace function private.create_demo_board()
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
  v_member_one_id uuid := pg_catalog.gen_random_uuid();
  v_member_two_id uuid := pg_catalog.gen_random_uuid();
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
    insert into public.demo_members (id, board_id, name, email)
    values
      (v_member_one_id, v_board_id, 'Demo Member 1', 'demo-member-1@team-kanban.invalid'),
      (v_member_two_id, v_board_id, 'Demo Member 2', 'demo-member-2@team-kanban.invalid');
    insert into public.cards (
      board_id, column_id, title, description, assignee_user_id, demo_assignee_id, position, created_by
    ) values
      (v_board_id, v_todo_id, 'Review the team backlog', 'Check priorities and agree on the next tasks.', v_user_id, null, 0, v_user_id),
      (v_board_id, v_todo_id, 'Write a short project update', 'Share the current status with the team.', null, v_member_one_id, 1, v_user_id),
      (v_board_id, v_progress_id, 'Prepare the weekly planning', 'Collect estimates and identify blockers.', null, v_member_two_id, 0, v_user_id),
      (v_board_id, v_done_id, 'Create the team workspace', 'The board is ready for your first planning session.', v_user_id, null, 0, v_user_id);
    v_created := true;
  end if;
  return pg_catalog.jsonb_build_object('id', v_board_id, 'created', v_created);
end;
$$;

-- Add demo profiles to demo boards that already existed before this migration.
do $$
declare
  v_board record;
  v_member_one_id uuid;
  v_member_two_id uuid;
begin
  for v_board in select id from public.boards where is_demo loop
    if exists (select 1 from public.demo_members where board_id = v_board.id) then
      continue;
    end if;
    v_member_one_id := pg_catalog.gen_random_uuid();
    v_member_two_id := pg_catalog.gen_random_uuid();
    insert into public.demo_members (id, board_id, name, email)
    values
      (v_member_one_id, v_board.id, 'Demo Member 1', 'demo-member-1@team-kanban.invalid'),
      (v_member_two_id, v_board.id, 'Demo Member 2', 'demo-member-2@team-kanban.invalid');
    update public.cards set assignee_user_id = null, demo_assignee_id = v_member_one_id
      where id = (select id from public.cards where board_id = v_board.id order by created_at, id offset 1 limit 1);
    update public.cards set assignee_user_id = null, demo_assignee_id = v_member_two_id
      where id = (select id from public.cards where board_id = v_board.id order by created_at, id offset 2 limit 1);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
