// Only runs against a locally configured emulator, never a real Firebase project.
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc } = require('firebase/firestore');
const projectId = 'demo-habit-world-tests';
if (!process.env.FIRESTORE_EMULATOR_HOST || !/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST)) {
  throw new Error('Start a local Firestore emulator first. No production fallback is allowed.');
}
const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
(async () => {
  const env = await initializeTestEnvironment({ projectId, firestore: { host, port: Number(port), rules: fs.readFileSync('firestore.rules', 'utf8') } });
  const google = { firebase: { sign_in_provider: 'google.com', identities: {} } };
  const dbFor = (uid, token = google) => env.authenticatedContext(uid, token).firestore();
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async context => {
      for (const [uid, label] of [['test01', 'TEST01'], ['test02', 'TEST02'], ['test03', 'TEST03']]) {
        await setDoc(doc(context.firestore(), 'testAdmins', uid), { enabled: true, label });
      }
    });
    const normal = dbFor('normal'), admin = dbFor('test01');
    await assertSucceeds(getDoc(doc(normal, 'testAdmins', 'normal')));
    await assertFails(setDoc(doc(normal, 'testAdmins', 'normal'), { enabled: true, label: 'TEST01' }));
    await assertFails(updateDoc(doc(admin, 'testAdmins', 'test01'), { label: 'TEST02' }));
    await assertFails(getDoc(doc(normal, 'testAdmins', 'test01')));
    await assertFails(setDoc(doc(normal, 'testSessions', 'normal'), { enabled: true, dayOffset: 1 }));
    await assertFails(setDoc(doc(normal, 'testWorkspaces', 'normal'), { habits: [] }));
    await assertFails(getDoc(doc(normal, 'testWorkspaces', 'test01')));
    // A writable profile field cannot grant test privileges.
    await assertSucceeds(setDoc(doc(normal, 'users', 'normal'), { isTestAdmin: true, role: 'TEST01' }));
    await assertFails(setDoc(doc(normal, 'testSessions', 'normal'), { enabled: true, dayOffset: 0 }));
    for (const uid of ['test01', 'test02', 'test03']) {
      const db = dbFor(uid), session = doc(db, 'testSessions', uid), workspace = doc(db, 'testWorkspaces', uid);
      await assertFails(setDoc(workspace, { habits: [] })); // Mode is not enabled yet.
      await assertSucceeds(setDoc(session, { enabled: true, dayOffset: 0 }));
      await assertSucceeds(updateDoc(session, { dayOffset: 1 }));
      await assertSucceeds(updateDoc(session, { dayOffset: -1 }));
      await assertSucceeds(updateDoc(session, { dayOffset: 0 }));
      await assertSucceeds(setDoc(workspace, { habits: [], earnedHabitStreakBonuses: [] }));
      await assertSucceeds(getDoc(workspace));
      await assertFails(updateDoc(session, { dayOffset: 3651 }));
      await assertFails(updateDoc(session, { dayOffset: 0.5 }));
      await assertFails(updateDoc(session, { arbitrary: true }));
      await assertFails(updateDoc(session, { enabled: false, dayOffset: 1 }));
      await assertSucceeds(setDoc(session, { enabled: false, dayOffset: 0 }));
      await assertFails(setDoc(workspace, { habits: [] }));
      await assertFails(getDoc(workspace));
    }
    await assertFails(setDoc(doc(dbFor('test02'), 'testSessions', 'test01'), { enabled: true, dayOffset: 0 }));
    await assertFails(setDoc(doc(dbFor('test01', { firebase: { sign_in_provider: 'password' } }), 'testSessions', 'test01'), { enabled: true, dayOffset: 0 }));
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'testSessions', 'test01'), { enabled: true, dayOffset: 0 }));
    await setDoc(doc(admin, 'testSessions', 'test01'), { enabled: true, dayOffset: 0 });
    await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'testAdmins', 'test01'), { enabled: false }));
    await assertFails(updateDoc(doc(admin, 'testSessions', 'test01'), { dayOffset: 2 }));
    await assertFails(getDoc(doc(admin, 'testWorkspaces', 'test01')));
    await assertFails(deleteDoc(doc(admin, 'testWorkspaces', 'test01')));
    // Existing normal data permissions stay intact, including today's/yesterday's histories.
    await assertSucceeds(setDoc(doc(normal, 'users', 'normal', 'habits', 'habit'), { pointHistory: [{ date: '2026-09-13', point: 1 }], point: 1 }));
    await assertSucceeds(updateDoc(doc(normal, 'users', 'normal', 'habits', 'habit'), { pointHistory: [{ date: '2026-09-13', point: 1 }, { date: '2026-09-14', point: 1 }], point: 2 }));
    console.log('PASS test rules: all 3 Google admins, ON/OFF, date bounds, normal user direct denial, self-promotion denial, account isolation, non-Google denial, revocation and normal habit writes.');
  } finally { await env.cleanup(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
