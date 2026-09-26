"use client";
import { useEffect, useRef, useState } from "react";
import { afterPaint } from "@/lib/afterPaint";

/** Presentation only. Keep rewards on the authoritative subscribed documents. */
export function useOptimisticCompletion<T extends { id: string; done: boolean }>(source: T[], owner: string | null) {
  const [pending, setPending] = useState<{ owner: string | null; id: string; done: boolean; settled: boolean } | null>(null);
  const lock = useRef(false);
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  useEffect(() => {
    if (pending?.settled && pending.owner === owner && source.find(item => item.id === pending.id)?.done === pending.done) setPending(null);
  }, [source, owner, pending]);
  const items = pending && pending.owner === owner
    ? source.map(item => item.id === pending.id ? { ...item, done: pending.done } : item) : source;
  const complete = async (id: string, done: boolean, save: () => Promise<unknown>) => {
    if (lock.current) return false;
    lock.current = true;
    const operation = { owner, id, done, settled: false };
    setPending(operation);
    try {
      await afterPaint();
      if (currentOwner.current !== owner) { setPending(null); return false; }
      await save();
      if (currentOwner.current === owner) setPending({ ...operation, settled: true });
      return true;
    } catch (error) {
      setPending(null);
      throw error;
    } finally { lock.current = false; }
  };
  return { items, complete };
}
