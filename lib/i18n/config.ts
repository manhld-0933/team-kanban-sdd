export const LOCALE_COOKIE = "team-kanban-locale";
export const supportedLocales = ["vi", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export function resolveLocale(value: string | undefined | null): Locale {
  return value === "en" ? "en" : "vi";
}
