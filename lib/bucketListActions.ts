import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BucketListData } from "@/types/appTypes";
import { LocalStorageRepository } from "@/lib/localActions";
import { LS_KEYS } from "@/lib/dataPersistence";

export const getBucketList = async (uid: string | null): Promise<BucketListData | null> => {
    if (!uid) {
        return LocalStorageRepository.getItem<BucketListData>(LS_KEYS.BUCKET_LIST);
    }

    try {
        const docRef = doc(db, "users", uid, "bucketList", "main");
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            return snap.data() as BucketListData;
        }
        return null;
    } catch (e) {
        console.error("Error fetching bucket list:", e);
        throw e;
    }
};

export const saveBucketList = async (uid: string | null, data: BucketListData): Promise<void> => {
    if (!uid) {
        LocalStorageRepository.setItem(LS_KEYS.BUCKET_LIST, data);
        return;
    }

    try {
        const docRef = doc(db, "users", uid, "bucketList", "main");
        await setDoc(docRef, data);
    } catch (e) {
        console.error("Error saving bucket list:", e);
        throw e;
    }
};
