const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('hooks/useOptimisticCompletion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
function harness(){const state=[];let cursor=0,effects=[];const paint=deferred();const react={useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],v=>state[i]=typeof v==='function'?v(state[i]):v];},useRef(initial){const i=cursor++;return state[i]??(state[i]={current:initial});},useEffect(fn){effects.push(fn);}};const c={exports:{},require:n=>n==='react'?react:{afterPaint:()=>paint.promise}};vm.runInNewContext(code,c);return {paint,render(source,owner='me'){cursor=0;effects=[];const result=c.exports.useOptimisticCompletion(source,owner);effects.forEach(fn=>fn());return result;}};}
(async()=>{
 for(const from of [false,true])for(const success of [false,true]){
  const h=harness(), source=[{id:'a',done:from}],save=deferred();let calls=0;
  const operation=h.render(source).complete('a',!from,()=>{calls++;return save.promise;});
  assert.equal(h.render(source).items[0].done,!from);assert.equal(source[0].done,from);assert.equal(calls,0);
  assert.equal(await h.render(source).complete('a',!from,()=>{calls++;}),false);
  h.paint.resolve();await new Promise(r=>setImmediate(r));assert.equal(calls,1);
  if(success){save.resolve();await operation;assert.equal(h.render(source).items[0].done,!from);const saved=[{id:'a',done:!from}];h.render(saved);assert.equal(h.render(saved).items[0].done,!from);}
  else {save.reject(Error('offline'));await assert.rejects(operation);assert.equal(h.render(source).items[0].done,from);}
 }
 const h=harness(),source=[{id:'a',done:false}];let writes=0;const op=h.render(source).complete('a',true,async()=>{writes++;});h.render(source,'other');h.paint.resolve();await op;assert.equal(writes,0);assert.equal(h.render(source,'other').items[0].done,false);
 console.log('PASS optimistic completion: check/uncheck feedback before save, duplicate guard, rollback, delayed snapshot handoff and account change');
})().catch(e=>{console.error(e);process.exitCode=1;});
