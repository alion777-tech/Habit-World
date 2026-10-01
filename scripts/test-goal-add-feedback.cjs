const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('app/components/DreamView.tsx','utf8');
const start=source.indexOf('              onClick={async () => {\n                if (addingGoal.current');
const end=source.indexOf('\n              style={{',start);
const handler=source.slice(start,end).trim().slice('onClick={'.length,-1);
(async()=>{for(const failure of ['none','create','stats']){
let resolve,reject;const pending=new Promise((a,b)=>{resolve=a;reject=b});let calls=0,text='目標',date='2026-10-01',error='',saving=false;
const c={newGoalSecret:true,addingGoal:{current:false},goalInput:text,deadline:date,uid:'u',checkLimit:()=>true,setSavingGoal:v=>saving=v,setAddError:v=>error=v,setGoalInput:v=>text=v,setDeadline:v=>date=v,addGoalAction:(_uid,_title,_deadline,secret)=>{assert.equal(secret,true);calls++;return pending},incrementStats:async()=>{if(failure==='stats')throw Error('stats')},t:x=>x,tc:x=>x};
vm.createContext(c);const submit=vm.runInContext('('+handler+')',c);const operation=submit();await submit();assert.equal(calls,1);assert.equal(text,'');assert.equal(saving,true);
if(failure==='create')reject(Error('offline'));else resolve();await operation;
assert.equal(text,failure==='create'?'目標':'');assert.equal(date,failure==='create'?'2026-10-01':'');assert.equal(saving,false);assert.equal(c.addingGoal.current,false);assert.equal(!!error,failure!=='none');
}
const layout=fs.readFileSync('app/[locale]/layout.tsx','utf8');const production=layout.split('process.env.NODE_ENV === "production" ? `')[1].split('` : `')[0];assert.ok(!production.includes('location.reload'));
console.log('PASS: immediate clear, duplicate click rejected, failed save restored, post-save failure not duplicated, no production auto reload');})();
const opening=fs.readFileSync('app/components/OpeningTutorial.tsx','utf8');
const init=opening.slice(opening.indexOf('    if (!ready || initialized.current)'),opening.indexOf('  }, [ready, progressKey]);'));
for(const saved of [null,{index:4,started:true},{index:999,started:true}]){
let index=0,started=false,active=false;
const c={ready:true,initialized:{current:false},sessionStorage:{getItem:()=>JSON.stringify(saved)},localStorage:{getItem:()=>null},completionKey:'complete',progressKey:'u',openingDialogue:Array(12),setIndex:v=>index=v,setStarted:v=>started=v,setActive:v=>active=v};
vm.runInNewContext('(function(){'+init+'})()',c);
assert.equal(active,true);assert.equal(index,saved?.index===4?4:0);assert.equal(started,saved?.index===4);
}
console.log('PASS: onboarding progress restores and invalid progress safely starts at beginning');
