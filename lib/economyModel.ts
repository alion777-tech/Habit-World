// Gold is the only spendable currency; the migration receipt is not a balance.
export type Economy = { version: 1; lifetimePoints: number; gold: number; credited: Record<string, number>; legacyCoinMigration?: { amount: number } };
type HabitSource = { id: string; point?: number | null; pointHistory?: { date: string; point: number }[] };
type GoalSource = { id: string; done?: boolean };
type ProfileSource = { economy?: Economy; bonusPoints?: number; todoPoints?: number };
const amount = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n > 0 ? n : 0;
export function reconcileEconomy(profile: ProfileSource, habits: HabitSource[], goals: GoalSource[]): Economy {
  const sources: Record<string, number> = { bonus: amount(profile.bonusPoints), todo: amount(profile.todoPoints) };
  for (const h of habits) {
    let history = 0;
    for (const entry of h.pointHistory ?? []) {
      const key = `habit:${h.id}:${entry.date}`;
      sources[key] = Math.max(sources[key] ?? 0, amount(entry.point));
      history += amount(entry.point);
    }
    sources[`habit:${h.id}:legacy`] = Math.max(0, amount(h.point) - history);
  }
  for (const g of goals) sources[`goal:${g.id}`] = g.done ? 100 : 0;
  const previous = profile.economy;
  if (!previous) {
    // Preserve the currently displayed legacy total; never reprice old rewards.
    const total = habits.reduce((n, h) => n + amount(h.point), 0)
      + goals.filter(g => g.done).length * 100 + sources.bonus + sources.todo;
    return { version: 1, lifetimePoints: total, gold: total, credited: sources };
  }
  const credited = { ...previous.credited };
  let earned = 0;
  for (const [key, value] of Object.entries(sources)) {
    earned += Math.max(0, value - (credited[key] ?? 0));
    credited[key] = Math.max(credited[key] ?? 0, value);
  }
  return { ...previous, version: 1, lifetimePoints: previous.lifetimePoints + earned, gold: previous.gold + earned, credited };
}

// Gold-only income (e.g. future sale rewards) never changes achievement progress.
export function changeGold(economy: Economy, delta: number): Economy {
  const gold = economy.gold + delta;
  if (!Number.isSafeInteger(delta) || !Number.isSafeInteger(gold) || gold < 0) throw Error('ゴールドが不足しているか、金額が不正です。');
  return { ...economy, gold };
}

export function migrateLegacyCoins(economy: Economy, coins: unknown): Economy {
  if (economy.legacyCoinMigration || coins === undefined) return economy;
  if (typeof coins !== 'number' || !Number.isSafeInteger(coins) || coins < 0) throw Error('旧残高を確認できません。移行を中止しました。');
  return { ...changeGold(economy, coins), legacyCoinMigration: { amount: coins } };
}

export function withoutLegacyCoins<T extends { coins?: number }>(room: T): Omit<T, 'coins'> {
  const { coins: _legacy, ...rest } = room;
  return rest;
}

// Standalone previews store their wallet in the room itself. Removing the old
// field in the same localStorage write makes subsequent reads idempotent.
export function migratePreviewGold<T extends { coins?: number; gold?: number }>(room: T) {
  const wallet = migrateLegacyCoins({ version: 1, lifetimePoints: 0, gold: room.gold ?? 0, credited: {} }, room.coins);
  return { ...withoutLegacyCoins(room), gold: wallet.gold };
}
