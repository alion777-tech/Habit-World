import { readEconomy } from "./economyActions";
import { reconcileEconomy } from "./economyModel";
import { doc, runTransaction } from "firebase/firestore";
import { auth, db } from "./firebase";
import { TITLE_DEFINITIONS } from "./titles";
import { calculateSpecialRewards } from "./specialPointModel";
import { formatDateToJST } from "./habits/dateUtils";

export async function awardSpecialPoints(uid: string, stats: Record<string, unknown>) {
  if (auth.currentUser?.uid !== uid) throw new Error("ログイン状態を確認してください。");
  return runTransaction(db, async transaction => {
    const ref = doc(db, "users", uid);
    const state = await readEconomy(transaction, uid);
    const profile = state.profile;
    const currentStats = {
      ...stats, ...profile.stats, totalPoints: state.economy.lifetimePoints, highestLevel: state.economy.highestLevel ?? 1,
      habitsCreatedCount: Math.max(Number(stats.habitsCreatedCount || 0), Number(profile.stats?.habitsCreatedCount || 0)),
      goalsCreatedCount: Math.max(Number(stats.goalsCreatedCount || 0), Number(profile.stats?.goalsCreatedCount || 0)),
    };
    const result = calculateSpecialRewards(profile, TITLE_DEFINITIONS, currentStats, formatDateToJST(new Date()));
    transaction.set(ref, { ...result.patch, economy: reconcileEconomy({ ...profile, ...result.patch, economy: state.economy }, state.habits, state.goals) }, { merge: true });
    return result;
  });
}
