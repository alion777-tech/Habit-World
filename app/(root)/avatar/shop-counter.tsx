'use client';
import {useState} from 'react';
import {PRODUCTS,MATERIALS,BUYBACK,effectText,type StoreId} from '../../../lib/shopCatalog';
import {useCommerce} from './commerce';
import type {TradeInput} from '../../../lib/shopModel';
import s from './wardrobe.module.css';
export function ShopCounter({shop}:{shop:StoreId}){
 const {room,busy,ready,error,submit}=useCommerce();const [tab,setTab]=useState<'buy'|'sell'|'bag'>('buy'),[notice,setNotice]=useState(''),[quantity,setQuantity]=useState<Record<string,number>>({});
 async function act(input:TradeInput){try{const next=await submit(input);setNotice(next.records.at(-1)?.text??'保存しました。');}catch{setNotice('');}}
 const list=PRODUCTS.filter(p=>p.shop===shop&&p.enabled&&['consumable','equipment'].includes(p.kind));
 return <section className={s.counter} aria-label="商品の購入と素材買取"><header><h2>お店のカウンター</h2><strong>{(room.coins??0).toLocaleString()} コイン</strong></header><nav className={s.tabs} aria-label="取引の種類">{(['buy','sell','bag'] as const).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{{buy:'商品',sell:'素材の買取',bag:'所持品'}[t]}</button>)}</nav>
 {tab==='buy'&&<>{!list.length&&<p>{shop==='fairy'?'着替え商品は衣類店の試着室で選べます。':'商品の入荷をお待ちください。'}</p>}{list.map(p=><article key={p.id}><div><h3>{p.name}</h3><p>{effectText(p)}</p><small>{p.description}</small></div><div><strong>{p.price} コイン</strong><button className={s.purchase} disabled={!ready||busy||p.kind==='equipment'&&!!room.purchases?.includes(p.id)} onClick={()=>void act({type:'buy',shop,productId:p.id})}>{p.kind==='equipment'&&room.purchases?.includes(p.id)?'所持済み':'購入する'}</button></div></article>)}</>}
 {tab==='sell'&&<><p>冒険で集めた素材を売って、コインを受け取れます。</p>{BUYBACK.filter(b=>b.shop===shop&&b.enabled).map(b=>{const material=MATERIALS.find(m=>m.id===b.material)!,count=room.materials?.[b.material]??0,q=quantity[b.material]??1;return <article key={b.material}><div><h3>{material.name}</h3><p>所持 {count}個 · 1個 {b.price} コイン</p><small>受取額 {q*b.price} コイン</small></div><div><label>売る個数<input aria-label={`${material.name}の売却数`} type="number" min={1} max={count||1} step={1} value={q} onChange={e=>setQuantity({...quantity,[b.material]:Math.max(1,Math.floor(Number(e.target.value)||1))})}/></label><button className={s.purchase} disabled={!ready||busy||count<q} onClick={()=>void act({type:'sell',shop,materialId:b.material,quantity:q})}>売却する</button></div></article>;})}</>}
 {tab==='bag'&&<><p>装備の効果は次の冒険への出発時に反映されます。</p>{PRODUCTS.filter(p=>(room.inventory?.[p.id]??0)>0).map(p=><article key={p.id}><div><h3>{p.name} × {room.inventory?.[p.id]}</h3><p>{effectText(p)}</p></div><button className={s.purchase} disabled={!ready||busy} onClick={()=>void act({type:p.kind==='equipment'?'equip':'use',productId:p.id})}>{p.kind==='equipment'?(room.equipment===p.id?'装備を外す':'装備する'):'使う'}</button></article>)}{!Object.values(room.inventory??{}).some(n=>n>0)&&<p>購入した道具や装備がここに並びます。</p>}<h3>冒険素材</h3>{MATERIALS.map(m=><p key={m.id}>{m.name}：{room.materials?.[m.id]??0}個</p>)}</>}
 <p role="status" className={s.notice}>{error||notice}</p></section>;
}
