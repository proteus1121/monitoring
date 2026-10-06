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
 * The language outside of components (labels built in helpers); components use useLang / useTexts so they
 * render again when it changes.
 */
export function getLang(): Lang {
  return current;
}

/**
 * Texts of the current language outside of components.
 */
export function pick<T>(texts: Record<Lang, T>): T {
  return texts[current];
}

/**
 * The interface language, Ukrainian by default; one choice for the sign-in page and the app.
 */
export function useLang(): Lang {
  // the server snapshot is for the prerendered home page (src/prerender.tsx)
  return useSyncExternalStore(subscribe, () => current, () => current);
}

/**
 * Texts of the current language from a table of both: `const t = useTexts(TEXTS)`.
 */
export function useTexts<T>(texts: Record<Lang, T>): T {
  return texts[useLang()];
}
