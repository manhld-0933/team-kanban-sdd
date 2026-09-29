import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardDetail, BoardMember, BoardSummary, CardRecord, ColumnRecord } from "@/lib/boards/types";

async function mapBoardMembers(supabase: SupabaseClient, rows: { user_id: unknown; role: unknown }[]) {
  if (!rows.length) return [];
  const { data: profiles, error } = await supabase.from("user_profiles")
    .select("id, email")
    .in("id", rows.map((item) => item.user_id as string));
  if (error) throw error;
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id as string, profile]));
  return rows.map((item) => ({
    userId: item.user_id as string,
    role: item.role as "owner" | "member",
    email: profilesById.get(item.user_id as string)?.email as string ?? "",
  }));
}

export async function getBoardMembers(
  supabase: SupabaseClient,
  boardId: string,
): Promise<BoardMember[]> {
  const { data: rows, error } = await supabase
    .from("board_members")
    .select("user_id, role")
    .eq("board_id", boardId)
    .order("user_id", { ascending: true });
  if (error) throw error;
  return mapBoardMembers(supabase, rows ?? []);
}

export async function listBoards(
  supabase: SupabaseClient,
  userId: string,
): Promise<BoardSummary[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("board_members")
    .select("board_id, role")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;
  if (!memberships?.length) return [];

  const roles = new Map<string, "owner" | "member">(
    memberships.map((item) => [item.board_id as string, item.role as "owner" | "member"]),
  );
  const { data: boards, error } = await supabase
    .from("boards")
    .select("id, name, created_at, is_demo")
    .in("id", [...roles.keys()])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (boards ?? []).map((board) => ({
    id: board.id as string,
    name: board.name as string,
    createdAt: board.created_at as string,
    role: roles.get(board.id as string) ?? "member",
    isDemo: board.is_demo as boolean,
  }));
}

export async function getBoardDetail(
  supabase: SupabaseClient,
  boardId: string,
  role: "owner" | "member",
): Promise<BoardDetail | null> {
  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id, name, created_at, updated_at")
    .eq("id", boardId)
    .maybeSingle();

  if (boardError) throw boardError;
  if (!board) return null;

  const [columnsResult, cardsResult, members] = await Promise.all([
    supabase
    .from("columns")
    .select("id, board_id, name, position, default_status_key")
    .eq("board_id", boardId)
    .order("position", { ascending: true }),
    supabase
    .from("cards")
    .select("id, board_id, column_id, title, description, assignee_user_id, position, version, created_at, updated_at")
    .eq("board_id", boardId)
    .order("position", { ascending: true }),
    getBoardMembers(supabase, boardId),
  ]);
  if (columnsResult.error) throw columnsResult.error;
  if (cardsResult.error) throw cardsResult.error;

  const cardsByColumn = new Map<string, CardRecord[]>();
  for (const card of (cardsResult.data ?? []) as CardRecord[]) {
    const columnCards = cardsByColumn.get(card.column_id) ?? [];
    columnCards.push(card);
    cardsByColumn.set(card.column_id, columnCards);
  }

  return {
    id: board.id as string,
    name: board.name as string,
    createdAt: board.created_at as string,
    updatedAt: board.updated_at as string,
    role,
    members,
    columns: (columnsResult.data ?? []).map((column) => ({
      id: column.id as string,
      board_id: column.board_id as string,
      name: column.name as string,
      position: column.position as number,
      default_status_key: column.default_status_key as ColumnRecord["default_status_key"],
      cards: cardsByColumn.get(column.id) ?? [],
    })),
  };
}
