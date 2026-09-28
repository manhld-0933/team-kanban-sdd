import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardRecord } from "@/lib/boards/types";

export async function getCardById(
  supabase: SupabaseClient,
  boardId: string,
  cardId: string,
): Promise<CardRecord | null> {
  const { data, error } = await supabase
    .from("cards")
    .select("id, board_id, column_id, title, description, assignee_user_id, position, version, created_at, updated_at")
    .eq("board_id", boardId)
    .eq("id", cardId)
    .maybeSingle();
  if (error) throw error;
  return (data as CardRecord | null) ?? null;
}
