alter table public.cards
  add constraint cards_board_id_id_unique unique (board_id, id);

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  updated_at timestamptz not null default now()
);

create index user_profiles_email_lower_idx on public.user_profiles (lower(email));

create function private.sync_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    insert into public.user_profiles (id, email, updated_at)
    values (new.id, new.email, now())
    on conflict (id) do update
      set email = excluded.email,
          updated_at = excluded.updated_at;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_user_profile() from public, anon, authenticated;
create trigger on_auth_user_profile_sync
  after insert or update of email on auth.users
  for each row execute function private.sync_user_profile();

insert into public.user_profiles (id, email)
select id, email from auth.users where email is not null
on conflict (id) do update set email = excluded.email, updated_at = now();

alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from public, anon, authenticated;
grant select on public.user_profiles to authenticated;
create policy user_profiles_read_board_peers on public.user_profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.board_members as viewer
      where viewer.user_id = (select auth.uid())
        and viewer.board_id in (
          select peer.board_id from public.board_members as peer
          where peer.user_id = user_profiles.id
        )
        and private.is_board_member(viewer.board_id)
    )
  );

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  card_id uuid not null,
  author_user_id uuid not null references auth.users (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_body_length check (char_length(btrim(body)) between 1 and 5000),
  constraint comments_board_card_fk foreign key (board_id, card_id)
    references public.cards (board_id, id) on delete cascade
);

create index comments_board_card_created_idx
  on public.comments (board_id, card_id, created_at, id);

create policy user_profiles_read_board_history on public.user_profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.activity_log
      where activity_log.actor_user_id = user_profiles.id
        and private.is_board_member(activity_log.board_id)
    )
    or exists (
      select 1 from public.comments
      where comments.author_user_id = user_profiles.id
        and private.is_board_member(comments.board_id)
    )
  );

alter table public.comments enable row level security;
revoke all on public.comments from public, anon, authenticated;
grant select on public.comments to authenticated;
grant insert (board_id, card_id, author_user_id, body) on public.comments to authenticated;

create policy comments_select_member on public.comments
  for select to authenticated
  using (private.is_board_member(board_id));
create policy comments_insert_member on public.comments
  for insert to authenticated
  with check (
    private.is_board_member(board_id)
    and author_user_id = (select auth.uid())
  );

create function private.add_board_member(p_board_id uuid, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_user_id uuid;
begin
  if not private.is_board_owner(p_board_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if v_email is null or char_length(v_email) > 254 then
    raise exception using errcode = '22023', message = 'INVALID_EMAIL';
  end if;

  select id into v_user_id from auth.users where lower(email) = v_email limit 1;
  if v_user_id is null or exists (
    select 1 from public.board_members
    where board_id = p_board_id and user_id = v_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'MEMBER_ADD_FAILED';
  end if;

  begin
    insert into public.board_members (board_id, user_id, role)
    values (p_board_id, v_user_id, 'member');
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'MEMBER_ADD_FAILED';
  end;

  return jsonb_build_object('userId', v_user_id, 'email', v_email, 'role', 'member');
end;
$$;

create function private.remove_board_member(p_board_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  if not private.is_board_owner(p_board_id) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  select role into v_role from public.board_members
    where board_id = p_board_id and user_id = p_user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'NOT_FOUND';
  end if;
  if v_role = 'owner' or p_user_id = (select auth.uid()) then
    raise exception using errcode = '42501', message = 'OWNER_CANNOT_BE_REMOVED';
  end if;
  if exists (
    select 1 from public.cards
    where board_id = p_board_id and assignee_user_id = p_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'MEMBER_ASSIGNED';
  end if;
  delete from public.board_members where board_id = p_board_id and user_id = p_user_id;
end;
$$;

revoke all on function private.add_board_member(uuid, text) from public, anon;
revoke all on function private.remove_board_member(uuid, uuid) from public, anon;
grant execute on function private.add_board_member(uuid, text) to authenticated;
grant execute on function private.remove_board_member(uuid, uuid) to authenticated;

create function public.add_board_member(p_board_id uuid, p_email text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.add_board_member(p_board_id, p_email); $$;

create function public.remove_board_member(p_board_id uuid, p_user_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.remove_board_member(p_board_id, p_user_id); $$;

revoke all on function public.add_board_member(uuid, text) from public, anon;
revoke all on function public.remove_board_member(uuid, uuid) from public, anon;
grant execute on function public.add_board_member(uuid, text) to authenticated;
grant execute on function public.remove_board_member(uuid, uuid) to authenticated;
