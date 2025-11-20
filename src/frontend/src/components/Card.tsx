import { cn } from '@src/lib/classnameUtils';
import { ReactNode } from 'react';

export type CardProps = {
  children?: ReactNode;
  className?: string;
};

export function Card(props: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card text-card-foreground rounded-xl border border-black/10 p-4',
        props.className
      )}
    >
      {props.children}
    </div>
  );
}
