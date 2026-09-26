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
  return runTransaction(db, async tx => {
    const ref = doc(db, "users", uid);
    const profile = (await tx.get(ref)).data() as UserProfile | undefined;
    if (profile?.fairy?.status !== "ready") throw new Error("妖精が生まれてから、お部屋に遊びに来てください。");
    let room = advanceRoom(profile.fairyRoom ?? createRoom(now, profile.fairy.bornAt), now, level);
    if (areaId) room = departAdventure(room, now, areaId, random);
    tx.update(ref, { fairyRoom: room });
    return room;
  });
}
export async function tradeFairyRoom(uid:string,action:TradeAction){
 if(auth.currentUser?.uid!==uid||auth.currentUser.isAnonymous)throw Error('Googleアカウントでログインしてください。');
 const now=Date.now();return runTransaction(db,async tx=>{
  const ref=doc(db,'users',uid),profile=(await tx.get(ref)).data() as UserProfile|undefined;
  if(profile?.fairy?.status!=='ready')throw Error('妖精が生まれてから利用できます。');
  const room=tradeRoom(profile.fairyRoom??createRoom(now,profile.fairy.bornAt),action,now);
  tx.update(ref,{fairyRoom:room});return room;
 });
}
