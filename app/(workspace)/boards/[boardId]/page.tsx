import { notFound, redirect } from "next/navigation";
import { BoardView } from "@/components/board/board-view";
import { AuthenticationError, getAuthenticatedClient } from "@/lib/auth/require-user";
import { getBoardDetail } from "@/lib/boards/queries";
import { getBoardRole } from "@/lib/permissions/board";

export default async function BoardPage({
  params,
}: PageProps<"/boards/[boardId]">) {
  const { boardId } = await params;
  let board;
  try {
    const { supabase, user } = await getAuthenticatedClient();
    const role = await getBoardRole(supabase, boardId, user.id);
    if (!role) notFound();
    board = await getBoardDetail(supabase, boardId, role);
    if (!board) notFound();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    throw error;
  }
  return <BoardView initialBoard={board} />;
}
