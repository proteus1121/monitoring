import { useSyncExternalStore } from 'react';

export type Lang = 'uk' | 'en';

export const LANGS: { code: Lang; name: string }[] = [
  { code: 'uk', name: 'UA' },
  { code: 'en', name: 'EN' },
];

// the sign-in page saved the choice under this key before the app had a language too
const LANG_KEY = 'auth-lang';
const listeners = new Set<() => void>();

function read(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'uk';
  } catch {
    return 'uk';
  }
}

let current: Lang = read();

export function setLang(next: Lang) {
  current = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    // the choice is just not remembered
  }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The interface language, Ukrainian by default; one choice for the sign-in page and the app.
 */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, () => current);
}

/**
 * Texts of the current language from a table of both: `const t = useTexts(TEXTS)`.
 */
export function useTexts<T>(texts: Record<Lang, T>): T {
  return texts[useLang()];
}
