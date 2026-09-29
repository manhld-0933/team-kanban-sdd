"use client";

import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Column } from "@/components/board/column";
import { useLocale } from "@/components/i18n/locale-provider";
import type { BoardDetail } from "@/lib/boards/types";

async function request(path: string, method: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const code = result?.error?.code;
    throw new Error(typeof code === "string" ? code : "INTERNAL_ERROR");
  }
  return result?.data;
}

function localizedError(code: string, t: (key: import("@/lib/i18n/messages").MessageKey) => string) {
  if (code === "VERSION_CONFLICT") return t("versionConflict");
  if (code === "COLUMN_NOT_EMPTY") return t("columnNotEmpty");
  if (code === "FORBIDDEN") return t("errorForbidden");
  if (code === "NOT_FOUND") return t("errorNotFound");
  if (code === "VALIDATION_ERROR") return t("errorValidation");
  return t("genericError");
}

export function KanbanBoard({ initialBoard }: { initialBoard: BoardDetail }) {
  const { t } = useLocale();
  const [board, setBoard] = useState(initialBoard);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const base = `/api/v1/boards/${board.id}`;

  async function refreshBoard() {
    const fresh = await request(base, "GET") as BoardDetail;
    setBoard(fresh);
    window.dispatchEvent(new Event("kanban:activity"));
  }

  async function mutate(path: string, method: string, body?: unknown) {
    setPending(true);
    setError("");
    try {
      await request(path, method, body);
      await refreshBoard();
    } catch (mutationError) {
      if (mutationError instanceof Error && mutationError.message === "VERSION_CONFLICT") {
        try { await refreshBoard(); } catch { /* retain the current board if refresh is unavailable */ }
      }
      const message = localizedError(mutationError instanceof Error ? mutationError.message : "INTERNAL_ERROR", t);
      setError(message);
      throw new Error(message);
    } finally {
      setPending(false);
    }
  }

  async function moveCard(cardId: string, columnId: string, position: number) {
    const sourceBoard = board;
    const allCards = sourceBoard.columns.flatMap((column) => column.cards);
    const card = allCards.find((item) => item.id === cardId);
    if (!card) return;
    const columns = sourceBoard.columns.map((column) => ({ ...column, cards: [...column.cards] }));
    const from = columns.find((column) => column.id === card.column_id);
    const to = columns.find((column) => column.id === columnId);
    if (!from || !to) return;
    from.cards = from.cards.filter((item) => item.id !== cardId);
    const targetIndex = Math.max(0, Math.min(position, to.cards.length));
    to.cards.splice(targetIndex, 0, { ...card, column_id: columnId });
    from.cards.forEach((item, index) => { item.position = index; });
    to.cards.forEach((item, index) => { item.position = index; });
    setBoard({ ...sourceBoard, columns });
    setPending(true);
    setError("");
    try {
      const result = await request(`${base}/cards/${cardId}/move`, "POST", {
        toColumnId: columnId,
        toPosition: targetIndex,
        expectedVersion: card.version,
      }) as { board: BoardDetail };
      setBoard(result.board);
      window.dispatchEvent(new Event("kanban:activity"));
    } catch (moveError) {
      setBoard(sourceBoard);
      const isConflict = moveError instanceof Error && moveError.message === "VERSION_CONFLICT";
      setError(isConflict ? t("versionConflict") : t("cardMoveFailed"));
      try { await refreshBoard(); } catch { /* keep the saved snapshot if refresh is unavailable */ }
    } finally {
      setPending(false);
    }
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    if (result.source.droppableId === result.destination.droppableId
      && result.source.index === result.destination.index) return;
    await moveCard(result.draggableId, result.destination.droppableId, result.destination.index);
  }

  const orderedColumns = [...board.columns].sort((a, b) => a.position - b.position);

  return (
    <div className="kanban-region" aria-busy={pending}>
      {error ? <p className="form-message error board-error" role="alert">{error}</p> : null}
      {pending ? <p className="pending-status" role="status">{t("saving")}</p> : null}
      <DragDropContext onDragEnd={(result) => { void onDragEnd(result); }}>
        <div className="kanban-columns">
          {orderedColumns.map((column, index) => (
            <Column
              key={column.id}
              column={column}
              boardId={board.id}
              members={initialBoard.members}
              columnIndex={index}
              columns={orderedColumns}
              role={initialBoard.role}
              disabled={pending}
              onCardCreate={(columnId, input) => mutate(`${base}/cards`, "POST", { ...input, columnId })}
              onCardSave={(cardId, input) => mutate(`${base}/cards/${cardId}`, "PATCH", input)}
              onCardDelete={(cardId) => mutate(`${base}/cards/${cardId}`, "DELETE")}
              onCardMove={moveCard}
              onColumnSave={(columnId, input) => mutate(`${base}/columns/${columnId}`, "PATCH", input)}
              onColumnDelete={(columnId, moveCardsToColumnId) => mutate(`${base}/columns/${columnId}`, "DELETE", { moveCardsToColumnId })}
              onColumnMove={(columnId, position) => mutate(`${base}/columns/${columnId}`, "PATCH", { position })}
              onBoardRefresh={refreshBoard}
            />
          ))}
        </div>
      </DragDropContext>
      {board.role === "owner" ? <AddColumn base={base} onCreated={refreshBoard} /> : null}
    </div>
  );
}

function AddColumn({ base, onCreated }: { base: string; onCreated: () => Promise<void> }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { setError(t("columnNameRequired")); return; }
    setPending(true); setError("");
    try {
      const response = await request(`${base}/columns`, "POST", { name: name.trim() });
      void response;
      await onCreated(); setName(""); setOpen(false);
    } catch (submitError) {
      setError(localizedError(submitError instanceof Error ? submitError.message : "INTERNAL_ERROR", t));
    } finally { setPending(false); }
  }
  return open ? (
    <form className="add-column-form" onSubmit={(event) => void submit(event)}>
      <label htmlFor="new-column-name">{t("columnName")}</label>
      <input id="new-column-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoFocus />
      {error ? <p className="form-message error" role="alert">{error}</p> : null}
      <div className="inline-actions">
        <button className="small-primary" disabled={pending}>{pending ? t("saving") : t("columnSave")}</button>
        <button className="small-secondary" type="button" onClick={() => setOpen(false)}>{t("cancel")}</button>
      </div>
    </form>
  ) : <button className="add-column-button" type="button" onClick={() => setOpen(true)}>＋ {t("boardAddColumn")}</button>;
}
