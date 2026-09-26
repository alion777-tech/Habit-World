const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const data=new Map();let failProfile=false,notifications=0;
const keys={PROFILE:'profile_v2',HABITS:'habits_v2',GOALS:'goals_v2',TODOS:'todos_v2'};
const storage={getItem:k=>data.get(k)??null,setItem(k,v){if(failProfile&&k===keys.PROFILE)throw Error('quota');data.set(k,v);},removeItem:k=>data.delete(k)};
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const c={exports:{},localStorage:storage,window:{},Date,Intl,console,crypto:require('node:crypto'),require(name){if(name==='firebase/firestore')return {};if(name.endsWith('/firebase')||name==='./firebase')return {auth:{currentUser:null},db:{}};if(name.endsWith('dataPersistence'))return {LS_KEYS:keys,notifyLocalStorageChange:()=>notifications++};const target=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name);if(target.endsWith('.json'))return JSON.parse(fs.readFileSync(target,'utf8'));return load(target.endsWith('.ts')?target:target+'.ts');}};cache.set(file,c.exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,c);return c.exports;}
const todo=load('lib/todoActions.ts'),habit=load('lib/habits/updateHabitFields.ts'),goal=load('lib/goalActions.ts'),economy=load('lib/economyActions.ts'),model=load('lib/economyModel.ts'),local=load('lib/localActions.ts').LocalStorageRepository;
(async()=>{
 local.setProfile({});local.saveList(keys.TODOS,[{id:'a',text:'Task',done:false}]);
 await todo.toggleTodo(null,'a',false);assert.equal(local.getProfile().economy.gold,1);
 await todo.toggleTodo(null,'a',true);assert.equal(local.getProfile().economy.gold,0);
 await todo.toggleTodo(null,'a',false);await todo.deleteTodo(null,'a');assert.equal(local.getProfile().economy.gold,1);
 local.saveList(keys.GOALS,[{id:'g',title:'Goal',done:false}]);await goal.updateGoal(null,'g',{done:true});assert.equal(local.getProfile().economy.gold,101);
 await goal.updateGoal(null,'g',{done:false});assert.equal(local.getProfile().economy.gold,1);assert.equal(local.getProfile().economy.highestLevel,2);
 local.saveList(keys.HABITS,[{id:'h',text:'Habit',point:0,pointHistory:[],dailyStreak:0,lastCompletedDate:null,type:'daily'}]);
 for(let day=1;day<=3;day++)await habit.setHabitCompletion(null,'h','2026-09-0'+day,true);
 assert.equal(local.getProfile().economy.gold,9);assert.equal(local.getProfile().bonusPoints,5);
 await habit.setHabitCompletion(null,'h','2026-09-03',false);assert.equal(local.getProfile().economy.gold,8);
 await habit.setHabitCompletion(null,'h','2026-09-03',true);assert.equal(local.getProfile().economy.gold,9);
 let p=local.getProfile();local.setProfile({...p,economy:model.changeGold(p.economy,-9)});
 const before=JSON.stringify([...data]);await assert.rejects(habit.setHabitCompletion(null,'h','2026-09-03',false),/ゴールド/);assert.equal(JSON.stringify([...data]),before);
 // A failure writing the wallet restores the list and emits no partial snapshot.
 local.saveList(keys.TODOS,[{id:'b',text:'Retry',done:false}]);economy.syncLocalEconomy();const snapshot=JSON.stringify([...data]),observed=notifications;
 failProfile=true;await assert.rejects(todo.toggleTodo(null,'b',false),/quota/);failProfile=false;
 assert.equal(JSON.stringify([...data]),snapshot);assert.equal(notifications,observed);
 await todo.toggleTodo(null,'b',false);assert.equal(local.getProfile().economy.gold,1);
 console.log('PASS local completion: normal reversals, permanent specials/level, deletion, insufficient-gold rejection, atomic notification and quota rollback');
})().catch(e=>{console.error(e);process.exitCode=1;});
