import {
    collection,
    query,
    where,
    getDocs,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    limit,
    serverTimestamp,
    orderBy,
    documentId,
    startAfter,
    type QueryDocumentSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types/appTypes";
import { discoveryProfile, rankSearchUsers } from "@/lib/friendDiscovery";

/**
 * ユーザー検索
 * publicUsers を検索する
 */
export const getDiscoveryUsers = async (): Promise<UserProfile[]> => {
    const users: UserProfile[] = [];
    let cursor: QueryDocumentSnapshot | undefined;
    // Read every page: a fixed first-page limit silently hides matching users.
    while (true) {
        const q = query(collection(db, "publicUsers"), where("isPublic", "==", true),
            orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(200));
        const snap = await getDocs(q);
        users.push(...snap.docs.map(d => discoveryProfile(d.id, d.data())));
        if (snap.size < 200) return users;
        cursor = snap.docs[snap.docs.length - 1];
    }
};

export const getDiscoveryContext = async (uid: string) => {
    const snap = await getDoc(doc(db, "publicUsers", uid));
    return snap.exists() ? discoveryProfile(snap.id, snap.data()) : null;
};

export const searchUsers = async (searchTerm: string, currentUid: string): Promise<UserProfile[]> => {
    if (!searchTerm.trim()) return [];
    return rankSearchUsers(await getDiscoveryUsers(), searchTerm, currentUid);
};

/**
 * フォローする
 * 自分の publicUsers/{currentUid} の following 配列に targetUid を追加
 */
export const followUser = async (currentUid: string, targetUid: string) => {
    if (!currentUid || !targetUid || currentUid === targetUid) return;

    try {
        const myRef = doc(db, "publicUsers", currentUid);
        // 自分の公開プロフィールが存在することを確認（なければ作る）
        const snap = await getDoc(myRef);
        if (!snap.exists()) {
            // プロフィールがまだ公開設定されていない場合でも、フォロー機能を使うために枠だけ作る等は検討が必要だが、
            // 基本は ProfileView で保存されているはず。
            // ここでは updateDoc でエラーにならないように setDoc(merge) を使う手もあるが、
            // arrayUnion を使うため、ドキュメント必須。
            await setDoc(myRef, { following: [targetUid] }, { merge: true });
        } else {
            await updateDoc(myRef, {
                following: arrayUnion(targetUid)
            });
        }
    } catch (e) {
        console.error("[followUser] error:", e);
        throw e;
    }
};

/**
 * フォロー解除
 * 自分の publicUsers/{currentUid} の following 配列から targetUid を削除
 */
export const unfollowUser = async (currentUid: string, targetUid: string) => {
    if (!currentUid || !targetUid) return;

    try {
        const myRef = doc(db, "publicUsers", currentUid);
        await updateDoc(myRef, {
            following: arrayRemove(targetUid)
        });
    } catch (e) {
        console.error("[unfollowUser] error:", e);
        throw e;
    }
};

/**
 * フォロー中のユーザー一覧を取得
 * 自分の publicUsers から following を取得し、それぞれの publicUsers を引く
 */
export const getFollowingUsers = async (currentUid: string): Promise<UserProfile[]> => {
    if (!currentUid) return [];

    try {
        const mySnap = await getDoc(doc(db, "publicUsers", currentUid));
        if (!mySnap.exists()) return [];

        const data = mySnap.data();
        const followingIds: string[] = data.following ?? [];

        if (followingIds.length === 0) return [];

        // IDリストからユーザー情報を取得
        // Firestore の in クエリは10件制限などがあるため、Promise.all で個別に取得するか、
        // クライアントサイドJoinを行う。件数が多くなると分割が必要。
        // 今回は簡易的に Promise.all で取得。
        const promises = followingIds.map(async (uid): Promise<UserProfile | null> => {
            const d = await getDoc(doc(db, "publicUsers", uid));
            if (!d.exists()) return null;
            const u = d.data();
            // users/{uid}/public/status からログイン情報を取るのがベストだが、
            // publicUsers に lastLoginAt を同期させている前提で進める（Plan通り）
            return { ...discoveryProfile(d.id, u), recentAction: u.recentAction?.type === "dream" ? u.recentAction : null };
        });

        const results = await Promise.all(promises);
        return results.filter((r): r is UserProfile => r !== null);

    } catch (e) {
        console.error("[getFollowingUsers] error:", e);
        return [];
    }
};




/**
 * 最近の活動を更新
 * 夢達成などを記録
 */
export const updateRecentAction = async (uid: string, actionText: string, type: "dream" | "goal") => {
    if (!uid || type === "goal") return;
    try {
        await setDoc(doc(db, "publicUsers", uid), {
            recentAction: {
                type,
                text: actionText,
                date: serverTimestamp()
            }
        }, { merge: true });
    } catch (e) {
        console.error("[updateRecentAction] error:", e);
    }
}
