import {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp,
    limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types/appTypes";

/**
 * ユーザー検索
 * ❌ users を検索しない
 * ✅ publicUsers を直接検索する
 */
export const searchUsers = async (searchTerm: string, currentUid: string): Promise<UserProfile[]> => {
    if (!searchTerm.trim()) return [];

    try {
        console.log(`[searchUsers] Searching in publicUsers for term: ${searchTerm}`);
        const q = query(
            collection(db, "publicUsers"),
            where("isPublic", "==", true),
            limit(50)
        );

        const snap = await getDocs(q);
        const results: UserProfile[] = [];
        const term = searchTerm.toLowerCase();

        snap.forEach(d => {
            const data = d.data();
            const userUid = d.id;

            if (userUid === currentUid) return;

            const name = (data.name || "").toLowerCase();
            const dream = (data.dream || data.dreams || "").toLowerCase();
            const showDream = !!data.showDream || !!data.showDreams;

            if (name.includes(term) || (showDream && dream.includes(term))) {
                results.push({
                    uid: userUid,
                    name: data.name ?? "",
                    gender: data.gender ?? "",
                    dream: data.dream ?? data.dreams ?? "",
                    isPublic: !!data.isPublic,
                    showDream: showDream,
                    showGoal: !!data.showGoal || !!data.showGoals,
                    earnedTitles: data.earnedTitles ?? [],
                    lastLoginAt: data.lastLoginAt ?? null,
                });
            }
        });

        return results;
    } catch (e) {
        console.error("[searchUsers] error:", e);
        return [];
    }
};

/**
 * フレンド申請を送る
 * users/{toUid}/friendRequests/{fromUid} に書き込む
 */
export const sendFriendRequest = async (fromUid: string, toUid: string, fromName: string) => {
    if (!fromUid || !toUid || fromUid === toUid) return;

    try {
        const requestRef = doc(db, "users", toUid, "friendRequests", fromUid);
        console.log(`[sendFriendRequest] Writing to: ${requestRef.path}`);
        await setDoc(requestRef, {
            fromUid,
            toUid, // ルールでチェックされるため明示的に追加
            fromName,
            status: "pending",
            createdAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("[sendFriendRequest] error:", e);
        throw e;
    }
};

/**
 * フレンド申請を承認する
 * ✅ setDoc(doc(db,"users",myUid,"friends",friendUid), {...}) で docId=friendUid固定
 * ❌ 相手の領域への書き込みはルールで禁止されているため削除
 */
export const acceptFriendRequest = async (currentUid: string, requesterUid: string) => {
    if (!currentUid || !requesterUid) return;

    try {
        console.log(`[acceptFriendRequest] Adding ${requesterUid} to users/${currentUid}/friends`);

        // 自分のフレンドリストに相手を追加（docId=相手のUID固定）
        await setDoc(doc(db, "users", currentUid, "friends", requesterUid), {
            uid: requesterUid,
            createdAt: serverTimestamp(),
        });

        // 申請を削除
        await deleteDoc(doc(db, "users", currentUid, "friendRequests", requesterUid));

        console.log("[acceptFriendRequest] Success (One-way friend added by owner)");
    } catch (e) {
        console.error("[acceptFriendRequest] error:", e);
        alert("承認に失敗しました。詳細: " + (e as any).message);
        throw e;
    }
};

/**
 * フレンド申請を拒否する
 */
export const rejectFriendRequest = async (currentUid: string, requesterUid: string) => {
    if (!currentUid || !requesterUid) return;
    try {
        await deleteDoc(doc(db, "users", currentUid, "friendRequests", requesterUid));
    } catch (e) {
        console.error("[rejectFriendRequest] error:", e);
    }
};

/**
 * フレンド解除
 * ✅ 自分のリストからのみ削除（相手側はルールにより削除不可）
 */
export const removeFriend = async (currentUid: string, friendUid: string) => {
    if (!currentUid || !friendUid) return;
    try {
        console.log(`[removeFriend] Removing ${friendUid} from users/${currentUid}/friends`);
        await deleteDoc(doc(db, "users", currentUid, "friends", friendUid));
    } catch (e) {
        console.error("[removeFriend] error:", e);
    }
};
