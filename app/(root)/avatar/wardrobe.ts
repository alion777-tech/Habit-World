import sprites from './sprites.json';
import {PRODUCTS,avatarProduct} from '../../../lib/shopCatalog';
export const CATEGORIES = [
  {id:'base',name:'基本パーツ'}, {id:'hair',name:'髪型'}, {id:'accessory',name:'髪飾り'}, {id:'outfit',name:'衣装'}, {id:'wings',name:'羽'},
] as const;
export type Category = typeof CATEGORIES[number]['id'];
export const SKIN_COLORS = [
  {id:'ivory',name:'白っぽい色',color:'#fff1e5',filter:'saturate(.4) brightness(1.1)'},
  {id:'gray',name:'薄い灰色',color:'#ccc9c8',filter:'saturate(0) brightness(.95)'},
  {id:'pink',name:'ピンクがかった肌色',color:'#f3c1bc',filter:'hue-rotate(335deg) saturate(.7)'},
  {id:'natural',name:'肌色',color:'#efc09d',filter:'none'},
  {id:'wheat',name:'薄い小麦色',color:'#d4a67a',filter:'sepia(.3) brightness(.88)'},
  {id:'tan',name:'濃い小麦色',color:'#ac7955',filter:'sepia(.5) brightness(.7)'},
  {id:'brown',name:'濃い茶色',color:'#724932',filter:'sepia(.7) brightness(.48)'},
] as const;
export const HAIR_COLORS = [
  {id:'gold',name:'ゴールド',color:'#e9c769',filter:'grayscale(1) sepia(1) saturate(2)'},
  {id:'silver',name:'シルバー',color:'#cbd0d4',filter:'grayscale(1) brightness(1.35)'},
  {id:'blue',name:'ブルー',color:'#7a9ccf',filter:'grayscale(1) sepia(1) saturate(2) hue-rotate(150deg)'},
  {id:'pink',name:'ピンク',color:'#d993bc',filter:'grayscale(1) sepia(1) saturate(2) hue-rotate(280deg)'},
  {id:'brown',name:'焦げ茶色',color:'#775039',filter:'grayscale(1) sepia(1) brightness(.7)'},
  {id:'black',name:'黒髪',color:'#302c35',filter:'grayscale(1) brightness(.35)'},
] as const;
export const SHOPS = [
  {id:'elf',name:'エルフの魔法・アイテムショップ',image:'/avatar/v2/shops/elf-clean.png',description:'森の知恵と、小さな魔法。'},
  {id:'dwarf',name:'ドワーフの武器・防具店',image:'/avatar/v2/shops/dwarf-clean.png',description:'旅を支える、職人の手仕事。'},
  {id:'fairy',name:'妖精の衣類店',image:'/avatar/v2/shops/fairy-clean.png',description:'あなたに似合う、とっておきの一着。'},
] as const;
export type Shop = typeof SHOPS[number]['id'];
export type RenderLayer = {id:Category|'hair-back'|'face';src:string;x:number;y:number;width:number;height:number;filter?:string;clipPath?:string};
export type Item = {id:string;name:string;category:Category;starter:boolean;shop:'fairy';price:number;asset?:string};
const definitions: Record<Category, [string,string][]> = {
  base:[['gentle','やさしい顔'],['boy','きりっとした顔'],['anime','アニメ風の顔'],['happy','にっこり笑顔']],
  hair:[['long','ウェーブロング'],['twintail','ツインテール'],['spiky','ふんわりショート'],['straight','ストレートロング']],
  accessory:[['none','飾りなし'],['cat','猫耳'],['dog','犬耳'],['rabbit','うさ耳'],['crown','王冠'],['flowers','花冠'],['hairpin','花のかんざし'],['antenna','蝶の触角飾り'],['butterfly','蝶の髪飾り'],['tiara','真珠のティアラ']],
  outfit:[['royal-dress','王家のドレス'],['leaf-dress','若葉のドレス'],['gothic','深紅のドレス'],['petal','花びらのドレス'],['leaf','森の妖精'],['star','星空のドレス'],['prince','王子の衣装'],['ranger','森の旅人'],['coat','冒険家のコート'],['bard','吟遊詩人'],['armor','騎士の鎧'],['wizard','星読みのローブ']],
  wings:[['butterfly','蝶の羽'],['leaf','若葉の羽'],['light','光の羽'],['crystal','氷晶の羽'],['dragonfly','妖精の羽'],['night','星空の羽']],
};
definitions.hair.unshift(['starter-short','はじまりのショート'],['starter-bob','はじまりのボブ']);
definitions.outfit.unshift(['starter-green','はじまりの若草服'],['starter-pink','はじまりのピンクドレス']);
definitions.accessory.push(['starter-antenna','はじまりの触角']);
definitions.wings.unshift(['starter-rainbow','はじまりの虹色の羽']);
export const ITEMS:Item[] = CATEGORIES.flatMap(c=>definitions[c.id].map(([id,name])=>({id,name:avatarProduct(c.id,id)?.name??name,category:c.id,starter:c.id==='base'||id==='none'||id.startsWith('starter-'),shop:'fairy' as const,price:avatarProduct(c.id,id)?.price??0,asset:id==='none'?undefined:`/avatar/v2/parts/${c.id}-${c.id==='hair'&&id==='starter-short'?'short':id}.png`})));
export type Appearance = Record<Category,string> & {skinColor:string;hairColor:string;name:string};
export type AdjustableCategory = 'hair'|'accessory'|'outfit'|'wings';
export type Adjustments = Record<string,number>;
export const adjustmentKey = (a:Appearance,c:AdjustableCategory)=>c==='accessory'?`accessory:${a.hair}:${a.accessory}`:`${c}:${a[c]}`;
export const adjustmentY = (a:Appearance,c:AdjustableCategory,values:Adjustments)=>values[adjustmentKey(a,c)]??0;
export const adjustmentScale = (a:Appearance,c:AdjustableCategory,values:Adjustments)=>values[`scale:${adjustmentKey(a,c)}`]??100;
export function adjustScale(values:Adjustments,a:Appearance,c:AdjustableCategory,percent:number):Adjustments{
 if(!Number.isFinite(percent)||c==='accessory'&&a.accessory==='none')return values;
 return {...values,[`scale:${adjustmentKey(a,c)}`]:Math.max(70,Math.min(130,Math.round(percent)))};
}
export const hairFilter = (hair:string,color:string)=>hair==='starter-bob'&&color==='blue'?'none':HAIR_COLORS.find(c=>c.id===color)?.filter;
export function adjustPosition(values:Adjustments,a:Appearance,c:AdjustableCategory,y:number):Adjustments {
 if(!Number.isFinite(y)||c==='accessory'&&a.accessory==='none')return values;
 return {...values,[adjustmentKey(a,c)]:Math.max(-150,Math.min(150,Math.round(y)))};
}
export function readAdjustments(value:unknown):Adjustments {
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const result:Adjustments={};
 for(const [key,y] of Object.entries(value)){
  const scale=key.startsWith('scale:'),part=scale?key.slice(6):key;
  if(/^(hair|outfit|wings):[\w-]+$|^accessory:[\w-]+:[\w-]+$/.test(part)&&typeof y==='number'&&Number.isFinite(y)&&(scale?y>=70&&y<=130:Math.abs(y)<=150))result[key]=Math.round(y);
 }
 return result;
}
export type Wardrobe = {version:2;equipped:Appearance;owned:string[];closetPurchased:boolean;adjustments:Adjustments};
export const DEFAULT:Appearance = {base:'gentle',hair:'starter-bob',accessory:'starter-antenna',outfit:'starter-pink',wings:'starter-rainbow',skinColor:'natural',hairColor:'blue',name:'リリ'};
export const itemKey = (i:Pick<Item,'category'|'id'>)=>`${i.category}:${i.id}`;
export const initialWardrobe = ():Wardrobe=>({version:2,equipped:{...DEFAULT},owned:ITEMS.filter(i=>i.starter).map(itemKey),closetPurchased:false,adjustments:{}});
export function purchaseCloset(w:Wardrobe):Wardrobe{return {...w,closetPurchased:true,owned:[...new Set([...w.owned,...ITEMS.filter(i=>i.starter).map(itemKey)])]};}
export function grantPurchases(w:Wardrobe,receipts:string[]=[]):Wardrobe{
 const next=receipts.includes('closet')?purchaseCloset(w):w;
 const owned=PRODUCTS.filter(p=>p.kind==='avatar'&&receipts.includes(p.id)&&ITEMS.some(i=>itemKey(i)===p.target)).map(p=>p.target);
 for(const id of ['short','bob'])if(receipts.includes(`avatar-hair-${id}`))owned.push(`hair:${currentHair(id)}`);
 return {...next,owned:[...new Set([...next.owned,...owned])]};
}
export const offered=(item:Item)=>avatarProduct(item.category,item.id);
export const storageKey = (uid:string)=>`habit-world.wardrobe.v2:${uid}`;
const currentHair=(id:string)=>id==='short'?'starter-short':id==='bob'?'starter-bob':id;
const currentItemKey=(key:string)=>key.startsWith('hair:')?`hair:${currentHair(key.slice(5))}`:key;
export function validAppearance(value:unknown):value is Appearance {
 if(!value||typeof value!=='object')return false;const a=value as Appearance;
 return typeof a.name==='string'&&!!a.name.trim()&&a.name.length<=20&&CATEGORIES.every(c=>ITEMS.some(i=>i.category===c.id&&i.id===a[c.id]))&&SKIN_COLORS.some(c=>c.id===a.skinColor)&&HAIR_COLORS.some(c=>c.id===a.hairColor);
}
export function owns(w:Wardrobe,a:Appearance){return CATEGORIES.every(c=>w.owned.includes(itemKey({category:c.id,id:a[c.id]})));}
export function readWardrobe(value:unknown):Wardrobe|null{
 if(!value||typeof value!=='object')return null;const original=value as Wardrobe;
 if(!original.equipped||!Array.isArray(original.owned)||!original.owned.every(k=>typeof k==='string'))return null;
 const adjustments=readAdjustments(original.adjustments),migrated:Adjustments={};
 for(const [key,n] of Object.entries(adjustments)){
  const tokens=key.split(':'),part=tokens[0]==='scale'?1:0;
  if(tokens[part]==='hair'||tokens[part]==='accessory')tokens[part+1]=currentHair(tokens[part+1]);
  const next=tokens.join(':');migrated[next]=adjustments[next]??n;
 }
 const w={...original,equipped:{...original.equipped,hair:currentHair(original.equipped.hair)},owned:original.owned.map(currentItemKey),adjustments:migrated};
 if(w.version!==2||!validAppearance(w.equipped)||!Array.isArray(w.owned)||!w.owned.every(k=>typeof k==='string'&&ITEMS.some(i=>itemKey(i)===k))||!owns(w,w.equipped))return null;
 return {version:2,equipped:{...w.equipped},owned:[...new Set(w.owned)],closetPurchased:w.closetPurchased===true,adjustments:readAdjustments(w.adjustments)};
}
export function equip(a:Appearance,category:Category,id:string):Appearance{return ITEMS.some(i=>i.category===category&&i.id===id)?{...a,[category]:id}:a;}
export function buy(w:Wardrobe,category:Category,id:string,shop:Shop):Wardrobe{
 if(!w.closetPurchased)throw Error('まず妖精の衣類店でクローゼットを購入してください。');
 const item=ITEMS.find(i=>i.category===category&&i.id===id&&i.shop===shop);
 if(!item||!offered(item)?.enabled)throw Error('この店舗では購入できません。');if(offered(item)?.price!==0)throw Error('ゴールド決済で購入してください。');
 return {...w,owned:[...new Set([...w.owned,itemKey(item)])]};
}
export function saveAppearance(w:Wardrobe,a:Appearance):Wardrobe{
 if(!w.closetPurchased)throw Error('まず妖精の衣類店でクローゼットを購入してください。');
 if(!validAppearance(a)||!owns(w,a))throw Error('未購入のアイテムがあります。購入してから保存してください。');
 return {...w,equipped:{...a,name:a.name.trim()}};
}
export function renderLayers(a:Appearance,adjustments:Adjustments={}):RenderLayer[]{
 const registry=sprites as Record<string,Omit<RenderLayer,'id'|'filter'>>;
 const layers:RenderLayer[]=(['wings','base','outfit','hair','accessory'] as Category[]).flatMap(id=>{
  const sprite=registry[`${id}-${a[id]}`];if(!sprite)return [];
  const scale=id==='base'?1:adjustmentScale(a,id,adjustments)/100;
  return [{...sprite,id,x:sprite.x+sprite.width*(1-scale)/2,width:sprite.width*scale,height:sprite.height*scale,y:sprite.y+sprite.height*(1-scale)/2+(id==='base'?0:adjustmentY(a,id,adjustments)),filter:id==='base'?SKIN_COLORS.find(c=>c.id===a.skinColor)?.filter:id==='hair'?hairFilter(a.hair,a.hairColor):undefined}];
 });
 const hair=layers.find(l=>l.id==='hair');
 const base=layers.find(l=>l.id==='base');
 // Full trouser/boot sets cover the bare legs. The base selection and skin setting stay intact.
 if(base&&['prince','ranger','coat','bard','armor','wizard'].includes(a.outfit))base.clipPath='inset(0 0 27% 0)';
 if(base)layers.splice(layers.indexOf(base)+1,0,{...base,id:'face',filter:undefined});
 if(hair&&a.hair!=='starter-short'){
  layers.splice(1,0,{...hair,id:'hair-back'});
  // Keep the hair behind the neck and outfit; only fringe and side locks go in front.
  hair.clipPath='polygon(0 0,100% 0,100% 100%,76% 100%,76% 58%,24% 58%,24% 100%,0 100%)';
 }
 return layers;
}
