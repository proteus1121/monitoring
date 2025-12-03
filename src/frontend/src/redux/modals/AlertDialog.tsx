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
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {state?.description ??
              'This action cannot be undone. This will permanently delete this entity'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={close}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isLoading} onClick={onSubmit}>
            {isLoading && <Spinner />}
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
