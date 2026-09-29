"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import { CreateBoardForm } from "@/components/board/create-board-form";
import { LogoutButton } from "@/components/auth/logout-button";
import type { BoardSummary } from "@/lib/boards/types";
import { DemoDataButton } from "@/components/board/demo-data-button";
import { DeleteBoardButton } from "@/components/board/delete-board-button";

export function BoardsList({ boards }: { boards: BoardSummary[] }) {
  const { locale, t } = useLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
  });
  const demoBoard = boards.find((board) => board.isDemo && board.role === "owner");

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <Link className="auth-brand" href="/" aria-label={t("brandLabel")}>
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>Team Kanban</span>
        </Link>
        <div className="workspace-header-actions"><LanguageSwitcher /><LogoutButton /></div>
      </header>

      <section className="boards-page">
        <p className="eyebrow">TEAM KANBAN</p>
        <h1>{t("boardsHeading")}</h1>
        <p className="auth-description">{t("boardsDescription")}</p>
        <CreateBoardForm />
        <DemoDataButton existingBoardId={demoBoard?.id} />

        <div className="board-grid" aria-label={t("boardsHeading")}>
          {boards.length === 0 ? <p className="empty-state">{t("noBoards")}</p> : null}
          {boards.map((board) => (
            <div className="board-tile-card" key={board.id}>
              <Link className="board-tile" href={`/boards/${board.id}`}>
                <span className="board-tile-mark" aria-hidden="true">▦</span>
                <strong>{board.name}</strong>
                <span className="board-tile-meta">
                  {board.role === "owner" ? t("roleOwner") : t("roleMember")}
                  <span aria-hidden="true"> · </span>
                  {dateFormatter.format(new Date(board.createdAt))}
                </span>
                <span className="board-open">{t("boardOpen")} <span aria-hidden="true">→</span></span>
              </Link>
              {board.role === "owner" ? <DeleteBoardButton boardId={board.id} /> : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
