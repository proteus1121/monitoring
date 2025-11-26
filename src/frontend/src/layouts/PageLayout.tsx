import { cn } from '@src/lib/classnameUtils';
import { forwardRef } from 'react';

export const PageLayout = forwardRef<
  HTMLDivElement,
  React.ButtonHTMLAttributes<HTMLDivElement>
>(function PageLayout({ className, ...props }, ref) {
  return (
    <div
      className={cn('p-4 py-8 sm:p-6 lg:p-8', className)}
      {...props}
      ref={ref}
    />
  );
});
