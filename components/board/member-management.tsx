"use client";

import { useState } from "react";
import { apiErrorMessage } from "@/components/board/api-error-message";
import { useLocale } from "@/components/i18n/locale-provider";
import type { BoardMember } from "@/lib/boards/types";

export function MemberManagement({
  boardId,
  initialMembers,
  onChanged,
}: {
  boardId: string;
  initialMembers: BoardMember[];
  onChanged: (members: BoardMember[]) => void;
}) {
  const { t } = useLocale();
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function reload() {
    const response = await fetch(`/api/v1/boards/${boardId}/members`);
    if (!response.ok) throw new Error(await apiErrorMessage(response, t));
    const result = await response.json();
    const nextMembers = result.data as BoardMember[];
    setMembers(nextMembers);
    return nextMembers;
  }

  async function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) { setError(t("memberEmailRequired")); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(t("memberEmailInvalid")); return; }
    setPending(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/boards/${boardId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok) throw new Error(await apiErrorMessage(response, t));
      setEmail("");
      const nextMembers = await reload();
      setNotice(t("memberAdded"));
      window.dispatchEvent(new Event("kanban:activity"));
      onChanged(nextMembers);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : t("genericError"));
    } finally { setPending(false); }
  }

  async function removeMember(member: BoardMember) {
    if (!window.confirm(`${t("memberRemoveConfirm")} ${member.email}`)) return;
    setPending(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/boards/${boardId}/members/${member.userId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await apiErrorMessage(response, t));
      const nextMembers = await reload();
      setNotice(t("memberRemoved"));
      window.dispatchEvent(new Event("kanban:activity"));
      onChanged(nextMembers);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : t("genericError"));
    } finally { setPending(false); }
  }

  return (
    <details className="member-management">
      <summary>{t("membersTitle")} <span className="member-total">{members.length}</span></summary>
      <div className="member-management-panel">
        <ul className="member-list">
          {members.map((member) => (
            <li key={member.userId}>
              <span><strong>{member.email || member.userId}</strong><small>{member.role === "owner" ? t("roleOwner") : t("roleMember")}</small></span>
              {member.role === "member" ? <button className="small-secondary" type="button" onClick={() => void removeMember(member)} disabled={pending}>{t("memberRemove")}</button> : null}
            </li>
          ))}
        </ul>
        <form className="member-add-form" onSubmit={(event) => void addMember(event)} noValidate>
          <label htmlFor={`member-email-${boardId}`}>{t("memberEmail")}</label>
          <div className="member-add-fields">
            <input id={`member-email-${boardId}`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("memberEmailPlaceholder")} maxLength={254} />
            <button className="small-primary" type="submit" disabled={pending}>{pending ? t("saving") : t("memberAdd")}</button>
          </div>
        </form>
        {error ? <p className="form-message error" role="alert">{error}</p> : null}
        {notice ? <p className="form-message success" role="status">{notice}</p> : null}
      </div>
    </details>
  );
}
