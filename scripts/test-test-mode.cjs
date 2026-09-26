const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, resolve = require, extra = {}) {
  const context = { exports: {}, require: resolve, Date, console, ...extra };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, context);
  return context.exports;
}
const model = load('lib/testAccessModel.ts');
// Exercise the existing calendar hook: month navigation must not change input dates.
function calendarHarness(offset) {
  const slots = []; let cursor = 0; let effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i], deps)) { slots[i] = deps; effects.push(fn); } },
  };
  const FixedDate = class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-09-15T03:00:00Z'])); } static now() { return new Date('2026-09-15T03:00:00Z').getTime(); } };
  const hook = load('hooks/useHabitCalendar.ts', name => name === 'react' ? react : name.includes('dateUtils') ? load('lib/habits/dateUtils.ts') : { isHabitVisibleOnDate: () => true },
    { Date: FixedDate, window: { setInterval: () => 0, clearInterval() {}, addEventListener() {}, removeEventListener() {} } });
  return () => { cursor = 0; effects = []; const result = hook.useHabitCalendar([], offset); effects.forEach(fn => fn()); return result; };
}
const normalCalendar = calendarHarness();
let calendar = normalCalendar();
assert.equal(calendar.todayStr, '2026-09-15'); assert.equal(calendar.yesterdayStr, '2026-09-14');
calendar.setCurrentMonth(new Date(2026, 7, 1)); calendar = normalCalendar();
assert.equal(calendar.currentMonth.getMonth(), 7); assert.equal(calendar.todayStr, '2026-09-15');
calendar.setCurrentMonth(new Date(2026, 9, 1)); calendar = normalCalendar();
assert.equal(calendar.currentMonth.getMonth(), 9); assert.equal(calendar.yesterdayStr, '2026-09-14');
assert.equal(calendarHarness(1)().todayStr, '2026-09-16');
assert.equal(calendarHarness(-1)().todayStr, '2026-09-14');
assert.equal(normalCalendar().todayStr, '2026-09-15', 'sandbox offset never changes normal calendar');
for (const label of ['TEST01', 'TEST02', 'TEST03']) assert.equal(model.isTestAdminRegistration({ label, enabled: true }), true);
for (const value of [null, {}, { label: 'TEST01', enabled: false }, { label: 'TEST04', enabled: true }]) assert.equal(model.isTestAdminRegistration(value), false);
for (const value of [0, -1, 1, -3650, 3650]) assert.equal(model.validTestDayOffset(value), true);
for (const value of [0.5, 3651, NaN, '1']) assert.equal(model.validTestDayOffset(value), false);

