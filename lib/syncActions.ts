import { doc, setDoc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";
import { syncPublicGoals } from "./goalActions";
import { LS_KEYS } from "./dataPersistence";
import { LocalStorageRepository as Local } from "./localActions";
import { readEconomy, syncLocalEconomy } from "./economyActions";
import type { Habit, Goal, Todo } from "../types/appTypes";

/** Import sources and their already-earned balances exactly once, including
 * rewards whose habit/goal has since been deleted. Keep stable IDs on retries. */
export async function syncLocalDataToFirestore(uid: string) {
  if (!uid) return;
  const habits = Local.getList<Habit>(LS_KEYS.HABITS);
  const goals = Local.getList<Goal>(LS_KEYS.GOALS);
  const todos = Local.getList<Todo>(LS_KEYS.TODOS);
  if (!Local.getProfile() && !habits.length && !goals.length && !todos.length) return;
  const localEconomy = syncLocalEconomy();
  const local = Local.getProfile() || {};
  const importId = local.todoImportId || crypto.randomUUID();
  Local.setProfile({ ...local, todoImportId: importId });
  const { economy, todoCategories, todoPoints, todoImportId, fairy, fairyRoom, loginRewardDate,
    specialPointHistory, bonusPoints, earnedTitles, stats, ...publicProfile } = local;
  await runTransaction(db, async tx => {
    const state = await readEconomy(tx, uid);
    const current = state.profile as typeof local;
    const imported: string[] = current.todoImportIds || [];
    if (imported.includes(importId)) return;
    const nextBonus = current.bonusPoints ?? bonusPoints ?? 0;
    const nextTodo = (current.todoPoints || 0) + (todoPoints || 0);
    const credited = { ...localEconomy.credited, ...state.economy.credited,
      bonus: Math.max(state.economy.credited.bonus || 0, nextBonus),
      todo: Math.max(state.economy.credited.todo || 0, nextTodo) };
    const categories = [...(current.todoCategories || []), ...(todoCategories || []).filter((c: { id: string }) => !(current.todoCategories || []).some((e: { id: string }) => e.id === c.id))];
    tx.set(state.ref, {
      ...publicProfile,
      ...(current.stats ? { stats: current.stats } : stats ? { stats } : {}),
      ...(current.fairy ? { fairy: current.fairy } : fairy ? { fairy: { status: 'egg', eggReceivedAt: fairy.eggReceivedAt, appearance: 'basic' } } : {}),
      bonusPoints: nextBonus, todoPoints: nextTodo,
      earnedTitles: current.earnedTitles ?? earnedTitles ?? [],
      specialPointHistory: current.specialPointHistory ?? specialPointHistory ?? [],
      ...(categories.length ? { todoCategories: categories } : {}),
      todoImportIds: [...imported, importId],
      economy: { ...state.economy, version: 1, lifetimePoints: state.economy.lifetimePoints + localEconomy.lifetimePoints,
        gold: state.economy.gold + localEconomy.gold, credited,
        highestLevel: Math.max(state.economy.highestLevel ?? 1, localEconomy.highestLevel ?? 1, Math.floor((state.economy.lifetimePoints + localEconomy.lifetimePoints) / 100) + 1),
        normalCredited: { ...localEconomy.normalCredited, ...state.economy.normalCredited, todo: nextTodo } },
    }, { merge: true });
    for (const [name, list] of [['habits', habits], ['goals', goals], ['todos', todos]] as const) {
      for (const { id, ...data } of list) tx.set(doc(db, 'users', uid, name, id), { ...data, syncedFromLocal: true }, { merge: true });
    }
  });
  await setDoc(doc(db, 'publicUsers', uid), publicProfile, { merge: true });
  await syncPublicGoals(uid);
  for (const key of [LS_KEYS.PROFILE, LS_KEYS.HABITS, LS_KEYS.GOALS, LS_KEYS.TODOS]) localStorage.removeItem(key);
}
