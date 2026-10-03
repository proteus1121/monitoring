import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from '@iconify/react';

/**
 * Incident explanation written by the language model, collapsed to two lines.
 */
export function AiExplanation({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      title={expanded ? 'Collapse' : 'Show the whole explanation'}
      className="mt-1.5 flex w-full gap-1.5 rounded-md bg-violet-50 px-2 py-1.5 text-left text-xs leading-relaxed text-slate-700"
    >
      <Icon icon="lucide:sparkles" className="mt-0.5 size-3.5 shrink-0 text-violet-500" />
      <span className={clsx(!expanded && 'line-clamp-2')}>{text}</span>
    </button>
  );
}
