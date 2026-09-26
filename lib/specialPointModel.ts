import type { SpecialPointEntry, UserProfile } from "@/types/appTypes";
import type { TitleDefinition } from "./titles";

// 旧称号IDを達成済みIDとして引き継ぎ、報酬の重複を防ぐ。
export function specialPointHistory(profile: Partial<UserProfile>, definitions: TitleDefinition[]): SpecialPointEntry[] {
  const entries = [...(profile.specialPointHistory || [])];
  for (const id of profile.earnedTitles || []) {
    const definition = definitions.find(item => item.id === id);
    if (definition && !entries.some(item => item.id === id)) {
      entries.push({ id, date: null, name: definition.name, description: definition.conditionDescription, point: definition.bonusPoints });
    }
  }
  return entries;
}

export function calculateSpecialRewards(profile: Partial<UserProfile>, definitions: TitleDefinition[], stats: Record<string, unknown>, date: string) {
  const history = specialPointHistory(profile, definitions);
  const earned = new Set([...(profile.earnedTitles || []), ...history.map(item => item.id)]);
  const added: SpecialPointEntry[] = [];
  for (const definition of definitions) {
    if (earned.has(definition.id) || !definition.check(stats)) continue;
    earned.add(definition.id);
    added.push({ id: definition.id, date, name: definition.name, description: definition.conditionDescription, point: definition.bonusPoints });
  }
  return {
    added,
    patch: {
      earnedTitles: [...earned],
      specialPointHistory: [...history, ...added],
      bonusPoints: Number(profile.bonusPoints || 0) + added.reduce((sum, item) => sum + item.point, 0),
    },
  };
}
