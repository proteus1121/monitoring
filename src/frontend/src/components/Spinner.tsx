import { Icon } from '@iconify/react';
import { clsx } from 'clsx';

export type SpinnerProps = {
  className?: string;
};

export function Spinner(props: SpinnerProps) {
  return (
    <Icon
      icon="lucide:loader"
      className={clsx(
        'size-4 animate-[spin_2s_linear_infinite]',
        props.className
      )}
    />
  );
}
