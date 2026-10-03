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
const completionModel = loader.load('../lib/habits/completionModel.ts');
const goalModel = loader.load('../lib/goalModel.ts');
const wardrobeModel = loader.load('../app/(root)/avatar/wardrobe.ts');
const legacy = loader.load('../lib/legacyShopOwnership.ts');
loader.restore();
function load(file, resolve) {
  const context = { exports: {}, require: resolve, Date, console, crypto: require('node:crypto') };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return context.exports;
}
const docs = new Map(); let fail = false, serial = 0, retries = 0;
const snap = ref => { const value = structuredClone(docs.get(ref)); return { ref, id: ref.split('/').at(-1), exists: () => value !== undefined, data: () => structuredClone(value) }; };
const api = {
  doc: (_db, ...parts) => parts.length ? parts.join('/') : `${_db}/new-${++serial}`,
  collection: (_db, ...parts) => parts.join('/'),
  getDocs: async ref => ({ docs: [...docs.keys()].filter(k => k.startsWith(ref + '/') && k.split('/').length === ref.split('/').length + 1).map(snap) }),
  deleteField: () => ({ deleteField: true }),
  serverTimestamp: () => new Date(), increment: n => ({ increment: n }),
  setDoc: async (ref, patch) => docs.set(ref, { ...docs.get(ref), ...patch }),
  updateDoc: async (ref, patch) => docs.set(ref, { ...docs.get(ref), ...patch }),
  deleteDoc: async ref => docs.delete(ref),
  runTransaction: async (_db, fn) => {
    for (let attempt=0;attempt<20;attempt++) {
    const reads = new Map();
    const pending = []; let wrote = false;
    const tx = { get: async ref => { assert.equal(wrote, false, 'all reads precede writes'); reads.set(ref, JSON.stringify(docs.get(ref))); return snap(ref); },
      set: (ref, patch) => { wrote = true; pending.push([ref, patch]); },
      update: (ref, patch) => { wrote = true; pending.push([ref, patch]); },
      delete: ref => { wrote = true; pending.push([ref, null]); } };
    const result = await fn(tx);
    if (fail) throw Error('simulated failed commit');
    if ([...reads].some(([ref,value])=>JSON.stringify(docs.get(ref))!==value)) { retries++; continue; }
    for (const [ref, patch] of pending) {
      if (patch === null) { docs.delete(ref); continue; }
      const next = { ...docs.get(ref) };
      for (const [key, value] of Object.entries(patch)) {
        if (key === "fairyRoom.coins" && value?.deleteField) { next.fairyRoom = { ...next.fairyRoom }; delete next.fairyRoom.coins; }
        else next[key] = value?.increment !== undefined ? (next[key] || 0) + value.increment : value;
      }
      docs.set(ref, next);
    }
    return result;
    }
    throw Error("too many transaction conflicts");
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
  : name.includes('completionModel') ? completionModel : name.includes('goalModel') ? goalModel
  : name.includes('fairyProgressModel') ? fairyProgress
  : name.includes('firebase') ? { db: {}, auth } : {};
economyActions = load('lib/economyActions.ts', resolve);
const roomActions = load('lib/fairyRoomActions.ts', resolve);
const todoActions = load('lib/todoActions.ts', resolve);
const habitActions = load('lib/habits/updateHabitFields.ts', resolve);
const specialActions = load('lib/specialPointActions.ts', resolve);
const progressActions = load('lib/fairyProgressActions.ts', resolve);
const goalActions = load('lib/goalActions.ts', resolve);
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
  assert.equal(docs.get('users/me').economy.gold, 3501, 'ToDo completion reward is 1');
  await todoActions.toggleTodo('me', 'a', true); await todoActions.toggleTodo('me', 'a', false);
  assert.equal(docs.get('users/me').economy.gold, 3501);
  docs.set('users/me/habits/a', { point: 0, pointHistory: [] });
  const fields = { point: 1, pointHistory: [{ date: '2026-09-26', point: 1 }] };
  await habitActions.updateHabitFields('me', 'a', fields);
  await habitActions.updateHabitFields('me', 'a', { point: 0, pointHistory: [] });
  await habitActions.updateHabitFields('me', 'a', fields);
  assert.equal(docs.get('users/me').economy.gold, 3502, 'rechecking cannot farm gold');
  docs.delete('users/me/habits/a'); await economyActions.syncEconomy('me');
  assert.equal(docs.get('users/me').economy.lifetimePoints, 5502, 'deleting a source never lowers lifetime');
  await specialActions.awardSpecialPoints('me', { totalPoints: 5502 });
  // Existing level/point awards may unlock a different later award. Drain those first.
  for(let i=0;i<5;i++) await specialActions.awardSpecialPoints('me', {});
  const rewarded = docs.get('users/me').economy.gold;
  await specialActions.awardSpecialPoints('me', { totalPoints: 5502 });
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
  // Goal cancellation/recompletion follows the current state.
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
  // Completion accounting: reversals, deletion, special receipts and legacy amounts.
  docs.clear();
  const habitRef = 'users/me/habits/check';
  docs.set('users/me', {});
  docs.set(habitRef, { text: 'Walk', type: 'daily', point: 0, pointHistory: [], dailyStreak: 0, lastCompletedDate: null });
  for (let day = 1; day <= 7; day++) await habitActions.setHabitCompletion('me', 'check', '2026-09-0' + day, true);
  p = docs.get('users/me');
  assert.equal(p.economy.lifetimePoints, 95); // 70 normal + 5 and 20 special.
  assert.equal(p.bonusPoints, 25);
  assert.equal(docs.get(habitRef).point, 70);
  assert.ok(docs.get(habitRef).pointHistory.every(entry => entry.point === 10 && entry.normalPoint === 10));
  assert.equal(p.specialPointHistory.length, 2);
  await habitActions.setHabitCompletion('me', 'check', '2026-09-07', false);
  assert.equal(docs.get('users/me').economy.gold, 85);
  await habitActions.setHabitCompletion('me', 'check', '2026-09-07', true);
  await habitActions.setHabitCompletion('me', 'check', '2026-09-07', true);
  assert.equal(docs.get('users/me').economy.gold, 95);
  assert.equal(docs.get('users/me').specialPointHistory.length, 2);
  const beforeFailedCheck = JSON.stringify([...docs]);
  fail = true; await assert.rejects(habitActions.setHabitCompletion('me', 'check', '2026-09-07', false)); fail = false;
  assert.equal(JSON.stringify([...docs]), beforeFailedCheck);
  p = docs.get('users/me');
  docs.set('users/me', { ...p, economy: model.changeGold(p.economy, -95) });
  const spent = JSON.stringify([...docs]);
  await assert.rejects(habitActions.setHabitCompletion('me', 'check', '2026-09-07', false), /ゴールド/);
  assert.equal(JSON.stringify([...docs]), spent);
  docs.delete(habitRef); await economyActions.syncEconomy('me');
  assert.equal(docs.get('users/me').economy.lifetimePoints, 95);
  assert.equal(docs.get('users/me').economy.gold, 0);
  // A separate habit cannot claim an already earned global streak bonus.
  docs.set('users/me/habits/other', { text: 'New walk', type: 'daily', point: 0, pointHistory: [], dailyStreak: 0, lastCompletedDate: null });
  for (let day=1;day<=3;day++) await habitActions.setHabitCompletion('me', 'other', '2026-10-0'+day, true);
  assert.equal(docs.get('users/me').bonusPoints,25);
  // Old embedded rewards survive normalization and cancellation without new payment.
  docs.clear(); docs.set('users/me', {});
  docs.set(habitRef, {text:'Legacy',type:'daily',point:8,pointHistory:[{date:'2026-09-01',point:1},{date:'2026-09-02',point:1},{date:'2026-09-03',point:6}],dailyStreak:3,lastCompletedDate:'2026-09-03'});
  await habitActions.setHabitCompletion('me','check','2026-09-03',false);
  assert.equal(docs.get('users/me').economy.gold,7);
  assert.equal(docs.get(habitRef).point,2);
  await habitActions.setHabitCompletion('me','check','2026-09-03',true);
  assert.equal(docs.get('users/me').economy.gold,17);
  assert.equal(docs.get('users/me').specialPointHistory.length,1);
  // Mixed old 1pt and new 10pt histories never reprice on background sync.
  await economyActions.syncEconomy('me');
  assert.equal(docs.get('users/me').economy.gold,17);
  await habitActions.setHabitCompletion('me','check','2026-09-01',false);
  assert.equal(docs.get('users/me').economy.gold,16, 'old completion reverses only one');
  await habitActions.setHabitCompletion('me','check','2026-09-03',false);
  assert.equal(docs.get('users/me').economy.gold,6, 'new completion reverses ten');
  assert.equal(docs.get('users/me').specialPointHistory.length,1);
  // Old ToDo amounts are reversible once; all new completions pay exactly one.
  docs.clear(); docs.set('users/me',{todoPoints:5}); docs.set('users/me/todos/old',{done:true,rewarded:true});
  await todoActions.toggleTodo('me','old',true);
  assert.equal(docs.get('users/me').economy.gold,0);
  await todoActions.toggleTodo('me','old',false);
  assert.equal(docs.get('users/me').economy.gold,1);
  await todoActions.toggleTodo('me','old',false); assert.equal(docs.get('users/me').economy.gold,1);
  p=docs.get('users/me');docs.set('users/me',{...p,economy:model.changeGold(p.economy,-1)});
  const todoBefore=JSON.stringify([...docs]);await assert.rejects(todoActions.toggleTodo('me','old',true),/ゴールド/);assert.equal(JSON.stringify([...docs]),todoBefore);
  await todoActions.deleteTodo('me','old');await economyActions.syncEconomy('me');assert.equal(docs.get('users/me').economy.lifetimePoints,1);
  // Goal cancellation updates score and stats together, but retains attained level.
  docs.clear();docs.set('users/me',{});docs.set('users/me/goals/g',{done:true,title:'Goal'});
  await goalActions.updateGoal('me','g',{done:false});
  assert.equal(docs.get('users/me').economy.lifetimePoints,0);
  assert.equal(docs.get('users/me').economy.highestLevel,2);
  assert.equal(docs.get('users/me').stats.goalsAchievedCount,0);
  await goalActions.updateGoal('me','g',{done:false});assert.equal(docs.get('users/me').economy.gold,0);
  docs.clear();docs.set('users/me',{});docs.set('users/me/goals/g',{done:true,title:'Goal'});
  await economyActions.syncEconomy('me');p=docs.get('users/me');docs.set('users/me',{...p,economy:model.changeGold(p.economy,-100)});
  const goalBefore=JSON.stringify([...docs]);await assert.rejects(goalActions.updateGoal('me','g',{done:false}),/ゴールド/);assert.equal(JSON.stringify([...docs]),goalBefore);
  await goalActions.deleteGoal('me','g');await economyActions.syncEconomy('me');assert.equal(docs.get('users/me').economy.lifetimePoints,100);
  // Conflicting transactions retry against the latest profile, not captured UI state.
  docs.clear(); docs.set('users/me',{});
  for (const id of ['a','b']) docs.set('users/me/habits/'+id,{text:id,type:'daily',point:2,dailyStreak:2,lastCompletedDate:'2026-09-02',pointHistory:[{date:'2026-09-01',point:1},{date:'2026-09-02',point:1}]});
  await Promise.all(['a','b'].map(id=>habitActions.setHabitCompletion('me',id,'2026-09-03',true)));
  assert.ok(retries>0,'realistic transaction conflicts were retried');
  assert.equal(docs.get('users/me').bonusPoints,5);
  assert.equal(docs.get('users/me').specialPointHistory.length,1);
  assert.equal(docs.get('users/me').economy.lifetimePoints,29);
  docs.set('users/me/todos/concurrent',{done:false});
  await Promise.all([todoActions.toggleTodo('me','concurrent',false),todoActions.toggleTodo('me','concurrent',false)]);
  assert.equal(docs.get('users/me').todoPoints,1);
  assert.equal(docs.get('users/me').economy.lifetimePoints,30);
  docs.set('users/me/goals/concurrent',{done:false});
  await Promise.all([goalActions.updateGoal('me','concurrent',{done:true}),goalActions.updateGoal('me','concurrent',{done:true})]);
  assert.equal(docs.get('users/me').economy.lifetimePoints,130);
  assert.equal(docs.get('users/me').economy.highestLevel,2);
  await goalActions.updateGoal('me','concurrent',{done:false});
  assert.equal(docs.get('users/me').economy.lifetimePoints,30);
  assert.equal(docs.get('users/me').economy.highestLevel,2);
  // Shop spending and cancellation cannot both use the same gold.
  docs.clear();docs.set('users/me',{fairy:{status:'ready'},fairyRoom:roomModel.createRoom(Date.now())});docs.set('users/me/goals/race',{done:true});
  const race=await Promise.allSettled([goalActions.updateGoal('me','race',{done:false}),roomActions.tradeFairyRoom('me',{type:'buy',shop:'elf',productId:'elf-potion',requestId:'race'})]);
  assert.equal(race.filter(result=>result.status==='fulfilled').length,1);
  assert.ok(docs.get('users/me').economy.gold>=0);
  assert.equal(docs.get('users/me').economy.highestLevel,2);
  console.log('PASS economy: lifetime/gold separation, 1:1 legacy migration, rollback/retry, direct purchases, gold sales, preserved ownership, preview migration and reversible normal rewards with permanent specials');
})().catch(e => { console.error(e); process.exitCode = 1; });
