import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function redirectAuthenticatedUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/boards");
}
