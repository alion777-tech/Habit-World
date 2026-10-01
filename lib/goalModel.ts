import type { Goal } from "@/types/appTypes";

function createdTime(goal: Goal): number {
  const value = goal.createdAt;
  if (!value) return 0;
  return (typeof value === "object" && "toDate" in value ? value.toDate().getTime() : new Date(value as string).getTime()) || 0;
}
export function orderedGoals(goals: Goal[], secretFirst = false): Goal[] {
  const rank = (g: Goal) => Number.isFinite(g.priorityOrder) ? g.priorityOrder! : Number.MAX_SAFE_INTEGER;
  return [...goals].sort((a, b) => Number(a.done) - Number(b.done)
    || (!a.done ? (Number(!!a.secret) - Number(!!b.secret)) * (secretFirst ? -1 : 1) : 0)
    || (!a.done ? rank(a) - rank(b) : 0)
    || createdTime(b) - createdTime(a) || a.id.localeCompare(b.id));
}
type GoalVisibility = { isPublic?: boolean; showGoal?: boolean; showGoals?: boolean };
export function isPublicGoal(goal: Goal, profile: GoalVisibility) {
  const visible = typeof profile.showGoal === "boolean" ? profile.showGoal : profile.showGoals;
  return profile.isPublic === true && visible === true && !goal.secret;
}
// This is only the profile card preview; eligibility never depends on rank.
export function publicGoalList(goals: Goal[], profile: { isPublic?: boolean; showGoal?: boolean; showGoals?: boolean }) {
  const visible = typeof profile.showGoal === "boolean" ? profile.showGoal : profile.showGoals;
  if (!profile.isPublic || !visible) return [];
  return orderedGoals(goals).filter(g => !g.done && isPublicGoal(g, profile)).slice(0, 3)
    .map(g => ({ id: g.id, title: g.title, deadline: g.deadline || null }));
}
export function moveGoal(goals: Goal[], id: string, index: number): Goal[] {
  const all = orderedGoals(goals).filter(g => !g.done);
  const secret = !!goals.find(g => g.id === id)?.secret;
  const active = all.filter(g => !!g.secret === secret);
  const from = active.findIndex(g => g.id === id);
  if (from < 0) return active;
  const [goal] = active.splice(from, 1);
  active.splice(Math.max(0, Math.min(index, active.length)), 0, goal);
  let next = 0;
  return all.map(g => !!g.secret === secret ? active[next++] : g);
}
