const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const bank = require("../data/fairy/ja.json");
function compile(path) {
  return ts.transpileModule(fs.readFileSync(path, "utf8"), {compilerOptions:{
    target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }}).outputText;
}
const dialogue = {};
vm.runInNewContext(compile("lib/fairy/dialogue.ts"), {exports:dialogue,require:p=>p.endsWith("ja.json")?bank:require("../data/fairy/en.json")});
function harness(storageFails = false, ready = true) {
  const effects=[], states=[], listeners=new Map(), timers=new Map(), intervals=new Map();
  let id=0;
  const exports={};
  const sprite={current:{dataset:{action:"rest"}}};
  const win={
    addEventListener:(name,fn)=>listeners.set(name,fn),
    removeEventListener:name=>listeners.delete(name),
  };
  const storage=new Map();
  vm.runInNewContext(compile("app/components/FairySpeech.tsx"),{
    exports,window:win,document:{hidden:false},Intl,Date,Object,
    localStorage:{getItem:key=>{if(storageFails)throw Error();return storage.get(key)||"broken JSON";},
      setItem:(key,value)=>{if(storageFails)throw Error();storage.set(key,value);}},
    setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:key=>timers.delete(key),
    setInterval:fn=>{intervals.set(++id,fn);return id;},clearInterval:key=>intervals.delete(key),
    require:p=>p==="react"?{
      useRef:value=>({current:value}),useEffect:fn=>effects.push(fn),
      useState:value=>{const index=states.length;states.push(value);return[value,v=>states[index]=v];},
    }:p==="react/jsx-runtime"?{jsx:()=>null}:p.includes("lib/fairy/dialogue")?dialogue:p.includes("ja.json")?bank:{},
  });
  exports.default({sprite,request:1,context:{account:"test",ready},locale:"ja"});
  const cleanup=effects.map(fn=>fn()).filter(Boolean);
  return {states,listeners,timers,intervals,sprite,cleanup:()=>cleanup.forEach(fn=>fn())};
}
for(const storageFails of [false,true]) {
  const h=harness(storageFails);
  assert.ok(bank.firstLogin.includes(h.states[0].text),"first visit works with corrupt or disabled storage");
  assert.equal(h.timers.size,2);
  h.listeners.get("fairy-dialogue")({detail:"goalCompleted"});
  assert.ok(bank.goalCompleted.includes(h.states[0].text),"event takes priority");
  assert.equal(h.timers.size,2,"new speech replaces old timers");
  [...h.timers.values()].sort((a,b)=>a.ms-b.ms)[0].fn();
  assert.equal(h.states[1],true,"fades");
  [...h.timers.values()].sort((a,b)=>a.ms-b.ms)[1].fn();
  assert.equal(h.states[0],null,"disappears");
  h.sprite.current.dataset.action="away";
  h.listeners.get("fairy-dialogue")({detail:"levelUp"});
  assert.equal(h.states[0],null,"does not display while away");
  h.cleanup();
  assert.equal(h.listeners.size,0);
  assert.equal(h.timers.size,0);
  assert.equal(h.intervals.size,0);
}
const waiting=harness(false,false);
assert.equal(waiting.states[0],null,"no dialogue during loading");
assert.equal(waiting.listeners.size,0);
console.log("PASS speech events, timer replacement, fade/hide, storage failures, away state, loading, cleanup");
