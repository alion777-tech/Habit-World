import { readWardrobe, storageKey } from '../app/(root)/avatar/wardrobe';
import { PRODUCTS } from './shopCatalog';

// Old free purchases lived in the browser. Merge receipts without charging again.
export function legacyShopPurchases(uid: string): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(uid));
    const wardrobe = raw ? readWardrobe(JSON.parse(raw)) : null;
    if (!wardrobe?.closetPurchased) return [];
    return ['closet', ...PRODUCTS.filter(p => p.kind === 'avatar' && wardrobe.owned.includes(p.target)).map(p => p.id)];
  } catch { return []; }
}
