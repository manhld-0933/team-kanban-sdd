"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";

export default function Home() {
  const { t } = useLocale();

  return (
    <main className="home-shell">
      <header className="home-header">
        <Link className="auth-brand" href="/" aria-label={t("brandLabel")}>
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>Team Kanban</span>
        </Link>
        <LanguageSwitcher />
      </header>
      <section className="home-hero">
        <p className="eyebrow">TEAM KANBAN</p>
        <h1>{t("homeTitle")}</h1>
        <p className="auth-description">{t("homeDescription")}</p>
        <div className="home-actions">
          <Link className="primary-button home-primary" href="/signup">{t("homeSignup")}</Link>
          <Link className="secondary-button" href="/login">{t("homeLogin")}</Link>
        </div>
      </section>
    </main>
  );
}
