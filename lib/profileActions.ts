import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { UserProfile } from "@/types/appTypes";
import { syncPublicGoals } from "./goalActions";
import { LocalStorageRepository } from "./localActions";

/**
 * ユーザープロフィールの取得
 */
export const getUserProfile = async (uid: string | null): Promise<UserProfile | null> => {
  if (!uid) {
    // LocalStorageから取得
    return LocalStorageRepository.getProfile();
  }

  try {
    const currentUid = auth.currentUser?.uid;
    const isOwner = uid === currentUid;

    // 1. プロフィール基本情報の取得
    const profileRef = doc(db, isOwner ? "users" : "publicUsers", uid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      return null;
    }

    const profileData = profileSnap.data();

    // 2. 状態（最終ログイン等）の取得
    let statusData: any = {};
    try {
      const statusRef = doc(db, "users", uid, "public", "status");
      const statusSnap = await getDoc(statusRef);
      if (statusSnap.exists()) {
        statusData = statusSnap.data();
      }
    } catch (e) {
      console.warn(`[getUserProfile] Could not read status for ${uid}:`, e);
    }

    return {
      uid: uid,
      name: profileData.name ?? "",
      gender: profileData.gender ?? "",
      dream: profileData.dream ?? profileData.dreams ?? "",
      isPublic: !!profileData.isPublic,
      showDream: !!profileData.showDream || !!profileData.showDreams,
      showGoal: typeof profileData.showGoal === "boolean" ? profileData.showGoal : !!profileData.showGoals,
      earnedTitles: Array.isArray(profileData.earnedTitles) ? profileData.earnedTitles : [],
      dreamAchievedCount: profileData.dreamAchievedCount ?? 0,
      economy: isOwner ? profileData.economy : undefined,
      lastLoginAt: statusData.lastLoginAt ?? profileData.lastLoginAt ?? null,
      showLastLogin: !!profileData.showLastLogin,
      following: profileData.following ?? [],
      recentAction: profileData.recentAction ?? null,
      stats: profileData.stats ?? {},
      bonusPoints: profileData.bonusPoints ?? 0,
      specialPointHistory: profileData.specialPointHistory ?? [],
      fairy: profileData.fairy,
      loginRewardDate: profileData.loginRewardDate,
      todoPoints: profileData.todoPoints ?? 0,
      todoCategories: profileData.todoCategories,
    };
  } catch (e) {
    console.error(`[getUserProfile] Fatal error reading profile for ${uid}:`, e);
  }
  return null;
};

/**
 * ユーザープロフィールの保存
 */
export const saveUserProfile = async (uid: string | null, profile: Partial<UserProfile>) => {
  if (!uid) {
    // LocalStorageへ保存
    const current = LocalStorageRepository.getProfile() || {
      uid: "local",
      name: "",
      gender: "",
      dream: "",
      isPublic: false,
      showDream: false,
      showGoal: false,
      earnedTitles: [],
      stats: {},
    };
    const updated = { ...current, ...profile, ...(current.economy ? { economy: current.economy } : {}) };
    LocalStorageRepository.setProfile(updated);
    return;
  }

  if (auth.currentUser?.uid !== uid) return;

  const { economy: _economy, bonusPoints: _bonus, todoPoints: _todo, specialPointHistory: _history, earnedTitles: _titles, ...editableProfile } = profile;
  const batch = {
    ...editableProfile,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, "users", uid), batch, { merge: true });
    if ("showGoal" in profile || "isPublic" in profile) await syncPublicGoals(uid, batch);
    else await setDoc(doc(db, "publicUsers", uid), batch, { merge: true });
  } catch (e) {
    console.error(`[saveUserProfile] Error saving profile for ${uid}:`, e);
    throw e;
  }
};

/**
 * ログイン状況/アクティブ状況の更新
 */
export const updateLastLogin = async (uid: string | null) => {
  if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) return;

  try {
    const statusRef = doc(db, "users", uid, "public", "status");
    const now = serverTimestamp();
    await setDoc(statusRef, {
      lastLoginAt: now,
      lastActive: now
    }, { merge: true });

    const publicRef = doc(db, "publicUsers", uid);
    await setDoc(publicRef, {
      lastLoginAt: now
    }, { merge: true });
  } catch (e) {
    console.error(`[updateLastLogin] Error:`, e);
  }
};

/**
 * アクティブ状況のみ更新
 */
export const updateLastActive = async (uid: string | null) => {
  if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) return;
  try {
    const statusRef = doc(db, "users", uid, "public", "status");
    await setDoc(statusRef, { lastActive: serverTimestamp() }, { merge: true });
  } catch (e) {
    // サイレントに
  }
};
