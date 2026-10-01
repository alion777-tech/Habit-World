const fs=require('fs');
const source=fs.readFileSync('app/components/DreamView.tsx','utf8');
const start=source.indexOf('                onClick={async () => {\n                  if (g.secret');
const end=source.indexOf('\n                }} style=',start);
const handler=source.slice(start,end).trim().slice('onClick={'.length)+'}';
const assert=require('node:assert/strict'),vm=require('node:vm');
(async()=>{
 for(const [secret,confirmed,expectedCalls] of [[true,false,0],[true,true,1],[false,false,1]]) {
  let calls=0,confirmCalls=0;
  const c={g:{id:'g',secret},uid:'u',window:{confirm:()=>{confirmCalls++;return confirmed}},t:x=>x,tc:x=>x,setPrivacySaving:()=>{},setCompletionError:()=>{},updateGoalAction:async(uid,id,fields)=>{calls++;assert.equal(fields.secret,!secret)}};
  await vm.runInNewContext('('+handler+')()',c);
  assert.equal(calls,expectedCalls);assert.equal(confirmCalls,secret?1:0);
 }
 console.log('PASS secret toggle: cancel keeps private, confirmation unlocks, locking needs no confirmation');
})().catch(e=>{console.error(e);process.exitCode=1;});
