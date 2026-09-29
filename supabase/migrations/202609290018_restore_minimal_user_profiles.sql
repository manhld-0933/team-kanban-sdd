create or replace function private.sync_user_profile()
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

alter table public.user_profiles drop column display_name;
revoke select on public.user_profiles from authenticated;
grant select (id, email) on public.user_profiles to authenticated;

notify pgrst, 'reload schema';
