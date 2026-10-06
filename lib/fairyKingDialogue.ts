import dialogue from "@/data/fairy-king-dialogue.json";

export type FairyKingWord = { id: string; word: string; explanation: string; action: string };
export type FairyKingResponse = { id: string; reply: string; action: string };
export type FairyKingAdvice = { id: string; label: string; choice: string; responses: FairyKingResponse[] };

export const fairyKingDialogue: {
  greetings: string[];
  consultationPrompt: string;
  fairyKingWords: FairyKingWord[];
  fairyKingAdvice: FairyKingAdvice[];
} = dialogue;

export const fairyKingGreetings = dialogue.greetings.map((text, index) => ({ id: String(index), text }));

// Exclude the last entry in each pool; other topics never reset its history.
export function pickFairyKingEntry<T extends { id: string }>(
  entries: readonly T[], previousId?: string, random: () => number = Math.random,
): T {
  if (!entries.length) throw new Error("精霊王の会話データがありません。");
  const candidates = entries.length > 1 ? entries.filter(entry => entry.id !== previousId) : entries;
  const index = Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)));
  return candidates[index];
}
