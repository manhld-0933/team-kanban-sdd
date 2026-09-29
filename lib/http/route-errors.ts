import { AuthenticationError } from "@/lib/auth/require-user";
import { apiError, type ApiErrorCode } from "@/lib/http/api-response";

type DatabaseError = {
  code?: string;
  message?: string;
};

export function routeError(error: unknown) {
  if (error instanceof AuthenticationError) {
    return apiError("UNAUTHENTICATED", "Authentication is required.", 401);
  }

  const databaseError = error as DatabaseError;
  const message = databaseError?.message ?? "";
  const errorCode = message.includes("VERSION_CONFLICT")
    ? "VERSION_CONFLICT"
    : message.includes("COLUMN_NOT_EMPTY")
      ? "COLUMN_NOT_EMPTY"
      : message.includes("NOT_FOUND")
        ? "NOT_FOUND"
        : message.includes("MEMBER_ASSIGNED")
          ? "MEMBER_ASSIGNED"
          : message.includes("MEMBER_ADD_FAILED")
            ? "MEMBER_ADD_FAILED"
            : message.includes("INVALID_")
          ? "VALIDATION_ERROR"
          : null;

  if (errorCode === "VERSION_CONFLICT") {
    return apiError(errorCode, "The card changed since it was loaded.", 409);
  }
  if (errorCode === "COLUMN_NOT_EMPTY") {
    return apiError(errorCode, "Move the cards before deleting this column.", 409);
  }
  if (errorCode === "MEMBER_ASSIGNED") {
    return apiError("MEMBER_ASSIGNED", "Unassign this member from their cards before removing them.", 409);
  }
  if (errorCode === "MEMBER_ADD_FAILED") {
    return apiError("MEMBER_ADD_FAILED", "Could not add this account to the board.", 422);
  }
  if (errorCode === "NOT_FOUND" || databaseError?.code === "P0002") {
    return apiError("NOT_FOUND", "The requested resource was not found.", 404);
  }
  if (databaseError?.code === "42501") {
    return apiError("FORBIDDEN", "You do not have permission to perform this action.", 403);
  }
  if (databaseError?.code === "23503") {
    return apiError("VALIDATION_ERROR", "A referenced user or resource is no longer available.", 422);
  }
  if (errorCode === "VALIDATION_ERROR" || databaseError?.code === "22023") {
    return apiError("VALIDATION_ERROR", "The request contains invalid data.", 422);
  }

  return apiError("INTERNAL_ERROR", "An unexpected error occurred.", 500);
}

export function errorCodeOf(error: unknown): ApiErrorCode | null {
  const message = (error as DatabaseError)?.message ?? "";
  if (message.includes("VERSION_CONFLICT")) return "VERSION_CONFLICT";
  if (message.includes("COLUMN_NOT_EMPTY")) return "COLUMN_NOT_EMPTY";
  return null;
}
