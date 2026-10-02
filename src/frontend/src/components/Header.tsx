import { Icon } from '@iconify/react';
import { useUi } from '@src/redux/ui/ui.hook';
import { ReactNode } from 'react';
import { Button } from './Button';
import { NotificationsBell } from './NotificationsBell';
import { SearchDialog } from './SearchDialog';

export function Header(props: { children?: ReactNode }) {
  const { state, setState } = useUi();
  return (
    <header className="h-header sticky top-0 z-10 border-b border-black/10 bg-white">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Button
          className="mr-2 lg:hidden"
          variant="ghost"
          onClick={() => {
            setState({
              ...state,
              isSidebarCollapsed: !state.isSidebarCollapsed,
            });
          }}
        >
          <Icon icon="lucide:menu" className="size-4" />
        </Button>
        {props.children}
        <div className="ml-auto flex items-center gap-2">
          <SearchDialog />
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}
