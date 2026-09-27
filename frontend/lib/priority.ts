export type UrgencyBand = "overdue" | "urgent" | "warn" | "calm";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function urgencyBand(msRemaining: number): UrgencyBand {
  if (msRemaining <= 0) return "overdue";
  if (msRemaining < DAY) return "urgent";
  if (msRemaining < 7 * DAY) return "warn";
  return "calm";
}

export const urgencyStyles: Record<UrgencyBand, string> = {
  overdue: "border-red-700 bg-red-950/40 text-red-200",
  urgent: "border-red-500 bg-red-950/20 text-red-100 animate-pulse-urgent",
  warn: "border-amber-500 bg-amber-950/20 text-amber-100",
  calm: "border-blue-600 bg-blue-950/10 text-blue-100",
};
