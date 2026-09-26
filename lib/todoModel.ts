import type { Todo, TodoRecurrence, TodoCategory } from "@/types/appTypes";

export const DEFAULT_CATEGORIES: TodoCategory[] = [
  { id: "shopping", name: "買い物", shopping: true }, { id: "work", name: "仕事" },
  { id: "home", name: "家" }, { id: "paperwork", name: "手続き" }, { id: "other", name: "その他" },
];
export const addDays = (date: string, days: number) => {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export const weekEnd = (date: string) => addDays(date, (7 - new Date(date + "T00:00:00Z").getUTCDay()) % 7);
export function nextOccurrence(date: string, rule: TodoRecurrence): string {
  if (!Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > 365) throw new Error("Invalid recurrence interval");
  if (!['day', 'week', 'month'].includes(rule.unit)) throw new Error("Invalid recurrence unit");
  if (rule.weekday != null && (!Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6)) throw new Error("Invalid weekday");
  if (rule.monthDay != null && rule.monthDay !== "last" && (!Number.isInteger(rule.monthDay) || rule.monthDay < 1 || rule.monthDay > 31)) throw new Error("Invalid month day");
  const interval = rule.interval;
  if (rule.unit === "day") return addDays(date, interval);
  const d = new Date(date + "T00:00:00Z");
  if (rule.unit === "week") {
    const shift = ((rule.weekday ?? d.getUTCDay()) - d.getUTCDay() + 7) % 7;
    return addDays(date, shift || 7 * interval);
  }
  const monthDate = (offset: number) => {
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset + 1, 0));
    last.setUTCDate(rule.monthDay === "last" ? last.getUTCDate() : Math.min(Number(rule.monthDay || d.getUTCDate()), last.getUTCDate()));
    return last.toISOString().slice(0, 10);
  };
  const current = monthDate(0);
  return current > date ? current : monthDate(interval);
}
export const isOverdue = (todo: Todo, today: string) => !todo.done && !!todo.dueDate && todo.dueDate < today;
export const isToday = (todo: Todo, today: string) => !todo.done && (todo.dueDate === today || todo.startDate === today);
export const reminderActive = (todo: Todo, today: string) => !todo.done && !!todo.dueDate && todo.reminderDays != null && addDays(todo.dueDate, -todo.reminderDays) <= today;
export const homeTodos = (todos: Todo[], today: string) => todos.filter(t => isToday(t, today) || (!t.done && t.priority === "high" && !!t.dueDate && t.dueDate > today && t.dueDate <= addDays(today, 7)));
export function completionChanges(todo: Todo, today: string, now: string) {
  const reward = todo.done ? -(todo.completionPoints ?? (todo.rewarded ? 5 : 0)) : 1;
  const fields = { done: !todo.done, completedAt: todo.done ? null : now, rewarded: todo.rewarded || !todo.done, completionPoints: todo.done ? 0 : 1 };
  let next: Omit<Todo, "id"> | null = null;
  if (!todo.done && todo.recurrence && !todo.nextTodoId) {
    const anchor = todo.dueDate || todo.startDate || today;
    let date = nextOccurrence(anchor, todo.recurrence);
    // Missed occurrences remain as one overdue task; skip backlog when completing.
    while (date <= today) date = nextOccurrence(date, todo.recurrence);
    const offset = Math.round((Date.parse(date) - Date.parse(anchor)) / 86400000);
    next = { text: todo.text, done: false, memo: todo.memo || "", priority: todo.priority || "medium",
      pinned: !!todo.pinned, categoryId: todo.categoryId || null, reminderDays: todo.reminderDays ?? null,
      recurrence: todo.recurrence, startDate: todo.startDate ? addDays(todo.startDate, offset) : null,
      dueDate: todo.dueDate ? date : null, createdAt: now, completedAt: null,
      subtasks: (todo.subtasks || []).map(s => ({ ...s, done: false })), rewarded: false };
  }
  return { fields, reward, next };
}
