create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boards_name_length check (char_length(btrim(name)) between 1 and 100)
);

create table public.board_members (
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create unique index board_members_one_owner_per_board
  on public.board_members (board_id)
  where role = 'owner';

create table public.columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint columns_name_length check (char_length(btrim(name)) between 1 and 60),
  constraint columns_board_id_id_unique unique (board_id, id),
  constraint columns_board_position_unique unique (board_id, position) deferrable initially deferred
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  column_id uuid not null,
  title text not null,
  description text,
  assignee_user_id uuid,
  position integer not null check (position >= 0),
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cards_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint cards_description_length check (description is null or char_length(description) <= 5000),
  constraint cards_board_column_fk foreign key (board_id, column_id)
    references public.columns (board_id, id) on delete restrict,
  constraint cards_board_assignee_fk foreign key (board_id, assignee_user_id)
    references public.board_members (board_id, user_id) on delete restrict,
  constraint cards_board_column_position_unique unique (board_id, column_id, position)
    deferrable initially deferred
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  entity_type text not null check (entity_type in ('board', 'column', 'card', 'member', 'comment')),
  entity_id uuid not null,
  action text not null check (action in (
    'board.create', 'board.update', 'column.create', 'column.update', 'column.delete',
    'card.create', 'card.update', 'card.delete', 'card.move', 'card.assignee_change',
    'member.add', 'member.remove', 'comment.create'
  )),
  summary text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_summary_length check (char_length(summary) <= 500),
  constraint activity_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index board_members_user_board_idx on public.board_members (user_id, board_id);
create index columns_board_position_idx on public.columns (board_id, position);
create index cards_board_column_position_idx on public.cards (board_id, column_id, position);
create index cards_assignee_idx on public.cards (assignee_user_id) where assignee_user_id is not null;
create index activity_log_board_created_idx on public.activity_log (board_id, created_at desc, id desc);

create function private.is_board_member(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.board_members as bm
    where bm.board_id = p_board_id
      and bm.user_id = (select auth.uid())
  );
$$;

create function private.is_board_owner(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.board_members as bm
    where bm.board_id = p_board_id
      and bm.user_id = (select auth.uid())
      and bm.role = 'owner'
  );
$$;

revoke all on function private.is_board_member(uuid) from public;
revoke all on function private.is_board_owner(uuid) from public;
grant execute on function private.is_board_member(uuid) to authenticated;
grant execute on function private.is_board_owner(uuid) to authenticated;

alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.columns enable row level security;
alter table public.cards enable row level security;
alter table public.activity_log enable row level security;

create policy boards_select_member on public.boards
  for select to authenticated
  using (private.is_board_member(id));
create policy boards_update_owner on public.boards
  for update to authenticated
  using (private.is_board_owner(id))
  with check (private.is_board_owner(id) and created_by = (select auth.uid()));

create policy board_members_select_member on public.board_members
  for select to authenticated
  using (private.is_board_member(board_id));

create policy columns_select_member on public.columns
  for select to authenticated
  using (private.is_board_member(board_id));
create policy columns_insert_owner on public.columns
  for insert to authenticated
  with check (private.is_board_owner(board_id));
create policy columns_update_owner on public.columns
  for update to authenticated
  using (private.is_board_owner(board_id))
  with check (private.is_board_owner(board_id));
create policy columns_delete_owner on public.columns
  for delete to authenticated
  using (private.is_board_owner(board_id));

create policy cards_select_member on public.cards
  for select to authenticated
  using (private.is_board_member(board_id));
create policy cards_insert_member on public.cards
  for insert to authenticated
  with check (
    private.is_board_member(board_id)
    and created_by = (select auth.uid())
    and (assignee_user_id is null or exists (
      select 1 from public.board_members as assignee
      where assignee.board_id = cards.board_id
        and assignee.user_id = cards.assignee_user_id
    ))
  );
create policy cards_update_member on public.cards
  for update to authenticated
  using (private.is_board_member(board_id))
  with check (
    private.is_board_member(board_id)
    and (assignee_user_id is null or exists (
      select 1 from public.board_members as assignee
      where assignee.board_id = cards.board_id
        and assignee.user_id = cards.assignee_user_id
    ))
  );
create policy cards_delete_member on public.cards
  for delete to authenticated
  using (private.is_board_member(board_id));

create policy activity_log_select_member on public.activity_log
  for select to authenticated
  using (private.is_board_member(board_id));

revoke all on public.boards, public.board_members, public.columns, public.cards, public.activity_log from anon, authenticated;
grant select on public.boards, public.board_members, public.columns, public.cards, public.activity_log to authenticated;
grant update (name, updated_at) on public.boards to authenticated;
grant insert (board_id, name, position) on public.columns to authenticated;
grant update (name, position, updated_at) on public.columns to authenticated;
grant delete on public.columns to authenticated;
grant insert (board_id, column_id, title, description, assignee_user_id, position, version, created_by) on public.cards to authenticated;
grant update (column_id, title, description, assignee_user_id, position, version, updated_at) on public.cards to authenticated;
grant delete on public.cards to authenticated;
