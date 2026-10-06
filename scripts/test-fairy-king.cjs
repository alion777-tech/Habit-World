const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const data = require('../data/fairy-king-dialogue.json');
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
const model = { exports: {}, require: name => {
  assert.equal(name, '@/data/fairy-king-dialogue.json');
  return data;
} };
vm.runInNewContext(compile('lib/fairyKingDialogue.ts'), model);
const { pickFairyKingEntry } = model.exports;
assert.ok(data.greetings.length >= 4);
assert.ok(data.fairyKingWords.length >= 15);
assert.deepEqual(data.fairyKingAdvice.map(topic => topic.id), ['motivation', 'consistency', 'results', 'missed', 'dream']);
const ids = new Set(), texts = new Set();
function validate(entry, fields) {
  assert.ok(entry.id && !ids.has(entry.id), `unique ID: ${entry.id}`);
  ids.add(entry.id);
  for (const field of fields) {
    assert.ok(typeof entry[field] === 'string' && entry[field].trim().length >= 15, `${entry.id}.${field} has meaningful content`);
    assert.ok(!texts.has(entry[field]), `${entry.id}.${field} is not duplicated`);
    texts.add(entry[field]);
  }
}
for (const entry of data.fairyKingWords) validate(entry, ['word', 'explanation', 'action']);
for (const topic of data.fairyKingAdvice) {
  assert.ok(topic.responses.length >= 10);
  assert.ok(topic.label && topic.choice);
  for (const entry of topic.responses) validate(entry, ['reply', 'action']);
}
assert.ok(data.fairyKingAdvice.reduce((count, topic) => count + topic.responses.length, 0) >= 50);
for (const pool of [data.fairyKingWords, ...data.fairyKingAdvice.map(topic => topic.responses)]) {
  const reachable = new Set();
  for (let index = 0; index < pool.length; index++) reachable.add(pickFairyKingEntry(pool, undefined, () => (index + .5) / pool.length).id);
  assert.equal(reachable.size, pool.length, 'every entry can be drawn');
  for (const previous of pool) {
    for (let index = 0; index < pool.length - 1; index++) {
      assert.notEqual(pickFairyKingEntry(pool, previous.id, () => (index + .5) / (pool.length - 1)).id, previous.id);
    }
  }
}
assert.equal(pickFairyKingEntry([{ id: 'only' }], 'only').id, 'only');
assert.throws(() => pickFairyKingEntry([]));

// Exercise the real conversation component, including callbacks and topic history.
const states = [], refs = [];
let stateIndex = 0, refIndex = 0, left = 0;
const history = {};
const draw = (pool, entries) => {
  const entry = pickFairyKingEntry(entries, history[pool], () => .2);
  history[pool] = entry.id;
  return entry;
};
const jsx = (type, props) => ({ type, props });
const react = {
  useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = initial; return [states[index], next => { states[index] = next; }]; },
  useRef(initial) { const index = refIndex++; return refs[index] ?? (refs[index] = { current: initial }); },
  useEffect() {},
};
const component = { exports: {}, require: name => {
  if (name === 'react') return react;
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
  if (name === '@/lib/fairyKingDialogue') return model.exports;
  if (name === 'next/image') return props => jsx('img', props);
  if (name.endsWith('.module.css')) return {};
  throw Error(`Unexpected external dependency: ${name}`);
} };
vm.runInNewContext(compile('app/components/FairyKingRoom.tsx'), component);
const flatten = node => {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (typeof node.type === 'function') return flatten(node.type(node.props));
  return [node, ...flatten(node.props?.children)];
};
const render = () => {
  stateIndex = 0; refIndex = 0;
  return flatten(component.exports.default({ initialGreeting: data.greetings[0], draw, onLeave: () => left++ }));
};
const click = label => {
  const button = render().find(node => node.type === 'button' && flatten(node.props.children).some(child => child.props?.children === label));
  const plain = render().find(node => node.type === 'button' && node.props.children === label);
  assert.ok(button || plain, `choice exists: ${label}`);
  (button || plain).props.onClick();
};
assert.equal(render().filter(node => node.type === 'button').length, 3, 'two opening choices plus exit');
click('精霊王に今日のお言葉をいただく');
assert.equal(states[0].step, 'word');
assert.ok(render().some(node => node.type === 'p' && node.props.children === states[0].word.explanation));
assert.ok(render().some(node => node.type === 'p' && node.props.children === states[0].word.action));
const firstWord = states[0].word.id;
click('別のお言葉をいただく');
assert.notEqual(states[0].word.id, firstWord);
click('悩みを聞いてもらう');
assert.equal(states[0].step, 'topics');
for (const topic of data.fairyKingAdvice) {
  click(topic.choice);
  assert.equal(states[0].topic.id, topic.id);
  assert.ok(render().some(node => node.type === 'p' && node.props.children === states[0].response.action));
  const firstReply = states[0].response.id;
  click('この悩みをもう少し相談する');
  assert.notEqual(states[0].response.id, firstReply);
  click('もう一度相談する');
  assert.equal(states[0].step, 'topics');
}
const lastMotivation = history['advice:motivation'];
click(data.fairyKingAdvice[0].choice);
assert.notEqual(states[0].response.id, lastMotivation, 'other topics preserve history');
click('精霊王の部屋に戻る');
assert.equal(states[0].step, 'welcome');
const firstGreeting = states[0].greeting;
click('精霊王に悩みを聞いてもらう');
click('精霊王の部屋に戻る');
assert.notEqual(states[0].greeting, firstGreeting);
click('妖精の部屋へ戻る');
assert.equal(left, 1);
assert.ok(fs.existsSync('public/opening/spirit.jpg'));
console.log('PASS fairy king: 15 words, 50 unique advice entries, all draws reachable, no consecutive repeats, all five topics, explanation/action rendering, repeat/back/exit flows.');
