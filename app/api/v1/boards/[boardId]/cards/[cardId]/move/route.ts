import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { getCardById } from "@/lib/cards/queries";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";
import { getBoardRole } from "@/lib/permissions/board";

type RouteContext = { params: Promise<{ boardId: string; cardId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "A valid JSON body is required.", 422);
  }
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  if (typeof input.toColumnId !== "string"
    || !Number.isInteger(input.toPosition)
    || (input.toPosition as number) < 0
    || !Number.isInteger(input.expectedVersion)
    || (input.expectedVersion as number) < 1) {
    return apiError("VALIDATION_ERROR", "The move request is invalid.", 422);
  }

  try {
    const { boardId, cardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Card not found.", 404);

    const { data, error } = await supabase.rpc("move_card", {
      p_board_id: boardId,
      p_card_id: cardId,
      p_to_column_id: input.toColumnId,
      p_to_position: input.toPosition,
      p_expected_version: input.expectedVersion,
    });
    if (error) throw error;
    return apiSuccess(data);
  } catch (error) {
    if ((error as { message?: string })?.message?.includes("VERSION_CONFLICT")) {
      try {
        const { boardId, cardId } = await params;
        const { supabase } = await getAuthenticatedClient();
        const latest = await getCardById(supabase, boardId, cardId);
        return apiError("VERSION_CONFLICT", "The card changed since it was loaded.", 409, latest);
      } catch (readError) {
        return routeError(readError);
      }
    }
    return routeError(error);
  }
}
