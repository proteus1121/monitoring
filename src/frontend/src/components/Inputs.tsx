import { clsx } from 'clsx';
import {
  ComponentPropsWithoutRef,
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  useState,
} from 'react';
import './Inputs.css';
import {
  Form as RadixForm,
  Checkbox as RadixCheckbox,
  RadioGroup as RadixRadioGroup,
} from 'radix-ui';
import { Icon } from '@iconify/react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  PrefixIcon?: ReactNode;
  SuffixIcon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', PrefixIcon, SuffixIcon, ...props }, ref) => {
    const isInvalid = props['data-invalid' as keyof typeof props] === true;

    return (
      <div
        className={clsx(
          'relative flex w-full rounded-md px-2 py-1 placeholder-[#818898] shadow-none transition-all',
          {
            'pl-6': PrefixIcon,
            'pr-8': SuffixIcon,
            'input-bg-invalid': isInvalid,
            'input-bg-disabled': props.disabled,
            'input-bg': !props.disabled && !isInvalid,
          },

          className
        )}
      >
        {PrefixIcon && (
          <div
            className={clsx(
              'absolute top-1/2 left-2 flex h-5 w-5 -translate-y-1/2 transform justify-center',
              props.disabled ? 'text-[#A4ACB9]' : 'text-[#818898]'
            )}
          >
            {PrefixIcon}
          </div>
        )}

        <input
          {...props}
          ref={ref}
          className={clsx(
            props.disabled
              ? 'text-[#444] placeholder-[#999]'
              : 'text-[black] placeholder-[#888]',
            PrefixIcon ? 'pl-3' : '',
            'w-full focus-within:outline-none'
          )}
        />

        {SuffixIcon && (
          <div
            className={clsx(
              'absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 transform justify-center',
              props.disabled ? 'text-[#A4ACB9]' : 'text-[#818898]'
            )}
          >
            {SuffixIcon}
          </div>
        )}
      </div>
    );
  }
);

type LabelProps = {
  children: ReactNode;
} & React.ComponentPropsWithoutRef<typeof RadixForm.Label>;

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ children, ...props }, ref) => {
    return (
      <RadixForm.Label
        ref={ref}
        className="mb-1 text-sm font-semibold text-[black]"
        {...props}
      >
        {children}
      </RadixForm.Label>
    );
  }
);

type MessageBaseProps = ComponentPropsWithoutRef<typeof RadixForm.Message>;
type CustomMessageProps = {
  variant?: 'danger' | 'hint';
};

export const Message = forwardRef<
  HTMLSpanElement,
  MessageBaseProps & CustomMessageProps
>(({ children, variant = 'danger', className, ...props }, ref) => {
  return (
    <RadixForm.Message
      ref={ref}
      className={clsx(
        'flex gap-1 text-[12px]',
        {
          'text-[#DF1C41]': variant === 'danger',
          'text-[#666D80]': variant === 'hint',
        },
        className
      )}
      {...props}
    >
      {children}
    </RadixForm.Message>
  );
});

export const Messages = (props: { children: ReactNode }) => {
  return <div className="mt-1 flex flex-col">{props.children}</div>;
};

type CheckboxBaseProps = ComponentPropsWithoutRef<typeof RadixCheckbox.Root>;

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxBaseProps>(
  (props, ref) => {
    const [checked, setChecked] = useState(props.defaultChecked ?? false);

    return (
      <RadixCheckbox.Root
        className="group flex gap-1.5"
        checked={checked}
        onCheckedChange={setChecked}
        {...props}
      >
        <RadixCheckbox.Indicator
          className={clsx(
            'flex h-5 w-5 items-center justify-center rounded-md transition-all',
            [
              checked === true
                ? 'checkbox-checked-bg'
                : 'checkbox-bg group-hover:checkbox-hovered-bg',
            ]
          )}
          forceMount
        >
          {checked === true && (
            <Icon
              icon="material-symbols:check-small-rounded"
              className="size-full text-white"
            />
          )}
          {checked === 'indeterminate' && (
            <Icon
              icon="material-symbols:check-indeterminate-small-rounded"
              className="size-full text-white"
            />
          )}
        </RadixCheckbox.Indicator>
        <div className="text-sm font-semibold text-[#36394A]">
          {props.children}
        </div>
      </RadixCheckbox.Root>
    );
  }
);

type RadioGroupProps = ComponentPropsWithoutRef<typeof RadixRadioGroup.Root>;

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ children, ...props }, ref) => {
    return (
      <RadixRadioGroup.Root
        ref={ref}
        className="flex flex-col gap-2"
        {...props}
      >
        {children}
      </RadixRadioGroup.Root>
    );
  }
);

type RadioItemProps = ComponentPropsWithoutRef<typeof RadixRadioGroup.Item> & {
  children?: ReactNode;
};

export const RadioItem = forwardRef<HTMLButtonElement, RadioItemProps>(
  ({ children, className, disabled, form, ...props }, ref) => {
    return (
      <RadixRadioGroup.Item
        ref={ref}
        className={clsx(
          'group flex items-center gap-1.5',
          disabled && 'cursor-not-allowed',
          className
        )}
        form={form}
        disabled={disabled}
        {...props}
      >
        <div
          className={clsx(
            'flex h-5 w-5 items-center justify-center rounded-full transition-all',
            'checkbox-bg',
            'group-hover:checkbox-hovered-bg',
            'group-data-[state=checked]:checkbox-checked-bg'
          )}
        >
          <RadixRadioGroup.Indicator
            className={clsx(
              'flex h-5 w-5 items-center justify-center rounded-full transition-all'
            )}
            forceMount
          >
            <Icon icon="circle" />
          </RadixRadioGroup.Indicator>
        </div>
        <div
          className={clsx('text-sm font-semibold', {
            'text-[#A4ACB9]': disabled,
            'text-[#36394A]': !disabled,
          })}
        >
          {children}
        </div>
      </RadixRadioGroup.Item>
    );
  }
);
