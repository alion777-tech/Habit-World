'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import FairyChamber from '../../app/components/FairyChamber';
import AutonomousFairy from '../../app/components/AutonomousFairy';
import {createRoom,advanceRoom,departAdventure,type FairyRoomState} from '../../lib/fairyRoomModel';
import {tradeRoom} from '../../lib/shopModel';
import Link from 'next/link';
export default function ConnectedAvatarPreview({uid}:{uid:string}){
 const current=useRef<FairyRoomState>(createRoom(0));const [room,setRoom]=useState<FairyRoomState|null>(null),[moving,setMoving]=useState(false),[error,setError]=useState('');
 const key=`habit-world.shop-preview.v1:${uid}`;
 useEffect(()=>{const read=()=>{try{const raw=localStorage.getItem(key),value=raw?JSON.parse(raw):createRoom(Date.now());current.current=value;setRoom(value);}catch{setError('確認用データを読み込めませんでした。');}};read();window.addEventListener('storage',read);return()=>window.removeEventListener('storage',read);},[key]);
 const commit=useCallback((next:FairyRoomState)=>{localStorage.setItem(key,JSON.stringify(next));current.current=next;setRoom(next);return next;},[key]);
 const sync=useCallback(async(level:number,areaId?:string)=>{let next=advanceRoom(current.current,Date.now(),level);if(areaId)next=departAdventure(next,Date.now(),areaId,.5);return commit(next);},[commit]);
 const trade=useCallback(async(action:import('../../lib/shopModel').TradeAction)=>commit(tradeRoom(current.current,action,Date.now())),[commit]);
 if(!room)return <p role="status">{error||'確認用の部屋を準備しています…'}</p>;
 return <><aside style={{padding:16,background:'#f4eedf',display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}><strong>接続確認用の妖精の部屋</strong><span>実際のアカウントには影響しません。</span><button onClick={()=>setMoving(v=>!v)}>{moving?'動く妖精を隠す':'動く妖精を表示'}</button><button disabled={!room.adventure} onClick={()=>{const value=current.current;if(value.adventure)commit(advanceRoom({...value,adventure:{...value.adventure,returnsAt:Date.now()}},Date.now()));}}>冒険をすぐ帰還させる（確認用）</button><Link href="/">確認メニューへ</Link></aside>
 {moving&&<AutonomousFairy uid={uid}/>}
 <FairyChamber uid={uid} fairy={{status:'ready',name:'確認用の妖精',appearance:'basic',eggReceivedAt:'2026-09-12',bornAt:'2026-09-12'}} room={room} totalPoints={1250} loginDays={128}
 onSync={sync}
 onTrade={trade}
 onName={async()=>{throw Error('確認画面の名前は固定です。');}}/>
 </>;
}
