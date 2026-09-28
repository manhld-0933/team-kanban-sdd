"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import { CreateBoardForm } from "@/components/board/create-board-form";
import type { BoardSummary } from "@/lib/boards/types";

export function BoardsList({ boards }: { boards: BoardSummary[] }) {
  const { locale, t } = useLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
  });

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <Link className="auth-brand" href="/" aria-label={t("brandLabel")}>
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>Team Kanban</span>
        </Link>
        <LanguageSwitcher />
      </header>

      <section className="boards-page">
        <p className="eyebrow">TEAM KANBAN</p>
        <h1>{t("boardsHeading")}</h1>
        <p className="auth-description">{t("boardsDescription")}</p>
        <CreateBoardForm />

        <div className="board-grid" aria-label={t("boardsHeading")}>
          {boards.length === 0 ? <p className="empty-state">{t("noBoards")}</p> : null}
          {boards.map((board) => (
            <Link className="board-tile" href={`/boards/${board.id}`} key={board.id}>
              <span className="board-tile-mark" aria-hidden="true">▦</span>
              <strong>{board.name}</strong>
              <span className="board-tile-meta">
                {board.role === "owner" ? t("roleOwner") : t("roleMember")}
                <span aria-hidden="true"> · </span>
                {dateFormatter.format(new Date(board.createdAt))}
              </span>
              <span className="board-open">{t("boardOpen")} <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
