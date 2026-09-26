const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const previous = require.extensions['.ts'];
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const m = require('../app/(root)/avatar/wardrobe.ts');
if (previous) require.extensions['.ts'] = previous; else delete require.extensions['.ts'];
const { DEFAULT, ITEMS, CATEGORIES, SKIN_COLORS, HAIR_COLORS, equip, renderLayers, initialWardrobe, itemKey, buy, saveAppearance, readWardrobe } = m;
assert.equal(SKIN_COLORS.length, 7); assert.equal(HAIR_COLORS.length, 6);
let changes = 0;
for (const skin of SKIN_COLORS) for (const hair of HAIR_COLORS) for (const item of ITEMS) {
  const before = { ...DEFAULT, skinColor: skin.id, hairColor: hair.id };
  const after = equip(before, item.category, item.id);
  for (const key of Object.keys(before)) if (key !== item.category) assert.equal(after[key], before[key]);
  assert.ok(m.validAppearance(after));
  const original = renderLayers(before), result = renderLayers(after); assert.equal(result.length, (after.accessory === 'none' ? 5 : 6) + (after.hair === 'starter-short' ? 0 : 1));
  for (const layer of original) {
    const isBase = ['face'].includes(layer.id);
    if (item.category === 'base' && isBase || item.category === layer.id || item.category === 'hair' && layer.id === 'hair-back' || item.category === 'accessory' && layer.src.includes('/accessories/')) continue;
    const rendered = result.find(l => l.id === layer.id && l.src === layer.src);
    if (item.category === 'outfit' && ['base','face'].includes(layer.id)) assert.deepEqual({...rendered,clipPath:undefined},{...layer,clipPath:undefined});
    else assert.deepEqual(rendered, layer);
  }
  changes++;
}
const locked = initialWardrobe();
assert.equal(locked.closetPurchased,false);
assert.throws(()=>buy(locked,'hair','long','fairy'));
assert.throws(()=>saveAppearance(locked,locked.equipped));
const initial = m.purchaseCloset(locked);
assert.equal(initial.closetPurchased,true);
assert.deepEqual(m.purchaseCloset(initial),initial);
assert.deepEqual(initial.owned.filter(k=>k.startsWith('outfit:')).sort(),['outfit:starter-green','outfit:starter-pink']);
assert.deepEqual(initial.owned.filter(k=>k.startsWith('hair:')).sort(),['hair:starter-bob','hair:starter-short']);
const trial = equip(initial.equipped, 'hair', 'long');
assert.throws(() => saveAppearance(initial, trial));
assert.deepEqual(initial.equipped, DEFAULT);
const bought = buy(initial, 'hair', 'long', 'fairy');
assert.ok(bought.owned.includes('hair:long'));
assert.equal(initial.owned.includes('hair:long'), false);
assert.deepEqual(bought.equipped, initial.equipped, 'purchase must not equip');
assert.deepEqual(buy(bought, 'hair', 'long', 'fairy'), bought, 'repeat purchase is idempotent');
assert.throws(() => buy(initial, 'hair', 'long', 'elf'));
const saved = saveAppearance(bought, trial);
assert.deepEqual(readWardrobe(JSON.parse(JSON.stringify(saved))), saved);
assert.equal(readWardrobe({ ...saved, owned: [] }), null);
assert.equal(readWardrobe({ ...saved, equipped: { ...trial, skinColor: 'invalid' } }), null);
assert.equal(readWardrobe({ ...saved, owned: [null] }), null);
assert.notEqual(m.storageKey('a'), m.storageKey('b'));
for (const item of ITEMS) {
  assert.equal(ITEMS.filter(i => itemKey(i) === itemKey(item)).length, 1);
  for (const l of renderLayers(equip(DEFAULT, item.category, item.id))) if (l.src) assert.ok(fs.existsSync(path.join('public', l.src)), l.src);
}
for (const color of SKIN_COLORS) {
  const changed = renderLayers({ ...DEFAULT, skinColor: color.id });
  for (const l of renderLayers(DEFAULT)) if (l.id !== 'base') assert.deepEqual(changed.find(x => x.id === l.id), l);
}
for (const color of HAIR_COLORS) {
  const changed = renderLayers({ ...DEFAULT, hairColor: color.id });
  for (const l of renderLayers(DEFAULT)) if (l.id !== 'hair' && l.id !== 'hair-back') assert.deepEqual(changed.find(x => x.id === l.id), l);
}
assert.equal(CATEGORIES.length, 5);
let adjustments=m.adjustPosition({},DEFAULT,'hair',-15);
adjustments=m.adjustPosition(adjustments,DEFAULT,'accessory',-25);
adjustments=m.adjustPosition(adjustments,DEFAULT,'wings',-10);
const positioned=renderLayers(DEFAULT,adjustments);
for(const layer of renderLayers(DEFAULT)){
 const delta=layer.id==='hair'||layer.id==='hair-back'?-15:layer.id==='accessory'?-25:layer.id==='wings'?-10:0;
 assert.deepEqual(positioned.find(l=>l.id===layer.id),{...layer,y:layer.y+delta});
}
assert.equal(m.adjustmentY({...DEFAULT,hair:'long'},'accessory',adjustments),0);
assert.equal(m.adjustmentY({...DEFAULT,hairColor:'black'},'accessory',adjustments),-25);
assert.equal(m.adjustmentY(DEFAULT,'hair',m.adjustPosition(adjustments,DEFAULT,'hair',999)),150);
assert.deepEqual(m.readAdjustments({'hair:long':Infinity,'wings:light':'12','invalid':5}),{});
assert.deepEqual(readWardrobe({...initial,adjustments}).adjustments,adjustments);
const legacy={version:2,equipped:initial.equipped,owned:initial.owned};
assert.equal(readWardrobe(legacy).closetPurchased,false);
assert.deepEqual(readWardrobe(legacy).adjustments,{});
console.log(`PASS: ${changes} independent part/color combinations; trial, purchase, ownership, persistence, assets.`);
for(const category of ['hair','accessory','outfit','wings']){
 const values=m.adjustScale(m.adjustPosition({},DEFAULT,category,-12),DEFAULT,category,110);
 const before=renderLayers(DEFAULT),after=renderLayers(DEFAULT,values);
 for(const layer of before){
  const result=after.find(l=>l.id===layer.id),target=layer.id===category||category==='hair'&&layer.id==='hair-back';
  if(!target){assert.deepEqual(result,layer);continue;}
  assert.ok(Math.abs(result.width-layer.width*1.1)<1e-8);
  assert.ok(Math.abs(result.height-layer.height*1.1)<1e-8);
  assert.ok(Math.abs(result.x+result.width/2-layer.x-layer.width/2)<1e-8);
  assert.ok(Math.abs(result.y+result.height/2-layer.y-layer.height/2+12)<1e-8);
 }
 assert.deepEqual(readWardrobe({...initial,adjustments:values}).adjustments,values);
 assert.equal(m.adjustmentScale(DEFAULT,category,{}),100);
 assert.equal(m.adjustmentScale(DEFAULT,category,m.adjustScale(values,DEFAULT,category,200)),130);
 assert.equal(m.adjustmentScale(DEFAULT,category,m.adjustScale(values,DEFAULT,category,10)),70);
}
const accessoryScale=m.adjustScale({},DEFAULT,'accessory',120);
assert.equal(m.adjustmentScale({...DEFAULT,hair:'short'},'accessory',accessoryScale),100);
assert.deepEqual(m.readAdjustments({'hair:short':-5,'scale:outfit:starter-pink':110,'scale:base:gentle':120,'scale:hair:short':Infinity}),{'hair:short':-5,'scale:outfit:starter-pink':110});
console.log('PASS: independent position/scale for all non-base parts, bounds, legacy values, combined persistence and accessory pairing.');

