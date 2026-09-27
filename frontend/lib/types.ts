export type TaskStatus = "active" | "completed";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string; // ISO-8601
  status: TaskStatus;
  reminder_offsets_minutes: string; // comma-separated minutes-before-deadline
  created_at: string;
  updated_at: string;
}

export interface ChatResponse {
  reply: string;
  session_id: string;
}
