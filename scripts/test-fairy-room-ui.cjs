const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const loader = require('./load-model.cjs');
const model = loader.load('../lib/fairyRoomModel.ts');
const catalog = loader.load('../lib/shopCatalog.ts');
loader.restore();
const styles = new Proxy({}, {get: (_, key) => String(key)});
function load(file, resolve, expose='') {
  const context = {exports:{},require:resolve};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}
  }).outputText + expose,context);
  return context.exports;
}
const Chamber = load('app/components/FairyChamber.tsx', name => {
  if (name === 'react' || name === 'react/jsx-runtime') return require(name);
  if (name.endsWith('.css')) return {__esModule:true,default:styles};
  if (name.includes('fairyRoomModel')) return model;
  if (name.includes('shopCatalog')) return catalog;
  if (name.includes('useWardrobe')) return {useWardrobe:()=>({closetPurchased:true})};
  if (name.includes('wardrobe-studio')) return {AvatarFigure:()=>React.createElement('span',{'data-avatar':true},'avatar')};
  return {};
}).default;
const now = Date.now();
const room = {...model.createRoom(now),health:20,energy:100,sleeping:true};
const props = {uid:'test',fairy:{status:'ready',name:'ミント'},room,totalPoints:0,loginDays:1};
const sleeping = renderToStaticMarkup(React.createElement(Chamber,props));
assert.ok(sleeping.includes('/world/fairy-hibernating.png'));
assert.ok(!sleeping.includes('data-avatar'));
assert.ok(sleeping.includes('ふぁ……ちょっと疲れちゃった。少しだけ、ここでおやすみするね。'));
function menuButton(html,title){return [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(m=>m[0]).find(s=>s.includes(`<strong>${title}</strong>`));}
for(const title of ['アイテムショップ','クローゼット','冒険に出かける']){
 const button=menuButton(sleeping,title);assert.ok(button.includes('disabled=""'));assert.ok(button.includes('💤冬眠中'));
}
assert.ok(!menuButton(sleeping,'妖精と冒険の記録').includes('disabled=""'));
const awake = renderToStaticMarkup(React.createElement(Chamber,{...props,room:{...room,health:51}}));
assert.ok(!awake.includes('/world/fairy-hibernating.png'));
assert.ok(awake.includes('data-avatar'));
for(const title of ['アイテムショップ','クローゼット','冒険に出かける'])assert.ok(!menuButton(awake,title).includes('disabled=""'));
const trip=model.departAdventure(model.createRoom(now),now,'forest',.5);
const adventuring=renderToStaticMarkup(React.createElement(Chamber,{...props,room:trip}));
assert.ok(adventuring.includes('/world/fairy-adventuring.png'));
assert.ok(!adventuring.includes('data-avatar'));
for(const title of ['アイテムショップ','クローゼット']){
 const button=menuButton(adventuring,title);assert.ok(button.includes('disabled=""'));assert.ok(button.includes('data-state="adventure"'));
}
assert.ok(!menuButton(adventuring,'冒険に出かける').includes('disabled=""'),'adventure status panel remains accessible');
// Render the actual bag tab and verify the item button is blocked before submission.
let commerceRoom;
const Counter=load('app/(root)/avatar/shop-counter.tsx',name=>{
  if(name==='react') return {...React,useState:value=>React.useState(value==='buy'?'bag':value)};
  if(name==='react/jsx-runtime')return require(name);
  if(name.endsWith('.css'))return {__esModule:true,default:styles};
  if(name.includes('fairyRoomModel'))return model;
  if(name.includes('shopCatalog'))return catalog;
  if(name==='./commerce')return {useCommerce:()=>({room:commerceRoom,ready:true,busy:false,error:'',submit:()=>{throw Error('unexpected submit');}})};
  return {};
}).ShopCounter;
commerceRoom={...room,inventory:{'elf-potion':1}};
const bag=renderToStaticMarkup(React.createElement(Counter,{shop:'elf'}));
assert.match(bag,/<button[^>]*disabled=""[^>]*>使う<span[^>]*>💤冬眠中<\/span><\/button>/);
commerceRoom={...trip,inventory:{'elf-potion':1}};
const tripBag=renderToStaticMarkup(React.createElement(Counter,{shop:'elf'}));
assert.match(tripBag,/<button[^>]*disabled=""[^>]*>使う<span[^>]*data-state="adventure"[^>]*>冒険中<\/span><\/button>/);
commerceRoom={...room,health:51,inventory:{'elf-potion':1}};
const awakeBag=renderToStaticMarkup(React.createElement(Counter,{shop:'elf'}));
assert.match(awakeBag,/<button[^>]*>使う<\/button>/);
assert.ok(!awakeBag.includes('disabled=""'));
// The direct studio route must also hide the wardrobe/shop editors when unavailable.
const Availability=load('app/(root)/avatar/wardrobe-studio.tsx',name=>{
 if(name==='react'||name==='react/jsx-runtime')return require(name);
 if(name.endsWith('.css'))return {__esModule:true,default:styles};
 if(name.includes('fairyRoomModel'))return model;
 if(name==='./commerce')return {useCommerce:()=>({room:commerceRoom,ready:true})};
 return {};
},'\nexports.Availability=StudioAvailability;').Availability;
for(const state of [room,trip]){
 commerceRoom=state;
 const blocked=renderToStaticMarkup(React.createElement(Availability,{onClose:()=>{}},React.createElement('div',null,'WARDROBE_EDITOR')));
 assert.ok(!blocked.includes('WARDROBE_EDITOR'));
 assert.ok(blocked.includes(state.sleeping?'💤冬眠中':'冒険中'));
}
commerceRoom={...room,health:51};
assert.ok(renderToStaticMarkup(React.createElement(Availability,{},'WARDROBE_EDITOR')).includes('WARDROBE_EDITOR'));
assert.equal(fs.readFileSync('public/world/fairy-hibernating.png').subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(fs.readFileSync('public/world/fairy-adventuring.png').subarray(0,8).toString('hex'),'89504e470d0a1a0a');
console.log('Fairy room UI: sleep dialogue, sleep/adventure images, restricted menu/item buttons and state badges, normal access restored.');
