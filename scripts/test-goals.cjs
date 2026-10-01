const economySupport = require('./economy-test-support.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, requireFn) {
  const context = {exports: {}, require: requireFn, Date, Map, console};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText, context);
  return context.exports;
}
const model=load('lib/goalModel.ts');
const rows=[
 {id:'a',title:'A',done:false,createdAt:'2026-09-10'},
 {id:'b',title:'B',done:true,createdAt:'2026-09-11'},
 {id:'c',title:'C',done:false,createdAt:'2026-09-12'},
 {id:'d',title:'D',done:false,createdAt:'2026-09-13'},
 {id:'e',title:'E',done:false,createdAt:'2026-09-14'},
];
const ids=list=>Array.from(list,g=>g.id).join(',');
assert.equal(ids(model.orderedGoals(rows)),'e,d,c,a,b');
const moved=model.moveGoal(rows,'a',0);
assert.equal(ids(moved),'a,e,d,c');
const ranked=moved.map((g,i)=>({...g,priorityOrder:i}));
assert.equal(ids(model.publicGoalList(ranked,{isPublic:true,showGoal:true})),'a,e,d');
assert.equal(ids(model.publicGoalList(ranked,{isPublic:true,showGoal:false,showGoals:true})),'');
assert.equal(ids(model.publicGoalList(ranked,{isPublic:false,showGoal:true})),'');
assert.equal(ids(model.publicGoalList(ranked,{isPublic:true,showGoals:true})),'a,e,d');
assert.equal(ids(model.publicGoalList(ranked.map(g=>g.id==='a'?{...g,done:true}:g),{isPublic:true,showGoal:true})),'e,d,c');
assert.equal(ids(model.publicGoalList(ranked.filter(g=>g.id!=='a'),{isPublic:true,showGoal:true})),'e,d,c');
assert.equal(ids(model.moveGoal(ranked,'a',3)),'e,d,c,a');
assert.equal(ids(model.moveGoal(rows,'b',0)),'e,d,c,a');
assert.equal(rows[0].priorityOrder,undefined);
const secretRows=rows.map(g=>g.id==='e'?{...g,secret:true}:g);
assert.equal(ids(model.orderedGoals(secretRows)),'d,c,a,e,b');
assert.equal(ids(model.orderedGoals(secretRows,true)),'e,d,c,a,b');
assert.equal(ids(model.publicGoalList(secretRows,{isPublic:true,showGoal:true})),'d,c,a');
assert.equal(model.isPublicGoal(ranked[3],{isPublic:true,showGoal:true}),true,'rank four is eligible');
assert.equal(model.isPublicGoal({...ranked[3],secret:true},{isPublic:true,showGoal:true}),false);
assert.equal(ids(model.moveGoal(secretRows,'a',0)),'a,d,c,e');

