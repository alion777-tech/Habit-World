const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const loader=require('./load-model.cjs');const dates=loader.load('../lib/habits/dateUtils.ts');loader.restore();
const source=fs.readFileSync('lib/habits/calcToggleHabit.ts','utf8');
const load=text=>{const c={exports:{},require:()=>dates};vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,c);return c.exports.calcToggleHabit;};
const current=load(source), previous=load(source.replace('while (completedDates.has(current))','while (history.some(h => h.date === current))'));
const date=n=>new Date(Date.UTC(2000,0,1+n)).toISOString().slice(0,10);
for(const length of [0,1,7,365,7300]) {
 const history=Array.from({length},(_,i)=>({date:date(i),point:1}));
 const h={id:'h',text:'habit',dailyStreak:length,lastCompletedDate:date(length-1),point:length,pointHistory:history};
 for(const target of [date(length),date(Math.max(0,length-1)),date(Math.floor(length/2))]) {
  const args=[h,target,date(length),date(length-1),[3,7]];
  const start=performance.now(),expected=previous(...args),oldMs=performance.now()-start;
  const startNew=performance.now(),actual=current(...args),newMs=performance.now()-startNew;
  assert.equal(JSON.stringify(actual),JSON.stringify(expected));
  if(length===7300)console.log('20-year history '+target+': previous '+oldMs.toFixed(1)+'ms, current '+newMs.toFixed(1)+'ms');
 }
}
console.log('PASS history: identical checks, cancellations, streaks and rewards for short and 20-year histories');
