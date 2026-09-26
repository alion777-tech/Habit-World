"use client";
import { useEffect, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { isTestAdminRegistration, validTestDayOffset, type TestLabel } from "@/lib/testAccessModel";

export type TestAccess = { uid: string | null; loading: boolean; label: TestLabel | null; enabled: boolean; dayOffset: number; error: string };
const empty: TestAccess = { uid: null, loading: true, label: null, enabled: false, dayOffset: 0, error: "" };

/** Never grant access from offline cache, an optimistic write, or the previous account. */
export function useTestAccess(): TestAccess {
  const [access, setAccess] = useState<TestAccess>(empty);
  useEffect(() => {
    let generation = 0;
    let sessionGeneration = 0;
    let stopRegistry = () => {};
    let stopSession = () => {};
    const stopAuth = onIdTokenChanged(auth, async user => {
      const version = ++generation;
      sessionGeneration++;
      stopRegistry(); stopSession();
      const uid = user?.uid ?? null;
      setAccess({ ...empty, uid, loading: !!user });
      if (!user) return;
      const current = () => generation === version && auth.currentUser?.uid === uid;
      const deny = () => {
        if (!current()) return;
        sessionGeneration++; stopSession();
        if (current()) setAccess({ ...empty, uid, loading: false, error: "テスト権限を確認できません。接続または登録設定を確認してください。" });
      };
      try {
        const token = await user.getIdTokenResult();
        if (!current()) return;
        if (user.isAnonymous || token.signInProvider !== "google.com") {
          setAccess({ ...empty, uid, loading: false }); return;
        }
        stopRegistry = onSnapshot(doc(db, "testAdmins", uid!), { includeMetadataChanges: true }, snapshot => {
          if (!current()) return;
          const sessionVersion = ++sessionGeneration;
          stopSession();
          const registration = snapshot.data();
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites || !isTestAdminRegistration(registration)) {
            setAccess({ ...empty, uid, loading: snapshot.metadata.fromCache }); return;
          }
          const label = registration.label;
          setAccess({ ...empty, uid, label, loading: true });
          stopSession = onSnapshot(doc(db, "testSessions", uid!), { includeMetadataChanges: true }, session => {
            if (!current() || sessionVersion !== sessionGeneration) return;
            const data = session.data();
            // Keep the last confirmed state while our write is pending; never grant
            // a new mode/offset optimistically or remount the open menu on every click.
            if (session.metadata.hasPendingWrites && !session.metadata.fromCache) return;
            const confirmed = !session.metadata.fromCache && !session.metadata.hasPendingWrites;
            setAccess({ uid, label, loading: !confirmed, error: "", enabled: confirmed && data?.enabled === true,
              dayOffset: confirmed && data?.enabled === true && validTestDayOffset(data.dayOffset) ? data.dayOffset : 0 });
          }, deny);
        }, deny);
      } catch { deny(); }
    });
    return () => { generation++; stopAuth(); stopRegistry(); stopSession(); };
  }, []);
  return access;
}
