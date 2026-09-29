revoke select on public.user_profiles from authenticated;
grant select (id, email, display_name, user_type)
  on public.user_profiles to authenticated;
