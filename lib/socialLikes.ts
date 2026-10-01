import { collection, doc, getDoc, onSnapshot, query, where, setDoc, deleteDoc, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types/appTypes";

type Action = NonNullable<UserProfile["recentAction"]>;
export const activityLikeId = (uid: string, action: Action) => {
    const date = action.date as Timestamp;
    if (!date || typeof date.toMillis !== "function") throw new Error("Activity date is missing");
    return uid + "_" + Math.floor(date.toMillis());
};
export const getActivityLiked = async (uid: string, targetUid: string, action: Action) =>
    (await getDoc(doc(db, "publicUsers", targetUid, "likes", activityLikeId(uid, action)))).exists();

// A deterministic document per sender and achievement makes repeated requests idempotent.
export async function setActivityLiked(uid: string, targetUid: string, action: Action, liked: boolean) {
    const ref = doc(db, "publicUsers", targetUid, "likes", activityLikeId(uid, action));
    if (liked) await setDoc(ref, { fromUid: uid, actionDate: action.date });
    else await deleteDoc(ref);
}
export type SocialCounts = { followers: number | null; following: number | null; likes: number | null };
export function subscribeSocialCounts(uid: string, update: (counts: Partial<SocialCounts>) => void, error: () => void) {
    const stops = [
        onSnapshot(doc(db, "publicUsers", uid), snap => update({ following: (snap.data()?.following ?? []).length }), error),
        onSnapshot(query(collection(db, "publicUsers"), where("following", "array-contains", uid)), snap => update({ followers: snap.size }), error),
        onSnapshot(collection(db, "publicUsers", uid, "likes"), snap => update({ likes: snap.size }), error),
    ];
    return () => stops.forEach(stop => stop());
}
