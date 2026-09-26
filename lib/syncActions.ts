import { collection, addDoc, doc, setDoc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";
import { syncPublicGoals } from "./goalActions";
import { LS_KEYS } from "./dataPersistence";
import { LocalStorageRepository } from "./localActions";

/**
 * LocalStorageのデータをFirestoreへ同期する
 */
export async function syncLocalDataToFirestore(uid: string) {
  if (!uid) return;

  console.log("[Sync] Starting sync for user:", uid);

  // 1. プロフィールの同期
  const localProfile = LocalStorageRepository.getProfile();
  if (localProfile) {
    console.log("[Sync] Syncing profile...");
    // 既存のプロフィールを上書きせずマージ
    // Merge task rewards once even when an interrupted import is retried.
    const importId = localProfile.todoImportId || crypto.randomUUID();
    LocalStorageRepository.setProfile({ ...localProfile, todoImportId: importId });
    const { todoCategories, todoPoints, todoImportId, fairy, loginRewardDate, specialPointHistory, bonusPoints, earnedTitles, ...publicProfile } = localProfile;
    void todoImportId;
    const userRef = doc(db, "users", uid);
    await runTransaction(db, async tx => {
      const current = (await tx.get(userRef)).data() || {};
      const imported = current.todoImportIds || [];
      const existingCategories = current.todoCategories || [];
      const categories = [...existingCategories, ...(todoCategories || []).filter((c: { id: string }) => !existingCategories.some((e: { id: string }) => e.id === c.id))];
      tx.set(userRef, {
        ...publicProfile,
        // 端末の卵や古いプロフィールで、アカウントの孵化・報酬を巻き戻さない。
        ...(current.fairy ? { fairy: current.fairy } : fairy ? { fairy: { status: "egg", eggReceivedAt: fairy.eggReceivedAt, appearance: "basic" } } : {}),
        ...(current.loginRewardDate ? { loginRewardDate: current.loginRewardDate } : {}),
        ...(current.stats ? { stats: current.stats } : {}),
        bonusPoints: current.bonusPoints ?? bonusPoints ?? 0,
        earnedTitles: current.earnedTitles ?? earnedTitles ?? [],
        specialPointHistory: current.specialPointHistory ?? specialPointHistory ?? [],
        ...(categories.length ? { todoCategories: categories } : {}),
        todoPoints: (current.todoPoints || 0) + (imported.includes(importId) ? 0 : (todoPoints || 0)),
        todoImportIds: imported.includes(importId) ? imported : [...imported, importId],
      }, { merge: true });
    });
    void todoCategories; void todoPoints;
    await setDoc(doc(db, "publicUsers", uid), publicProfile, { merge: true });
    localStorage.removeItem(LS_KEYS.PROFILE);
  }

  // 2. データの同期 (Habits, Goals, Todos)
  const collections = [
    { key: LS_KEYS.HABITS, name: "habits" },
    { key: LS_KEYS.GOALS, name: "goals" },
    { key: LS_KEYS.TODOS, name: "todos" },
  ];

  for (const col of collections) {
    const list = LocalStorageRepository.getList<any>(col.key);
    if (list.length > 0) {
      console.log(`[Sync] Syncing ${col.name} (${list.length} items)...`);
      for (const item of list) {
        // IDを新しく生成し直す（FirestoreのIDを使用）
        const { id, ...data } = item;
        // createdAtがDate型ならFirestoreの形式に合わせる必要はないが、一応検証
        if (col.name === "todos") {
          // Preserve recurrence references and make retried imports idempotent.
          await setDoc(doc(db, "users", uid, col.name, id), { ...data, syncedFromLocal: true }, { merge: true });
        } else {
          await addDoc(collection(db, "users", uid, col.name), { ...data, syncedFromLocal: true });
        }
      }
      // 同期完了後にローカルデータを削除
      localStorage.removeItem(col.key);
    }
  }

  await syncPublicGoals(uid);
  console.log("[Sync] Sync completed.");
}
