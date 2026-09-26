import { LS_KEYS, notifyLocalStorageChange } from "./dataPersistence";

/**
 * 汎用的なローカルデータ操作クラス
 */
export class LocalStorageRepository {
  static getList<T>(key: string): T[] {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  }

  static saveList<T>(key: string, list: T[]) {
    localStorage.setItem(key, JSON.stringify(list));
    notifyLocalStorageChange();
  }

  static addItem<T extends { id: string }>(key: string, item: T) {
    const list = this.getList<T>(key);
    list.push(item);
    this.saveList(key, list);
  }

  static updateItem<T extends { id: string }>(key: string, id: string, fields: Partial<T>) {
    const list = this.getList<T>(key);
    const index = list.findIndex((i) => i.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...fields };
      this.saveList(key, list);
    }
  }

  static deleteItem<T extends { id: string }>(key: string, id: string) {
    const list = this.getList<T>(key);
    const filtered = list.filter((i) => i.id !== id);
    this.saveList(key, filtered);
  }

  static setProfile(profile: any) {
    localStorage.setItem(LS_KEYS.PROFILE, JSON.stringify(profile));
    notifyLocalStorageChange();
  }

  static getProfile() {
    const saved = localStorage.getItem(LS_KEYS.PROFILE);
    return saved ? JSON.parse(saved) : null;
  }

  static getItem<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  }

  static setItem<T>(key: string, value: T) {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
    notifyLocalStorageChange();
  }
}

