"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";

export type AuthFormState = {
  error?: string;
  message?: string;
};

function readCredentials(formData: FormData, locale: Locale) {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");

  if (typeof emailValue !== "string" || typeof passwordValue !== "string") {
    return { error: translate(locale, "missingCredentials") } as const;
  }

  const email = emailValue.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: translate(locale, "invalidEmail") } as const;
  }
  if (passwordValue.length < 8 || passwordValue.length > 128) {
    return { error: translate(locale, "invalidPassword") } as const;
  }

  return { email, password: passwordValue } as const;
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = await getRequestLocale();
  const credentials = readCredentials(formData, locale);
  if ("error" in credentials) return credentials;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    return { error: translate(locale, "loginFailure") };
  }

  redirect("/boards");
}

export async function signupAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = await getRequestLocale();
  const credentials = readCredentials(formData, locale);
  if ("error" in credentials) return credentials;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(credentials);
  if (error) {
    return { error: translate(locale, "signupFailure") };
  }
  if (!data.session) {
    return { message: translate(locale, "signupSuccess") };
  }

  redirect("/boards");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
