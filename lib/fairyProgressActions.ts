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
    const profile = (await tx.get(ref)).data() || {};
    tx.set(ref, change(profile), { merge: true });
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
  await update(uid, p => ({ ...advanceFairyLogin(p, formatDateToJST(now), formatDateToJST(yesterday)), firstLoginAt: p.firstLoginAt || now.toISOString() }));
}
export async function nameFairy(uid: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed || Array.from(trimmed).length > 20) throw new Error("名前を1〜20文字で入力してください。");
  await update(uid, p => {
    if (!p.fairy || p.fairy.status === "egg") throw new Error("妖精はまだ生まれていません。");
    return { fairy: { ...p.fairy, status: "ready", name: trimmed } };
  });
}
