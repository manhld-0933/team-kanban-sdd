import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
};

export class AuthenticationError extends Error {
  constructor() {
    super("UNAUTHENTICATED");
    this.name = "AuthenticationError";
  }
}

export async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || typeof subject !== "string" || subject.length === 0) {
    throw new AuthenticationError();
  }

  return { supabase, user: { id: subject } satisfies AuthenticatedUser };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const { user } = await getAuthenticatedClient();
  return user;
}
