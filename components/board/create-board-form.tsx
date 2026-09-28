"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/components/board/api-error-message";
import { useLocale } from "@/components/i18n/locale-provider";

export function CreateBoardForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!name.trim()) { setError(t("boardNameRequired")); return; }
    if (name.trim().length > 100) { setError(t("errorValidation")); return; }
    setPending(true);
    try {
      const response = await fetch("/api/v1/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(await apiErrorMessage(new Response(JSON.stringify(body), { status: response.status }), t));
        return;
      }
      router.push(`/boards/${body.data.id}`);
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="board-create-form" onSubmit={submit} noValidate>
      <label htmlFor="board-name">{t("boardName")}</label>
      <div className="board-create-fields">
        <input
          id="board-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("boardNamePlaceholder")}
          maxLength={100}
          required
        />
        <button className="primary-button board-create-button" type="submit" disabled={pending}>
          {pending ? t("saving") : t("boardCreate")}
        </button>
      </div>
      {error ? <p className="form-message error" role="alert">{error}</p> : null}
    </form>
  );
}
