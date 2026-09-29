import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { listBoardActivity, parseActivityCursor } from "@/lib/activity/queries";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";
import { getBoardRole } from "@/lib/permissions/board";

type RouteContext = { params: Promise<{ boardId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit");
  const requestedLimit = rawLimit === null ? 20 : Number(rawLimit);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 50) {
    return apiError("VALIDATION_ERROR", "Activity limit must be between 1 and 50.", 422);
  }
  const rawCursor = url.searchParams.get("cursor");
  const cursor = parseActivityCursor(rawCursor);
  if (rawCursor && !cursor) return apiError("VALIDATION_ERROR", "Activity cursor is invalid.", 422);

  try {
    const { boardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Board not found.", 404);
    return apiSuccess(await listBoardActivity(supabase, boardId, requestedLimit, cursor ?? undefined));
  } catch (error) {
    return routeError(error);
  }
}
