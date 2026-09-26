export const ROOM_RULES = {
  maxHealth: 100, decayPerDay: 5, habitRecovery: 8, adventureMinHealth: 80,
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
  const state: FairyRoomState = { health: 100, updatedAt: now, sleeping: false, adventurePoints: 0, highestLevel: 1, recoveryDay: "", recoveredHabitIds: [], adventure: null, records: [], materials:{},inventory:{},purchases:[],equipment:null,tradeIds:[] };
  if (bornAt) record(state, "birth", bornAt, "あなたの妖精が誕生しました。");
  record(state, "room-open", now, "木のうろのお部屋で、新しい暮らしが始まりました。");
  return state;
}
export function advanceRoom(source: FairyRoomState, now: number, level = source.highestLevel): FairyRoomState {
  const state = { ...source, records: [...source.records], recoveredHabitIds: [...source.recoveredHabitIds],materials:{...source.materials},inventory:{...source.inventory},purchases:[...(source.purchases??[])] };
  const elapsed = Math.max(0, now - source.updatedAt);
  state.health = Math.max(0, Math.min(100, source.health - elapsed / 86400000 * ROOM_RULES.decayPerDay));
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
  if (!state.sleeping && state.health === 0) {
    state.sleeping = true;
    record(state, `sleep-${now}`, now, "しばらく会えなかったので、妖精は静かに冬眠しています。");
  }
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
  state.health = Math.min(100, state.health + ROOM_RULES.habitRecovery);
  if (state.sleeping) {
    state.sleeping = false;
    record(state, `wake-${now}`, now, "あなたが習慣を再開して、妖精が冬眠から目覚めました。");
  }
  return state;
}
export function departAdventure(source: FairyRoomState, now: number, areaId: string, random: number): FairyRoomState {
  const state = advanceRoom(source, now);
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
