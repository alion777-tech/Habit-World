import type { Habit } from "@/types/appTypes";
import { getJSTDayOfWeek } from "./dateUtils";

export const isHabitVisibleOnDate = (h: Habit, dateStr: string) => {
  if (h.type === "daily") return true;

  // Split "YYYY-MM-DD" to avoid UTC/Local parsing ambiguity
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d); // Midnight local time
  const dow = getJSTDayOfWeek(dateObj); // Correctly get JST weekday for that local day

  return Array.isArray(h.daysOfWeek) && h.daysOfWeek.includes(dow);
};
