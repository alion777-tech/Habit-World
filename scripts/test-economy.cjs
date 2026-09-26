const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const loader = require('./load-model.cjs');
const model = loader.load('../lib/economyModel.ts');
const roomModel = loader.load('../lib/fairyRoomModel.ts');
const shopModel = loader.load('../lib/shopModel.ts');
const todoModel = loader.load('../lib/todoModel.ts');
const titles = loader.load('../lib/titles.ts');
const special = loader.load('../lib/specialPointModel.ts');
const dates = loader.load('../lib/habits/dateUtils.ts');
const fairyProgress = loader.load('../lib/fairyProgressModel.ts');
const wardrobeModel = loader.load('../app/(root)/avatar/wardrobe.ts');
const legacy = loader.load('../lib/legacyShopOwnership.ts');
loader.restore();
function load(file, resolve) {
  const context = { exports: {}, require: resolve, Date, console, crypto: require('node:crypto') };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return context.exports;
}
const docs = new Map(); let fail = false, serial = 0;
const snap = ref => ({ ref, id: ref.split('/').at(-1), exists: () => docs.has(ref), data: () => structuredClone(docs.get(ref)) });
const api = {
  doc: (_db, ...parts) => parts.length ? parts.join('/') : `${_db}/new-${++serial}`,
  collection: (_db, ...parts) => parts.join('/'),
  getDocs: async ref => ({ docs: [...docs.keys()].filter(k => k.startsWith(ref + '/') && k.split('/').length === ref.split('/').length + 1).map(snap) }),
  deleteField: () => ({ deleteField: true }),
  serverTimestamp: () => new Date(), increment: n => ({ increment: n }),
  updateDoc: async (ref, patch) => docs.set(ref, { ...docs.get(ref), ...patch }),
  deleteDoc: async ref => docs.delete(ref),
  runTransaction: async (_db, fn) => {
    const pending = []; let wrote = false;
    const tx = { get: async ref => { assert.equal(wrote, false, 'all reads precede writes'); return snap(ref); },
      set: (ref, patch) => { wrote = true; pending.push([ref, patch]); },
      update: (ref, patch) => { wrote = true; pending.push([ref, patch]); } };
    const result = await fn(tx);
    if (fail) throw Error('simulated failed commit');
    for (const [ref, patch] of pending) {
      const next = { ...docs.get(ref) };
      for (const [key, value] of Object.entries(patch)) {
        if (key === "fairyRoom.coins" && value?.deleteField) { next.fairyRoom = { ...next.fairyRoom }; delete next.fairyRoom.coins; }
        else next[key] = value?.increment !== undefined ? (next[key] || 0) + value.increment : value;
      }
      docs.set(ref, next);
    }
    return result;
  },
};
const auth = { currentUser: { uid: 'me', isAnonymous: false } };
let economyActions;
const resolve = name => name === 'firebase/firestore' ? api
  : name.includes('economyModel') ? model : name.includes('economyActions') ? economyActions
  : name.includes('legacyShopOwnership') ? { legacyShopPurchases: () => [] }
  : name.includes('fairyRoomModel') ? roomModel : name.includes('shopModel') ? shopModel
  : name.includes('todoModel') ? todoModel : name.includes('specialPointModel') ? special
  : name.includes('titles') ? titles : name.includes('dateUtils') ? dates
  : name.includes('fairyProgressModel') ? fairyProgress
  : name.includes('firebase') ? { db: {}, auth } : {};
