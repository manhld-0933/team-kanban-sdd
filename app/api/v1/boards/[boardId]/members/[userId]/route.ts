import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { apiError } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";
import { getBoardRole } from "@/lib/permissions/board";

type RouteContext = { params: Promise<{ boardId: string; userId: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { boardId, userId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Board not found.", 404);
    if (role !== "owner") return apiError("FORBIDDEN", "Only the board owner can manage members.", 403);

    const { error } = await supabase.rpc("remove_board_member", {
      p_board_id: boardId,
      p_user_id: userId,
    });
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    return routeError(error);
  }
}
