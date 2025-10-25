import { Toast } from 'radix-ui';
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  ElementType,
} from 'react';
import './Toast.css';
import { clsx } from 'clsx';
import { Icon } from '@iconify/react';
import { Button } from './Button';

type ToastData = {
  id: number;
  title: string;
  description?: string;
  variant?: 'default' | 'danger' | 'warning' | 'info' | 'confirmed';
  action?: () => void;
  icon?: ElementType;
  actionText?: string;
};

type ToastContextType = {
  toast: (data: Omit<ToastData, 'id'>) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const toast = ({ variant = 'default', ...data }: Omit<ToastData, 'id'>) => {
    const id = Date.now();

    setToasts(prev => [...prev, { id, variant, ...data }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      <Toast.Provider duration={5000}>
        {children}
        {toasts.map(
          ({
            id,
            title,
            description,
            variant,
            actionText,
            action,
            icon: IconElement,
          }) => (
            <Toast.Root
              key={id}
              onOpenChange={open => {
                if (!open) removeToast(id);
              }}
              className={clsx(
                'flex w-[650px] justify-between rounded-lg px-4 py-2 backdrop-blur-[5px]',
                {
                  'toast-default text-[#36394A]': variant === 'default',
                  'toast-danger': variant === 'danger',
                  'toast-warning': variant === 'warning',
                  'toast-info': variant === 'info',
                  'toast-confirmed': variant === 'confirmed',
                }
              )}
            >
              <Toast.Title className="flex gap-2 self-center text-sm font-semibold">
                {IconElement && (
                  <IconElement
                    className={clsx('h-5 w-5 shrink-0', {
                      'text-[#666D80]': variant === 'default',
                      'text-[#DF1C41]': variant === 'danger',
                      'text-[#FFBE4C]': variant === 'warning',
                      'text-[#00CB7D]': variant === 'info',
                      'text-[#40C4AA]': variant === 'confirmed',
                    })}
                  />
                )}
                <div className="flex flex-col">
                  <div
                    className={clsx('shrink-0', {
                      'text-[#36394A]': variant === 'default',
                      'text-[#710E21]': variant === 'danger',
                      'text-[#5C3D1F]': variant === 'warning',
                      'text-[#00553A]': variant === 'info',
                      'text-[#184E44]': variant === 'confirmed',
                    })}
                  >
                    {title}
                  </div>

                  {description && (
                    <Toast.Description className="text-[#666D80]">
                      {description}
                    </Toast.Description>
                  )}
                </div>
              </Toast.Title>
              <div className="flex max-h-8 shrink-0 items-center justify-center">
                {action && actionText && (
                  <Button
                    variant="outlined"
                    onClick={action}
                    className="ml-auto shrink-0 px-3.5 !py-1"
                  >
                    {actionText}
                  </Button>
                )}
                <Button variant="flat" onClick={() => removeToast(id)}>
                  <Icon
                    icon="material-symbols:close-rounded"
                    className="size-5"
                  />
                </Button>
              </div>
            </Toast.Root>
          )
        )}
        <Toast.Viewport className="z-toast fixed top-16 left-1/2 flex -translate-x-1/2 flex-col items-center justify-center gap-2" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
