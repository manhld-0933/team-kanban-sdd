-- Preserve immutability while allowing the declared ON DELETE SET NULL FK
-- action to clear an actor reference when an Auth user is deleted.
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
  raise exception using errcode = '42501', message = 'ACTIVITY_LOG_APPEND_ONLY';
end;
$$;
