const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const bank = require("../data/fairy/ja.json");
const en = require("../data/fairy/en.json");
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/fairy/dialogue.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, { exports: exportsObject, require: path => path.endsWith("ja.json") ? bank : en });
const { categories, selectDialogue, loginCategory, timeCategory, bubblePosition } = exportsObject;
for (const [key, lines] of Object.entries(bank)) {
  assert.ok(lines.length >= 6, key);
  assert.equal(lines.length, new Set(lines).size, key);
  for (const text of lines) {
    assert.ok(text.trim() && text.length <= 80, key);
    assert.doesNotMatch(text, /俺|僕|私|あたし|サボ|怠け|べき|しなさい/);
  }
}
assert.equal(categories({hour: 9, total: 0, completed: 0}).includes("allDone"), false);
assert.equal(categories({hour: 9}).includes("notStarted"), false);
for (const [completed, total, expected] of [[0,5,"notStarted"],[1,5,"oneDone"],[2,5,"multipleDone"],[3,5,"goodProgress"],[4,5,"almostDone"],[5,5,"allDone"]]) {
  assert.ok(categories({hour: 9, total, completed}).includes(expected));
}
assert.deepEqual(Array.from(categories({hour: 2, login: "firstLogin", event: "streak7"})), ["streak7"]);
for (const [h,c] of [[0,"lateNight"],[5,"morning"],[9,"forenoon"],[12,"noon"],[14,"afternoon"],[17,"evening"],[19,"night"],[23,"lateNight"]]) assert.equal(timeCategory(h), c);
const now = Date.parse("2026-09-09T00:00:00+09:00");
assert.equal(loginCategory(undefined,now,1), "firstLogin");
assert.equal(loginCategory(now-1000,now,2), "consecutiveLogin");
assert.equal(loginCategory(now,now+1000,2), "shortReturn");
assert.equal(loginCategory(now-8*86400000,now,1), "returnLogin");
assert.equal(loginCategory(now-31*86400000,now,1), "longAbsence");
let history = [];
const results = [];
for(let i=0;i<6;i++) {
  const result = selectDialogue({hour: 9,event:"firstHabit"},history,now+i,"ja",()=>0);
  assert.ok(result); results.push(result.text); history=result.history;
}
assert.equal(new Set(results).size,6);
assert.equal(selectDialogue({hour:9,event:"firstHabit"},history,now+10,"ja",()=>0),null);
assert.ok(selectDialogue({hour:9,event:"firstHabit"},history,now+10,"ja",()=>0,true),"manual taps respond after category exhaustion");
assert.notEqual(selectDialogue({hour:9,event:"firstHabit"},history,now+10,"ja",()=>0,true).text,history[history.length-1].text);
assert.ok(selectDialogue({hour:9,event:"firstHabit"},history,now+61000,"ja",()=>0));
assert.ok(selectDialogue({hour:9,event:"firstHabit"},[],now,"en",()=>0).text.match(/[A-Za-z]/));
for(const [w,h] of [[320,480],[800,600],[180,240]]) {
  for(const x of [-80,0,w-20,w+80]) for(const y of [-30,0,h-20,h+80]) {
    const p=bubblePosition(x,y,100,Math.min(280,w-16),80,w,h);
    assert.ok(p.left>=8 && p.top>=8);
    assert.ok(p.left+Math.min(280,w-16)<=w-8 && p.top+80<=h-8);
  }
}
console.log("PASS 43 categories, 260 lines, contextual selection, JST boundaries, history exhaustion, locale fallback, viewport edges");
