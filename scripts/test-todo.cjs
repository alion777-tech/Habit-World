const economySupport = require('./economy-test-support.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const context = { exports: {}, Date, Math };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/todoModel.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const m = context.exports;
assert.equal(m.addDays('2026-12-31',1),'2027-01-01');
assert.equal(m.weekEnd('2026-09-13'),'2026-09-13');
assert.equal(m.nextOccurrence('2026-09-14',{unit:'week',interval:1,weekday:1}),'2026-09-21');
assert.equal(m.nextOccurrence('2026-09-18',{unit:'week',interval:2,weekday:5}),'2026-10-02');
assert.equal(m.nextOccurrence('2026-01-31',{unit:'month',interval:1,monthDay:31}),'2026-02-28');
assert.equal(m.nextOccurrence('2026-02-28',{unit:'month',interval:1,monthDay:31}),'2026-03-31');
assert.equal(m.nextOccurrence('2028-01-31',{unit:'month',interval:1,monthDay:'last'}),'2028-02-29');
assert.equal(m.nextOccurrence('2026-09-01',{unit:'month',interval:3,monthDay:1}),'2026-12-01');
const base = { id:'old', text:'Legacy', done:false };
assert.equal(m.completionChanges(base,'2026-09-10','now').reward,5);
assert.equal(m.completionChanges({...base,done:true,rewarded:true},'2026-09-10','now').reward,0);
assert.equal(m.completionChanges({...base,rewarded:true},'2026-09-10','now').reward,0);
const recurring={...base,startDate:'2026-08-30',dueDate:'2026-09-01',recurrence:{unit:'month',interval:1,monthDay:1},subtasks:[{id:'s',text:'review',done:true}]};
const result=m.completionChanges(recurring,'2026-09-10','now');
assert.equal(result.next.dueDate,'2026-10-01');
assert.equal(result.next.startDate,'2026-09-29');
assert.equal(result.next.subtasks[0].done,false);
assert.equal(m.completionChanges({...recurring,nextTodoId:'next'},'2026-09-10','now').next,null);
assert.equal(m.reminderActive({...base,dueDate:'2026-09-30',reminderDays:7},'2026-09-22'),false);
assert.equal(m.reminderActive({...base,dueDate:'2026-09-30',reminderDays:7},'2026-09-23'),true);
assert.equal(m.reminderActive({...base,done:true,dueDate:'2026-09-30',reminderDays:7},'2026-09-23'),false);
assert.equal(m.isOverdue({...base,dueDate:'2026-09-09'},'2026-09-10'),true);
assert.equal(m.isOverdue({...base,dueDate:'2026-09-10'},'2026-09-10'),false);
assert.equal(m.homeTodos([base,{...base,dueDate:'2026-09-10'},{...base,dueDate:'2026-09-16',priority:'high'},{...base,dueDate:'2027-01-01',priority:'high'}],'2026-09-10').length,2);
console.log('ToDo: 20 date, recurrence, reminder, reward and Home checks passed');

// Exercise existing local persistence and the Firestore transaction branch with a fake store.
const crypto = require('node:crypto');
const storage = new Map();
let profile = {};
const repository = {
  getList: key => JSON.parse(storage.get(key) || '[]'),
  saveList: (key, list) => storage.set(key,JSON.stringify(list)),
  addItem(key,item) { this.saveList(key,[...this.getList(key),item]); },
  updateItem(key,id,fields) { this.saveList(key,this.getList(key).map(t=>t.id===id?{...t,...fields}:t)); },
  deleteItem(key,id) { this.saveList(key,this.getList(key).filter(t=>t.id!==id)); },
  getProfile: () => profile,
  setProfile: p => { profile=p; },
};
const docs = new Map();
let generated=0;
const firestore={
  collection: (_db,...parts)=>parts.join('/'),
  doc: (...parts)=> { const path = parts.length===1 ? `${parts[0]}/generated-${++generated}` : parts.slice(1).join('/'); return {path,id:path.split('/').pop()}; },
  serverTimestamp: ()=> 'server-time', increment: n=>({increment:n}),
  runTransaction: async (_db,fn)=> {
    const writes=[];
    const write=(ref,value)=>writes.push(()=> {
      const old=docs.get(ref.path)||{};
      const patch={...value};
      for(const key in patch) if(patch[key] && patch[key].increment) patch[key]=(old[key]||0)+patch[key].increment;
      docs.set(ref.path,{...old,...patch});
    });
    await fn({get:async ref=>({exists:()=>docs.has(ref.path),data:()=>docs.get(ref.path)}),update:write,set:write});
    writes.forEach(w=>w());
  },
};
const actionContext={exports:{},crypto,Date,require: name=> {
  if(name.includes('economyModel')) return economySupport.model;
  if(name.includes('economyActions')) return economySupport.actions(docs,path=>({path,id:path.split('/').pop()}),repository);
  if(name==='firebase/firestore') return firestore;
  if(name.includes('firebase')) return {db:{}};
  if(name.includes('localActions')) return {LocalStorageRepository:repository};
  if(name.includes('dataPersistence')) return {LS_KEYS:{TODOS:'todos'}};
  if(name.includes('todoModel')) return m;
  if(name.includes('dateUtils')) return {formatDateToJST:()=> '2026-09-10'};
  throw new Error(name);
}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/todoActions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,actionContext);
(async()=> {
 const a=actionContext.exports;
 await a.addTodo(null,'Shopping',{memo:'Keep me',categoryId:'shopping'});
 const id=repository.getList('todos')[0].id;
 await a.updateTodo(null,id,{text:'Milk',priority:'high'});
 assert.equal(repository.getList('todos')[0].memo,'Keep me');
 await a.toggleTodo(null,id,false); await a.toggleTodo(null,id,false);
 assert.equal(profile.todoPoints,5);
 assert.ok(repository.getList('todos')[0].completedAt);
 await a.toggleTodo(null,id,true); await a.toggleTodo(null,id,false);
 assert.equal(profile.todoPoints,5);
 await a.deleteTodo(null,id); assert.equal(profile.todoPoints,5);
 await a.saveTodoCategories(null,[{id:'shopping',name:'Groceries'}]);
 assert.equal(profile.todoCategories[0].name,'Groceries');
 docs.set('users/test/todos/old',recurring);
 await a.toggleTodo('test','old',false); await a.toggleTodo('test','old',false);
 assert.equal(docs.get('users/test').todoPoints,5);
 assert.ok(docs.get('users/test/todos/old').nextTodoId);
 assert.equal([...docs.keys()].filter(k=>k.includes('generated-')).length,1);
 await a.toggleTodo('test','old',true); await a.toggleTodo('test','old',false);
 assert.equal(docs.get('users/test').todoPoints,5);
 assert.equal([...docs.keys()].filter(k=>k.includes('generated-')).length,1);
 console.log('ToDo persistence: local edits/rewards/categories and transaction idempotency passed');
})().catch(error=>{console.error(error);process.exitCode=1;});

(async () => {
  let storedProfile={todoPoints:5,todoCategories:[{id:'shopping',name:'買い物'}]};
  const syncDocs=new Map();
  syncDocs.set('users/import-user',{todoPoints:15,todoCategories:[{id:'work',name:'仕事'}]});
  let rejectPublic=true;
  const merge=(ref,data)=>syncDocs.set(ref.path,{...(syncDocs.get(ref.path)||{}),...data});
  const syncFirestore={...firestore,
    setDoc:async(ref,data)=>{ if(ref.path.startsWith('publicUsers') && rejectPublic) throw new Error('Simulated interruption'); merge(ref,data); },
    runTransaction:async(_db,fn)=>{ const pending=[]; await fn({get:async ref=>({data:()=>syncDocs.get(ref.path)}),set:(ref,data)=>pending.push(()=>merge(ref,data))});pending.forEach(f=>f()); },
  };
  const syncContext={exports:{},crypto,console:{log(){}},localStorage:{removeItem:()=>{}},require:name=> {
    if(name.includes('economyActions')) return economySupport.actions(syncDocs,path=>({path,id:path.split('/').pop()}),{getProfile:()=>storedProfile,setProfile:p=>{storedProfile=p;}});
    if(name==='firebase/firestore') return syncFirestore;
    if(name==='./goalActions') return {syncPublicGoals:async()=>{}};
    if(name==='./firebase') return {db:{}};
    if(name==='./dataPersistence') return {LS_KEYS:{PROFILE:'profile',HABITS:'habits',GOALS:'goals',TODOS:'todos'}};
    if(name==='./localActions') return {LocalStorageRepository:{getProfile:()=>storedProfile,setProfile:p=>{storedProfile=p;},getList:()=>[]}};
    throw new Error(name);
  }};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/syncActions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,syncContext);
  await assert.rejects(()=>syncContext.exports.syncLocalDataToFirestore('import-user'));
  assert.equal(syncDocs.get('users/import-user').todoPoints,20);
  rejectPublic=false;
  await syncContext.exports.syncLocalDataToFirestore('import-user');
  assert.equal(syncDocs.get('users/import-user').todoPoints,20);
  assert.equal(syncDocs.get('users/import-user').todoCategories.length,2);
  assert.equal(syncDocs.get('publicUsers/import-user').todoCategories,undefined);
  assert.equal(syncDocs.get('publicUsers/import-user').todoPoints,undefined);
  console.log('ToDo import: interrupted retry, existing points/categories, private metadata passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
