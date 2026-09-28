import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";
import { getBoardRole } from "@/lib/permissions/board";
import { parseRequiredString } from "@/lib/validation/common";

type RouteContext = { params: Promise<{ boardId: string; columnId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "A valid JSON body is required.", 422);
  }
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const name = input.name === undefined ? null : parseRequiredString(input.name, "Column name", 60);
  if (name && !name.success) return apiError("VALIDATION_ERROR", name.message, 422);
  if (input.position !== undefined && (!Number.isInteger(input.position) || (input.position as number) < 0)) {
    return apiError("VALIDATION_ERROR", "Position must be a non-negative integer.", 422);
  }
  if (name === null && input.position === undefined) {
    return apiError("VALIDATION_ERROR", "Provide a column name or position.", 422);
  }

  try {
    const { boardId, columnId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Board not found.", 404);
    if (role !== "owner") return apiError("FORBIDDEN", "Only the board owner can manage columns.", 403);

    const { error } = await supabase.rpc("update_column", {
      p_board_id: boardId,
      p_column_id: columnId,
      p_name: name?.success ? name.data : null,
      p_position: input.position === undefined ? null : input.position,
    });
    if (error) throw error;
    const { data, error: readError } = await supabase
      .from("columns")
      .select("id, board_id, name, position, created_at, updated_at")
      .eq("board_id", boardId)
      .eq("id", columnId)
      .maybeSingle();
    if (readError) throw readError;
    if (!data) return apiError("NOT_FOUND", "Column not found.", 404);
    return apiSuccess(data);
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  let body: unknown = {};
  try {
    if (request.headers.get("content-length") !== "0") body = await request.json();
  } catch {
    body = {};
  }
  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};

  try {
    const { boardId, columnId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Board not found.", 404);
    if (role !== "owner") return apiError("FORBIDDEN", "Only the board owner can manage columns.", 403);

    let targetId: string | null = null;
    if (input.moveCardsToColumnId !== undefined) {
      if (typeof input.moveCardsToColumnId !== "string") {
        return apiError("VALIDATION_ERROR", "The target column id is invalid.", 422);
      }
      targetId = input.moveCardsToColumnId;
    }
    const { error } = await supabase.rpc("delete_column", {
      p_board_id: boardId,
      p_column_id: columnId,
      p_move_cards_to_column_id: targetId,
    });
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    return routeError(error);
  }
}
