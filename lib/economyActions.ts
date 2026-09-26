import { collection, doc, getDocs, runTransaction, deleteField, type Transaction } from 'firebase/firestore';
import { auth, db } from './firebase';
import { reconcileEconomy, migrateLegacyCoins, withoutLegacyCoins } from './economyModel';
import { LocalStorageRepository as Local } from './localActions';
import { LS_KEYS } from './dataPersistence';
import type { Habit, Goal, UserProfile } from '../types/appTypes';

// Read source documents inside the transaction, before any writes. Existing
// reward histories remain the source of truth and receipts survive cancellation.
export async function readEconomy(tx: Transaction, uid: string) {
  const ref = doc(db, 'users', uid);
  const profile = ((await tx.get(ref)).data() ?? {}) as Partial<UserProfile>;
  const lists = await Promise.all(['habits', 'goals'].map(name => getDocs(collection(db, 'users', uid, name))));
  const snapshots = await Promise.all(lists.map(list => Promise.all(list.docs.map(d => tx.get(d.ref)))));
  const habits = snapshots[0].filter(d => d.exists()).map(d => ({ ...d.data(), id: d.id } as Habit));
  const goals = snapshots[1].filter(d => d.exists()).map(d => ({ ...d.data(), id: d.id } as Goal));
  const economy = migrateLegacyCoins(reconcileEconomy(profile, habits, goals), profile.fairyRoom?.coins);
  const legacyCoinsPresent = profile.fairyRoom?.coins !== undefined;
  const cleanProfile = profile.fairyRoom ? { ...profile, fairyRoom: withoutLegacyCoins(profile.fairyRoom) } : profile;
  return { ref, profile: cleanProfile, habits, goals, economy, legacyCoinsPresent };
}
export function syncLocalEconomy() {
  const profile = Local.getProfile() ?? {};
  const economy = migrateLegacyCoins(reconcileEconomy(profile, Local.getList<Habit>(LS_KEYS.HABITS), Local.getList<Goal>(LS_KEYS.GOALS)), profile.fairyRoom?.coins);
  if (JSON.stringify(profile.economy) !== JSON.stringify(economy) || profile.fairyRoom?.coins !== undefined) Local.setProfile({ ...profile, economy, ...(profile.fairyRoom ? { fairyRoom: withoutLegacyCoins(profile.fairyRoom) } : {}) });
  return economy;
}
export async function syncEconomy(uid: string | null) {
  if (!uid) return syncLocalEconomy();
  if (auth.currentUser?.uid !== uid) throw Error('ログイン状態を確認してください。');
  return runTransaction(db, async tx => {
    const state = await readEconomy(tx, uid);
    if (JSON.stringify(state.profile.economy) !== JSON.stringify(state.economy)) tx.set(state.ref, { economy: state.economy }, { merge: true });
    if ((state.profile.stats?.goalsAchievedCount ?? 0) !== state.goals.filter(g => g.done).length) tx.set(state.ref, { stats: { ...state.profile.stats, goalsAchievedCount: state.goals.filter(g => g.done).length } }, { merge: true });
    if (state.legacyCoinsPresent) tx.update(state.ref, { 'fairyRoom.coins': deleteField() });
    return state.economy;
  });
}
