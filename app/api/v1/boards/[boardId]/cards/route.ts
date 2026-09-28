import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { getCardById } from "@/lib/cards/queries";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";
import { getBoardRole } from "@/lib/permissions/board";
import { parseOptionalString, parseRequiredString } from "@/lib/validation/common";

type RouteContext = { params: Promise<{ boardId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "A valid JSON body is required.", 422);
  }
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const title = parseRequiredString(input.title, "Card title", 200);
  const description = parseOptionalString(input.description, "Card description", 5000);
  if (!title.success) return apiError("VALIDATION_ERROR", title.message, 422);
  if (!description.success) return apiError("VALIDATION_ERROR", description.message, 422);
  if (typeof input.columnId !== "string") {
    return apiError("VALIDATION_ERROR", "Column id is required.", 422);
  }

  try {
    const { boardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Board not found.", 404);

    const { data: cardId, error } = await supabase.rpc("create_card", {
      p_board_id: boardId,
      p_column_id: input.columnId,
      p_title: title.data,
      p_description: description.data,
    });
    if (error) throw error;
    const card = await getCardById(supabase, boardId, cardId as string);
    if (!card) return apiError("INTERNAL_ERROR", "The card was created but could not be loaded.", 500);
    return apiSuccess(card, 201);
  } catch (error) {
    return routeError(error);
  }
}
