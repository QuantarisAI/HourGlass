import { ChatResponse, Task } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchTasks(): Promise<Task[]> {
  return request<Task[]>("/api/tasks");
}

export function sendChatMessage(message: string, sessionId = "default"): Promise<ChatResponse> {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

export function uploadSkill(file: File): Promise<{ saved_as: string }> {
  const form = new FormData();
  form.append("file", file);
  return fetch(`${API_BASE}/api/skills/upload`, { method: "POST", body: form }).then((res) => {
    if (!res.ok) throw new Error("Skill upload failed");
    return res.json();
  });
}