let local=rows.map(g=>({...g}));
const docs=new Map(rows.map(g=>['users/u/goals/'+g.id,{...g}]));
docs.set('users/u',{isPublic:true,showGoal:true});
docs.set('publicUsers/u',{name:'Existing user',recentAction:{type:'goal',text:'Completed private goal'}});
const ref=path=>({path,id:path.split('/').pop()});
const snapshot=r=>({id:r.id,ref:r,exists:()=>docs.has(r.path),data:()=>docs.get(r.path)});
const write=(r,patch)=>docs.set(r.path,{...(docs.get(r.path)||{}),...patch});
const firebase={
 doc:(_db,...parts)=>ref(parts.join('/')),
 collection:(_db,...parts)=>ref(parts.join('/')),
 getDocs:async r=>({docs:[...docs.keys()].filter(k=>k.startsWith(r.path+'/')).map(k=>snapshot(ref(k)))}),
 runTransaction:async(_db,fn)=>{
   const pending=[];
   await fn({get:async r=>snapshot(r),set:(r,p)=>pending.push(()=>write(r,p)),update:(r,p)=>pending.push(()=>write(r,p)),delete:r=>pending.push(()=>docs.delete(r.path))});
   pending.forEach(fn=>fn());
 },
 writeBatch:()=>{const pending=[];return {update:(r,p)=>pending.push(()=>write(r,p)),commit:async()=>pending.forEach(fn=>fn())};},
 updateDoc:async(r,p)=>write(r,p), deleteDoc:async r=>docs.delete(r.path), serverTimestamp:()=> '2026-09-14',
};
const actions=load('lib/goalActions.ts',name=>{
 if(name.includes('economyModel'))return economySupport.model;
 if(name.includes('economyActions'))return economySupport.actions(docs,ref);
 if(name==='firebase/firestore')return firebase;
 if(name==='@/lib/firebase')return {db:{}};
 if(name==='./goalModel')return model;
 if(name==='./dataPersistence')return {LS_KEYS:{GOALS:'goals'}};
 if(name==='./localActions')return {LocalStorageRepository:{getList:()=>local,saveList:(_k,rows)=>{local=rows;}}};
 throw new Error(name);
});
(async()=>{
 await actions.reorderGoals(null,moved);
 assert.equal(ids(model.orderedGoals(local)),'a,e,d,c,b');
 assert.equal(local.find(g=>g.id==='b').done,true);
 assert.equal(local.find(g=>g.id==='a').createdAt,'2026-09-10');
 await actions.reorderGoals('u',moved);
 assert.equal(ids(docs.get('publicUsers/u').publicGoals),'a,e,d');
 assert.equal(docs.get('publicUsers/u').recentAction,null);
 assert.equal(docs.get('publicUsers/u').name,'Existing user');
 await actions.updateGoal('u','c',{done:true});
 assert.equal(docs.get('publicUsers/u').recentAction.goalId,'c','fourth-ranked goal notifies');
 await actions.updateGoal('u','c',{secret:true});
 assert.equal(docs.get('publicUsers/u').recentAction,null,'making goal secret retracts achievement');
 await actions.updateGoal('u','c',{done:false});
 await actions.updateGoal('u','c',{done:true});
 assert.equal(docs.get('publicUsers/u').recentAction,null,'secret completion does not notify');
 await actions.updateGoal('u','c',{secret:false});
 assert.equal(docs.get('publicUsers/u').recentAction,null,'unsecreting does not retroactively notify');
 await actions.updateGoal('u','c',{done:false});
 await actions.updateGoal('u','a',{done:true});
 assert.equal(docs.get('publicUsers/u').recentAction.goalId,'a');
 await actions.syncPublicGoals('u');
 assert.equal(docs.get('publicUsers/u').recentAction.goalId,'a','sync keeps eligible achievement');
 assert.equal(ids(docs.get('publicUsers/u').publicGoals),'e,d,c');
 await actions.updateGoal('u','e',{title:'Updated title'});
 assert.equal(docs.get('publicUsers/u').publicGoals[0].title,'Updated title');
 await actions.deleteGoal('u','e');
 assert.equal(ids(docs.get('publicUsers/u').publicGoals),'d,c');
 await actions.syncPublicGoals('u', {showGoal:false}, {showGoal:false});
 assert.equal(docs.get('users/u').showGoal,false);
 assert.equal(docs.get('publicUsers/u').recentAction,null,'turning publication off retracts notification');
 await actions.updateGoal('u','d',{done:true});
 assert.equal(docs.get('publicUsers/u').recentAction,null,'disabled publication does not notify');
 assert.equal(docs.get('publicUsers/u').publicGoals.length,0);
 const discovery=load('lib/friendDiscovery.ts');
 const publicData={isPublic:true,showGoal:true,publicGoals:[...ranked,...ranked]};
 assert.equal(discovery.discoveryProfile('u',publicData).publicGoals.length,3);
 assert.equal(discovery.discoveryProfile('u',{...publicData,showGoal:false,showGoals:true}).publicGoals.length,0);
 console.log('PASS goal ranking, completed placement, move persistence, top-three publication, settings and legacy privacy');
})().catch(error=>{console.error(error);process.exitCode=1;});

// Render the actual goal component to verify numbered active controls and completed placement.
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const messages = JSON.parse(fs.readFileSync('messages/ja.json','utf8'));
const DreamView=load('app/components/DreamView.tsx',name=>{
 if(name.includes('useOptimisticCompletion')) return load('hooks/useOptimisticCompletion.ts', dep => dep.includes('afterPaint') ? {afterPaint: async()=>{}} : require(dep));
 if(name==='./DragOrderHandle')return {default:load('app/components/DragOrderHandle.tsx', dep => dep==='next-intl'?{useLocale:()=> 'ja'}:require(dep)).default};
 if(name==='react')return React;
 if(name==='react/jsx-runtime')return require(name);
 if(name==='next-intl')return {useTranslations:section=>(key,values={})=>Object.entries(values).reduce((s,[k,v])=>s.replace(`{${k}}`,String(v)),messages[section][key]||key)};
 if(name==='@/lib/goalModel')return model;
 if(name==='@/lib/goalActions')return {};
 if(name==='@/lib/profileActions')return {};
 if(name==='@/lib/fairy/events')return {};
 throw new Error(name);
});

const noop=()=>{};
const html=renderToStaticMarkup(React.createElement(DreamView.default,{
 uid:null,profile:{dream:'',stats:{}},goals:rows,goalInput:'',dreamInput:'',deadline:'',editingGoalId:null,editingGoalText:'',isEditingDream:false,
 setProfile:noop,setDreamInput:noop,setIsEditingDream:noop,setGoalInput:noop,setDeadline:noop,setEditingGoalId:noop,setEditingGoalText:noop,
 tabButtonStyle:{},checkLimit:()=>true,incrementStats:async()=>{},
}));
assert.equal((html.match(/<select/g)||[]).length,0);
assert.equal((html.match(/ドラッグで並べ替え（上下キーでも移動）/g)||[]).length,4);
assert.equal(html.includes('aria-label="4番"'),true);
assert.equal(html.includes('aria-label="5番"'),false);
assert.ok(html.lastIndexOf('>B</div>') > html.lastIndexOf('>A</div>'));
assert.ok(html.includes('⚠️ 目標は他のユーザーに公開される場合があります。'));
assert.ok(html.includes('秘密の目標'));
console.log('PASS goal UI: numbered active goals, drag handles and completed goals at the bottom');
