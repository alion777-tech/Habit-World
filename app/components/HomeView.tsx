"use client";
import { useOptimisticCompletion } from "@/hooks/useOptimisticCompletion";
import { useState } from "react";
import { useLocale } from "next-intl";
import type { Habit, Todo, Goal } from "@/types/appTypes";
import { orderedHabits, upcomingGoals } from "@/lib/cardOrder";
import { homeTodos, isOverdue, reminderActive } from "@/lib/todoModel";
import { isHabitVisibleOnDate } from "@/lib/habits/visibility";
import { toggleTodo } from "@/lib/todoActions";
import styles from "./TodoView.module.css";

type Props = { uid: string | null; todos: Todo[]; goals?: Goal[]; habits: Habit[]; today: string; habitToday?: string; habitDisabled?: boolean; isDarkMode: boolean; onTodo: () => void; onHabit: () => void; onToggleHabit: (id: string) => Promise<void> };
export default function HomeView({ uid, todos: savedTodos, goals = [], habits, today, habitToday = today, habitDisabled = false, isDarkMode, onTodo, onHabit, onToggleHabit }: Props) {
  const { items: todos, complete } = useOptimisticCompletion(savedTodos, uid);
  const ja = useLocale() === "ja";
  const l = (jp: string, en: string) => ja ? jp : en;
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [overdueExpanded, setOverdueExpanded] = useState(false);
  const highMark = (t: Todo) => t.priority === "high" ? <span role="img" aria-label={l("重要度：高", "High importance")} style={{ marginLeft: "auto", flexShrink: 0, color: "#ef4444", fontSize: 18 }}>●</span> : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<unknown>) => { if (busy) return; setBusy(true); setError(""); try { await action(); } catch (error) { setError(error instanceof Error ? error.message : l("更新できませんでした。再試行してください。", "Update failed. Please retry.")); } finally { setBusy(false); } };
  const tasks = homeTodos(todos, today).sort((a,b) => (a.dueDate || a.startDate || "").localeCompare(b.dueDate || b.startDate || ""));
  const nearGoals = upcomingGoals(goals, today);
  const daily = orderedHabits(habits, habitToday).filter(h => isHabitVisibleOnDate(h, habitToday));
  const reminders = todos.filter(t => reminderActive(t, today));
  const overdue = todos.filter(t => isOverdue(t, today)).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  return <section className={styles.root} data-dark={isDarkMode}>
    {!!nearGoals.length && <section style={{ marginBottom: 24 }}>
      <h2>{l("期限が近い目標（あと1か月以内）", "Goals due within one month")}</h2>
      {nearGoals.map(g => <div key={g.id} className={styles.card}><strong style={{ fontSize: 20, overflowWrap: "anywhere" }}>{g.title}</strong><p className={styles.hint} style={{ margin: "2px 0" }}>{l("期限: ", "Due: ")}{g.deadline}</p></div>)}
    </section>}
    <h2>{l("今日やること", "Your day")}</h2><p>{today}</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {!!overdue.length && <button className={styles.error} onClick={onTodo}>{l("⚠ 期限切れ", "⚠ Overdue")}: {overdue.length} {l("件 — ToDoで確認", "tasks — review in ToDo")}</button>}
    {!!reminders.length && <div className={styles.card} role="status"><h3>🔔 {l("リマインダー", "Reminders")}</h3>{reminders.slice(0,3).map(t => <p key={t.id}>{t.text} · {t.dueDate}<br/>{isOverdue(t,today) ? l("期限を過ぎています", "Past due") : l("もうすぐ期限です。確認・判断を忘れずに。", "Due soon. Remember to review and decide.")}</p>)}<button onClick={onTodo}>{l("ToDoで確認", "Review tasks")} ({reminders.length})</button></div>}
    <h3>{l("今日のHabit", "Today's Habits")} · {daily.filter(h => h.pointHistory.some(p => p.date === habitToday)).length}/{daily.length}</h3>
    {daily.slice(0,5).map(h => {
      const done = h.pointHistory.some(p => p.date === habitToday);
      return <label key={h.id} className={`${styles.card} ${styles.row}`} style={{ flexDirection: "row", background: done ? (isDarkMode ? "#064e3b" : "#d1fae5") : undefined, color: done ? (isDarkMode ? "#6ee7b7" : "#065f46") : undefined }}><input type="checkbox" checked={done} disabled={busy || habitDisabled} onChange={() => void run(() => onToggleHabit(h.id))}/><span style={{ textDecoration: done ? "line-through" : "none" }}>{h.text}</span></label>;
    })}
    {!daily.length && <p className={styles.hint}>{l("今日のHabitはありません。", "No Habits scheduled today.")}</p>}
    <button onClick={onHabit}>{l("Habitを開く", "Open Habits")}{daily.length > 5 && ` (${daily.length})`}</button>
    <h3 style={{ marginTop:24 }}>{l("今日・明日・近日中の重要なToDo", "Today, tomorrow and important upcoming tasks")}</h3>
    <p className={styles.hint}>{l("🔴 赤丸は重要度「高」のしるしです。", "🔴 A red dot indicates high importance.")}</p>
    {tasks.slice(0, tasksExpanded ? undefined : 5).map(t => <div key={t.id} className={`${styles.card} ${styles.row} ${styles.todoCard}`}><label className={styles.check}><input type="checkbox" aria-label={t.text} disabled={busy} checked={t.done} onChange={() => void run(() => complete(t.id, !t.done, () => toggleTodo(uid,t.id,t.done)))}/></label><div><span>{t.text}</span><p className={styles.hint}>{t.startDate && `${l("開始: ", "Start: ")}${t.startDate} · `}{t.dueDate && `${l("期限: ", "Due: ")}${t.dueDate}`}{t.recurrence && " · ↻"}</p></div>{highMark(t)}</div>)}
    {tasks.length > 5 && <button type="button" aria-expanded={tasksExpanded} onClick={() => setTasksExpanded(v => !v)}>{tasksExpanded ? l("閉じる（5件表示）", "Show only 5") : l(`残り${tasks.length - 5}件を表示 ▼`, `Show ${tasks.length - 5} more ▼`)}</button>}
    {!tasks.length && <p className={styles.hint}>{l("今日・明日・近日中の重要な予定はありません。", "No tasks for today, tomorrow or important upcoming dates.")}</p>}
    <h3 style={{ marginTop: 24 }}>{l("期限切れのToDo", "Overdue tasks")} · {overdue.length}</h3>
    {overdue.slice(0, overdueExpanded ? undefined : 5).map(t => <div key={t.id} className={`${styles.card} ${styles.row} ${styles.todoCard}`} data-overdue>
      <label className={styles.check}><input type="checkbox" aria-label={t.text} disabled={busy} checked={t.done} onChange={() => void run(() => complete(t.id, !t.done, () => toggleTodo(uid, t.id, t.done)))}/></label>
      <div><span>{t.text}</span><p className={styles.hint}>{l("期限: ", "Due: ")}{t.dueDate}{t.recurrence && " · ↻"}</p></div>
      {highMark(t)}
    </div>)}
    {overdue.length > 5 && <button type="button" aria-expanded={overdueExpanded} onClick={() => setOverdueExpanded(v => !v)}>{overdueExpanded ? l("閉じる（5件表示）", "Show only 5") : l(`残り${overdue.length - 5}件を表示 ▼`, `Show ${overdue.length - 5} more ▼`)}</button>}
    {!overdue.length && <p className={styles.hint}>{l("期限切れのToDoはありません。", "No overdue tasks.")}</p>}
  </section>;
}
