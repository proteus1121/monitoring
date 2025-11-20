import { clsx } from 'clsx';
import { forwardRef } from 'react';

type Variant = 'primary' | 'flat';

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    disabled?: boolean;
    rounded?: boolean;
  }
>(function Button(
  { className, children, variant = 'flat', disabled = false, ...props },
  ref
) {
  return (
    <button
      {...props}
      ref={ref}
      disabled={disabled}
      className={clsx(
        'flex cursor-pointer items-center justify-center rounded-lg p-2 text-sm transition-all focus-visible:outline-none',
        [
          disabled
            ? 'pointer-events-none cursor-auto border-transparent bg-[#f8fafb] text-[#A4ACB9] shadow-none'
            : {
                'bg-black text-white hover:bg-black/90': variant === 'primary',
                'hover:bg-gray-200': variant === 'flat',
              },
        ],
        className
      )}
    >
      {children}
    </button>
  );
});
