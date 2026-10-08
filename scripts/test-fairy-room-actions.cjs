const economySupport = require('./economy-test-support.cjs');
// Verify the actual persistence boundary with an atomic Firestore transaction double.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, require = () => ({}), extra = {}) {
  const context = { exports: {}, require, ...extra };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return context.exports;
}
const now = Date.parse('2026-09-12T03:00:00Z');
class Clock extends Date { static now() { return now; } }
const loader=require('./load-model.cjs');
const model=loader.load('../lib/fairyRoomModel.ts'),shopModel=loader.load('../lib/shopModel.ts'),completionModel=loader.load('../lib/habits/completionModel.ts');loader.restore();
const docs = new Map();
let fail = false;
const api = {
  doc: (_db, ...parts) => parts.join('/'),
  updateDoc: async (ref, data) => docs.set(ref, { ...docs.get(ref), ...data }),
  runTransaction: async (_db, fn) => {
    const pending = [];
    const result = await fn({ get: async ref => ({ data: () => docs.get(ref) }), update: (ref, data) => pending.push([ref, data]), set: (ref, data) => pending.push([ref, data]) });
    if (fail) throw new Error('offline');
    pending.forEach(([ref, data]) => docs.set(ref, { ...docs.get(ref), ...data }));
    return result;
  },
};
const auth = { currentUser: { uid: 'me', isAnonymous: false } };
const resolve = name => name.includes('completionModel') ? completionModel : name.includes('economyModel') ? economySupport.model : name.includes('economyActions') ? economySupport.actions(docs) : name.includes('legacyShopOwnership') ? {legacyShopPurchases:()=>[]} : name === 'firebase/firestore' ? api : name.includes('shopModel')?shopModel:name.includes('fairyRoomModel') ? model
  : name.includes('dateUtils') ? { formatDateToJST: () => '2026-09-12' }
  : name.includes('firebase') ? { db: {}, auth } : {};
