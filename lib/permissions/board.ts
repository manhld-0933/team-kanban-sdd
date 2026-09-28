import type { SupabaseClient } from "@supabase/supabase-js";

export type BoardRole = "owner" | "member";

export async function getBoardRole(
  supabase: SupabaseClient,
  boardId: string,
  userId: string,
): Promise<BoardRole | null> {
  const { data, error } = await supabase
    .from("board_members")
    .select("role")
    .eq("board_id", boardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.role === "owner" || data.role === "member" ? data.role : null;
}

export function canReadBoard(role: BoardRole | null | undefined): boolean {
  return role === "owner" || role === "member";
}

export function canManageBoard(role: BoardRole | null | undefined): boolean {
  return role === "owner";
}

export function canManageCards(role: BoardRole | null | undefined): boolean {
  return canReadBoard(role);
}
