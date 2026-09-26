export const HAIRS=[{id:'short',name:'そよ風ショート'},{id:'long',name:'月あかりロング'},{id:'twintail',name:'花風ツインテール'}] as const;
export const OUTFITS=[{id:'leaf',name:'森の旅人'},{id:'petal',name:'花びらのドレス'},{id:'star',name:'星読みのローブ'}] as const;
export const WINGS=[{id:'butterfly',name:'虹のちょうちょ'},{id:'leaf',name:'若葉のささやき'},{id:'crystal',name:'星晶のつばさ'}] as const;
export const OPTIONS={hair:HAIRS,outfit:OUTFITS,wings:WINGS,eyes:[{id:'gentle',name:'やさしい瞳'},{id:'clear',name:'すっきりした瞳'}],brows:[{id:'arched',name:'やわらかな眉'},{id:'straight',name:'まっすぐな眉'}],nose:[{id:'dot',name:'小さな鼻'},{id:'curve',name:'丸みのある鼻'}],mouth:[{id:'smile',name:'にっこり'},{id:'open',name:'うれしい笑顔'}],cheeks:[{id:'rose',name:'さくら色'},{id:'peach',name:'あんず色'},{id:'none',name:'色なし'}]} as const;
export type Category=keyof typeof OPTIONS;
export type Avatar={version:3;name:string}&{[K in Category]:typeof OPTIONS[K][number]['id']};
export const DEFAULT:Avatar={version:3,name:'リリ',hair:'short',outfit:'leaf',wings:'butterfly',eyes:'gentle',brows:'arched',nose:'dot',mouth:'smile',cheeks:'rose'};
export const STORAGE_KEY='habit-world.avatar-prototype.v3';
export const LEGACY_KEY='habit-world.avatar-prototype.v2';
export function isAvatar(v:unknown):v is Avatar{if(!v||typeof v!=='object')return false;const a=v as Avatar;return a.version===3&&typeof a.name==='string'&&!!a.name.trim()&&a.name.length<=20&&(Object.keys(OPTIONS) as Category[]).every(k=>OPTIONS[k].some(o=>o.id===a[k]));}
export function migrate(v:unknown):Avatar|null{if(isAvatar(v))return v;if(!v||typeof v!=='object')return null;const a=v as Record<string,unknown>;if(a.version!==2||typeof a.name!=='string')return null;const next={...DEFAULT,name:a.name,hair:a.hair,outfit:a.outfit,wings:a.wings};return isAvatar(next)?next:null;}
export type Visibility=Record<Category,boolean>;
export const ALL_VISIBLE:Visibility={hair:true,outfit:true,wings:true,eyes:true,brows:true,nose:true,mouth:true,cheeks:true};
export const NONE_VISIBLE:Visibility={hair:false,outfit:false,wings:false,eyes:false,brows:false,nose:false,mouth:false,cheeks:false};
export type Layer={id:'mannequin'|Category;src:string;column:number;columns:number;row?:number;rows?:number;x:number;y:number;width:number;height:number;tint?:string;crop?:{x:number;width:number;total:number}};
export function layers(a:Avatar,visible:Visibility=ALL_VISIBLE):Layer[]{
 const h=HAIRS.findIndex(x=>x.id===a.hair),o=OUTFITS.findIndex(x=>x.id===a.outfit),w=WINGS.findIndex(x=>x.id===a.wings);
 const face=(id:'eyes'|'brows'|'nose'|'mouth',row:number,x:number,y:number,width:number):Layer=>({id,src:'/avatar/mannequin/features.png',columns:2,column:OPTIONS[id].findIndex(v=>v.id===a[id]),rows:4,row,x,y,width,height:width/2});
 return [
 ...(visible.wings?[{id:'wings' as const,src:'/avatar/wings.png',columns:3,column:w,x:40,y:255-[.555,.585,.555][w]*420,width:420,height:420}]:[]),
 {id:'mannequin',src:'/avatar/mannequin/neutral-v3.png',columns:1,column:0,x:0,y:31,width:500,height:580},
 ...(visible.outfit?[{id:'outfit' as const,src:'/avatar/mannequin/clothes.png',columns:3,column:o,x:[110,125,140][o],y:153,width:250,height:300}]:[]),
 ...(visible.cheeks&&a.cheeks!=='none'?[{id:'cheeks' as const,src:'',columns:1,column:0,x:192,y:173,width:116,height:22,tint:a.cheeks==='rose'?'#f18ba5':'#efa278'}]:[]),
 ...(visible.eyes?[face('eyes',0,177.5,110,145)]:[]),
 ...(visible.brows?[face('brows',1,177.5,91,145)]:[]),
 ...(visible.nose?[face('nose',2,190,150,120)]:[]),
 ...(visible.mouth?[face('mouth',3,190,164,120)]:[]),
 ...(visible.hair?[{id:'hair' as const,src:'/avatar/mannequin/hair.png',columns:3,column:h,x:[134.8,111.75,105.44][h],y:14,width:[237.6,279.65,293.55][h],height:334,crop:{x:[40,620,1285][h],width:[565,665,698][h],total:1983}}]:[])
 ];
}
export function describe(a:Avatar){return `${a.name||'妖精'}：${(Object.keys(OPTIONS) as Category[]).map(k=>OPTIONS[k].find(o=>o.id===a[k])?.name).join('、')}`;}
export function equip(a:Avatar,k:Category,id:string):Avatar{return OPTIONS[k].some(o=>o.id===id)?{...a,[k]:id}:a;}

