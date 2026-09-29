import type { SupabaseClient } from "@supabase/supabase-js";

export type CommentRecord = {
  id: string;
  board_id: string;
  card_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  author: { userId: string; email: string };
};

export async function listCardComments(
  supabase: SupabaseClient,
  boardId: string,
  cardId: string,
): Promise<CommentRecord[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("id, board_id, card_id, author_user_id, body, created_at")
    .eq("board_id", boardId)
    .eq("card_id", cardId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(500);
  if (error) throw error;
  const comments = data ?? [];
  if (!comments.length) return [];

  const authorIds = [...new Set(comments.map((comment) => comment.author_user_id as string))];
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("id, email")
    .in("id", authorIds);
  if (profilesError) throw profilesError;
  const emails = new Map((profiles ?? []).map((profile) => [profile.id as string, profile.email as string]));

  return comments.map((comment) => ({
    id: comment.id as string,
    board_id: comment.board_id as string,
    card_id: comment.card_id as string,
    author_user_id: comment.author_user_id as string,
    body: comment.body as string,
    created_at: comment.created_at as string,
    author: {
      userId: comment.author_user_id as string,
      email: emails.get(comment.author_user_id as string) ?? "",
    },
  }));
}
