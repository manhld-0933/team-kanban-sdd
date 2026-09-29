alter table public.columns add column default_status_key text;
alter table public.columns add constraint columns_default_status_key_check
  check (default_status_key is null or default_status_key in ('to_do', 'in_progress', 'done'));

create function private.clear_default_status_key_on_rename()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.name is distinct from old.name then
    new.default_status_key := null;
  end if;
  return new;
end;
$$;

revoke all on function private.clear_default_status_key_on_rename() from public, anon, authenticated;
create trigger clear_default_column_label_on_rename
  before update of name on public.columns
  for each row execute function private.clear_default_status_key_on_rename();

create or replace function public.create_board(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_board_id uuid;
  v_name text := btrim(p_name);
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'UNAUTHENTICATED';
  end if;
  if v_name is null or char_length(v_name) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'INVALID_BOARD_NAME';
  end if;

  insert into public.boards (name, created_by)
    values (v_name, v_user_id) returning id into v_board_id;
  insert into public.board_members (board_id, user_id, role)
    values (v_board_id, v_user_id, 'owner');
  insert into public.columns (board_id, name, position, default_status_key)
  values
    (v_board_id, 'To Do', 0, 'to_do'),
    (v_board_id, 'In Progress', 1, 'in_progress'),
    (v_board_id, 'Done', 2, 'done');
  return v_board_id;
end;
$$;
