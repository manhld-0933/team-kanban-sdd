import { redirect } from "next/navigation";
import { BoardsList } from "@/components/board/boards-list";
import { AuthenticationError, getAuthenticatedClient } from "@/lib/auth/require-user";
import { listBoards } from "@/lib/boards/queries";

export default async function BoardsPage() {
  let boards;
  try {
    const { supabase, user } = await getAuthenticatedClient();
    boards = await listBoards(supabase, user.id);
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }
  return <BoardsList boards={boards} />;
}
