"use client";

import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { useLocale } from "@/components/i18n/locale-provider";
import { CardMoveControls } from "@/components/board/card-move-controls";
import type { CardRecord } from "@/lib/boards/types";

export function Card({
  card,
  index,
  columnIndex,
  columnCount,
  disabled,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
}: {
  card: CardRecord;
  index: number;
  columnIndex: number;
  columnCount: number;
  disabled: boolean;
  onSave: (input: { title: string; description: string | null; expectedVersion: number }) => Promise<void>;
  onDelete: () => Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError(t("cardTitleRequired"));
      return;
    }
    if (title.trim().length > 200 || description.length > 5000) { setError(t("errorValidation")); return; }
    setPending(true);
    setError("");
    try {
      await onSave({ title: title.trim(), description: description || null, expectedVersion: card.version });
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("genericError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Draggable draggableId={card.id} index={index} isDragDisabled={disabled || editing}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`kanban-card${snapshot.isDragging ? " is-dragging" : ""}`}
        >
          {editing ? (
            <form className="card-edit-form" onSubmit={save} noValidate>
              <label htmlFor={`card-title-${card.id}`}>{t("cardTitle")}</label>
              <input id={`card-title-${card.id}`} value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} required autoFocus />
              <label htmlFor={`card-description-${card.id}`}>{t("cardDescription")}</label>
              <textarea id={`card-description-${card.id}`} value={description} maxLength={5000} onChange={(event) => setDescription(event.target.value)} rows={3} />
              {error ? <p className="form-message error" role="alert">{error}</p> : null}
              <div className="inline-actions">
                <button className="small-primary" type="submit" disabled={pending}>{pending ? t("saving") : t("columnSave")}</button>
                <button className="small-secondary" type="button" onClick={() => { setEditing(false); setError(""); }}>{t("cancel")}</button>
              </div>
            </form>
          ) : (
            <>
              <button
                type="button"
                className="card-drag-handle"
                {...provided.dragHandleProps}
                aria-label={`${t("cardDragHandle")}: ${card.title}`}
                disabled={disabled}
              >
                <span aria-hidden="true" className="drag-grip">⠿</span>
                <span className="card-title-text">{card.title}</span>
              </button>
              {card.description ? <p className="card-description-text">{card.description}</p> : null}
              <div className="card-footer">
                <div className="card-actions">
                  <button type="button" onClick={() => setEditing(true)} disabled={disabled}>{t("cardEdit")}</button>
                  <button type="button" onClick={() => { if (window.confirm(t("cardDeleteConfirm"))) void onDelete(); }} disabled={disabled}>{t("cardDelete")}</button>
                </div>
                <CardMoveControls
                  columnIndex={columnIndex}
                  columnCount={columnCount}
                  disabled={disabled}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onMoveLeft={onMoveLeft}
                  onMoveRight={onMoveRight}
                />
              </div>
            </>
          )}
        </article>
      )}
    </Draggable>
  );
}
