"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

export function CardCreateForm({
  onCreate,
}: {
  onCreate: (input: { title: string; description: string | null }) => Promise<void>;
}) {
  const { t } = useLocale();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError(t("cardTitleRequired"));
      return;
    }
    if (title.trim().length > 200 || description.length > 5000) { setError(t("errorValidation")); return; }
    setPending(true);
    setError("");
    try {
      await onCreate({ title: title.trim(), description: description || null });
      setTitle("");
      setDescription("");
      setOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t("genericError"));
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return <button className="add-card-button" type="button" onClick={() => setOpen(true)}>+ {t("cardAdd")}</button>;
  }

  return (
    <form className="card-create-form" onSubmit={submit} noValidate>
      <label htmlFor={`new-card-title-${id}`}>{t("cardTitle")}</label>
      <input id={`new-card-title-${id}`} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("cardTitlePlaceholder")} maxLength={200} autoFocus />
      <label htmlFor={`new-card-description-${id}`}>{t("cardDescription")}</label>
      <textarea id={`new-card-description-${id}`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("cardDescriptionPlaceholder")} maxLength={5000} rows={3} />
      {error ? <p className="form-message error" role="alert">{error}</p> : null}
      <div className="inline-actions">
        <button className="small-primary" type="submit" disabled={pending}>{pending ? t("saving") : t("cardAdd")}</button>
        <button className="small-secondary" type="button" onClick={() => { setOpen(false); setError(""); }}>{t("cancel")}</button>
      </div>
    </form>
  );
}
