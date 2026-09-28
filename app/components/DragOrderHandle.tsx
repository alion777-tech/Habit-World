"use client";
import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
export default function DragOrderHandle({ id, group, disabled, onMove }: { id: string; group: string; disabled?: boolean; onMove: (target: string) => void }) {
  const ja = useLocale() === 'ja';
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{pointer: number; x: number; y: number; target: HTMLElement | null; frame: number} | null>(null);
  const clear = () => { const d=drag.current; if(d) { cancelAnimationFrame(d.frame); d.target?.classList.remove('card-drop-target'); } drag.current=null; };
  useEffect(() => clear, []);
  const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-order-group]')).filter(el => el.dataset.orderGroup === group);
  const update = () => {
    const d=drag.current; if(!d) return;
    const hit=document.elementFromPoint(d.x,d.y)?.closest<HTMLElement>('[data-order-group]') ?? null;
    const target=hit?.dataset.orderGroup===group ? hit : null;
    if(target!==d.target) { d.target?.classList.remove('card-drop-target'); d.target=target; if(target?.dataset.orderId!==id) target?.classList.add('card-drop-target'); }
    const container=rows()[0]?.closest<HTMLElement>('.app-content');
    if(container) { const rect=container.getBoundingClientRect(); if(d.y<rect.top+55) container.scrollTop-=10; else if(d.y>rect.bottom-55) container.scrollTop+=10; }
    d.frame=requestAnimationFrame(update);
  };
  return <button type="button" disabled={disabled} aria-label={ja ? 'ドラッグで並べ替え（上下キーでも移動）' : 'Drag to reorder (or use arrow keys)'} title={ja ? 'つかんで上下に移動' : 'Drag up or down'}
    style={{ touchAction:'none', userSelect:'none', cursor:disabled?'wait':dragging?'grabbing':'grab', minWidth:36, minHeight:44, border:0, borderRadius:6, background:dragging?'#6366f133':'transparent', color:'inherit', flexShrink:0, fontSize:22 }}
    onPointerDown={e=>{ if(disabled || !e.isPrimary || e.button!==0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,target:null,frame:0};setDragging(true);update(); }}
    onPointerMove={e=>{if(drag.current) {drag.current.x=e.clientX;drag.current.y=e.clientY;}}}
    onPointerUp={e=>{const d=drag.current;if(!d || d.pointer!==e.pointerId)return;const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-order-group]');const target=hit?.dataset.orderGroup===group?hit.dataset.orderId:undefined;clear();setDragging(false);if(target && target!==id)onMove(target);}}
    onPointerCancel={()=>{clear();setDragging(false);}}
    onLostPointerCapture={()=>{clear();setDragging(false);}}
    onKeyDown={e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();const list=rows();const index=list.findIndex(el=>el.dataset.orderId===id);const target=list[index+(e.key==='ArrowUp'?-1:1)]?.dataset.orderId;if(target)onMove(target);}}
  >≡</button>;
}
