'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {createRoom,type FairyRoomState} from '../../../lib/fairyRoomModel';
import {tradeRoom,type TradeAction,type TradeInput} from '../../../lib/shopModel';
export type CommerceProps={room?:FairyRoomState;onTrade?:(action:TradeAction)=>Promise<FairyRoomState>};
type Commerce={room:FairyRoomState;busy:boolean;ready:boolean;error:string;submit:(action:TradeInput)=>Promise<FairyRoomState>};
const Context=createContext<Commerce|null>(null);
export function CommerceProvider({uid,room,onTrade,children}:CommerceProps&{uid:string;children:ReactNode}){
 const [local,setLocal]=useState(()=>createRoom(0)),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const running=useRef(false),pending=useRef<{signature:string;id:string}|null>(null);
 const key=`habit-world.shop-preview.v1:${uid}`;
 useEffect(()=>{if(onTrade){setReady(true);return;}const read=()=>{try{const raw=localStorage.getItem(key);setLocal(raw?JSON.parse(raw):createRoom(Date.now()));setReady(true);}catch{setError('所持品を読み込めませんでした。');setReady(false);}};read();window.addEventListener('storage',read);return()=>window.removeEventListener('storage',read);},[key,onTrade]);
 async function submit(input:TradeInput){
  if(running.current||!ready)throw Error('処理が終わるまでお待ちください。');
  running.current=true;setBusy(true);setError('');
  const signature=JSON.stringify(input);if(pending.current?.signature!==signature)pending.current={signature,id:crypto.randomUUID()};
  const action={...input,requestId:pending.current.id};
  try{let next:FairyRoomState;
   if(onTrade)next=await onTrade(action);
   else{const transact=async()=>{const raw=localStorage.getItem(key),current=raw?JSON.parse(raw):local;const result=tradeRoom(current,action,Date.now());localStorage.setItem(key,JSON.stringify(result));return result;};next=navigator.locks?await navigator.locks.request(key,transact):await transact();}
   setLocal(next);pending.current=null;return next;
  }catch(e){setError(e instanceof Error?e.message:'保存できませんでした。');throw e;}finally{running.current=false;setBusy(false);}
 }
 return <Context.Provider value={{room:room??local,busy,ready,error,submit}}>{children}</Context.Provider>;
}
export function useCommerce(){const value=useContext(Context);if(!value)throw Error('ショップの保存先が設定されていません。');return value;}
