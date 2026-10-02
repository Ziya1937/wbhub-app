const STORAGE_KEY = "wbhub:base";

export interface RememberedBase {
  id: string;
  name: string;
}

let currentBase: RememberedBase | null = null;

export function getRememberedBase(): RememberedBase | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RememberedBase) : null;
  } catch {
    return null;
  }
}

export function setCurrentBase(base: RememberedBase, remember: boolean) {
  currentBase = base;
  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
    } catch {
      // игнорируем — просто не запомнится между запусками
    }
  }
}

export function setSessionBase(base: RememberedBase) {
  currentBase = base;
}

export function clearBase() {
  currentBase = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // игнорируем
  }
}

export function getCurrentBase(): RememberedBase | null {
  return currentBase;
}

export function getBaseId(): string {
  if (!currentBase) throw new Error("База не выбрана");
  return currentBase.id;
}
