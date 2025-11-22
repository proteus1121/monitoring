import { cn } from '@src/lib/classnameUtils';
import { forwardRef } from 'react';

export const H1 = forwardRef<
  HTMLDivElement,
  React.ButtonHTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <h2
      className={cn('font-semibold sm:text-xl lg:text-2xl', className)}
      {...props}
      ref={ref}
    />
  );
});

export const H2 = forwardRef<
  HTMLDivElement,
  React.ButtonHTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <h2
      className={cn('font-semibold sm:text-lg lg:text-xl', className)}
      {...props}
      ref={ref}
    />
  );
});

export const H3 = forwardRef<
  HTMLDivElement,
  React.ButtonHTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <h2
      className={cn('text-sm text-gray-600 lg:text-base', className)}
      {...props}
      ref={ref}
    />
  );
});