economyActions = load('lib/economyActions.ts', resolve);
const roomActions = load('lib/fairyRoomActions.ts', resolve);
const todoActions = load('lib/todoActions.ts', resolve);
const habitActions = load('lib/habits/updateHabitFields.ts', resolve);
const specialActions = load('lib/specialPointActions.ts', resolve);
const progressActions = load('lib/fairyProgressActions.ts', resolve);
(async () => {
  const oldWardrobe = wardrobeModel.purchaseCloset(wardrobeModel.initialWardrobe());
  oldWardrobe.owned.push('hair:long');
  global.localStorage = { getItem: () => JSON.stringify(oldWardrobe) };
  assert.ok(legacy.legacyShopPurchases('me').includes('closet'));
  assert.ok(legacy.legacyShopPurchases('me').includes('avatar-hair-long'));
  global.localStorage = { getItem: () => JSON.stringify(wardrobeModel.initialWardrobe()) };
  assert.equal(legacy.legacyShopPurchases('me').length, 0);
  delete global.localStorage;
  // Creation and its daily counter commit together, without touching rewards.
  docs.set('users/me', { stats: { lastActionDate: dates.formatDateToJST(new Date()), todosAddedToday: 3, habitsAddedToday: 2 }, bonusPoints: 50 });
  const countTodos = () => [...docs.keys()].filter(key => key.startsWith('users/me/todos/')).length;
  const initialTodos = countTodos();
  fail = true;
  await assert.rejects(todoActions.addTodo('me', 'failed addition', {}, true));
  fail = false;
  assert.equal(countTodos(), initialTodos);
  assert.equal(docs.get('users/me').stats.todosAddedToday, 3);
  await todoActions.addTodo('me', 'saved addition', {}, true);
  assert.equal(countTodos(), initialTodos + 1);
  assert.equal(docs.get('users/me').stats.todosAddedToday, 4);
  assert.equal(docs.get('users/me').stats.habitsAddedToday, 2);
  assert.equal(docs.get('users/me').bonusPoints, 50);
  // A first real login creates an egg without the opening tutorial or local flags.
  docs.set('users/me', { stats: { lastActionDate: dates.formatDateToJST(new Date()) } });
  await progressActions.recordFairyLogin('me');
  assert.equal(docs.get('users/me').fairy.status, 'egg');
  assert.equal(docs.get('users/me').stats.continuousLoginDays, 1);
  const firstLogin = JSON.stringify(docs.get('users/me'));
  await progressActions.recordFairyLogin('me');
  assert.equal(JSON.stringify(docs.get('users/me')), firstLogin);
  await assert.rejects(progressActions.nameFairy('me', 'ミント'));
  await assert.rejects(roomActions.syncFairyRoom('me', 1));
  await assert.rejects(roomActions.tradeFairyRoom('me', { type: 'buy', shop: 'fairy', productId: 'closet', requestId: 'egg-buy' }));
  docs.set('users/me', { bonusPoints: 5000, fairy: { status: 'ready' }, fairyRoom: { ...roomModel.createRoom(Date.now()), coins: 0 } });
  const initial = await economyActions.syncEconomy('me');
  assert.equal(initial.lifetimePoints, 5000); assert.equal(initial.gold, 5000);
  await economyActions.syncEconomy('me'); assert.equal(docs.get('users/me').economy.gold, 5000);
  const buy = { type: 'buy', shop: 'fairy', productId: 'closet', requestId: 'closet-once' };
  fail = true; await assert.rejects(roomActions.tradeFairyRoom('me', buy)); fail = false;
  assert.equal(docs.get('users/me').economy.gold, 5000);
  await roomActions.tradeFairyRoom('me', buy);
  let p = docs.get('users/me');
  assert.equal(p.economy.gold, 3000); assert.equal(p.economy.lifetimePoints, 5000);
  assert.equal(Math.floor(p.economy.lifetimePoints / 100) + 1, 51);
  assert.equal(p.fairyRoom.coins, undefined); assert.equal(p.fairyRoom.gold, undefined);
  await roomActions.tradeFairyRoom('me', buy);
  await roomActions.tradeFairyRoom('me', { ...buy, requestId: 'already-owned' });
  assert.equal(docs.get('users/me').economy.gold, 3000);
  docs.set('users/me', { ...docs.get('users/me'), bonusPoints: 5500 });
  await economyActions.syncEconomy('me');
  assert.equal(docs.get('users/me').economy.lifetimePoints, 5500);
  assert.equal(docs.get('users/me').economy.gold, 3500);
  docs.set('users/me/todos/a', { done: false, rewarded: false });
  await todoActions.toggleTodo('me', 'a', false);
  assert.equal(docs.get('users/me').economy.gold, 3505, 'existing ToDo reward remains 5');
  await todoActions.toggleTodo('me', 'a', true); await todoActions.toggleTodo('me', 'a', false);
  assert.equal(docs.get('users/me').economy.gold, 3505);
  docs.set('users/me/habits/a', { point: 0, pointHistory: [] });
  const fields = { point: 1, pointHistory: [{ date: '2026-09-26', point: 1 }] };
  await habitActions.updateHabitFields('me', 'a', fields);
  await habitActions.updateHabitFields('me', 'a', { point: 0, pointHistory: [] });
  await habitActions.updateHabitFields('me', 'a', fields);
  assert.equal(docs.get('users/me').economy.gold, 3506, 'rechecking cannot farm gold');
  docs.delete('users/me/habits/a'); await economyActions.syncEconomy('me');
  assert.equal(docs.get('users/me').economy.lifetimePoints, 5506, 'deleting a source never lowers lifetime');
  await specialActions.awardSpecialPoints('me', { totalPoints: 5506 });
  // Existing level/point awards may unlock a different later award. Drain those first.
  for(let i=0;i<5;i++) await specialActions.awardSpecialPoints('me', {});
  const rewarded = docs.get('users/me').economy.gold;
  await specialActions.awardSpecialPoints('me', { totalPoints: 5506 });
  assert.equal(docs.get('users/me').economy.gold, rewarded, 'special awards credited once');
  docs.set('users/me', { ...docs.get('users/me'), fairy: { status: 'egg' }, stats: { continuousLoginDays: 6 }, loginRewardDate: dates.formatDateToJST(new Date(Date.now()-86400000)) });
  await progressActions.recordFairyLogin('me');
  const hatched = docs.get('users/me').economy.gold;
  await progressActions.recordFairyLogin('me'); assert.equal(docs.get('users/me').economy.gold, hatched);
  assert.equal(hatched, rewarded + 100);
  assert.equal(docs.get('users/me').fairy.status, 'naming');
  await assert.rejects(roomActions.syncFairyRoom('me', 1));
  await assert.rejects(roomActions.tradeFairyRoom('me', { ...buy, requestId: 'naming-buy' }));
  await progressActions.nameFairy('me', 'ミント');
  assert.equal(docs.get('users/me').fairy.status, 'ready');
  const beforeLogin = structuredClone(docs.get('users/me'));
  await progressActions.recordFairyLogin('me');
  assert.equal(JSON.stringify(docs.get('users/me').fairy), JSON.stringify(beforeLogin.fairy));
  assert.equal(JSON.stringify(docs.get('users/me').fairyRoom), JSON.stringify(beforeLogin.fairyRoom));
  assert.equal(JSON.stringify(docs.get('users/me').economy), JSON.stringify(beforeLogin.economy));
  await roomActions.syncFairyRoom('me', 1);
  assert.throws(() => shopModel.tradeRoom({ ...roomModel.createRoom(0), gold: 1999 }, buy, 0), /ゴールド/);
  assert.throws(() => shopModel.tradeRoom({ ...roomModel.createRoom(0), gold: 5000 }, { type: 'buy', shop: 'fairy', productId: 'avatar-hair-long', requestId: 'locked' }, 0), /クローゼット/);
  const goldOnly = model.changeGold(docs.get('users/me').economy, 50);
  assert.equal(goldOnly.lifetimePoints, docs.get('users/me').economy.lifetimePoints);
  // Goal cancellation/recompletion is monotonic and paid only once.
  let e = model.reconcileEconomy({}, [], []);
  e = model.reconcileEconomy({ economy: e }, [], [{ id: 'goal', done: true }]);
  e = model.reconcileEconomy({ economy: e }, [], [{ id: 'goal', done: false }]);
  e = model.reconcileEconomy({ economy: e }, [], [{ id: 'goal', done: true }]);
  assert.equal(e.lifetimePoints, 100); assert.equal(e.gold, 100);
  // Previous-release users may have spent gold while retaining a coin balance.
  docs.clear();
  const legacyRoom = { ...roomModel.createRoom(Date.now()), coins: 123, purchases: ['closet', 'dwarf-bag'], inventory: { 'dwarf-bag': 1 }, materials: { 'forest-herb': 2 } };
  docs.set('users/me', { bonusPoints: 5000, economy: { version: 1, lifetimePoints: 5000, gold: 300, credited: { bonus: 5000, todo: 0 } }, fairy: { status: 'ready' }, fairyRoom: legacyRoom });
  fail = true; await assert.rejects(economyActions.syncEconomy('me')); fail = false;
  assert.equal(docs.get('users/me').fairyRoom.coins, 123, 'failed migration preserves old money');
  assert.equal(docs.get('users/me').economy.gold, 300);
  await economyActions.syncEconomy('me'); await economyActions.syncEconomy('me');
  p = docs.get('users/me');
  assert.equal(p.economy.gold, 423); assert.equal(p.economy.lifetimePoints, 5000);
  assert.equal(p.economy.legacyCoinMigration.amount, 123);
  assert.equal(p.fairyRoom.coins, undefined);
  assert.deepEqual(p.fairyRoom.purchases, legacyRoom.purchases);
  assert.deepEqual(p.fairyRoom.inventory, legacyRoom.inventory);
  const sale = { type: 'sell', shop: 'elf', materialId: 'forest-herb', quantity: 2, requestId: 'sale-gold' };
  fail = true; await assert.rejects(roomActions.tradeFairyRoom('me', sale)); fail = false;
  assert.equal(docs.get('users/me').economy.gold, 423);
  assert.equal(docs.get('users/me').fairyRoom.materials['forest-herb'], 2);
  await roomActions.tradeFairyRoom('me', sale); await roomActions.tradeFairyRoom('me', sale);
  assert.equal(docs.get('users/me').economy.gold, 433);
  assert.equal(docs.get('users/me').economy.lifetimePoints, 5000, 'sales never raise lifetime or level');
  assert.equal(docs.get('users/me').fairyRoom.materials['forest-herb'], 0);
  await roomActions.tradeFairyRoom('me', { type: 'buy', shop: 'elf', productId: 'elf-potion', requestId: 'spend-sale-gold' });
  assert.equal(docs.get('users/me').economy.gold, 423);
  await economyActions.syncEconomy('me');
  assert.equal(docs.get('users/me').economy.gold, 423, 'migration receipt survives trades and reconciliation');
  docs.clear();
  docs.set('users/me', { bonusPoints: 100, fairy: { status: 'ready' }, fairyRoom: { ...legacyRoom, coins: 25 } });
  // Migrating directly on a purchase must credit the old coins exactly once.
  await roomActions.tradeFairyRoom('me', { type: 'buy', shop: 'elf', productId: 'elf-potion', requestId: 'legacy-direct' });
  assert.equal(docs.get('users/me').economy.gold, 115);
  assert.equal(docs.get('users/me').economy.lifetimePoints, 100);
  assert.equal(docs.get('users/me').fairyRoom.coins, undefined);
  const preview = model.migratePreviewGold({ ...legacyRoom, gold: 50 });
  assert.equal(preview.gold, 173); assert.equal(preview.coins, undefined);
  assert.equal(model.migratePreviewGold(preview).gold, 173);
  assert.throws(() => model.migrateLegacyCoins(e, -1));
  assert.throws(() => model.migrateLegacyCoins(e, Number.MAX_SAFE_INTEGER));
  assert.equal(roomModel.createRoom(0).coins, undefined, 'new accounts never create a second currency');
  console.log('PASS economy: lifetime/gold separation, 1:1 legacy migration, rollback/retry, direct purchases, gold sales, preserved ownership, preview migration and unchanged rewards');
})().catch(e => { console.error(e); process.exitCode = 1; });
