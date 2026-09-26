'use client';
import {useEffect,useState} from 'react';
import {readWardrobe,storageKey,type Wardrobe} from '../app/(root)/avatar/wardrobe';
export function useWardrobe(uid?:string|null){
 const [value,setValue]=useState<{uid:string;wardrobe:Wardrobe}|null>(null);
 useEffect(()=>{function refresh(){if(!uid){setValue(null);return;}try{const raw=localStorage.getItem(storageKey(uid)),wardrobe=raw?readWardrobe(JSON.parse(raw)):null;setValue(wardrobe?{uid,wardrobe}:null);}catch{setValue(null);}}
 refresh();window.addEventListener('wardrobe-updated',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('wardrobe-updated',refresh);window.removeEventListener('storage',refresh);};},[uid]);
 return value&&value.uid===uid?value.wardrobe:null;
}