for(const old of ['short','bob']){
 const target=`starter-${old}`;
 assert.ok(!ITEMS.some(i=>i.category==='hair'&&i.id===old));
 const restored=readWardrobe({...initial,equipped:{...DEFAULT,hair:old},owned:[...initial.owned,`hair:${old}`],adjustments:{[`hair:${old}`]:-8,[`scale:hair:${old}`]:108,[`accessory:${old}:starter-antenna`]:12}});
 assert.equal(restored.equipped.hair,target);
 assert.equal(restored.owned.filter(k=>k===`hair:${target}`).length,1);
 assert.equal(restored.adjustments[`hair:${target}`],-8);
 assert.equal(restored.adjustments[`scale:hair:${target}`],108);
 assert.equal(restored.adjustments[`accessory:${target}:starter-antenna`],12);
 assert.deepEqual(readWardrobe(restored),restored);
 assert.ok(m.grantPurchases(initial,[`avatar-hair-${old}`]).owned.includes(`hair:${target}`));
}
const shortItem=ITEMS.find(i=>i.category==='hair'&&i.id==='starter-short');
assert.equal(shortItem.asset,'/avatar/v2/parts/hair-short.png');
assert.equal(renderLayers({...DEFAULT,hair:'starter-short'}).find(l=>l.id==='hair').src,shortItem.asset);
for(const base of ITEMS.filter(i=>i.category==='base')){
 const original=renderLayers({...DEFAULT,base:base.id}).find(l=>l.id==='face');
 assert.ok(original);assert.equal(original.filter,undefined);
 for(const skin of SKIN_COLORS)assert.deepEqual(renderLayers({...DEFAULT,base:base.id,skinColor:skin.id}).find(l=>l.id==='face'),original);
}
console.log('PASS: retired hair migration, adjustment/receipt preservation, shared short asset and four independent face layers.');


