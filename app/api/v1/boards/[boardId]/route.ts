import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { getBoardDetail } from "@/lib/boards/queries";
import { getBoardRole } from "@/lib/permissions/board";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";
import { parseRequiredString } from "@/lib/validation/common";

type RouteContext = { params: Promise<{ boardId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { boardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Board not found.", 404);
    const board = await getBoardDetail(supabase, boardId, role);
    if (!board) return apiError("NOT_FOUND", "Board not found.", 404);
    return apiSuccess(board);
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "A valid JSON body is required.", 422);
  }

  const name = parseRequiredString(
    typeof body === "object" && body !== null ? (body as { name?: unknown }).name : undefined,
    "Board name",
    100,
  );
  if (!name.success) return apiError("VALIDATION_ERROR", name.message, 422);

  try {
    const { boardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Board not found.", 404);
    if (role !== "owner") return apiError("FORBIDDEN", "Only the board owner can rename it.", 403);

    const { data, error } = await supabase
      .from("boards")
      .update({ name: name.data, updated_at: new Date().toISOString() })
      .eq("id", boardId)
      .select("id, name, updated_at")
      .single();
    if (error) throw error;
    return apiSuccess({ id: data.id, name: data.name, updatedAt: data.updated_at });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { boardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Board not found.", 404);
    if (role !== "owner") return apiError("FORBIDDEN", "Only the board owner can delete it.", 403);

    const { error } = await supabase.rpc("delete_board", { p_board_id: boardId });
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    return routeError(error);
  }
}
