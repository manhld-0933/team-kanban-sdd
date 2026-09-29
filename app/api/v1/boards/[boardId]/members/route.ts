import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { getBoardMembers } from "@/lib/boards/queries";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";
import { getBoardRole } from "@/lib/permissions/board";
import { parseEmail } from "@/lib/validation/common";

type RouteContext = { params: Promise<{ boardId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { boardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Board not found.", 404);
    return apiSuccess(await getBoardMembers(supabase, boardId));
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return apiError("VALIDATION_ERROR", "A valid JSON body is required.", 422); }
  const emailResult = parseEmail(typeof body === "object" && body !== null ? (body as { email?: unknown }).email : undefined);
  if (!emailResult.success) return apiError("VALIDATION_ERROR", emailResult.message, 422);

  try {
    const { boardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Board not found.", 404);
    if (role !== "owner") return apiError("FORBIDDEN", "Only the board owner can manage members.", 403);

    const { data, error } = await supabase.rpc("add_board_member", {
      p_board_id: boardId,
      p_email: emailResult.data,
    });
    if (error) throw error;
    return apiSuccess(data, 201);
  } catch (error) {
    return routeError(error);
  }
}
