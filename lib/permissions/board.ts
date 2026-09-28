export type BoardRole = "owner" | "member";

export function canReadBoard(role: BoardRole | null | undefined): boolean {
  return role === "owner" || role === "member";
}

export function canManageBoard(role: BoardRole | null | undefined): boolean {
  return role === "owner";
}

export function canManageCards(role: BoardRole | null | undefined): boolean {
  return canReadBoard(role);
}