const { updateHabitFields, setHabitCompletion } = load('lib/habits/updateHabitFields.ts', resolve, { Date: Clock });
const { syncFairyRoom,tradeFairyRoom } = load('lib/fairyRoomActions.ts', resolve, { Date: Clock });
(async () => {
  const profile = { fairy: { status: 'ready', bornAt: '2026-09-12' }, fairyRoom: { ...model.createRoom(now), health: 0, energy:50, sleeping: true } };
  docs.set('users/me', profile);
  docs.set('users/me/habits/a', { text: 'Walk', pointHistory: [] });
  await updateHabitFields('me', 'a', { text: 'Read' });
  assert.equal(docs.get('users/me').fairyRoom.health, 0, 'renaming does not heal');
  await updateHabitFields('me', 'a', { pointHistory: [{ date: '2026-09-11', point: 1 }] });
  assert.equal(docs.get('users/me').fairyRoom.health, 0, 'backdating does not heal');
  const checked = { pointHistory: [{ date: '2026-09-12', point: 1 }] };
  fail = true;
  await assert.rejects(updateHabitFields('me', 'a', checked));
  assert.equal(docs.get('users/me').fairyRoom.health, 0);
  assert.equal(docs.get('users/me/habits/a').pointHistory[0].date, '2026-09-11', 'failed transaction saves neither side');
  fail = false;
  await updateHabitFields('me', 'a', checked);
  assert.equal(docs.get('users/me').fairyRoom.health, 0);
  assert.equal(docs.get('users/me').fairyRoom.energy, 55);
  assert.equal(docs.get('users/me').fairyRoom.sleeping, true);
  await updateHabitFields('me', 'a', { pointHistory: [] });
  await updateHabitFields('me', 'a', checked);
  assert.equal(docs.get('users/me').fairyRoom.energy, 55, 'uncheck/recheck cannot farm recovery');
  docs.set('users/me', { ...profile, fairyRoom: model.createRoom(now) });
  const trip = await syncFairyRoom('me', 13, 'forest');
  assert.equal(trip.highestLevel, 13);
  assert.equal(docs.get('users/me').fairyRoom.energy, 100);
  await assert.rejects(syncFairyRoom('me', 13, 'forest'));
  const beforeBlockedTrade=JSON.stringify(docs.get('users/me'));
  await assert.rejects(tradeFairyRoom('me',{type:'buy',shop:'elf',productId:'elf-potion',requestId:'blocked-adventure'}),/冒険中/);
  assert.equal(JSON.stringify(docs.get('users/me')),beforeBlockedTrade);
  assert.equal(docs.get('users/me').fairyRoom.adventure.reward, trip.adventure.reward);
  docs.set('users/me', { ...profile, fairyRoom: { ...trip, adventure: { ...trip.adventure, returnsAt: now } } });
  const returned = await syncFairyRoom('me', 13);
  assert.equal(returned.adventurePoints, trip.adventure.reward);
  assert.equal((await syncFairyRoom('me', 13)).adventurePoints, trip.adventure.reward);
  assert.equal(docs.get('users/me').fairyRoom.energy, 100);
  docs.set('users/me',{...profile,bonusPoints:100,fairyRoom:{...model.createRoom(now),coins:100,materials:{'forest-herb':2}}});
  const purchase={type:'buy',shop:'elf',productId:'elf-potion',requestId:'purchase-1'};
  fail=true;await assert.rejects(tradeFairyRoom('me',purchase));assert.equal(docs.get('users/me').fairyRoom.coins,100);assert.equal(docs.get('users/me').fairyRoom.inventory['elf-potion'],undefined);
  fail=false;await tradeFairyRoom('me',purchase);await tradeFairyRoom('me',purchase);
  assert.equal(docs.get('users/me').economy.gold,190);assert.equal(docs.get('users/me').fairyRoom.inventory['elf-potion'],1);
  assert.equal(docs.get('users/me').fairyRoom.energy,100);
  const sale={type:'sell',shop:'elf',materialId:'forest-herb',quantity:2,requestId:'sale-1'};
  fail=true;await assert.rejects(tradeFairyRoom('me',sale));assert.equal(docs.get('users/me').fairyRoom.materials['forest-herb'],2);
  fail=false;await tradeFairyRoom('me',sale);assert.equal(docs.get('users/me').fairyRoom.coins,undefined);assert.equal(docs.get('users/me').economy.gold,200);assert.equal(docs.get('users/me').fairyRoom.materials['forest-herb'],0);
  assert.equal(docs.get('users/me').fairyRoom.energy,100);
  const {energy:unused,...oldRoom}=model.createRoom(now-30*86400000);
  docs.set('users/me',{...profile,fairyRoom:{...oldRoom,health:37}});
  await syncFairyRoom('me',1);
  assert.equal(docs.get('users/me').fairyRoom.energy,100);
  assert.equal(docs.get('users/me').fairyRoom.health,37);
  // Exercise the real completion plan, not only the legacy field-update entry point.
  docs.set('users/me',{...profile,fairyRoom:{...model.createRoom(now),health:3,energy:45,sleeping:true}});
  const beforeSleepingTrade=JSON.stringify(docs.get('users/me'));
  await assert.rejects(tradeFairyRoom('me',{type:'buy',shop:'fairy',productId:'closet',requestId:'blocked-sleep'}),/冬眠中/);
  await assert.rejects(syncFairyRoom('me',1,'forest'),/冬眠中/);
  assert.equal(JSON.stringify(docs.get('users/me')),beforeSleepingTrade);
  for(const id of ['b','c']) docs.set(`users/me/habits/${id}`,{text:'Walk',dailyStreak:0,lastCompletedDate:null,point:0,pointHistory:[]});
  fail=true;
  await assert.rejects(setHabitCompletion('me','b','2026-09-12',true));
  assert.equal(docs.get('users/me').fairyRoom.energy,45);
  assert.equal(docs.get('users/me/habits/b').pointHistory.length,0);
  fail=false;
  await setHabitCompletion('me','b','2026-09-12',true);
  assert.equal(docs.get('users/me').fairyRoom.energy,50);
  assert.equal(docs.get('users/me').fairyRoom.sleeping,true);
  await setHabitCompletion('me','c','2026-09-12',true);
  assert.equal(docs.get('users/me').fairyRoom.energy,55);
  assert.equal(docs.get('users/me').fairyRoom.health,3);
  assert.equal(docs.get('users/me').fairyRoom.sleeping,true);
  await setHabitCompletion('me','c','2026-09-12',true);
  await setHabitCompletion('me','c','2026-09-12',false);
  await setHabitCompletion('me','c','2026-09-12',true);
  assert.equal(docs.get('users/me').fairyRoom.energy,55);
  auth.currentUser.uid = 'someone-else';
  await assert.rejects(tradeFairyRoom('me',purchase));
  await assert.rejects(syncFairyRoom('me', 13));
  console.log('Fairy room persistence: atomic habit recovery, failure rollback, past-date edits, repeat checks, departure/return and account guard passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
