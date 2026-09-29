"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";
import { apiErrorMessage } from "@/components/board/api-error-message";

export function DemoDataButton({ existingBoardId }: { existingBoardId?: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function createDemoBoard() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/demo/board", { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        setError(await apiErrorMessage(new Response(JSON.stringify(result), { status: response.status }), t));
        return;
      }
      if (!result.data?.id) throw new Error("demo_create_failed");
      router.push(`/boards/${result.data.id}`);
      router.refresh();
    } catch {
      setError(t("demoCreateFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="demo-data-control">
      <button className="small-secondary" type="button" disabled={pending} onClick={() => void createDemoBoard()}>
        {pending ? t("demoCreating") : existingBoardId ? t("demoOpen") : t("demoCreate")}
      </button>
      {error ? <p className="form-message error" role="alert">{error}</p> : null}
    </div>
  );
}
