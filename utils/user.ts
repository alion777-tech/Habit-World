// utils/user.ts
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function ensureUserDocument(
  uid: string,
  data: { displayName: string | null; email: string | null }
) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      userId: uid,
      displayName: data.displayName ?? "",
      email: data.email ?? "",
      points: 0,
      level: 1,
      createdAt: serverTimestamp(),
    });
  }
}
