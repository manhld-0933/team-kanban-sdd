"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import type { ActivityAction, ActivityRecord } from "@/lib/activity/queries";
import type { MessageKey } from "@/lib/i18n/messages";

const actionMessages: Record<ActivityAction, MessageKey> = {
  "board.create": "activityBoardCreate",
  "board.update": "activityBoardUpdate",
  "column.create": "activityColumnCreate",
  "column.update": "activityColumnUpdate",
  "column.delete": "activityColumnDelete",
  "card.create": "activityCardCreate",
  "card.update": "activityCardUpdate",
  "card.delete": "activityCardDelete",
  "card.move": "activityCardMove",
  "card.assignee_change": "activityAssigneeChange",
  "member.add": "activityMemberAdd",
  "member.remove": "activityMemberRemove",
  "comment.create": "activityCommentCreate",
};

type ActivityPage = { items: ActivityRecord[]; nextCursor: string | null };

async function fetchActivityPage(boardId: string, cursor: string | null = null): Promise<ActivityPage> {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(`/api/v1/boards/${boardId}/activity?${params.toString()}`);
  if (!response.ok) throw new Error("ACTIVITY_LOAD_FAILED");
  const result = await response.json() as { data: ActivityPage };
  return result.data;
}

export function ActivityFeed({ boardId }: { boardId: string }) {
  const { locale, t } = useLocale();
  const [items, setItems] = useState<ActivityRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const dateFormatter = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const load = useCallback(async (append: boolean) => {
    try {
      const page = await fetchActivityPage(boardId, append ? cursorRef.current : null);
      setItems((current) => append ? [...current, ...page.items] : page.items);
      setCursor(page.nextCursor);
      cursorRef.current = page.nextCursor;
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [boardId]);

  useEffect(() => {
    let active = true;
    fetchActivityPage(boardId).then((page) => {
      if (active) {
        setItems(page.items);
        setCursor(page.nextCursor);
        cursorRef.current = page.nextCursor;
      }
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [boardId]);
  useEffect(() => {
    const refresh = () => { setError(false); void load(false); };
    window.addEventListener("kanban:activity", refresh);
    return () => window.removeEventListener("kanban:activity", refresh);
  }, [load]);

  return (
    <section className="activity-feed" aria-labelledby="activity-heading">
      <header className="activity-heading"><h2 id="activity-heading">{t("activityTitle")}</h2></header>
      {loading ? <p className="muted-copy" role="status">{t("activityLoading")}</p> : null}
      {error ? <p className="form-message error" role="alert">{t("activityError")}</p> : null}
      {!loading && !error && items.length === 0 ? <p className="muted-copy">{t("activityEmpty")}</p> : null}
      <ol className="activity-list">
        {items.map((item) => (
          <li key={item.id}>
            <span className="activity-marker" aria-hidden="true" />
            <div className="activity-copy">
              <p><strong>{item.actor_email ?? t("roleMember")}</strong> {t(actionMessages[item.action])}{item.summary ? <>: <span className="activity-summary">{item.summary}</span></> : null}</p>
              <time dateTime={item.created_at}>{dateFormatter.format(new Date(item.created_at))}</time>
            </div>
          </li>
        ))}
      </ol>
      {!loading && cursor ? <button className="small-secondary" type="button" onClick={() => { setLoadingMore(true); void load(true); }} disabled={loadingMore}>{loadingMore ? t("loading") : t("activityMore")}</button> : null}
    </section>
  );
}
