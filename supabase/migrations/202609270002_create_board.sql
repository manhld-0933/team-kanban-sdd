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
  values (v_name, v_user_id)
  returning id into v_board_id;

  insert into public.board_members (board_id, user_id, role)
  values (v_board_id, v_user_id, 'owner');

  insert into public.columns (board_id, name, position)
  values
    (v_board_id, 'To Do', 0),
    (v_board_id, 'In Progress', 1),
    (v_board_id, 'Done', 2);

  return v_board_id;
end;
$$;

revoke all on function public.create_board(text) from public, anon;
grant execute on function public.create_board(text) to authenticated;
