import type { MessageKey } from "@/lib/i18n/messages";

export async function apiErrorMessage(
  response: Response,
  translate: (key: MessageKey) => string,
) {
  try {
    const body = await response.json();
    const code = body?.error?.code as string | undefined;
    if (code === "UNAUTHENTICATED") return translate("loginFailure");
    if (code === "FORBIDDEN") return translate("errorForbidden");
    if (code === "NOT_FOUND") return translate("errorNotFound");
    if (code === "VERSION_CONFLICT") return translate("versionConflict");
    if (code === "COLUMN_NOT_EMPTY") return translate("columnNotEmpty");
    if (code === "VALIDATION_ERROR") return translate("errorValidation");
  } catch {
    return translate("genericError");
  }
  return translate("genericError");
}
