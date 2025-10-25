import { NavLink, NavLinkProps } from 'react-router-dom';
import { clsx } from 'clsx';
import { forwardRef } from 'react';

type Variant = 'primary' | 'outlined' | 'danger' | 'flat' | 'danger-outlined';
type Size = 'small' | 'normal' | 'large';

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    disabled?: boolean;
    rounded?: boolean;
    size?: Size;
  }
>(function Button(
  {
    className,
    children,
    variant = 'primary',
    rounded = false,
    disabled = false,
    size = 'normal',
    ...props
  },
  ref
) {
  return (
    <button
      {...props}
      ref={ref}
      disabled={disabled}
      className={clsx(
        'inline-flex h-fit w-fit cursor-pointer items-center justify-center gap-1.5 border border-transparent text-sm font-semibold transition-all focus-visible:outline-none',
        [
          disabled
            ? 'pointer-events-none cursor-auto border-transparent bg-[#f8fafb] text-[#A4ACB9] shadow-none'
            : {
                'bg-blue-500 text-white': variant === 'primary',

                'outlined-btn text-[#DF1C41] hover:text-[#96132C] active:text-[#96132C]':
                  variant === 'danger-outlined',

                'outlined-btn text-[#36394A] hover:text-[#0D0D12] active:text-[#0D0D12]':
                  variant === 'outlined',

                'danger-btn text-white': variant === 'danger',

                'flat-btn text-[#36394A] hover:text-[#0D0D12] active:text-[#0D0D12]':
                  variant === 'flat',
              },

          rounded ? 'rounded-full' : 'rounded-md',

          rounded
            ? {
                'p-1': size === 'small',
                'p-1.5': size === 'normal',
                'p-2': size === 'large',
              }
            : {
                'px-2 py-1': size === 'small',
                'px-2 py-1.5': size === 'normal',
                'px-2.5 py-2': size === 'large',
              },
        ],
        className
      )}
    >
      {children}
    </button>
  );
});
