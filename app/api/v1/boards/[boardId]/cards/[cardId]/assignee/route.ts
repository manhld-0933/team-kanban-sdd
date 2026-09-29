import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { getCardById } from "@/lib/cards/queries";
import { getBoardMembers } from "@/lib/boards/queries";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";
import { getBoardRole } from "@/lib/permissions/board";

type RouteContext = { params: Promise<{ boardId: string; cardId: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return apiError("VALIDATION_ERROR", "A valid JSON body is required.", 422); }
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  if (!(input.userId === null || (typeof input.userId === "string" && /^[0-9a-f-]{36}$/i.test(input.userId)))) {
    return apiError("VALIDATION_ERROR", "Assignee user id is invalid.", 422);
  }
  if (!Number.isInteger(input.expectedVersion) || (input.expectedVersion as number) < 1) {
    return apiError("VALIDATION_ERROR", "A valid expectedVersion is required.", 422);
  }

  try {
    const { boardId, cardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Card not found.", 404);
    const current = await getCardById(supabase, boardId, cardId);
    if (!current) return apiError("NOT_FOUND", "Card not found.", 404);
    if (current.version !== input.expectedVersion) {
      return apiError("VERSION_CONFLICT", "The card changed since it was loaded.", 409, current);
    }

    const targetUserId = input.userId as string | null;
    const members = await getBoardMembers(supabase, boardId);
    const assignee = targetUserId ? members.find((member) => member.userId === targetUserId) : null;
    if (targetUserId && !assignee) return apiError("VALIDATION_ERROR", "Assignee must be a member of this board.", 422);
    if (current.assignee_user_id === targetUserId) return apiSuccess({ card: current, assignee });

    const { data, error } = await supabase.from("cards")
      .update({
        assignee_user_id: targetUserId,
        version: current.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("board_id", boardId)
      .eq("id", cardId)
      .eq("version", current.version)
      .select("id, board_id, column_id, title, description, assignee_user_id, position, version, created_at, updated_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const latest = await getCardById(supabase, boardId, cardId);
      return apiError("VERSION_CONFLICT", "The card changed since it was loaded.", 409, latest);
    }
    return apiSuccess({ card: data, assignee });
  } catch (error) {
    return routeError(error);
  }
}
