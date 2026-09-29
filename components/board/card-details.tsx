"use client";

import { useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/components/board/api-error-message";
import { useLocale } from "@/components/i18n/locale-provider";
import type { BoardMember, CardRecord } from "@/lib/boards/types";
import type { CommentRecord } from "@/lib/comments/queries";

export function CardDetails({
  boardId,
  card,
  members,
  onUpdated,
}: {
  boardId: string;
  card: CardRecord;
  members: BoardMember[];
  onUpdated: () => Promise<void>;
}) {
  const { locale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loadedMembers, setLoadedMembers] = useState<BoardMember[]>(members);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dateFormatter = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  useEffect(() => {
    if (open && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    Promise.all([
      fetch(`/api/v1/boards/${boardId}/members`),
      fetch(`/api/v1/boards/${boardId}/cards/${card.id}/comments`),
    ]).then(async ([membersResponse, commentsResponse]) => {
      if (!membersResponse.ok) throw new Error(t("genericError"));
      if (!commentsResponse.ok) throw new Error(await apiErrorMessage(commentsResponse, t));
      const [memberData, commentData] = await Promise.all([membersResponse.json(), commentsResponse.json()]);
      if (active) {
        setLoadedMembers(memberData.data as BoardMember[]);
        setComments(commentData.data as CommentRecord[]);
      }
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : t("commentFailed"));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, boardId, card.id, t]);

  async function changeAssignee(userId: string | null) {
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/boards/${boardId}/cards/${card.id}/assignee`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, expectedVersion: card.version }),
      });
      if (!response.ok) throw new Error(await apiErrorMessage(response, t));
      await onUpdated();
      setNotice(t("assignmentSaved"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("genericError"));
      await onUpdated().catch(() => undefined);
    } finally { setSaving(false); }
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) { setError(t("commentRequired")); return; }
    if (body.trim().length > 5000) { setError(t("errorValidation")); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/boards/${boardId}/cards/${card.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!response.ok) throw new Error(await apiErrorMessage(response, t));
      const result = await response.json();
      setComments((current) => [...current, result.data as CommentRecord]);
      setBody("");
      setNotice(t("commentAdded"));
      window.dispatchEvent(new Event("kanban:activity"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("commentFailed"));
    } finally { setSaving(false); }
  }

  return (
    <>
      <button className="card-detail-open" type="button" onClick={() => { setError(""); setLoading(true); setOpen(true); }} disabled={saving}>{t("cardDetails")}</button>
      {open ? (
        <dialog ref={dialogRef} className="card-details-dialog" aria-labelledby={`details-title-${card.id}`} onCancel={(event) => { event.preventDefault(); setOpen(false); }}>
            <header className="details-dialog-header">
              <div><p className="eyebrow">{t("cardDetails")}</p><h2 id={`details-title-${card.id}`}>{card.title}</h2></div>
              <button className="icon-button" type="button" aria-label={t("cancel")} onClick={() => setOpen(false)}>×</button>
            </header>
            <label className="detail-field-label" htmlFor={`assignee-${card.id}`}>{t("assigneeTitle")}</label>
            <select id={`assignee-${card.id}`} value={card.assignee_user_id ?? ""} onChange={(event) => void changeAssignee(event.target.value || null)} disabled={saving || loading}>
              <option value="">{t("assigneeNone")}</option>
              {loadedMembers.map((member) => <option value={member.userId} key={member.userId}>{member.email || member.userId}{member.role === "owner" ? ` (${t("roleOwner")})` : ""}</option>)}
            </select>
            <section className="comments-section" aria-labelledby={`comments-title-${card.id}`}>
              <h3 id={`comments-title-${card.id}`}>{t("commentsTitle")}</h3>
              {loading ? <p className="muted-copy" role="status">{t("loading")}</p> : null}
              {!loading && comments.length === 0 ? <p className="muted-copy">{t("commentEmpty")}</p> : null}
              <ul className="comment-list">
                {comments.map((comment) => (
                  <li key={comment.id}>
                    <div className="comment-meta"><strong>{comment.author.email}</strong><time dateTime={comment.created_at}>{dateFormatter.format(new Date(comment.created_at))}</time></div>
                    <p>{comment.body}</p>
                  </li>
                ))}
              </ul>
              <form className="comment-form" onSubmit={(event) => void submitComment(event)} noValidate>
                <label className="sr-only" htmlFor={`comment-body-${card.id}`}>{t("commentsTitle")}</label>
                <textarea id={`comment-body-${card.id}`} value={body} onChange={(event) => setBody(event.target.value)} placeholder={t("commentPlaceholder")} maxLength={5000} rows={3} />
                <button className="small-primary" type="submit" disabled={saving}>{saving ? t("saving") : t("commentAdd")}</button>
              </form>
            </section>
            {error ? <p className="form-message error" role="alert">{error}</p> : null}
            {notice ? <p className="form-message success" role="status">{notice}</p> : null}
        </dialog>
      ) : null}
    </>
  );
}
