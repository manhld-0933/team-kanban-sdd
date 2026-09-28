import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { getBoardDetail, listBoards } from "@/lib/boards/queries";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";
import { parseRequiredString } from "@/lib/validation/common";

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedClient();
    return apiSuccess(await listBoards(supabase, user.id));
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
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
    const { supabase } = await getAuthenticatedClient();
    const { data, error } = await supabase.rpc("create_board", { p_name: name.data });
    if (error) throw error;

    const boardId = data as string;
    const board = await getBoardDetail(supabase, boardId, "owner");
    if (!board) throw new Error("Created board could not be read.");
    return apiSuccess(board, 201);
  } catch (error) {
    return routeError(error);
  }
}
