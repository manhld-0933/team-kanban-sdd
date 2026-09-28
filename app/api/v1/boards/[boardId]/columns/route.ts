import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";
import { getBoardRole } from "@/lib/permissions/board";
import { parseRequiredString } from "@/lib/validation/common";

type RouteContext = { params: Promise<{ boardId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "A valid JSON body is required.", 422);
  }

  const input = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  const name = parseRequiredString(input.name, "Column name", 60);
  if (!name.success) return apiError("VALIDATION_ERROR", name.message, 422);
  if (!Number.isInteger(input.position) || (input.position as number) < 0) {
    return apiError("VALIDATION_ERROR", "Position must be a non-negative integer.", 422);
  }

  try {
    const { boardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Board not found.", 404);
    if (role !== "owner") return apiError("FORBIDDEN", "Only the board owner can manage columns.", 403);

    const { data: id, error } = await supabase.rpc("create_column", {
      p_board_id: boardId,
      p_name: name.data,
      p_position: input.position as number,
    });
    if (error) throw error;
    const { data, error: readError } = await supabase
      .from("columns")
      .select("id, board_id, name, position, created_at, updated_at")
      .eq("id", id as string)
      .single();
    if (readError) throw readError;
    return apiSuccess(data, 201);
  } catch (error) {
    return routeError(error);
  }
}
