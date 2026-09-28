export type BoardSummary = {
  id: string;
  name: string;
  createdAt: string;
  role: "owner" | "member";
};

export type CardRecord = {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  assignee_user_id: string | null;
  position: number;
  version: number;
  created_at: string;
  updated_at: string;
};

export type ColumnRecord = {
  id: string;
  board_id: string;
  name: string;
  position: number;
  cards: CardRecord[];
};

export type BoardDetail = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  role: "owner" | "member";
  columns: ColumnRecord[];
};
