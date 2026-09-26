import { calcToggleHabit, HABIT_STREAK_BONUS_POINTS } from './calcToggleHabit';
import type { Habit, UserProfile } from '@/types/appTypes';
import type { Economy } from '../economyModel';
export function habitCompletionPlan(profile: Partial<UserProfile>, economy: Economy, habit: Habit, date: string, done: boolean, today: string, yesterday: string) {
  if ((habit.pointHistory ?? []).some(entry => entry.date === date) === done) return null;
  const history = [...(profile.specialPointHistory ?? [])];
  const earned = new Set(profile.stats?.earnedHabitStreakBonuses ?? []);
  for (const entry of history) if (entry.id.startsWith('habit-streak:')) earned.add(Number(entry.id.slice(13)));
  // Archive old embedded bonuses without paying them again, including deleted histories.
  for (const [key, point] of Object.entries(economy.credited)) {
    if (!key.startsWith('habit-special:') || point <= 0) continue;
    const streak = Object.entries(HABIT_STREAK_BONUS_POINTS).find(([, value]) => value === point)?.[0];
    if (streak) earned.add(Number(streak));
    const id = 'legacy-' + key;
    if (!history.some(entry => entry.id === id)) history.push({ id, date: key.slice(-10), name: '習慣の連続達成報酬（引継ぎ）', description: '旧履歴から引継ぎ済み・再加算なし', point });
  }
  const normalHistory = (habit.pointHistory ?? []).map(entry => ({ ...entry, point: Math.min(1, entry.point) }));
  const normalized = { ...habit, pointHistory: normalHistory, point: normalHistory.reduce((sum, entry) => sum + entry.point, 0) };
  const result = calcToggleHabit(normalized, date, today, yesterday, [...earned], true);
  const bonus = result.earnedHabitStreakBonus;
  if (bonus) {
    earned.add(bonus.streak);
    history.push({ id: 'habit-streak:' + bonus.streak, date, name: '連続' + bonus.streak + '日達成', description: '習慣の初回連続達成報酬', point: bonus.point });
  }
  const patch: Partial<UserProfile> = { bonusPoints: (profile.bonusPoints ?? 0) + (bonus?.point ?? 0),
    specialPointHistory: history, stats: { ...profile.stats, earnedHabitStreakBonuses: [...earned] } };
  return { result, patch };
}
