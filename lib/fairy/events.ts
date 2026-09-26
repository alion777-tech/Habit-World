import type { Category } from "./dialogue";

// Emit only after a successful user action; never infer rewards from initial snapshots.
export function announceFairy(event: Category) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("fairy-dialogue", { detail: event }));
}
