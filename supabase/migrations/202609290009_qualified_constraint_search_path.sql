-- The board/card routines run with an empty search_path. SET CONSTRAINTS
-- resolves unqualified constraint names through the active search_path, so
-- those calls fail even though the deferrable constraints exist. Keep the
-- existing SECURITY INVOKER functions and set a fixed trusted search_path
-- that includes the catalog and public schema where the constraints live.
alter function public.create_column(uuid, text, integer)
  set search_path = pg_catalog, public;
alter function public.reorder_column(uuid, uuid, integer)
  set search_path = pg_catalog, public;
alter function public.update_column(uuid, uuid, text, integer)
  set search_path = pg_catalog, public;
alter function public.delete_column(uuid, uuid, uuid)
  set search_path = pg_catalog, public;
alter function public.delete_card(uuid, uuid)
  set search_path = pg_catalog, public;
alter function public.move_card(uuid, uuid, uuid, integer, integer)
  set search_path = pg_catalog, public;
