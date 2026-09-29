import { AuthForm } from "@/components/auth/auth-form";
import { redirectAuthenticatedUser } from "@/lib/auth/redirect-authenticated";

export default async function SignupPage() {
  await redirectAuthenticatedUser();
  return <AuthForm mode="signup" />;
}
