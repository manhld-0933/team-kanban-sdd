"use client";

import { useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Card } from "@/components/board/card";
import { CardCreateForm } from "@/components/board/card-create-form";
import { useLocale } from "@/components/i18n/locale-provider";
import type { ColumnRecord } from "@/lib/boards/types";

export function Column({
  column,
  columnIndex,
  columns,
  role,
  disabled,
  onCardCreate,
  onCardSave,
  onCardDelete,
  onCardMove,
  onColumnSave,
  onColumnDelete,
  onColumnMove,
}: {
  column: ColumnRecord;
  columnIndex: number;
  columns: ColumnRecord[];
  role: "owner" | "member";
  disabled: boolean;
  onCardCreate: (columnId: string, input: { title: string; description: string | null }) => Promise<void>;
  onCardSave: (cardId: string, input: { title: string; description: string | null; expectedVersion: number }) => Promise<void>;
  onCardDelete: (cardId: string) => Promise<void>;
  onCardMove: (cardId: string, columnId: string, position: number) => Promise<void>;
  onColumnSave: (columnId: string, input: { name?: string; position?: number }) => Promise<void>;
  onColumnDelete: (columnId: string, moveCardsToColumnId: string | null) => Promise<void>;
  onColumnMove: (columnId: string, position: number) => Promise<void>;
}) {
  const { t } = useLocale();
  const displayColumnName = column.name === "To Do" ? t("statusToDo")
    : column.name === "In Progress" ? t("statusInProgress")
      : column.name === "Done" ? t("statusDone") : column.name;
  const isOwner = role === "owner";
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(column.name);
  const [deleteTarget, setDeleteTarget] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function saveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("columnNameRequired"));
      return;
    }
    if (name.trim().length > 60) { setError(t("errorValidation")); return; }
    setPending(true);
    setError("");
    try {
      await onColumnSave(column.id, { name: name.trim() });
      setRenaming(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("genericError"));
    } finally {
      setPending(false);
    }
  }

  async function deleteColumn() {
    if (!window.confirm(t("columnDeleteConfirm"))) return;
    setPending(true);
    setError("");
    try {
      await onColumnDelete(column.id, column.cards.length ? deleteTarget || null : null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t("genericError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="kanban-column" aria-labelledby={`column-${column.id}`}>
      <header className="column-header">
        <div className="column-title-row">
          {renaming ? (
            <form className="column-rename-form" onSubmit={saveName} noValidate>
              <label className="sr-only" htmlFor={`column-name-${column.id}`}>{t("columnName")}</label>
              <input id={`column-name-${column.id}`} value={name} maxLength={60} onChange={(event) => setName(event.target.value)} autoFocus />
              <button className="icon-button" type="submit" aria-label={t("columnSave")} disabled={pending}>✓</button>
              <button className="icon-button" type="button" aria-label={t("cancel")} onClick={() => { setRenaming(false); setName(column.name); }}>×</button>
            </form>
          ) : (
            <h2 id={`column-${column.id}`} title={displayColumnName}>{displayColumnName}</h2>
          )}
          <span className="column-count" aria-label={`${column.cards.length} ${t("cardCount")}`}>{column.cards.length}</span>
        </div>
        {isOwner ? (
          <div className="column-toolbar">
            <button className="icon-button" type="button" aria-label={t("columnMoveUp")} title={t("columnMoveUp")} disabled={pending || columnIndex === 0} onClick={() => void onColumnMove(column.id, columnIndex - 1)}>←</button>
            <button className="icon-button" type="button" aria-label={t("columnMoveDown")} title={t("columnMoveDown")} disabled={pending || columnIndex === columns.length - 1} onClick={() => void onColumnMove(column.id, columnIndex + 1)}>→</button>
            {!renaming ? <button className="icon-button" type="button" aria-label={t("columnRename")} title={t("columnRename")} disabled={pending} onClick={() => { setName(column.name); setRenaming(true); }}>✎</button> : null}
          </div>
        ) : null}
      </header>

      {isOwner && column.cards.length > 0 ? (
        <div className="column-delete-row">
          <label className="sr-only" htmlFor={`move-target-${column.id}`}>{t("columnMoveCardsTo")}</label>
          <select id={`move-target-${column.id}`} value={deleteTarget} onChange={(event) => setDeleteTarget(event.target.value)}>
            <option value="">{t("columnMoveCardsTo")}</option>
            {columns.filter((item) => item.id !== column.id).map((item) => <option value={item.id} key={item.id}>{item.name === "To Do" ? t("statusToDo") : item.name === "In Progress" ? t("statusInProgress") : item.name === "Done" ? t("statusDone") : item.name}</option>)}
          </select>
          <button className="icon-button danger" type="button" aria-label={t("columnDelete")} title={t("columnDelete")} disabled={pending || !deleteTarget} onClick={() => void deleteColumn()}>×</button>
        </div>
      ) : isOwner ? (
        <div className="column-delete-row">
          <span />
          <button className="icon-button danger" type="button" aria-label={t("columnDelete")} title={t("columnDelete")} disabled={pending} onClick={() => void deleteColumn()}>×</button>
        </div>
      ) : null}
      {column.cards.length > 0 && isOwner && !deleteTarget ? <p className="inline-hint">{t("columnEmptyDeleteHint")}</p> : null}
      {error ? <p className="form-message error" role="alert">{error}</p> : null}

      <Droppable droppableId={column.id} type="KANBAN_CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-card-list${snapshot.isDraggingOver ? " is-dragging-over" : ""}`}
          >
            {column.cards.map((card, index) => (
              <Card
                key={card.id}
                card={card}
                index={index}
                columnIndex={columnIndex}
                columnCount={columns.length}
                disabled={disabled || pending}
                onSave={(input) => onCardSave(card.id, input)}
                onDelete={() => onCardDelete(card.id)}
                onMoveUp={() => { void onCardMove(card.id, column.id, Math.max(index - 1, 0)); }}
                onMoveDown={() => { void onCardMove(card.id, column.id, Math.min(index + 1, column.cards.length - 1)); }}
                onMoveLeft={() => { const target = columns[columnIndex - 1]; if (target) void onCardMove(card.id, target.id, target.cards.length); }}
                onMoveRight={() => { const target = columns[columnIndex + 1]; if (target) void onCardMove(card.id, target.id, target.cards.length); }}
              />
            ))}
            {provided.placeholder}
            {column.cards.length === 0 ? <p className="column-empty">{t("columnEmpty")}</p> : null}
          </div>
        )}
      </Droppable>

      <CardCreateForm onCreate={(input) => onCardCreate(column.id, input)} />
    </section>
  );
}
