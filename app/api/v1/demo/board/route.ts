import { getAuthenticatedClient } from "@/lib/auth/require-user";
import { apiSuccess } from "@/lib/http/api-response";
import { routeError } from "@/lib/http/route-errors";

type DemoBoardResult = { id: string; created: boolean };

export async function POST() {
  try {
    const { supabase } = await getAuthenticatedClient();
    const { data, error } = await supabase.rpc("create_demo_board");
    if (error) throw error;

    const result = data as DemoBoardResult;
    if (!result?.id) throw new Error("Demo board RPC returned no board id.");
    return apiSuccess({ id: result.id }, result.created ? 201 : 200);
  } catch (error) {
    return routeError(error);
  }
}
