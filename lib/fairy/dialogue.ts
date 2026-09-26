import japanese from "../../data/fairy/ja.json";
import english from "../../data/fairy/en.json";

export type Category = keyof typeof japanese;
export type DialogueContext = {
  hour: number;
  login?: Category;
  total?: number;
  completed?: number;
  streak?: number;
  action?: string;
  idleMs?: number;
  sessionMs?: number;
  event?: Category;
};
export type HistoryEntry = { text: string; at: number };
export const timeCategory = (hour: number): Category => hour < 5 ? "lateNight" : hour < 9 ? "morning" : hour < 12 ? "forenoon" : hour < 14 ? "noon" : hour < 17 ? "afternoon" : hour < 19 ? "evening" : hour < 23 ? "night" : "lateNight";

export function categories(c: DialogueContext): Category[] {
  if (c.event) return [c.event];
  if (c.login) return [c.login];
  const result: Category[] = ["normal", timeCategory(c.hour)];
  if ((c.idleMs ?? 0) >= 120000) result.push("idle");
  if ((c.sessionMs ?? 0) >= 3600000) result.push("longSession");
  if (c.action === "peek") result.push("peek");
  else if (c.action === "rest") result.push("rest");
  else if (c.action === "walk") result.push("playing");
  else if (c.action === "enter") result.push("nearby");
  if (c.total !== undefined && c.total > 0 && c.completed !== undefined) {
    const done = c.completed;
    result.push(done >= c.total ? "allDone" : done === 0 ? "notStarted" : done / c.total >= .8 ? "almostDone" : done / c.total >= .5 ? "goodProgress" : done === 1 ? "oneDone" : "multipleDone");
  }
  if ((c.streak ?? 0) >= 2) result.push("streak");
  return result;
}

/** Bounded text history also avoids duplicates shared by different categories. */
export function selectDialogue(c: DialogueContext, history: HistoryEntry[], now: number, locale = "ja", rng = Math.random) {
  const bank: Partial<Record<Category, string[]>> = locale.startsWith("ja") ? japanese : english;
  const keys = categories(c);
  const key = keys[Math.min(keys.length - 1, Math.floor(rng() * keys.length))];
  const candidates = [...new Set((bank[key]?.length ? bank[key] : bank.normal) ?? japanese.normal)];
  const last = history[history.length - 1]?.text;
  const recent = new Set(history.filter(h => now - h.at < 86400000).map(h => h.text));
  let pool = candidates.filter(t => t !== last && !recent.has(t));
  if (!pool.length) pool = candidates.filter(t => t !== last && !history.some(h => h.text === t && now - h.at < 60000));
  // Stay silent instead of repeating a tiny exhausted category in a short burst.
  if (!pool.length) return null;
  const text = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
  return { text, category: key, history: [...history, { text, at: now }].slice(-80) };
}

export function loginCategory(previous: number | undefined, now: number, consecutive: number): Category {
  if (!previous) return "firstLogin";
  const day = (ms: number) => Math.floor((ms + 9 * 3600000) / 86400000);
  const gap = day(now) - day(previous);
  return gap >= 30 ? "longAbsence" : gap >= 7 ? "returnLogin" : gap > 0 ? consecutive >= 2 ? "consecutiveLogin" : "dailyLogin" : "shortReturn";
}

export function bubblePosition(x: number, y: number, spriteHeight: number, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  return {
    left: Math.max(8, Math.min(x, viewportWidth - width - 8)),
    top: Math.max(8, Math.min(y >= height + 16 ? y - height - 12 : y + spriteHeight + 12, viewportHeight - height - 8)),
  };
}
