export const ROOM_RULES = {
  maxHealth: 100, maxEnergy: 100, changePerDay: 100 / 7, habitEnergyRecovery: 5,
  sleepHealth: 5, wakeHealth: 50, wakeEnergy: 50, adventureMinHealth: 80,
  recordLimit: 100,
} as const;
export const ADVENTURE_AREAS = [
  { id: "forest", name: "森の奥", durationMs: 86400000, healthCost: 20, minReward: 20, maxReward: 40 },
] as const;
export type RoomRecord = { id: string; at: string; text: string };
export type FairyRoomState = {
  /** Read-only compatibility with pre-gold saves; removed during migration. */
  coins?:number;
  /** UI projection; authoritative gold lives in users/{uid}.economy. */
  gold?:number;
  materials?:Record<string,number>;
  inventory?:Record<string,number>;
  purchases?:string[];
  equipment?:string|null;
  tradeIds?:string[];
  health: number;
  /** Absent only in legacy saves; starts at 100 when first advanced. */
  energy?: number;
  updatedAt: number;
  sleeping: boolean;
  adventurePoints: number;
  highestLevel: number;
  recoveryDay: string;
  recoveredHabitIds: string[];
  adventure: { areaId: string; departedAt: number; returnsAt: number; reward: number; materials?:Record<string,number> } | null;
  records: RoomRecord[];
};
function record(state: FairyRoomState, id: string, at: number | string, text: string) {
  if (state.records.some(item => item.id === id)) return;
  state.records = [...state.records, { id, at: typeof at === "number" ? new Date(at).toISOString() : at, text }].slice(-ROOM_RULES.recordLimit);
}
export function createRoom(now: number, bornAt?: string): FairyRoomState {
  const state: FairyRoomState = { health: ROOM_RULES.maxHealth, energy: ROOM_RULES.maxEnergy, updatedAt: now, sleeping: false, adventurePoints: 0, highestLevel: 1, recoveryDay: "", recoveredHabitIds: [], adventure: null, records: [], materials:{},inventory:{},purchases:[],equipment:null,tradeIds:[] };
  if (bornAt) record(state, "birth", bornAt, "あなたの妖精が誕生しました。");
  record(state, "room-open", now, "木のうろのお部屋で、新しい暮らしが始まりました。");
  return state;
}
/** Shared by time advancement, habits and existing health items. */
export function reconcileRoomSleep(state: FairyRoomState, at: number): void {
  if (state.sleeping) {
    if ((state.energy ?? ROOM_RULES.maxEnergy) > ROOM_RULES.wakeEnergy && state.health > ROOM_RULES.wakeHealth) {
      state.sleeping = false;
      record(state, `wake-${at}`, at, "気力と体力が戻り、妖精が冬眠から目覚めました。");
    }
  } else if (state.health <= ROOM_RULES.sleepHealth) {
    state.sleeping = true;
    record(state, `sleep-${at}`, at, "しばらく会えなかったので、妖精は静かに冬眠しています。");
  }
}
export function advanceRoom(source: FairyRoomState, now: number, level = source.highestLevel): FairyRoomState {
  const state = { ...source, records: [...source.records], recoveredHabitIds: [...source.recoveredHabitIds],materials:{...source.materials},inventory:{...source.inventory},purchases:[...(source.purchases??[])] };
  const rate = ROOM_RULES.changePerDay / 86400000;
  // Missing energy starts now: neither meter is advanced using an invented past energy.
  const elapsed = source.energy === undefined ? 0 : Math.max(0, now - source.updatedAt);
  state.health = Math.max(0, Math.min(ROOM_RULES.maxHealth, source.health));
  state.energy = Math.max(0, Math.min(ROOM_RULES.maxEnergy, source.energy ?? ROOM_RULES.maxEnergy));
  const start = Math.max(now, source.updatedAt) - elapsed;
  reconcileRoomSleep(state, start);
  // Energy crosses 50 during this interval: integrate recovery and decline separately.
  const recoveringMs = Math.min(elapsed, Math.max(0, state.energy - ROOM_RULES.wakeEnergy) / rate);
  const beforeRecovery = state.health;
  // Sleep persists while natural recovery continues; items cannot bypass it.
  state.health = Math.min(ROOM_RULES.maxHealth, state.health + recoveringMs * rate);
  if (state.sleeping && state.health > ROOM_RULES.wakeHealth && recoveringMs > 0) {
    const wakeAt = start + Math.max(0, ROOM_RULES.wakeHealth - beforeRecovery) / rate;
    reconcileRoomSleep(state, wakeAt);
  }
  const decliningMs = elapsed - recoveringMs;
  const beforeDecline = state.health;
  state.health = Math.max(0, state.health - decliningMs * rate);
  state.energy = Math.max(0, state.energy - elapsed * rate);
  if (decliningMs > 0 && !state.sleeping && state.health <= ROOM_RULES.sleepHealth) {
    const sleepAt = start + recoveringMs + Math.max(0, beforeDecline - ROOM_RULES.sleepHealth) / rate;
    reconcileRoomSleep(state, sleepAt);
  }
  state.updatedAt = Math.max(now, source.updatedAt);
  if (state.adventure && now >= state.adventure.returnsAt) {
    const trip = state.adventure;
    state.adventurePoints += trip.reward;
    const drops=trip.materials??Object.fromEntries(MATERIALS.filter(m=>m.enabled&&m.area===trip.areaId).map(m=>[m.id,m.min]));
    for(const [id,count] of Object.entries(drops))state.materials[id]=(state.materials[id]??0)+count;
    record(state, `return-${trip.departedAt}`, trip.returnsAt, `森の奥から帰ってきました。冒険ポイントを${trip.reward} AP獲得しました。`);
    record(state, `materials-${trip.departedAt}`, trip.returnsAt, `おみやげ：${Object.entries(drops).map(([id,count])=>`${MATERIALS.find(m=>m.id===id)?.name??id} ${count}個`).join('、')}`);
    state.adventure = null;
  }
  reconcileRoomSleep(state, state.updatedAt);
  if (level > state.highestLevel) {
    state.highestLevel = level;
    record(state, `level-${level}`, now, `妖精がLv.${level}まで成長していることを記録しました。`);
  }
  return state;
}
export function recoverFromHabit(source: FairyRoomState, now: number, today: string, habitId: string): FairyRoomState {
  const state = advanceRoom(source, now);
  if (state.recoveryDay !== today) { state.recoveryDay = today; state.recoveredHabitIds = []; }
  if (state.recoveredHabitIds.includes(habitId)) return state;
  state.recoveredHabitIds.push(habitId);
  state.energy = Math.min(ROOM_RULES.maxEnergy, state.energy! + ROOM_RULES.habitEnergyRecovery);
  reconcileRoomSleep(state, state.updatedAt);
  return state;
}
export function departAdventure(source: FairyRoomState, now: number, areaId: string, random: number): FairyRoomState {
  const state = advanceRoom(source, now);
  if (state.sleeping) throw new Error("冬眠中は冒険に出かけられません。気力と体力を回復しましょう。");
  const area = ADVENTURE_AREAS.find(item => item.id === areaId);
  if (!area) throw new Error("この場所への冒険は、まだ準備中です。");
  if (state.adventure) throw new Error("妖精はすでに冒険に出かけています。");
  if (state.health < ROOM_RULES.adventureMinHealth) throw new Error("冒険にはハート4個以上が必要です。習慣を続けて体力を回復しましょう。");
  const roll=Math.max(0,Math.min(0.999999,random));
  const gear=PRODUCTS.find(p=>p.id===state.equipment&&p.kind==='equipment'&&(state.inventory?.[p.id]??0)>0);
  const reward = area.minReward + Math.floor(roll * (area.maxReward - area.minReward + 1))+(gear?.effect==='adventure-ap'?gear.amount:0);
  const materials=Object.fromEntries(MATERIALS.filter(m=>m.enabled&&m.area===areaId).map((m,index)=>[m.id,m.min+Math.floor(((roll+index*.317)%1)*(m.max-m.min+1))+(gear?.effect==='material-bonus'?gear.amount:0)]));
  state.health -= area.healthCost;
  state.adventure = { areaId, departedAt: now, returnsAt: now + area.durationMs, reward, materials };
  record(state, `depart-${now}`, now, `${area.name}へ冒険に出かけました。`);
  return state;
}
export function heartFill(health: number, index: number) {
  return Math.max(0, Math.min(1, health / 20 - index));
}
import {MATERIALS,PRODUCTS} from './shopCatalog';
