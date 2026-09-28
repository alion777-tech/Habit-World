import type { Habit, Goal } from '@/types/appTypes';
export function orderedHabits(habits: Habit[], date?: string): Habit[] {
  const rank = (h: Habit) => Number.isFinite(h.priorityOrder) ? h.priorityOrder! : Number.MAX_SAFE_INTEGER;
  return [...habits].sort((a,b) => (date ? Number(a.pointHistory.some(p => p.date === date)) - Number(b.pointHistory.some(p => p.date === date)) : 0) || rank(a) - rank(b));
}
// Preserve the slots occupied by habits hidden on this weekday or in another completion group.
export function moveVisibleHabit(habits: Habit[], visibleIds: string[], id: string, target: string): Habit[] {
  const ordered = orderedHabits(habits);
  const visible = ordered.filter(h => visibleIds.includes(h.id));
  const from = visible.findIndex(h => h.id === id), to = visible.findIndex(h => h.id === target);
  if (from < 0 || to < 0 || from === to) return ordered;
  const [item] = visible.splice(from,1); visible.splice(to,0,item);
  let i=0;
  return ordered.map(h => visibleIds.includes(h.id) ? visible[i++] : h);
}
export function upcomingGoals(goals: Goal[], today: string): Goal[] {
  const [year,month,day] = today.split('-').map(Number);
  const last = new Date(Date.UTC(year, month+1, 0)).getUTCDate();
  const until = new Date(Date.UTC(year,month,Math.min(day,last))).toISOString().slice(0,10);
  return goals.filter(g => !g.done && !!g.deadline && g.deadline >= today && g.deadline <= until)
    .sort((a,b) => a.deadline!.localeCompare(b.deadline!));
}
