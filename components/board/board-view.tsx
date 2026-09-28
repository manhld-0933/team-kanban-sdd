"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/board/kanban-board";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import type { BoardDetail } from "@/lib/boards/types";

export function BoardView({ initialBoard }: { initialBoard: BoardDetail }) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState(initialBoard.name);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function saveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { setError(t("boardNameRequired")); return; }
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/v1/boards/${initialBoard.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }),
      });
      if (!response.ok) throw new Error(t("genericError"));
      setEditing(false); router.refresh();
    } catch { setError(t("genericError")); }
    finally { setPending(false); }
  }

  return (
    <main className="workspace-shell board-workspace">
      <header className="workspace-header">
        <Link className="auth-brand" href="/boards" aria-label={t("boardBack")}>
          <span className="brand-mark" aria-hidden="true">K</span><span>Team Kanban</span>
        </Link>
        <div className="workspace-header-actions"><Link className="back-link" href="/boards">← {t("boardBack")}</Link><LanguageSwitcher /></div>
      </header>
      <section className="board-page">
        <div className="board-heading-row">
          <div>
            <p className="eyebrow">{initialBoard.role === "owner" ? t("roleOwner") : t("roleMember")}</p>
            {editing ? (
              <form className="board-title-form" onSubmit={(event) => void saveName(event)}>
                <label className="sr-only" htmlFor="board-title">{t("boardName")}</label>
                <input id="board-title" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoFocus />
                <button className="small-primary" disabled={pending}>{t("columnSave")}</button>
                <button className="small-secondary" type="button" onClick={() => { setName(initialBoard.name); setEditing(false); }}>{t("cancel")}</button>
              </form>
            ) : <h1>{initialBoard.name}</h1>}
            {error ? <p className="form-message error" role="alert">{error}</p> : null}
          </div>
          {initialBoard.role === "owner" && !editing ? <button className="small-secondary" type="button" onClick={() => setEditing(true)}>{t("boardRename")}</button> : null}
        </div>
        <KanbanBoard initialBoard={initialBoard} />
      </section>
    </main>
  );
}
