import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoardDetail, BoardSummary, CardRecord } from "@/lib/boards/types";

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
    .select("id, name, created_at")
    .in("id", [...roles.keys()])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (boards ?? []).map((board) => ({
    id: board.id as string,
    name: board.name as string,
    createdAt: board.created_at as string,
    role: roles.get(board.id as string) ?? "member",
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

  const { data: columns, error: columnsError } = await supabase
    .from("columns")
    .select("id, board_id, name, position")
    .eq("board_id", boardId)
    .order("position", { ascending: true });
  if (columnsError) throw columnsError;

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id, board_id, column_id, title, description, assignee_user_id, position, version, created_at, updated_at")
    .eq("board_id", boardId)
    .order("position", { ascending: true });
  if (cardsError) throw cardsError;

  const cardsByColumn = new Map<string, CardRecord[]>();
  for (const card of (cards ?? []) as CardRecord[]) {
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
    columns: (columns ?? []).map((column) => ({
      id: column.id as string,
      board_id: column.board_id as string,
      name: column.name as string,
      position: column.position as number,
      cards: cardsByColumn.get(column.id) ?? [],
    })),
  };
}
