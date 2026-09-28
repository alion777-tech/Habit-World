const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
function load(file,extra={}) {const c={exports:{},...extra};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,c);return c.exports;}
const m=load('lib/cardOrder.ts');
const h=(id,priorityOrder,done=false)=>({id,priorityOrder,pointHistory:done?[{date:'2026-09-30',point:10}]:[]});
const habits=[h('a',0),h('hidden',1),h('b',2),h('done',3,true),h('c',4)];
assert.equal(m.moveVisibleHabit(habits,['a','b','c'],'c','a').map(h=>h.id).join(','),'c,hidden,a,done,b');
assert.equal(m.orderedHabits(habits,'2026-09-30').map(h=>h.id).join(','),'a,hidden,b,c,done');
const goals=[{id:'today',deadline:'2026-01-31'},{id:'boundary',deadline:'2026-02-28'},{id:'late',deadline:'2026-03-01'},{id:'past',deadline:'2026-01-30'},{id:'none'},{id:'done',done:true,deadline:'2026-02-01'}];
assert.equal(m.upcomingGoals(goals,'2026-01-31').map(g=>g.id).join(','),'today,boundary');
assert.equal(m.upcomingGoals([{id:'leap',deadline:'2028-02-29'}],'2028-01-31').length,1);
assert.equal(m.upcomingGoals([{id:'year',deadline:'2027-01-15'}],'2026-12-15').length,1);
// Exercise actual handle events, including pointer cancellation and group boundaries.
const rows=['a','b','done'].map((id,i)=>({dataset:{orderId:id,orderGroup:i===2?'done':'open'},classList:{add(){},remove(){}},closest(){return null}}));
let hit=rows[1],moved=[];
const react={useRef:v=>({current:v}),useState:v=>[v,()=>{}],useEffect(){}};
const Handle=load('app/components/DragOrderHandle.tsx',{require:n=>n==='react'?react:n==='next-intl'?{useLocale:()=> 'ja'}:{jsx:(type,props)=>({type,props})},document:{querySelectorAll:()=>rows,elementFromPoint:()=>({closest:()=>hit})},requestAnimationFrame:()=>1,cancelAnimationFrame(){}}).default;
const props=Handle({id:'a',group:'open',onMove:id=>moved.push(id)}).props;
const event={isPrimary:true,button:0,pointerId:1,clientX:0,clientY:0,preventDefault(){},currentTarget:{setPointerCapture(){}}};
props.onPointerDown(event);props.onPointerUp(event);assert.deepEqual(moved,['b']);
props.onPointerDown(event);props.onPointerCancel();props.onPointerUp(event);assert.deepEqual(moved,['b']);
hit=rows[2];props.onPointerDown(event);props.onPointerUp(event);assert.deepEqual(moved,['b']);
props.onKeyDown({key:'ArrowDown',preventDefault(){}});assert.deepEqual(moved,['b','b']);
console.log('PASS: hidden habit slots, completion grouping, month/leap/year deadlines, pointer drop/cancel/group boundary and keyboard ordering');
// Persistence changes only order fields; a failed batch leaves the saved order intact.
(async()=>{
let docs=new Map([['users/u/habits/a',{point:10,priorityOrder:0}],['users/u/habits/b',{point:1,priorityOrder:1}]]),fail=false;
let local=[{id:'a',point:10},{id:'b',point:1}];
const actions=load('lib/habitActions.ts',{require:n=>n==='firebase/firestore'?{doc:(_db,...p)=>p.join('/'),writeBatch:()=>{let pending=[];return {update:(r,v)=>pending.push([r,v]),commit:async()=>{if(fail)throw Error('offline');pending.forEach(([r,v])=>docs.set(r,{...docs.get(r),...v}));}}}}:n.includes('firebase')?{db:{}}:n.includes('localActions')?{LocalStorageRepository:{getList:()=>local,saveList:(_k,v)=>local=v}}:n.includes('dataPersistence')?{LS_KEYS:{HABITS:'h'}}:{}});
await actions.reorderHabits('u',[{id:'b'},{id:'a'}]);assert.equal(docs.get('users/u/habits/b').priorityOrder,0);assert.equal(docs.get('users/u/habits/a').point,10);
fail=true;await assert.rejects(actions.reorderHabits('u',[{id:'a'},{id:'b'}]));assert.equal(docs.get('users/u/habits/b').priorityOrder,0);
await actions.reorderHabits(null,[{id:'b'},{id:'a'}]);assert.equal(local.find(h=>h.id==='b').priorityOrder,0);assert.equal(local[0].point,10);
console.log('PASS: habit cloud/local rank persistence and failed-batch rollback preserve rewards');
})().catch(e=>{console.error(e);process.exitCode=1;});
