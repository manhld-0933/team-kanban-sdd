export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

export function parseRequiredString(
  value: unknown,
  label: string,
  maxLength = 200,
): ValidationResult<string> {
  if (typeof value !== "string") {
    return { success: false, message: `${label} phải là văn bản.` };
  }

  const trimmed = value.trim();
  if (!trimmed) return { success: false, message: `${label} không được để trống.` };
  if (trimmed.length > maxLength) {
    return { success: false, message: `${label} không được vượt quá ${maxLength} ký tự.` };
  }

  return { success: true, data: trimmed };
}

export function parseOptionalString(
  value: unknown,
  label: string,
  maxLength = 5000,
): ValidationResult<string | null> {
  if (value === null || value === undefined || value === "") {
    return { success: true, data: null };
  }
  if (typeof value !== "string") {
    return { success: false, message: `${label} phải là văn bản.` };
  }
  if (value.length > maxLength) {
    return { success: false, message: `${label} không được vượt quá ${maxLength} ký tự.` };
  }
  return { success: true, data: value };
}

export function parseEmail(value: unknown): ValidationResult<string> {
  if (typeof value !== "string") {
    return { success: false, message: "Email không hợp lệ." };
  }
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "Email không hợp lệ." };
  }
  return { success: true, data: email };
}