// Authentication and snapshot races: test the real hook with controllable SDK callbacks.
function accessHarness() {
  let state, authCallback, cleanup;
  const auth = { currentUser: null }, subscriptions = [];
  const hook = load('hooks/useTestAccess.ts', name => {
    if (name === 'react') return { useState: value => { state = value; return [value, next => { state = next; }]; }, useEffect: fn => { cleanup = fn(); } };
    if (name === 'firebase/auth') return { onIdTokenChanged: (_auth, fn) => { authCallback = fn; return () => {}; } };
    if (name === 'firebase/firestore') return { doc: (_db, ...parts) => parts.join('/'), onSnapshot: (ref, options, next, error) => {
      const sub = { ref, next, error, stopped: false }; subscriptions.push(sub); return () => { sub.stopped = true; };
    } };
    if (name.includes('testAccessModel')) return model;
    if (name.includes('firebase')) return { auth, db: {} };
    throw Error(name);
  });
  hook.useTestAccess();
  return {
    state: () => state, cleanup: () => cleanup(), subscriptions,
    async login(uid, provider = 'google.com') { const user = uid ? { uid, isAnonymous: provider === 'anonymous', getIdTokenResult: async () => ({ signInProvider: provider }) } : null; auth.currentUser = user; await authCallback(user); },
    emit(ref, data, metadata = {}) {
      const sub = subscriptions.filter(item => item.ref === ref && !item.stopped).at(-1);
      assert.ok(sub, 'active subscription ' + ref);
      sub.next({ data: () => data, metadata: { fromCache: false, hasPendingWrites: false, ...metadata } }); return sub;
    },
  };
}
function rendered(file, access) {
  const React = require('react');
  const component = load(file, name => name.includes('useTestAccess') ? { useTestAccess: () => access }
    : name === 'react' || name === 'react/jsx-runtime' ? require(name) : {}).default;
  return require('react-dom/server').renderToStaticMarkup(React.createElement(component, { locale: 'ja' }, React.createElement('b', null, 'protected-prototype')));
}
(async () => {
  const h = accessHarness();
  await h.login('normal'); h.emit('testAdmins/normal', undefined);
  assert.equal(h.state().label, null);
  assert.equal(rendered('app/components/TestAdminMenu.tsx', h.state()), '');
  assert.doesNotMatch(rendered('app/components/TestFeatureGate.tsx', h.state()), /protected-prototype/);
  await h.login('test01');
  h.emit('testAdmins/test01', { label: 'TEST01', enabled: true }, { fromCache: true });
  assert.equal(h.state().label, null, 'cache never grants role');
  h.emit('testAdmins/test01', { label: 'TEST01', enabled: true });
  h.emit('testSessions/test01', { enabled: false, dayOffset: 0 });
  assert.match(rendered('app/components/TestAdminMenu.tsx', h.state()), /テスト管理/);
  assert.doesNotMatch(rendered('app/components/TestFeatureGate.tsx', h.state()), /protected-prototype/);
  h.emit('testSessions/test01', { enabled: true, dayOffset: 1 }, { hasPendingWrites: true });
  assert.equal(h.state().enabled, false, 'pending enable cannot grant access');
  const oldSession = h.emit('testSessions/test01', { enabled: true, dayOffset: 1 });
  assert.equal(h.state().dayOffset, 1);
  assert.match(rendered('app/components/TestFeatureGate.tsx', h.state()), /protected-prototype/);
  h.emit('testSessions/test01', { enabled: true, dayOffset: 2 }, { hasPendingWrites: true });
  assert.equal(h.state().dayOffset, 1, 'pending date retains confirmed value');
  h.emit('testAdmins/test01', { label: 'TEST01', enabled: false });
  oldSession.next({ data: () => ({ enabled: true, dayOffset: 1 }), metadata: {} });
  assert.equal(h.state().enabled, false, 'revoked role cannot be resurrected by queued session');
  await h.login('normal');
  oldSession.next({ data: () => ({ enabled: true }), metadata: {} });
  assert.equal(h.state().label, null, 'account change drops old role');
  await h.login('test01', 'password'); assert.equal(h.state().label, null);
  await h.login(null); assert.equal(h.state().enabled, false);
  h.cleanup();

  // Run actual actions against transaction doubles; verify existing calculation reuse
  // and that every mutation stays in testSessions/testWorkspaces.
  const dateUtils = load('lib/habits/dateUtils.ts');
  const calc = load('lib/habits/calcToggleHabit.ts', () => dateUtils);
  const docs = new Map([['testAdmins/test01', { label: 'TEST01', enabled: true }]]), writes = [];
  const auth = { currentUser: { uid: 'test01', isAnonymous: false, getIdTokenResult: async () => ({ signInProvider: 'google.com' }) } };
  const snapshot = ref => ({ exists: () => docs.has(ref), data: () => structuredClone(docs.get(ref)) });
  const api = {
    doc: (_db, ...parts) => parts.join('/'), getDocFromServer: async ref => snapshot(ref),
    setDoc: async (ref, value) => { writes.push(ref); docs.set(ref, structuredClone(value)); },
    runTransaction: async (_db, fn) => {
      const pending = [];
      await fn({ get: async ref => snapshot(ref), set: (ref, value) => pending.push([ref, value]), update: (ref, value) => pending.push([ref, { ...docs.get(ref), ...value }]) });
      pending.forEach(([ref, value]) => { writes.push(ref); docs.set(ref, structuredClone(value)); });
    },
  };
  const actions = load('lib/testModeActions.ts', name => name === 'firebase/firestore' ? api : name.includes('testAccessModel') ? model
    : name.includes('calcToggleHabit') ? calc : name.includes('dateUtils') ? dateUtils : { auth, db: {} });
  await assert.rejects(actions.changeTestDay(1));
  await actions.setTestMode(true); await actions.updateTestHabit();
  for (let day = 0; day < 4; day++) { if (day) await actions.changeTestDay(1); await actions.updateTestHabit('sample-habit'); }
  const habit = docs.get('testWorkspaces/test01').habits[0];
  assert.equal(habit.point, 9); assert.equal(habit.dailyStreak, 4);
  await actions.changeTestDay(-1); assert.equal(docs.get('testSessions/test01').dayOffset, 2);
  await actions.changeTestDay(0); assert.equal(docs.get('testSessions/test01').dayOffset, 0);
  await actions.setTestMode(false); await assert.rejects(actions.updateTestHabit('sample-habit'));
  auth.currentUser.uid = 'normal'; await assert.rejects(actions.setTestMode(true));
  assert.ok(writes.every(ref => ref.startsWith('testSessions/') || ref.startsWith('testWorkspaces/')));
  console.log('PASS test mode: registration, menu/gates, pending writes, revocation/account races, ON/OFF, previous/next/today, real 3-day bonus calculation, isolated writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
