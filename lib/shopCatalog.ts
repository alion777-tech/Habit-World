import data from '../data/shop-catalog.json';
export type StoreId='elf'|'dwarf'|'fairy';
export type Product={id:string;name:string;shop:StoreId;kind:'consumable'|'equipment'|'avatar'|'closet';price:number;effect:'none'|'health'|'adventure-ap'|'material-bonus';amount:number;target:string;enabled:boolean;description:string};
export const PRODUCTS=data.products as Product[];
export const MATERIALS=data.materials;
export const BUYBACK=data.buyback;
export const avatarProduct=(category:string,id:string)=>PRODUCTS.find(p=>p.kind==='avatar'&&p.target===`${category}:${id}`);
export const effectText=(p:Product)=>p.effect==='health'?`体力 +${p.amount}`:p.effect==='adventure-ap'?`出発時の獲得AP +${p.amount}`:p.effect==='material-bonus'?`出発時の素材数 +${p.amount} / 種類`:p.kind==='closet'?'クローゼット・試着室を解禁':'着替えパーツ';
