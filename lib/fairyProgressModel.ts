import type { UserProfile } from "@/types/appTypes";

export function advanceFairyLogin(profile: Partial<UserProfile>, today: string, yesterday: string) {
  const stats = { ...profile.stats };
  const previous = profile.loginRewardDate ?? ((stats.continuousLoginDays || 0) > 0 ? stats.lastActionDate : undefined);
  if (previous !== today) {
    stats.continuousLoginDays = previous === yesterday ? (stats.continuousLoginDays || 0) + 1 : 1;
    stats.loginDays = (stats.loginDays || 0) + 1;
    stats.maxContinuousLoginDays = Math.max(stats.maxContinuousLoginDays || 0, stats.continuousLoginDays);
    if (stats.lastActionDate !== today) {
      stats.lastActionDate = today;
      stats.goalsAddedToday = 0; stats.todosAddedToday = 0; stats.habitsAddedToday = 0;
    }
  }
  const patch: Partial<UserProfile> = { stats, loginRewardDate: today };
  if (profile.fairy?.status === "egg" && (stats.continuousLoginDays || 0) >= 7) {
    patch.fairy = { ...profile.fairy, status: "naming", bornAt: today };
    const history = [...(profile.specialPointHistory || [])];
    if (!history.some(item => item.id === "fairy-login-7")) {
      history.push({ id: "fairy-login-7", date: today, name: "連続7日ログイン達成", description: "7日間の歩みから妖精が誕生", point: 100 });
      patch.specialPointHistory = history;
      patch.bonusPoints = Number(profile.bonusPoints || 0) + 100;
    }
  }
  return patch;
}
