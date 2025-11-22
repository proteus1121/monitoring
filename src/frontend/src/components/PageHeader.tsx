import { cn } from '@src/lib/classnameUtils';
import { forwardRef } from 'react';

export const PageHeader = forwardRef<
  HTMLDivElement,
  React.ButtonHTMLAttributes<HTMLDivElement>
>(function PageHeader({ className, ...props }, ref) {
  return (
    <div
      className={cn('flex w-full items-center justify-between pb-8', className)}
      {...props}
      ref={ref}
    />
  );
});

export const PageHeaderTitle = forwardRef<
  HTMLDivElement,
  React.ButtonHTMLAttributes<HTMLDivElement>
>(function PageHeaderText({ className, ...props }, ref) {
  return (
    <h2
      className={cn('mb-2 font-semibold sm:text-xl lg:text-2xl')}
      {...props}
      ref={ref}
    />
  );
});

export const PageHeaderDescription = forwardRef<
  HTMLDivElement,
  React.ButtonHTMLAttributes<HTMLDivElement>
>(function PageHeaderDescription({ className, ...props }, ref) {
  return (
    <div
      className={cn('text-sm text-gray-600 lg:text-base', className)}
      {...props}
      ref={ref}
    />
  );
});
