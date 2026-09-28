import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { getCardById } from "@/lib/cards/queries";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";
import { getBoardRole } from "@/lib/permissions/board";
import { parseOptionalString, parseRequiredString } from "@/lib/validation/common";

type RouteContext = { params: Promise<{ boardId: string; cardId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "A valid JSON body is required.", 422);
  }
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  if (!Number.isInteger(input.expectedVersion) || (input.expectedVersion as number) < 1) {
    return apiError("VALIDATION_ERROR", "A valid expectedVersion is required.", 422);
  }
  const changes: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = parseRequiredString(input.title, "Card title", 200);
    if (!title.success) return apiError("VALIDATION_ERROR", title.message, 422);
    changes.title = title.data;
  }
  if (input.description !== undefined) {
    const description = parseOptionalString(input.description, "Card description", 5000);
    if (!description.success) return apiError("VALIDATION_ERROR", description.message, 422);
    changes.description = description.data;
  }
  if (Object.keys(changes).length === 0) {
    return apiError("VALIDATION_ERROR", "Provide a title or description to update.", 422);
  }

  try {
    const { boardId, cardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Card not found.", 404);

    const latest = await getCardById(supabase, boardId, cardId);
    if (!latest) return apiError("NOT_FOUND", "Card not found.", 404);
    if (latest.version !== input.expectedVersion) {
      return apiError("VERSION_CONFLICT", "The card changed since it was loaded.", 409, latest);
    }

    const { data, error } = await supabase
      .from("cards")
      .update({
        ...changes,
        version: latest.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("board_id", boardId)
      .eq("id", cardId)
      .eq("version", latest.version)
      .select("id, board_id, column_id, title, description, assignee_user_id, position, version, created_at, updated_at")
      .maybeSingle();
    if (error) throw error;
    if (data) return apiSuccess(data);

    const current = await getCardById(supabase, boardId, cardId);
    return apiError("VERSION_CONFLICT", "The card changed since it was loaded.", 409, current);
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { boardId, cardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Card not found.", 404);
    const { error } = await supabase.rpc("delete_card", {
      p_board_id: boardId,
      p_card_id: cardId,
    });
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    return routeError(error);
  }
}
