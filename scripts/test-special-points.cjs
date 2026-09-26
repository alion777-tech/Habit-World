const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const output = ts.transpileModule(fs.readFileSync('lib/specialPointModel.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(output, context);
const { calculateSpecialRewards, specialPointHistory } = context.exports;
const definitions = [
  { id: 'old', name: '以前の達成', conditionDescription: '累計3日', bonusPoints: 30, check: s => s.loginDays >= 3 },
  { id: 'week', name: '一週間', conditionDescription: '累計7日', bonusPoints: 70, check: s => s.loginDays >= 7 },
];
const legacy = { earnedTitles: ['old'], bonusPoints: 45 };
const result = calculateSpecialRewards(legacy, definitions, { loginDays: 7 }, '2026-09-12');
assert.equal(result.patch.bonusPoints, 115, '既存残高を保持して新規報酬だけ加算');
assert.equal(result.added.length, 1);
assert.equal(result.added[0].date, '2026-09-12');
assert.equal(result.patch.specialPointHistory[0].date, null, '過去の獲得日を捏造しない');
const retry = calculateSpecialRewards(result.patch, definitions, { loginDays: 7 }, '2026-09-13');
assert.equal(retry.added.length, 0, '再読込や翌日の判定では再加算しない');
assert.equal(retry.patch.bonusPoints, 115);
assert.equal(specialPointHistory(result.patch, definitions).length, 2, '移行表示を重複しない');
assert.equal(calculateSpecialRewards({}, definitions, { loginDays: 2 }, '2026-09-12').added.length, 0);
console.log('Special point migration, history, threshold and duplicate reward checks passed.');
