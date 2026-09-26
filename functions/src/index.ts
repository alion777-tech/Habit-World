import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";

admin.initializeApp();

const db = admin.firestore();

export const onHabitCompleted = functions.firestore
  .document(
    "users/{uid}/dreams/{dreamId}/goals/{goalId}/habits/{habitId}"
  )
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { uid } = context.params;

    if (!before || !after) return null;

    if (!before.completedToday && after.completedToday) {
      const userRef = db.doc(`users/${uid}`);

      await userRef.update({
        points: FieldValue.increment(10),
      });

      console.log(`✅ ${uid} に 10 ポイント付与`);
    }

    return null;
  });
