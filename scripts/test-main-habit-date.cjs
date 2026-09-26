const economySupport = require('./economy-test-support.cjs');
// No live Firebase writes. Exercise real date selection, calculation and persistence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, resolve = require) {
  const context = { exports: {}, require: resolve, Date, Intl, console };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, context);
  return context.exports;
}
const model = load('lib/testAccessModel.ts');
const dates = load('lib/habits/dateUtils.ts');
const dateModel = load('lib/habits/habitTestDate.ts', name => name.includes('dateUtils') ? dates : model);
const calc = load('lib/habits/calcToggleHabit.ts', () => dates).calcToggleHabit;
const access = { uid: 'test01', label: 'TEST01', enabled: true, dayOffset: 1, loading: false, error: '' };
for (const label of model.TEST_LABELS) {
  assert.equal(dateModel.habitTestDate('2026-09-30', 'test01', { ...access, label }).today, '2026-10-01');
}
for (const change of [{ enabled: false }, { loading: true }, { label: null }, { label: 'TEST04' }, { uid: 'other' }, { error: 'offline' }, { dayOffset: NaN }]) {
  assert.equal(dateModel.habitTestDate('2026-09-30', 'test01', { ...access, ...change }).today, '2026-09-30');
}
assert.equal(dateModel.habitTestDate('2026-09-30', null, access).context, undefined);
assert.equal(dateModel.shiftHabitDate('2027-01-01', -1), '2026-12-31');
assert.equal(dateModel.shiftHabitDate('2028-02-28', 1), '2028-02-29');

const docs = new Map(), writes = [];
const auth = { currentUser: { uid: 'test01', isAnonymous: false, getIdTokenResult: async () => ({ signInProvider: 'google.com' }) } };
const api = {
  doc: (_db, ...parts) => parts.join('/'),
  runTransaction: async (_db, fn) => {
    const pending = [];
    await fn({ get: async ref => ({ data: () => structuredClone(docs.get(ref)) }), update: (ref, patch) => pending.push([ref, patch]), set: (ref, patch) => pending.push([ref, patch]) });
    for (const [ref, patch] of pending) { docs.set(ref, { ...docs.get(ref), ...patch }); writes.push(ref); }
  },
};
const { updateHabitFields } = load('lib/habits/updateHabitFields.ts', name => name.includes('economyModel') ? economySupport.model : name.includes('economyActions') ? economySupport.actions(docs) : name === 'firebase/firestore' ? api
  : name.includes('firebase') ? { auth, db: {} } : name.includes('habitTestDate') ? dateModel
  : name.includes('testAccessModel') ? model : name.includes('dateUtils') ? dates : {});

(async () => {
  const realToday = dates.formatDateToJST(new Date());
  const ref = 'users/test01/habits/existing-habit';
  docs.set(ref, { id: 'existing-habit', text: 'Existing habit', type: 'daily', point: 0, dailyStreak: 0, lastCompletedDate: null, pointHistory: [] });
  docs.set('users/test01', {});
  docs.set('testAdmins/test01', { label: 'TEST01', enabled: true });
  let earned = [];
  for (let offset = 0; offset < 3; offset++) {
    docs.set('testSessions/test01', { enabled: true, dayOffset: offset });
    const date = dateModel.habitTestDate(realToday, 'test01', { ...access, dayOffset: offset });
    const habit = docs.get(ref);
    assert.equal(habit.pointHistory.some(p => p.date === date.today), false, 'new day starts unchecked');
    const result = calc(habit, date.today, date.today, date.yesterday, earned);
    await updateHabitFields('test01', habit.id, result.fields, date.context);
    earned = result.earnedHabitStreakBonus?.earnedBonuses ?? earned;
    assert.equal(docs.get(ref).dailyStreak, offset + 1);
    assert.equal(docs.get(ref).pointHistory.at(-1).date, date.today);
  }
  assert.equal(docs.get(ref).point, 8, 'existing 3-day bonus retained');
  const date = dateModel.habitTestDate(realToday, 'test01', { ...access, dayOffset: 2 });
  const result = calc(docs.get(ref), date.today, date.today, date.yesterday, earned);
  await updateHabitFields('test01', 'existing-habit', result.fields, date.context);
  assert.equal(docs.get(ref).pointHistory.length, 2, 'cancel only removes target day');
  const yesterdayCancel = calc(docs.get(ref), date.yesterday, date.today, date.yesterday, earned);
  await updateHabitFields('test01', 'existing-habit', yesterdayCancel.fields, date.context);
  assert.equal(docs.get(ref).pointHistory.length, 1, 'yesterday input targets virtual yesterday');
  const gap = calc(docs.get(ref), date.today, date.today, date.yesterday, earned);
  assert.equal(gap.fields.dailyStreak, 1, 'missing yesterday breaks streak');
  const before = JSON.stringify(docs.get(ref));
  for (const session of [{ enabled: false, dayOffset: 0 }, { enabled: true, dayOffset: 3 }]) {
    docs.set('testSessions/test01', session);
    await assert.rejects(updateHabitFields('test01', 'existing-habit', result.fields, date.context));
  }
  docs.set('testSessions/test01', { enabled: true, dayOffset: 2 });
  docs.set('testAdmins/test01', { label: 'TEST01', enabled: false });
  await assert.rejects(updateHabitFields('test01', 'existing-habit', result.fields, date.context));
  auth.currentUser.uid = 'normal';
  await assert.rejects(updateHabitFields('test01', 'existing-habit', result.fields, date.context));
  assert.equal(JSON.stringify(docs.get(ref)), before);
  assert.ok(writes.every(path => path === ref || path === 'users/test01'), 'normal location retained, no workspace copy');

  // Render the real home component with different habit and ToDo dates.
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
  const visibility = load('lib/habits/visibility.ts', () => dates);
  const todoDates = [];
  const Home = load('app/components/HomeView.tsx', name => name === 'next-intl' ? { useLocale: () => 'ja' }
    : name.includes('todoModel') ? { homeTodos: (_t, day) => { todoDates.push(day); return []; }, isOverdue: () => false, reminderActive: () => false }
    : name.includes('visibility') ? visibility : name.includes('todoActions') || name.endsWith('.css') ? {} : require(name)).default;
  const habit = docs.get(ref);
  const render = day => renderToStaticMarkup(React.createElement(Home, { uid: 'test01', habits: [habit], todos: [], today: realToday, habitToday: day, onTodo() {}, onHabit() {}, onToggleHabit() {}, isDarkMode: false }));
  assert.match(render(realToday), /checked=""/);
  assert.doesNotMatch(render(date.today), /checked=""/);
  assert.ok(todoDates.every(day => day === realToday), 'ToDo keeps real date');
  assert.equal(dateModel.habitTestDate('2026-09-26', 'test01', access).dayOfWeek, 0, 'next day is Sunday');
  console.log('PASS main habit date: permissions, next days, normal persistence, streak/bonus/cancel, stale session denial, home display and ToDo isolation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
