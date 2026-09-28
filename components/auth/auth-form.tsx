"use client";

import { useActionState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import { loginAction, signupAction } from "@/app/(auth)/actions";

type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const isSignup = mode === "signup";
  const { t } = useLocale();
  const action = isSignup ? signupAction : loginAction;
  const [state, formAction, pending] = useActionState(action, {});

  function validateForm(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const password = form.elements.namedItem("password") as HTMLInputElement;
    email.setCustomValidity("");
    password.setCustomValidity("");

    if (!email.value.trim()) email.setCustomValidity(t("emailRequired"));
    else if (!email.validity.valid) email.setCustomValidity(t("invalidEmail"));
    if (!password.value) password.setCustomValidity(t("passwordRequired"));
    else if (password.value.length < 8 || password.value.length > 128) {
      password.setCustomValidity(t("invalidPassword"));
    }

    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-topbar">
          <Link className="auth-brand" href="/" aria-label={t("brandLabel")}>
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>Team Kanban</span>
          </Link>
          <LanguageSwitcher />
        </div>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 id="auth-title">{isSignup ? t("signupTitle") : t("loginTitle")}</h1>
        <p className="auth-description">
          {isSignup ? t("signupDescription") : t("loginDescription")}
        </p>

        <form action={formAction} className="auth-form" noValidate onSubmit={validateForm}>
          <label htmlFor="email">{t("emailLabel")}</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            required
          />

          <label htmlFor="password">{t("passwordLabel")}</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={8}
            maxLength={128}
            placeholder={t("passwordPlaceholder")}
            required
          />

          {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
          {state.message ? <p className="form-message success" role="status">{state.message}</p> : null}

          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? t("submitting") : isSignup ? t("signupButton") : t("loginButton")}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? `${t("haveAccount")} ` : `${t("noAccount")} `}
          <Link href={isSignup ? "/login" : "/signup"}>
            {isSignup ? t("linkLogin") : t("linkSignup")}
          </Link>
        </p>
      </section>
    </main>
  );
}
