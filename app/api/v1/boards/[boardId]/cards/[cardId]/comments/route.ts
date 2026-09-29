import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { listCardComments } from "@/lib/comments/queries";
import { apiError, apiSuccess } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";
import { getBoardRole } from "@/lib/permissions/board";
import { parseRequiredString } from "@/lib/validation/common";
import { getCardById } from "@/lib/cards/queries";

type RouteContext = { params: Promise<{ boardId: string; cardId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { boardId, cardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Card not found.", 404);
    if (!await getCardById(supabase, boardId, cardId)) return apiError("NOT_FOUND", "Card not found.", 404);
    return apiSuccess(await listCardComments(supabase, boardId, cardId));
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return apiError("VALIDATION_ERROR", "A valid JSON body is required.", 422); }
  const parsed = parseRequiredString(
    typeof body === "object" && body !== null ? (body as { body?: unknown }).body : undefined,
    "Comment",
    5000,
  );
  if (!parsed.success) return apiError("VALIDATION_ERROR", parsed.message, 422);

  try {
    const { boardId, cardId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) return apiError("NOT_FOUND", "Card not found.", 404);
    if (!await getCardById(supabase, boardId, cardId)) return apiError("NOT_FOUND", "Card not found.", 404);
    const { data: comment, error } = await supabase.from("comments")
      .insert({ board_id: boardId, card_id: cardId, author_user_id: user.id, body: parsed.data })
      .select("id, board_id, card_id, author_user_id, body, created_at")
      .single();
    if (error) throw error;
    const { data: author, error: authorError } = await supabase.from("user_profiles")
      .select("email")
      .eq("id", user.id)
      .single();
    if (authorError) throw authorError;
    return apiSuccess({
      ...comment,
      author: { userId: user.id, email: author.email as string },
    }, 201);
  } catch (error) {
    return routeError(error);
  }
}
