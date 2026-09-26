import {PRODUCTS,BUYBACK,MATERIALS,type StoreId} from './shopCatalog';
import {advanceRoom,type FairyRoomState} from './fairyRoomModel';
export type TradeInput={type:'buy';shop:StoreId;productId:string}|{type:'sell';shop:StoreId;materialId:string;quantity:number}|{type:'use'|'equip';productId:string};
export type TradeAction=TradeInput&{requestId:string};
export function tradeRoom(source:FairyRoomState,action:TradeAction,now:number):FairyRoomState{
 if(!action.requestId||action.requestId.length>100)throw Error('取引番号が不正です。');
 if(source.tradeIds?.includes(action.requestId))return source;
 const state=advanceRoom(source,now);let message='';
 const inventory={...state.inventory},materials={...state.materials},purchases=[...(state.purchases??[])];let coins=state.coins??0;
 if(!Number.isSafeInteger(coins)||coins<0)throw Error('コイン残高を確認できません。');
 if(action.type==='sell'){
  const price=BUYBACK.find(b=>b.shop===action.shop&&b.material===action.materialId&&b.enabled);
  if(!price)throw Error('この店舗では買い取っていません。');
  if(!Number.isSafeInteger(action.quantity)||action.quantity<1||(materials[action.materialId]??0)<action.quantity)throw Error('売却する素材が足りません。');
  const total=price.price*action.quantity;if(!Number.isSafeInteger(coins+total))throw Error('取引額が大きすぎます。');
  materials[action.materialId]-=action.quantity;coins+=total;
  message=`${MATERIALS.find(m=>m.id===action.materialId)?.name??action.materialId}を${action.quantity}個売却し、${total}コイン受け取りました。`;
 }else{
  const product=PRODUCTS.find(p=>p.id===action.productId);if(!product)throw Error('商品が見つかりません。');
  if(action.type==='buy'){
   if(!product.enabled||product.shop!==action.shop)throw Error('この店舗では販売していません。');
   if(product.kind!=='consumable'&&purchases.includes(product.id))return state;
   // Fitting access also accepts the previously purchased browser wardrobe.
   if(coins<product.price)throw Error('コインが足りません。素材の買取を利用できます。');
   coins-=product.price;
   if(product.kind==='consumable'||product.kind==='equipment')inventory[product.id]=(inventory[product.id]??0)+1;
   if(product.kind!=='consumable')purchases.push(product.id);
   message=`${product.name}を${product.price}コインで購入しました。`;
  }else{
   if((inventory[product.id]??0)<1)throw Error('このアイテムを所持していません。');
   if(action.type==='equip'){
    if(product.kind!=='equipment')throw Error('装備できないアイテムです。');
    state.equipment=state.equipment===product.id?null:product.id;message=state.equipment?`${product.name}を装備しました。`:'装備を外しました。';
   }else{
    if(product.kind!=='consumable'||product.effect!=='health')throw Error('使用できないアイテムです。');
    if(state.adventure)throw Error('帰還してから使ってください。');
    if(state.health>=100)throw Error('体力は満タンです。');
    state.health=Math.min(100,state.health+product.amount);state.sleeping=state.health<=0;inventory[product.id]--;
    message=`${product.name}を使い、体力を回復しました。`;
   }
  }
 }
 return {...state,coins,materials,inventory,purchases,tradeIds:[...(state.tradeIds??[]),action.requestId].slice(-200),records:[...state.records,{id:`trade-${action.requestId}`,at:new Date(now).toISOString(),text:message}].slice(-100)};
}
