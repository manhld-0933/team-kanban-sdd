import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
};

export async function requireUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || typeof subject !== "string" || subject.length === 0) {
    throw new Error("UNAUTHENTICATED");
  }

  return { id: subject };
}
