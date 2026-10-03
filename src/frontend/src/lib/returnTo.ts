// Page to open after signing in, e.g. /pair?code=... opened from a board. Kept in sessionStorage so it
// survives the Google / GitHub redirect, which always lands on the dashboard.
const KEY = 'returnTo';

export const saveReturnTo = (path: string) => {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // storage blocked: the user lands on the dashboard instead
  }
};

export const consumeReturnTo = (): string | null => {
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    // only paths of this site
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
};
