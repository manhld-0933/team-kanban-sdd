import { AuthForm } from "@/components/auth/auth-form";
import { redirectAuthenticatedUser } from "@/lib/auth/redirect-authenticated";

export default async function LoginPage() {
  await redirectAuthenticatedUser();
  return <AuthForm mode="login" />;
}
