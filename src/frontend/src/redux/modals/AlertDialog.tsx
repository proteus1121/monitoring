import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@src/components/AlertDialog';
import { ModalState } from './modals.types';
import { useModal } from './modals.hook';
import { useState } from 'react';
import { Spinner } from '@src/components/Spinner';
import { pick } from '@src/lib/lang';

const TEXTS = {
  uk: {
    title: 'Ви впевнені?',
    description: 'Цю дію не можна скасувати.',
    cancel: 'Скасувати',
    proceed: 'Продовжити',
  },
  en: {
    title: 'Are you absolutely sure?',
    description: 'This action cannot be undone. This will permanently delete this entity',
    cancel: 'Cancel',
    proceed: 'Continue',
  },
};

export const AppAlertDialogModalId = 'app-alert-dialog-modal-id';
export type AppAlertDialogModal = ModalState<
  typeof AppAlertDialogModalId,
  { description?: string; callback: () => Promise<void> | void }
>;

export const AppAlertDialog = () => {
  const { state, setState } = useModal(AppAlertDialogModalId);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const close = () => {
    setState(null);
  };

  const onSubmit = async () => {
    setIsLoading(true);
    try {
      await state?.callback?.();
    } finally {
      setIsLoading(false);
      close();
    }
  };

  return (
    <AlertDialog open={Boolean(state)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pick(TEXTS).title}</AlertDialogTitle>
          <AlertDialogDescription>
            {state?.description ?? pick(TEXTS).description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={close}>{pick(TEXTS).cancel}</AlertDialogCancel>
          <AlertDialogAction disabled={isLoading} onClick={onSubmit}>
            {isLoading && <Spinner />}
            {pick(TEXTS).proceed}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
