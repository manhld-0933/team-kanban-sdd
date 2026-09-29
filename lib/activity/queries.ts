import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityAction =
  | "board.create" | "board.update"
  | "column.create" | "column.update" | "column.delete"
  | "card.create" | "card.update" | "card.delete" | "card.move" | "card.assignee_change"
  | "member.add" | "member.remove" | "comment.create";

export type ActivityRecord = {
  id: string;
  board_id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  entity_type: string;
  entity_id: string;
  action: ActivityAction;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ActivityCursor = { createdAt: string; id: string };

export async function listBoardActivity(
  supabase: SupabaseClient,
  boardId: string,
  limit: number,
  cursor?: ActivityCursor,
): Promise<{ items: ActivityRecord[]; nextCursor: string | null }> {
  let query = supabase.from("activity_log")
    .select("id, board_id, actor_user_id, entity_type, entity_id, action, summary, metadata, created_at")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const actorIds = [...new Set(page.map((item) => item.actor_user_id as string | null).filter((id): id is string => id !== null))];
  const emails = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles, error: profileError } = await supabase.from("user_profiles")
      .select("id, email")
      .in("id", actorIds);
    if (profileError) throw profileError;
    for (const profile of profiles ?? []) emails.set(profile.id as string, profile.email as string);
  }

  const items: ActivityRecord[] = page.map((item) => ({
    id: item.id as string,
    board_id: item.board_id as string,
    actor_user_id: item.actor_user_id as string | null,
    actor_email: typeof (item.metadata as Record<string, unknown>)?.actorEmail === "string"
      ? (item.metadata as Record<string, unknown>).actorEmail as string
      : item.actor_user_id ? emails.get(item.actor_user_id as string) ?? null : null,
    entity_type: item.entity_type as string,
    entity_id: item.entity_id as string,
    action: item.action as ActivityAction,
    summary: item.summary as string,
    metadata: item.metadata as Record<string, unknown>,
    created_at: item.created_at as string,
  }));
  const last = items.at(-1);
  const nextCursor = hasMore && last
    ? Buffer.from(JSON.stringify({ createdAt: last.created_at, id: last.id })).toString("base64url")
    : null;
  return { items, nextCursor };
}

export function parseActivityCursor(value: string | null): ActivityCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<ActivityCursor>;
    if (typeof parsed.createdAt !== "string" || !Number.isFinite(Date.parse(parsed.createdAt))) return null;
    if (typeof parsed.id !== "string" || !/^[0-9a-f-]{36}$/i.test(parsed.id)) return null;
    return { createdAt: new Date(parsed.createdAt).toISOString(), id: parsed.id };
  } catch { return null; }
}
