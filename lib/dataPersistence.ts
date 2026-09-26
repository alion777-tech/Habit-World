import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  getDoc,
  DocumentData,
  QuerySnapshot
} from "firebase/firestore";
import { db } from "./firebase";

// ローカルストレージのキー定数
export const LS_KEYS = {
  HABITS: "habits_v2",
  GOALS: "goals_v2",
  TODOS: "todos_v2",
  PROFILE: "profile_v2",
  BUCKET_LIST: "bucket_list_v2",
};

// カスタムイベント名
const LS_CHANGE_EVENT = "local_storage_change";

/**
 * ローカルストレージの更新を通知する
 */
export const notifyLocalStorageChange = () => {
  window.dispatchEvent(new Event(LS_CHANGE_EVENT));
};

/**
 * データを取得・購読するための汎用関数
 * @param collectionName Firestoreのコレクション名（またはLSのキー）
 * @param uid ユーザーID。nullの場合はローカルストレージを使用
 * @param callback データ更新時のコールバック
 */
export function subscribeData<T>(
  collectionName: "habits" | "goals" | "todos",
  uid: string | null,
  callback: (data: T[]) => void
) {
  // --- Firebase Mode ---
  if (uid) {
    const q = query(
      collection(db, "users", uid, collectionName),
      ...(collectionName === "todos" ? [] : [orderBy("createdAt", "desc")])
    );
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as unknown as T[];
      if (collectionName === "todos") {
        const time = (item: unknown) => {
          const value = (item as { createdAt?: Date | string | { toDate: () => Date } }).createdAt;
          return value ? (typeof value === "object" && "toDate" in value ? value.toDate().getTime() : new Date(value as string).getTime()) || 0 : 0;
        };
        list.sort((a, b) => time(b) - time(a));
      }
      callback(list);
    });
  }

  // --- LocalStorage Mode ---
  const loadLocal = () => {
    const key = LS_KEYS[collectionName.toUpperCase() as keyof typeof LS_KEYS];
    const saved = localStorage.getItem(key);
    const data = saved ? JSON.parse(saved) : [];
    
    // idが含まれていない古いデータへの対応や、createdAtのパースが必要な場合がある
    const formatted = data.map((item: any) => ({
      ...item,
      // Date型に復元（FirestoreのTimestampと型を合わせるため）
      createdAt: item.createdAt ? new Date(item.createdAt) : null,
    }));

    // FirestoreのorderBy("desc")をシミュレート
    formatted.sort((a: any, b: any) => {
      const da = a.createdAt?.getTime() || 0;
      const db = b.createdAt?.getTime() || 0;
      return db - da;
    });

    callback(formatted as T[]);
  };

  // 初回読み込み
  loadLocal();

  // 変更検知用のリスナー
  const handleStorageChange = (e: Event) => {
    loadLocal();
  };

  window.addEventListener(LS_CHANGE_EVENT, handleStorageChange);
  window.addEventListener("storage", handleStorageChange); // 他のタブでの変更も検知

  return () => {
    window.removeEventListener(LS_CHANGE_EVENT, handleStorageChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

/**
 * プロフィールの購読
 */
export function subscribeProfile(
  uid: string | null,
  callback: (profile: any) => void
) {
  if (uid) {
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) {
        callback({ uid, ...snap.data() });
      } else {
        callback(null);
      }
    });
    return unsub;
  }

  const loadLocal = () => {
    const saved = localStorage.getItem(LS_KEYS.PROFILE);
    callback(saved ? JSON.parse(saved) : null);
  };

  loadLocal();

  window.addEventListener(LS_CHANGE_EVENT, loadLocal);
  return () => window.removeEventListener(LS_CHANGE_EVENT, loadLocal);
}
