import { Icon } from '@iconify/react';
import { useUi } from '@src/redux/ui/ui.hook';
import { ReactNode } from 'react';
import { Button } from './Button';

export function Header(props: { children?: ReactNode }) {
  const { state, setState } = useUi();
  return (
    <header className="z-raised h-header sticky top-0 border-b border-black/10 bg-white">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Button
          className="mr-2 lg:hidden"
          variant="flat"
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
          <button
            data-slot="button"
            className="[&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 [&amp;_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 relative inline-flex size-9 shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
          >
            {/* TODO: CHEKC IS IT PROPER ICON*/}
            <Icon icon={'lucide:bell'} className="size-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
          </button>
          <button
            data-slot="button"
            className="[&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 [&amp;_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 inline-flex size-9 shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
          >
            <Icon icon={'lucide:search'} className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
