'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useTestAccess} from '@/hooks/useTestAccess';
import {CATEGORIES,SKIN_COLORS,HAIR_COLORS,SHOPS,ITEMS,DEFAULT,initialWardrobe,storageKey,readWardrobe,equip,saveAppearance,owns,itemKey,renderLayers,grantPurchases,offered,adjustmentY,adjustPosition,adjustmentScale,adjustScale,hairFilter,type Adjustments,type AdjustableCategory,type Appearance,type Category,type Shop,type Wardrobe} from './wardrobe';
import {CommerceProvider,useCommerce,type CommerceProps} from './commerce';
import {ShopCounter} from './shop-counter';
import {PRODUCTS} from '../../../lib/shopCatalog';
import {syncFairyRoom,tradeFairyRoom} from '@/lib/fairyRoomActions';
import type {FairyRoomState} from '../../../lib/fairyRoomModel';
import s from './wardrobe.module.css';
import {BaseLayer} from './base-layer';
export function AvatarFigure({avatar,adjustments={}}:{avatar:Appearance;adjustments?:Adjustments}){
 const description=CATEGORIES.map(c=>ITEMS.find(i=>i.category===c.id&&i.id===avatar[c.id])?.name).join('、');
 const layers=renderLayers(avatar,adjustments),headroom=Math.max(0,...layers.map(l=>-l.y)),height=600+headroom+Math.max(0,...layers.map(l=>l.y+l.height-600));
 const sideRoom=Math.max(0,...layers.map(l=>Math.max(-l.x,l.x+l.width-500))),width=500+sideRoom*2;
 return <div className={s.figure} style={{aspectRatio:`${width} / ${height}`}} role="img" aria-label={`アバタール：${description}`}>
  {layers.map(l=>{
   const style={position:'absolute' as const,left:`${(l.x+sideRoom)/width*100}%`,top:`${(l.y+headroom)/height*100}%`,width:`${l.width/width*100}%`,height:`${l.height/height*100}%`,clipPath:l.clipPath};
   return l.id==='base'||l.id==='face'?<BaseLayer key={l.id} src={l.src} part={l.id} skinFilter={l.filter} style={style}/>:<Image unoptimized alt="" key={l.id} src={l.src} width={500} height={600} data-layer={l.id} draggable={false} style={{...style,filter:l.filter}}/>;
  })}</div>;
}
function loadSaved(uid:string):Wardrobe {
 const raw=localStorage.getItem(storageKey(uid));if(!raw)return initialWardrobe();
 const value=readWardrobe(JSON.parse(raw));if(!value)throw Error('保存データを読み込めませんでした。');return value;
}
function writeSaved(uid:string,value:Wardrobe){localStorage.setItem(storageKey(uid),JSON.stringify(value));window.dispatchEvent(new Event('wardrobe-updated'));}
function useSavedWardrobe(uid:string){
 const commerce=useCommerce();
 const [value,setValue]=useState<Wardrobe|null>(null),[error,setError]=useState('');
 useEffect(()=>{function refresh(){try{setValue(loadSaved(uid));setError('');}catch{setError('保存データを読み込めませんでした。ブラウザーの保存設定を確認してください。');}}
 refresh();window.addEventListener('storage',refresh);window.addEventListener('wardrobe-updated',refresh);
 return ()=>{window.removeEventListener('storage',refresh);window.removeEventListener('wardrobe-updated',refresh);};},[uid]);
 return {value:value?grantPurchases(value,commerce.room.purchases):null,error};
}
export default function AvatarStudio({entry='closet'}:{entry?:'closet'|'shops'}){
 const access=useTestAccess();
 if(!access.uid||!access.enabled)return <p role="status">テスト権限を確認しています…</p>;
 return <AccountWardrobe key={access.uid} uid={access.uid} entry={entry}/>;
}
function AccountWardrobe({uid,entry}:{uid:string;entry:'closet'|'shops'}){
 const [room,setRoom]=useState<FairyRoomState>(),[error,setError]=useState('');
 useEffect(()=>{let active=true;syncFairyRoom(uid,1).then(r=>{if(active)setRoom(r);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'部屋を読み込めませんでした。');});return()=>{active=false;};},[uid]);
 if(!room)return <p role="status">{error||'妖精の部屋と所持品を確認しています…'}</p>;
 return <WardrobeStudio uid={uid} initialMode={entry} room={room} onTrade={async action=>{const next=await tradeFairyRoom(uid,action);setRoom(next);return next;}}/>;
}
export function WardrobeStudio({uid,initialMode='closet',onClose,room,onTrade}:{uid:string;initialMode?:'closet'|'shops';onClose?:()=>void}&CommerceProps){
 return <CommerceProvider uid={uid} room={room} onTrade={onTrade}>{initialMode==='shops'?<ShopDirectory uid={uid} onClose={onClose}/>:<DressingRoom uid={uid} entry="closet" onClose={onClose}/>}</CommerceProvider>;
}
function Back({onClick,label='妖精の部屋へ戻る'}:{onClick?:()=>void;label?:string}){return onClick?<button className={s.back} onClick={onClick}>← {label}</button>:<Link className={s.back} href="/ja">← ホームへ戻る</Link>;}
export function ShopDirectory({uid,onClose,initialShop=null}:{uid:string;onClose?:()=>void;initialShop?:Shop|null}){
 const commerce=useCommerce(),closetProduct=PRODUCTS.find(p=>p.id==='closet')!;
 const [shop,setShop]=useState<Shop|null>(initialShop),[fitting,setFitting]=useState(false),[greeting,setGreeting]=useState(0),[notice,setNotice]=useState('');
 const {value:wardrobe,error}=useSavedWardrobe(uid);
 const unlocked=wardrobe?.closetPurchased===true;
 const lines:Record<Shop,string[]>={
  elf:['いらっしゃいませ。今日は、どんな魔法をお探しですか？','森で集めた素材も買い取りますよ。旅のお話も聞かせてくださいね。'],
  dwarf:['よく来たのう！ 今日はどんな品をお求めじゃ？','装備も素材の買取も任せるがよい。次の冒険に備えるぞ。'],
  fairy:['いらっしゃい！ 今日はどんな姿になってみたい？','気になる衣装があったら、試着室で合わせてみてね。']
 };
 function greet(){setGreeting(n=>n+1);}
 async function unlock(){try{const result=await commerce.submit({type:'buy',shop:'fairy',productId:'closet'});writeSaved(uid,grantPurchases(loadSaved(uid),result.purchases));setNotice('クローゼットを購入しました。初期パーツがそろい、クローゼットと試着室が使えるようになりました。');setGreeting(0);}catch(e){setNotice(e instanceof Error?e.message:'購入を保存できませんでした。');}}
 if(fitting)return <DressingRoom uid={uid} entry="fitting" onClose={()=>setFitting(false)}/>;
 const current=SHOPS.find(x=>x.id===shop);
 return <section className={s.shops} aria-label="アイテムショップ">
  <header className={s.header}><span className={s.brand}>✧ HABIT WORLD</span><Back onClick={shop?()=>{setShop(null);setGreeting(0);}:onClose} label={shop?'ショップの入口へ戻る':'妖精の部屋へ戻る'}/></header>
  {!current?<><div className={s.heading}><span>THE LITTLE SHOP STREET</span><h1>森のアイテムショップ</h1><p>扉の向こうに、小さな出会い。</p></div><div className={s.shopCards}>{SHOPS.map(x=><button key={x.id} onClick={()=>setShop(x.id)}><div><Image unoptimized src={x.image} alt="" width={1264} height={843}/></div><span><small>{x.description}</small><strong>{x.name}</strong><b>お店に入る →</b></span></button>)}</div></>:<>
   <div className={s.shopTitle}><h1>{current.name}</h1><p>店員をタップして話しかける</p></div>
   <div className={s.shopScene} data-shop={shop}><div className={s.shopArtwork}><Image unoptimized src={current.image} alt={`${current.name}の店内`} width={shop==='elf'?1408:1264} height={shop==='elf'?768:843} priority/>
    <button className={s.keeper} aria-label={`${current.name}の店員に話しかける`} onClick={greet}><span className={greeting>0?s.dialogue:undefined} role="status" aria-live="polite">{greeting>0?(shop==='fairy'&&!unlocked?(greeting===1?'いらっしゃい、初めまして。ここはいろんな姿に変わることができるものを売っているの。':'ただし、最初にクローゼットの購入が必要なの。あなたのクローゼットを用意しましょうか？'):lines[current.id][(greeting-1)%lines[current.id].length]):'話しかける'}</span></button>
    </div><div className={s.shopBoard}>{shop==='fairy'?(unlocked?<><small>FAIRY FITTING ROOM</small><h2>今日は、どんなあなたに？</h2><p>髪も、衣装も、羽も。<br/>鏡の前で、自由に組み合わせてみて。</p><button className={s.primary} onClick={()=>{setFitting(true);setGreeting(0);}}>試着室へ →</button><small>所持ゴールド：{commerce.room.gold??0}</small></>:<><small>YOUR FIRST CLOSET</small><fieldset disabled style={{opacity:.45}}><button>アバター</button><button>クローゼット</button><button>試着室</button></fieldset><h2>{closetProduct.name}</h2><p>{closetProduct.description}</p>{greeting<2?<button className={s.primary} disabled={!wardrobe} onClick={greet}>{greeting===0?'妖精に話しかける':'つづきを聞く'}</button>:<><button className={s.primary} disabled={!wardrobe||!commerce.ready||commerce.busy||!closetProduct.enabled||(commerce.room.gold??0)<closetProduct.price} onClick={()=>void unlock()}>クローゼットを購入する</button><button className={s.back} onClick={()=>setGreeting(0)}>また今度にする</button></>}<small>所持ゴールド：{commerce.room.gold??0}</small><small>{!closetProduct.enabled?'ただいま販売をお休みしています':closetProduct.price===0?'今回は無料で購入できます':`${closetProduct.price} ゴールドで購入できます`}</small></>):<><small>{shop==='elf'?'ELF MAGIC SHOP':'DWARF WORKSHOP'}</small><h2>{shop==='elf'?'森の恵みを、旅の力に。':'次の冒険を、もっと豊かに。'}</h2><p>{shop==='elf'?'回復薬の購入や、薬草・石の買取はこちら。':'冒険装備の購入や、素材の買取はこちら。'}</p><a className={s.primary} href="#shop-counter">商品と買取を見る ↓</a></>}</div>
   </div>
   <p className={s.notice} role="status">{error||notice}</p>
   <div id="shop-counter"><ShopCounter key={current.id} shop={current.id}/></div>
  </>}
 </section>;
}
export function DressingRoom({uid,entry,onClose}:{uid:string;entry:'closet'|'fitting';onClose?:()=>void}){
 const {value,error}=useSavedWardrobe(uid);const [visitShop,setVisitShop]=useState(false);
 if(visitShop)return <ShopDirectory uid={uid} initialShop="fairy" onClose={()=>setVisitShop(false)}/>;
 if(!value)return <section className={s.room}><Back onClick={onClose}/><p role="status">{error||'クローゼットを確認しています…'}</p></section>;
 if(!value.closetPurchased)return <section className={s.room}><header className={s.header}><span className={s.brand}>✧ HABIT WORLD</span><Back onClick={onClose}/></header><div className={s.locked}><span>YOUR FIRST CLOSET</span><h1>着替えは、クローゼットから。</h1><div style={{maxWidth:160,margin:"auto"}}><AvatarFigure avatar={DEFAULT}/></div><fieldset disabled style={{opacity:.45}}><button>アバター</button><button>クローゼット</button><button>試着室</button></fieldset><p>妖精の衣類店でクローゼットを購入すると、<br/>クローゼットと試着室が使えるようになります。</p><button className={s.primary} onClick={()=>setVisitShop(true)}>妖精の衣類店へ →</button></div></section>;
 return <DressingRoomUnlocked uid={uid} entry={entry} onClose={onClose}/>;
}
function DressingRoomUnlocked({uid,entry,onClose}:{uid:string;entry:'closet'|'fitting';onClose?:()=>void}){
 const commerce=useCommerce();
 const [wardrobe,setWardrobe]=useState<Wardrobe>(initialWardrobe),[avatar,setAvatar]=useState<Appearance>({...DEFAULT});
 const [adjustments,setAdjustments]=useState<Adjustments>({});
 const [category,setCategory]=useState<Category>('outfit'),[ready,setReady]=useState(false),[notice,setNotice]=useState(''),[night,setNight]=useState(false);
 useEffect(()=>{try{const value=loadSaved(uid);setWardrobe(value);setAvatar(value.equipped);setAdjustments(value.adjustments);setReady(true);}catch{setNotice('保存データを読み込めませんでした。ブラウザーの保存設定を確認してください。');}},[uid]);
 function latest(){return grantPurchases(loadSaved(uid),commerce.room.purchases);}
 function persist(next:Wardrobe){writeSaved(uid,next);setWardrobe(next);}
 async function purchase(){if(entry!=='fitting')return;try{const item=ITEMS.find(i=>i.category===category&&i.id===avatar[category]),product=item&&offered(item);if(!product)throw Error('商品が見つかりません。');const result=await commerce.submit({type:'buy',shop:'fairy',productId:product.id});persist(grantPurchases(latest(),result.purchases));setNotice('購入しました。クローゼットに追加されています。');}catch(e){setNotice(e instanceof Error?e.message:'購入を保存できませんでした。');}}
 function decide(){try{const current=latest();const changed=Object.fromEntries(Object.entries(adjustments).filter(([key,y])=>y!==(wardrobe.adjustments[key]??(key.startsWith('scale:')?100:0))));const next=saveAppearance({...current,adjustments:{...current.adjustments,...changed}},avatar);persist(next);setAdjustments(next.adjustments);setAvatar(next.equipped);setNotice('この姿と調整した位置・大きさを保存しました。');}catch(e){setNotice(e instanceof Error?e.message:'保存できませんでした。');}}
 const adjustable=(category!=='base'&&!(category==='accessory'&&avatar.accessory==='none'))?category as AdjustableCategory:null;
 const offset=adjustable?adjustmentY(avatar,adjustable,adjustments):0;
 const scale=adjustable?adjustmentScale(avatar,adjustable,adjustments):100;
 const dirty=adjustable?offset!==adjustmentY(avatar,adjustable,wardrobe.adjustments)||scale!==adjustmentScale(avatar,adjustable,wardrobe.adjustments):false;
 function move(y:number){if(adjustable)setAdjustments(v=>adjustPosition(v,avatar,adjustable,y));}
 function resize(percent:number){if(adjustable)setAdjustments(v=>adjustScale(v,avatar,adjustable,percent));}
 function resetAdjustment(){if(adjustable)setAdjustments(v=>adjustScale(adjustPosition(v,avatar,adjustable,0),avatar,adjustable,100));}
 function savePosition(){if(!adjustable)return;try{const current=latest();if(!current.closetPurchased)throw Error('クローゼットを購入してください。');persist({...current,adjustments:adjustScale(adjustPosition(current.adjustments,avatar,adjustable,offset),avatar,adjustable,scale)});setNotice('位置と大きさを保存しました。');}catch{setNotice('調整を保存できませんでした。もう一度お試しください。');}}
 const effective=grantPurchases(wardrobe,commerce.room.purchases);
 const items=ITEMS.filter(i=>i.category===category&&(entry==='fitting'?(offered(i)?.enabled||effective.owned.includes(itemKey(i))):effective.owned.includes(itemKey(i))));
 const selected=items.find(i=>i.id===avatar[category]);const unowned=selected&&!effective.owned.includes(itemKey(selected));
 const colors=category==='base'?SKIN_COLORS:HAIR_COLORS;
 return <section className={`${s.room} ${night?s.night:''}`} aria-label={entry==='closet'?'クローゼット':'衣類店の試着室'}>
  <header className={s.header}><span className={s.brand}>✧ HABIT WORLD</span><Back onClick={onClose} label={entry==='fitting'?'妖精の衣類店へ戻る':'妖精の部屋へ戻る'}/></header>
  <div className={s.heading}><span>{entry==='closet'?'YOUR LITTLE CLOSET':'FAIRY FITTING ROOM'}</span><h1>{entry==='closet'?'アバタールーム · クローゼット':'妖精の衣類店 · 試着室'}</h1><p>{entry==='closet'?'お気に入りと、今日のあなた。':'新しいお気に入りを、見つけよう。'}</p></div>
  <div className={s.workspace}><section className={s.preview} aria-label="アバタールの合成プレビュー"><div className={s.mirror}/><span className={s.sparkle}>✧</span><div className={`${s.character} ${avatar.accessory==='rabbit'?s.tall:''}`}><AvatarFigure avatar={avatar} adjustments={adjustments}/></div><div className={s.nameplate}><small>{owns(wardrobe,avatar)?'あなたのお気に入り':'未購入のアイテムを試着中'}</small></div>
   {adjustable&&<fieldset className={s.adjuster}><legend>{CATEGORIES.find(c=>c.id===adjustable)?.name}の位置・大きさ</legend>
    <div><button disabled={!ready||offset<=-150} onClick={()=>move(offset-2)} aria-label="位置を上へ">↑ 上へ</button><output aria-label="上下位置" aria-live="polite">{offset>0?'+':''}{offset}</output><button disabled={!ready||offset>=150} onClick={()=>move(offset+2)} aria-label="位置を下へ">↓ 下へ</button></div>
    <div><button disabled={!ready||scale<=70} onClick={()=>resize(scale-2)} aria-label="パーツを縮小">− 縮小</button><output aria-label="パーツの大きさ" aria-live="polite">{scale}%</output><button disabled={!ready||scale>=130} onClick={()=>resize(scale+2)} aria-label="パーツを拡大">＋ 拡大</button></div>
    <div><button disabled={!ready} onClick={resetAdjustment}>元に戻す</button><button disabled={!ready||!dirty} onClick={savePosition}>調整を決定</button></div><small>{dirty?'未保存の調整があります':adjustable==='accessory'?'この髪型との組み合わせで記憶します':'このパーツの調整を記憶します'}</small></fieldset>}
   <div className={s.previewTools}><button onClick={()=>setNight(v=>!v)} aria-pressed={night}>{night?'☼ 朝の光':'☾ 夜の光'}</button><button disabled={!ready} onClick={()=>{setAvatar(wardrobe.equipped);setAdjustments(wardrobe.adjustments);setNotice('保存した姿と調整に戻しました。');}}>試着をリセット</button></div></section>
   <section className={s.editor} aria-label="パーツを選ぶ"><div className={s.editorTop}><span>{entry==='closet'?'MY COLLECTION':'FIND YOUR FAVORITE'}</span><small>{entry==='closet'?'所持アイテム':`${commerce.room.gold??0} ゴールド`}</small></div>
    <nav className={s.tabs} aria-label="パーツのカテゴリ">{CATEGORIES.map(c=><button key={c.id} aria-pressed={c.id===category} onClick={()=>setCategory(c.id)}>{c.name}</button>)}</nav>
    <div className={s.parts} aria-label={`${CATEGORIES.find(c=>c.id===category)?.name}の一覧`}>{items.map(i=><button className={s.part} disabled={!ready} key={itemKey(i)} aria-label={`${i.name}${effective.owned.includes(itemKey(i))?'（所持済み）':`（${offered(i)?.price??0} ゴールド）`}`} title={i.name} aria-pressed={i.id===avatar[category]} onClick={()=>{setAvatar(a=>equip(a,category,i.id));setNotice(`${i.name}を試着しています。`);}}>{i.asset?category==='base'?<BaseLayer src={i.asset} skinFilter={SKIN_COLORS.find(c=>c.id===avatar.skinColor)?.filter} style={{width:'100%',height:'100%'}}/>:<Image unoptimized src={i.asset} alt="" width={180} height={180} style={{filter:category==='hair'?hairFilter(i.id,avatar.hairColor):undefined}}/>:<span className={s.none} aria-hidden="true">∅</span>}</button>)}</div>
    {!items.length&&<p>このカテゴリの所持品はありません。</p>}
    {(category==='base'||category==='hair')&&<fieldset className={s.colors}><legend>{category==='base'?'肌の色':'髪色'}</legend>{colors.map(c=><button key={c.id} disabled={!ready} title={c.name} aria-label={c.name} aria-pressed={c.id===(category==='base'?avatar.skinColor:avatar.hairColor)} style={{background:c.color}} onClick={()=>setAvatar(a=>({...a,[category==='base'?'skinColor':'hairColor']:c.id}))}/>)}</fieldset>}
    <div className={s.actions}>{entry==='fitting'&&<button className={s.purchase} disabled={!ready||commerce.busy||!unowned||!offered(selected)?.enabled} onClick={()=>void purchase()}>{unowned?`${selected.name}を${offered(selected)?.price===0?'無料':`${offered(selected)?.price} ゴールド`}で購入`:selected?'所持済み':'アイテムを選んでください'}</button>}<button className={s.primary} disabled={!ready||!owns(effective,avatar)} onClick={decide}>この姿に決定する ✧</button>{!owns(effective,avatar)&&<small>未購入のアイテムは、購入後に保存できます。</small>}</div>
    <p className={s.notice} role="status">{notice||'パーツをタップすると、左の姿に反映されます。'}</p>
   </section>
  </div><footer className={s.footer}>姿はこのブラウザーに保存されます。商品の購入と所持品は妖精の部屋と共有されます。</footer>
 </section>;
}

