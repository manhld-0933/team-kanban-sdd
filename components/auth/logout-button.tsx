"use client";

import { useActionState } from "react";
import { logoutAction, type AuthFormState } from "@/app/(auth)/actions";
import { useLocale } from "@/components/i18n/locale-provider";

const initialState: AuthFormState = {};

export function LogoutButton() {
  const { t } = useLocale();
  const [state, action, pending] = useActionState(logoutAction, initialState);

  return (
    <div className="logout-control">
      <form action={action}>
        <button className="small-secondary" type="submit" disabled={pending}>
          {pending ? t("submitting") : t("logout")}
        </button>
      </form>
      {state.error ? <span className="form-message error" role="alert">{state.error}</span> : null}
    </div>
  );
}
