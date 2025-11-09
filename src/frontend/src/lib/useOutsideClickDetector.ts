import { RefObject, useEffect } from 'react';

export function useOutsideClickDetector(
  ref: RefObject<HTMLElement | null>,
  handler: (e: any) => void
) {
  useEffect(() => {
    function handleClickOutside(e: any) {
      if (ref.current && !ref.current.contains(e.target)) {
        handler(e);
      }
    }

    const eventTarget = document;

    eventTarget.addEventListener('mouseup', handleClickOutside);

    return () => {
      eventTarget.removeEventListener('mouseup', handleClickOutside);
    };
  }, [ref, handler]);
}
