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
  const element = { offsetWidth: 64, offsetHeight: 96, style: {}, dataset: {}, firstElementChild: { style: {} } };
  const media = { matches: reduced, ...target('media:') };
  const navigation = { top: 536, height: 64 };
  const panel = { left: 120, top: 0, width: 560, height: 600 };
  const doc = { body: {}, hidden: false, querySelector: selector => {
    const rect = selector === '.app-panel' ? panel : selector === '.primary-nav' ? navigation : null;
    return rect && { getBoundingClientRect: () => rect };
  }, ...target('doc:') };
  const win = { innerWidth: 800, innerHeight: 600, matchMedia: () => media, ...target('win:') };
  let effect, cleanup, clock = 0, id = 0, choice = 0.2;
  const frames = new Map();
  let refCount = 0;
  let portalHost;
  const stateValues = [];
  const jsx = (type, props) => ({ type, props });
  const context = {
    exports: {}, window: win, document: doc,
    Math: Object.assign(Object.create(Math), { random: () => choice }),
    requestAnimationFrame: (fn) => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: (key) => frames.delete(key),
    require: (name) => name === 'react-dom' ? { createPortal: (children, host) => { portalHost = host; return children; } } : name === 'react' ? {
      useRef: (initial) => ({ current: refCount++ === 0 ? element : initial }),
      useState: (initial) => {
        const index = stateValues.length;
        stateValues.push(initial);
        return [initial, value => { stateValues[index] = typeof value === 'function' ? value(stateValues[index]) : value; }];
      },
      useEffect: (fn) => { effect = fn; },
    } : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === 'next-intl'
      ? { useLocale: () => 'ja' } : name.includes('useWardrobe') ? { useWardrobe: () => ({ purchased: [], equipped: {}, colors: {} }) } : { default: {} },
  };
  vm.runInNewContext(code, context);
  let roomOpened = false;
  const tree = context.exports.default({ onOpenRoom: () => { roomOpened = true; } });
  assert.equal(portalHost, doc.body, 'fairy overlay escapes the blurred app panel');
  tree.props.children[0].props.children[1].props.onClick();
  assert.ok(roomOpened, "room button opens fairy room");
  cleanup = effect();
  const talk = tree.props.children[1].props.children[0].props.children.props;
  talk.onClick({detail:1});
  assert.equal(stateValues[1],1,'ordinary PC click works without pointerdown');
  talk.onPointerDown({isPrimary:true,button:0});
  talk.onClick({detail:1});
  assert.equal(stateValues[1],2,'pointerdown plus click speaks once');
  talk.onClick({detail:1});
  assert.equal(stateValues[1],3,'another ordinary click speaks again');
  talk.onPointerDown({isPrimary:true,button:0});
  talk.onPointerCancel();
  talk.onClick({detail:1});
  assert.equal(stateValues[1],5,'cancelled pointer does not suppress the next click');
  talk.onClick({detail:0});
  assert.equal(stateValues[1],6,'accessible click still works');
  return { element, media, doc, win, navigation, panel, events, frames, cleanup,
    choose: (v) => { choice = v; },
    pause: tree.props.children[0].props.children[0].props.onClick,
    advance: (ms) => { for (let i = 0; i < ms; i += 16) {
      clock += 16;
      const callbacks = [...frames.values()]; frames.clear();
      callbacks.forEach(fn => fn(clock));
    } },
  };
}
const h = harness();
const start = h.element.style.transform;
assert.equal(Number(start.match(/translate3d\(([-\d.]+)px/)[1]), h.panel.left + h.panel.width + h.element.offsetWidth,
  'fairy enters from the app panel edge');
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
h.choose(0.7);
for (let i = 0; i < 3000 && h.element.dataset.action !== "walk"; i++) h.advance(16);
assert.equal(h.element.dataset.action, 'walk');
const walkingY = () => Number(h.element.style.transform.match(/, ([\d.]+)px, 0\)/)[1]);
const walkingX = () => Number(h.element.style.transform.match(/translate3d\(([-\d.]+)px/)[1]);
const assertAboveNavigation = () => {
  const floor = h.navigation.top - h.element.offsetHeight - 8;
  assert.ok(walkingY() <= floor && walkingY() >= floor - 4, 'whole sprite walks above navigation with bob clearance');
  assert.ok(walkingX() >= h.panel.left + 8 && walkingX() <= h.panel.left + h.panel.width - h.element.offsetWidth - 8,
    'fairy walks within the app panel');
};
assertAboveNavigation();
h.navigation.top = 512; h.navigation.height = 88;
h.advance(16);
assertAboveNavigation();
h.win.innerWidth = 320; h.win.innerHeight = 480;
h.panel.left = 10; h.panel.width = 300; h.panel.height = 480;
h.navigation.top = 400; h.navigation.height = 80;
h.events.get('win:resize')(); h.advance(16);
assert.equal(h.element.dataset.action, 'walk', 'resize preserves walking');
assertAboveNavigation();
h.doc.querySelector = selector => selector === '.app-panel' ? { getBoundingClientRect: () => h.panel } : null;
h.advance(16);
assert.ok(walkingY() <= 376 && walkingY() >= 372, 'preview without navigation uses viewport floor');
h.choose(0.95);
for (let i = 0; i < 3000 && h.element.dataset.action !== "away"; i++) h.advance(16);
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
