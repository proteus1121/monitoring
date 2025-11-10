import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useId,
} from 'react';
import { Select as RadixSelect } from 'radix-ui';
import './Select.css';
import clsx from 'clsx';
import { Icon } from '@iconify/react';

// INFO: There is a known bug where you can't unselect a field, even if the select is not required

type SelectContextType = {
  openSelectId: string | null;
  setOpenSelectId: (id: string | null) => void;
};

const SelectContext = createContext<SelectContextType | undefined>(undefined);

export const SelectProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);

  return (
    <SelectContext.Provider value={{ openSelectId, setOpenSelectId }}>
      {children}
    </SelectContext.Provider>
  );
};

function useSelectContext() {
  const context = useContext(SelectContext);
  if (!context)
    throw new Error('Select components must be used within SelectProvider');
  return context;
}

// ----------- Select Components -----------

type SelectRootProps = React.ComponentPropsWithoutRef<typeof RadixSelect.Root>;

export const SelectRoot: React.FC<SelectRootProps> = props => {
  const { openSelectId, setOpenSelectId } = useSelectContext();

  const generatedId = useId();
  const selectId = useMemo(
    () => props.name || generatedId,
    [props.name, generatedId]
  );
  const isOpen = openSelectId === selectId;

  const handleOpenChange = (open: boolean) => {
    setOpenSelectId(open ? selectId : null);
    props.onOpenChange?.(open);
  };

  return (
    <RadixSelect.Root
      {...props}
      open={isOpen}
      onOpenChange={handleOpenChange}
    />
  );
};

// ----------- Triggers, Values, Portal etc -----------

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger>
>((props, ref) => <RadixSelect.Trigger ref={ref} {...props} />);

export const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Value>
>((props, ref) => <RadixSelect.Value ref={ref} {...props} />);

export const SelectPortal: React.FC<
  React.ComponentPropsWithoutRef<typeof RadixSelect.Portal>
> = props => <RadixSelect.Portal {...props} />;

export const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Content>
>(({ position = 'popper', align = 'end', className, ...props }, ref) => (
  <RadixSelect.Content
    ref={ref}
    position={position}
    align={align}
    className={clsx('z-select select-presence', className)}
    {...props}
  />
));

export const SelectViewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Viewport> & {
    minWidthByTrigger?: boolean;
  }
>(({ className, minWidthByTrigger = false, ...props }, ref) => (
  <RadixSelect.Viewport
    ref={ref}
    className={clsx(
      { 'min-w-[var(--radix-popper-anchor-width)]': minWidthByTrigger },
      'select-bg select-anim mt-1.5 flex flex-col rounded-[10px] py-1 focus-visible:outline-none',
      className
    )}
    {...props}
  />
));

export const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Item>
>(({ className, ...props }, ref) => (
  <RadixSelect.Item
    ref={ref}
    className={clsx(
      'mx-1 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-[#36394A] transition-all hover:bg-[#1D4F810A] hover:text-[#0D0D12] focus-visible:outline-none',
      className
    )}
    {...props}
  />
));

export const SelectItemText = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.ItemText>
>((props, ref) => <RadixSelect.ItemText ref={ref} {...props} />);

export const SelectItemIndicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.ItemIndicator>
>((props, ref) => (
  <RadixSelect.ItemIndicator ref={ref} {...props}>
    <Icon icon="material-symbols:check-rounded" className="size-5" />
  </RadixSelect.ItemIndicator>
));

export const SelectLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Label>
>(({ className, ...props }, ref) => (
  <RadixSelect.Label
    ref={ref}
    className={clsx('px-4 py-3 text-xs font-medium opacity-50', className)}
    {...props}
  />
));

export const SelectSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Separator>
>(({ className, ...props }, ref) => (
  <RadixSelect.Separator
    ref={ref}
    className={clsx('my-1 h-0.5 bg-[#12376914]', className)}
    {...props}
  />
));
