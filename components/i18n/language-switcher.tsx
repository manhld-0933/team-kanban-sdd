"use client";

import { useLocale } from "@/components/i18n/locale-provider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className="language-switcher">
      <span className="sr-only">{t("languageLabel")}</span>
      <select
        aria-label={t("languageLabel")}
        value={locale}
        onChange={(event) => setLocale(event.target.value === "en" ? "en" : "vi")}
      >
        <option value="vi">{t("languageVietnamese")}</option>
        <option value="en">{t("languageEnglish")}</option>
      </select>
    </label>
  );
}
