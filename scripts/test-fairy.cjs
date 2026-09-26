// Exercise the actual component effect with a deterministic browser clock.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('app/components/AutonomousFairy.tsx', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
function harness(reduced = false) {
  const events = new Map();
  const target = (prefix) => ({
    addEventListener: (name, fn) => events.set(prefix + name, fn),
    removeEventListener: (name) => events.delete(prefix + name),
  });
  const element = { offsetWidth: 64, style: {}, dataset: {}, firstElementChild: { style: {} } };
  const media = { matches: reduced, ...target('media:') };
  const doc = { hidden: false, ...target('doc:') };
  const win = { innerWidth: 800, innerHeight: 600, matchMedia: () => media, ...target('win:') };
  let effect, cleanup, clock = 0, id = 0, choice = 0.2;
  const frames = new Map();
  let refCount = 0;
  const jsx = (type, props) => ({ type, props });
  const context = {
    exports: {}, window: win, document: doc,
    Math: Object.assign(Object.create(Math), { random: () => choice }),
    requestAnimationFrame: (fn) => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: (key) => frames.delete(key),
    require: (name) => name === 'react' ? {
      useRef: (initial) => ({ current: refCount++ === 0 ? element : initial }),
      useState: (initial) => [initial, () => {}],
      useEffect: (fn) => { effect = fn; },
    } : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === 'next-intl'
      ? { useLocale: () => 'ja' } : { default: {} },
  };
  vm.runInNewContext(code, context);
  const tree = context.exports.default();
  cleanup = effect();
  return { element, media, doc, win, events, frames, cleanup,
    choose: (v) => { choice = v; },
    pause: tree.props.children[0].props.children[0].props.onClick,
    preview: (index) => tree.props.children[0].props.children[1][index].props.onClick(),
    advance: (ms) => { for (let i = 0; i < ms; i += 16) {
      clock += 16;
      const callbacks = [...frames.values()]; frames.clear();
      callbacks.forEach(fn => fn(clock));
    } },
  };
}
const h = harness();
const start = h.element.style.transform;
h.advance(1600);
assert.notEqual(h.element.style.transform, start, 'moves without user input');
h.pause();
const stopped = h.element.style.transform;
const stoppedPose = h.element.firstElementChild.style.transform;
h.advance(2000);
assert.equal(h.element.style.transform, stopped, 'pause freezes exact position');
assert.equal(h.element.firstElementChild.style.transform, stoppedPose, 'pause freezes pose');
h.pause();
h.advance(2000);
assert.notEqual(h.element.style.transform, stopped, 'resume continues');
const seen = new Set();
for (const choice of [0.2, 0.4, 0.55, 0.7, 0.95]) {
  h.choose(choice);
  for (let i = 0; i < 2400; i++) { h.advance(16); seen.add(h.element.dataset.action); }
}
for (const state of ['fly', 'hover', 'rest', 'leave', 'away', 'enter', 'land', 'walk', 'takeoff', 'peek']) assert.ok(seen.has(state), state);
h.preview(1); h.advance(1900);
assert.equal(h.element.dataset.action, 'walk');
assert.match(h.element.style.transform, /, 49[0-6](?:\.\d+)?px, 0\)/, 'walk stays at floor');
h.preview(2); h.advance(2600);
assert.equal(h.element.dataset.action, 'away');
h.doc.hidden = true; h.events.get('doc:visibilitychange')();
assert.equal(h.frames.size, 0, 'hidden tab cancels animation');
h.doc.hidden = false; h.events.get('doc:visibilitychange')();
assert.equal(h.frames.size, 1, 'visible tab has one loop');
h.win.innerWidth = 320; h.win.innerHeight = 480; h.events.get('win:resize')();
h.advance(1800);
assert.ok(!h.element.style.transform.includes('NaN'));
h.cleanup();
assert.equal(h.frames.size, 0);
assert.equal(h.events.size, 0);
const r = harness(true);
const resting = r.element.style.transform;
r.advance(20000);
assert.equal(r.element.style.transform, resting, 'reduced motion remains still');
r.cleanup();
const css = fs.readFileSync('app/components/AutonomousFairy.module.css', 'utf8');
assert.match(css, /\.layer\s*\{[^}]*position: fixed;[^}]*pointer-events: none;/s);
console.log('PASS autonomous actions, pause/resume, resize, visibility, cleanup, reduced motion, click-through layer');
