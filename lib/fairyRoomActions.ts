import { legacyShopPurchases } from "./legacyShopOwnership";
import { readEconomy } from "./economyActions";
import { changeGold } from "./economyModel";
import { doc, runTransaction } from "firebase/firestore";
import { auth, db } from "./firebase";
import { advanceRoom, createRoom, departAdventure } from "./fairyRoomModel";
import type { UserProfile } from "@/types/appTypes";
import {tradeRoom,type TradeAction} from './shopModel';

export async function syncFairyRoom(uid: string, level: number, areaId?: string) {
  if (auth.currentUser?.uid !== uid || auth.currentUser.isAnonymous) throw new Error("Googleアカウントでログインしてください。");
  // Retries of the same transaction must keep the same departure result.
  const now = Date.now();
  const random = Math.random();
  const legacy = legacyShopPurchases(uid);
  return runTransaction(db, async tx => {
    const ref = doc(db, "users", uid);
    const state = await readEconomy(tx, uid);
    const profile = state.profile;
    if (profile?.fairy?.status !== "ready") throw new Error("妖精が生まれてから、お部屋に遊びに来てください。");
    let room = advanceRoom(profile.fairyRoom ?? createRoom(now, profile.fairy.bornAt), now, level);
    room.purchases = [...new Set([...(room.purchases ?? []), ...legacy])];
    if (areaId) room = departAdventure(room, now, areaId, random);
    tx.update(ref, { fairyRoom: room, economy: state.economy });
    return { ...room, gold: state.economy.gold };
  });
}
export async function tradeFairyRoom(uid:string,action:TradeAction){
 if(auth.currentUser?.uid!==uid||auth.currentUser.isAnonymous)throw Error('Googleアカウントでログインしてください。');
 const now=Date.now(),legacy=legacyShopPurchases(uid);return runTransaction(db,async tx=>{
  const state=await readEconomy(tx,uid);
  const {ref,profile}=state;
  if(profile?.fairy?.status!=='ready')throw Error('妖精が生まれてから利用できます。');
  const room=tradeRoom({...profile.fairyRoom??createRoom(now,profile.fairy.bornAt),gold:state.economy.gold,purchases:[...new Set([...(profile.fairyRoom?.purchases??[]),...legacy])]},action,now);
  const {gold,...storedRoom}=room;
  const economy=changeGold(state.economy,(gold??state.economy.gold)-state.economy.gold);
  tx.update(ref,{fairyRoom:storedRoom,economy});return room;
 });
}
