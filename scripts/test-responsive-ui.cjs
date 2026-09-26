const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const compile = text => ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
(async () => {
  // The scheduling helper runs work after the frame callback, with a hidden-tab fallback.
  for (const hidden of [false, true]) {
    let frame, serial=0, resolved=false;
    const timers=new Map();
    const scheduler={exports:{},setTimeout:(fn,delay)=>{timers.set(++serial,{fn,delay});return serial;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{frame=fn;return 1;},cancelAnimationFrame:()=>{frame=null;}};
    vm.runInNewContext(compile(fs.readFileSync('lib/afterPaint.ts','utf8')),scheduler);
    const done=scheduler.exports.afterPaint().then(()=>{resolved=true;});
    assert.equal(resolved,false);
    if(!hidden) { frame(); assert.equal(resolved,false); }
    [...timers.values()].find(t=>t.delay===(hidden?100:0)).fn();
    await done; assert.equal(resolved,true); assert.equal(timers.size,0); assert.equal(frame,null);
  }
  // Execute the real page event handler against a delayed persistence operation.
  const source=fs.readFileSync('app/[locale]/page.tsx','utf8');
  const handler=source.slice(source.indexOf('  const handleToggleHabit ='),source.indexOf('  const handleDeleteHabit ='));
  for(const success of [true,false]) {
    const wait=deferred(), paint=deferred();let calculations=0;let pending=null, busy=false, error='', canonical=[{id:'h',pointHistory:[]}];
    const fields={point:1,pointHistory:[{date:'2026-09-27',point:1}]};
    const context={exports:{},habitUnavailable:false,habitLock:{current:false},auth:{currentUser:{uid:'me'}},uid:'me',habits:canonical,activeHabitDate:'2026-09-27',habitDate:{today:'2026-09-27',yesterday:'2026-09-26'},profile:{stats:{}},totalPoint:0,level:1,
      setHabitBusy:v=>busy=v,setHabitError:v=>error=v,setPendingHabit:v=>pending=v,setHabits:fn=>canonical=fn(canonical),afterPaint:()=>paint.promise,calcToggleHabit:()=>{calculations++;return ({kind:'check',fields,pointDelta:1});},updateHabitFields:()=>wait.promise,announceFairy(){},saveUserProfile:async()=>{},setProfile(){},alert(){}};
    vm.runInNewContext(compile(handler+'\nexports.toggle=handleToggleHabit;'),context);
    const operation=context.exports.toggle('h');
    assert.equal(pending.fields.pointHistory[0].date,'2026-09-27','completion appears before calculation');
    assert.equal(pending.fields.pointHistory[0].point,0,'display placeholder never earns points');
    assert.equal(calculations,0,'calculation waits for paint opportunity');
    paint.resolve(); await new Promise(resolve=>setImmediate(resolve));
    assert.equal(calculations,1);
    assert.equal(canonical[0].pointHistory.length,0,'unconfirmed result cannot earn rewards');
    assert.equal(busy,true);
    if(success)wait.resolve();else wait.reject(new Error('offline'));
    await operation;
    assert.equal(pending,null);assert.equal(busy,false);
    assert.equal(canonical[0].pointHistory.length,success?1:0);
    assert.equal(!!error,!success);
  }
  // Render the real ToDo component with a small hooks harness.
  const values=[];let cursor=0, wait=deferred(),calls=0;
  const react={useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return [values[i],v=>values[i]=typeof v==='function'?v(values[i]):v];},useRef(initial){const i=cursor++;return values[i]??(values[i]={current:initial});},useEffect(){}};
  const jsx=(type,props)=>({type,props});
  const context={exports:{},require:name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='next-intl'?{useLocale:()=> 'ja'}:name.includes('todoActions')?{addTodo:()=>{calls++;return wait.promise;}}:name.includes('todoModel')?{DEFAULT_CATEGORIES:[]}: {},console};
  vm.runInNewContext(compile(fs.readFileSync('app/components/TodoView.tsx','utf8')),context);
  const render=()=>{cursor=0;return context.exports.default({uid:'me',todos:[],today:'2026-09-27',checkLimit:()=>true,incrementStats:()=>{throw Error('extra sequential save');}});};
  const all=node=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(all):[node,...all(node.props?.children)];
  const input=tree=>all(tree).find(n=>n.type==='input'&&n.props['aria-label']==='タスク名');
  let tree=render();input(tree).props.onChange({target:{value:'牛乳'}});tree=render();
  all(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
  tree=render();assert.equal(input(tree).props.value,'');assert.equal(calls,1);
  input(tree).props.onChange({target:{value:'卵'}});
  wait.reject(Error('offline'));await new Promise(resolve=>setImmediate(resolve));
  tree=render();assert.equal(input(tree).props.value,'卵','failure preserves newer input');
  assert.ok(all(tree).some(n=>n.props?.role==='alert'));
  assert.ok(JSON.stringify(tree).includes('牛乳'),'failed text remains available');
  wait=deferred();all(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(input(render()).props.value,'');wait.resolve();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(input(render()).props.value,'');
  console.log('PASS responsive UI: immediate habit feedback, confirmed rewards only, rollback, immediate ToDo input clear, failure preserves newer text, no second save');
})().catch(e=>{console.error(e);process.exitCode=1;});
