import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const messages = getMessages(resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value));
  return { title: messages.appTitle, description: messages.appDescription };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
