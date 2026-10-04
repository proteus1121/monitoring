import { getLang } from '@src/lib/lang';
import type { ActionCreatorsMapObject } from '@reduxjs/toolkit';
import { useTypedDispatch } from './store';

export const useActions = <T extends ActionCreatorsMapObject>(
  sliceActions: T
) => {
  const dispatch = useTypedDispatch();

  return Object.entries(sliceActions).reduce(
    (acc, [key, actionCreator]) => {
      acc[key as keyof T] = (...args: Parameters<typeof actionCreator>) =>
        dispatch(actionCreator(...args));
      return acc;
    },
    {} as { [key in keyof T]: (...args: Parameters<T[key]>) => void }
  );
};

/**
 * Readable text of an RTK Query error: the server's message when it sent one.
 */
export const errorMessage = (error: unknown): string => {
  const e = error as { status?: unknown; data?: { message?: string; error?: string } | string };
  if (e?.data && typeof e.data === 'object' && (e.data.message || e.data.error)) {
    return e.data.message || e.data.error!;
  }
  if (typeof e?.data === 'string' && e.data) return e.data;
  const failed = getLang() === 'uk' ? 'Помилка запиту' : 'Request failed';
  return e?.status ? `${failed} (${String(e.status)})` : JSON.stringify(error);
};
