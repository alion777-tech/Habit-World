import { readEconomy } from "./economyActions";
import { reconcileEconomy } from "./economyModel";
import { doc, runTransaction } from "firebase/firestore";
import { auth, db } from "./firebase";
import { LocalStorageRepository } from "./localActions";
import { formatDateToJST } from "./habits/dateUtils";
import { advanceFairyLogin } from "./fairyProgressModel";
import type { UserProfile } from "@/types/appTypes";

async function update(uid: string, change: (profile: Partial<UserProfile>) => Partial<UserProfile>) {
  if (auth.currentUser?.uid !== uid || auth.currentUser.isAnonymous) throw new Error("Googleアカウントでログインしてください。");
  await runTransaction(db, async tx => {
    const ref = doc(db, "users", uid);
    const state = await readEconomy(tx, uid);
    const patch = change(state.profile);
    tx.set(ref, { ...patch, economy: reconcileEconomy({ ...state.profile, ...patch, economy: state.economy }, state.habits, state.goals) }, { merge: true });
  });
}
export async function receiveFairyEgg(uid: string | null) {
  const change = (p: Partial<UserProfile>): Partial<UserProfile> => p.fairy ? {} : { fairy: { status: "egg", eggReceivedAt: formatDateToJST(new Date()), appearance: "basic" } };
  if (uid && !auth.currentUser?.isAnonymous) return update(uid, change);
  const local = LocalStorageRepository.getProfile() || {};
  LocalStorageRepository.setProfile({ ...local, ...change(local) });
}
export async function recordFairyLogin(uid: string) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  await update(uid, p => {
    // オープニングの閲覧状態に関係なく、実ログインと同じ取引で卵を用意する。
    const fairy = p.fairy ?? { status: "egg" as const, eggReceivedAt: formatDateToJST(now), appearance: "basic" };
    return { fairy, ...advanceFairyLogin({ ...p, fairy }, formatDateToJST(now), formatDateToJST(yesterday)), firstLoginAt: p.firstLoginAt || now.toISOString() };
  });
}
export async function nameFairy(uid: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed || Array.from(trimmed).length > 20) throw new Error("名前を1〜20文字で入力してください。");
  await update(uid, p => {
    if (!p.fairy || p.fairy.status === "egg") throw new Error("妖精はまだ生まれていません。");
    return { fairy: { ...p.fairy, status: "ready", name: trimmed } };
  });
}
