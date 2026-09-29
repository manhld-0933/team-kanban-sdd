"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/components/board/api-error-message";
import { useLocale } from "@/components/i18n/locale-provider";

export function DeleteBoardButton({ boardId }: { boardId: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function removeBoard() {
    if (!window.confirm(t("boardDeleteConfirm"))) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/boards/${boardId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json();
        setError(await apiErrorMessage(
          new Response(JSON.stringify(body), { status: response.status }),
          t,
        ));
        return;
      }
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="board-delete-control">
      <button
        className="small-secondary board-delete-button"
        type="button"
        disabled={pending}
        aria-label={t("boardDelete")}
        onClick={() => void removeBoard()}
      >
        {pending ? t("saving") : t("boardDelete")}
      </button>
      {error ? <p className="form-message error" role="alert">{error}</p> : null}
    </div>
  );
}
