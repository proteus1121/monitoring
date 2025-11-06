import clsx from 'clsx';
import { ReactNode } from 'react';

export const Card = (props: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <div
      className={clsx(
        'w-full bg-white p-4 last:mb-6 sm:mx-auto sm:mt-6 sm:max-w-[36rem] sm:rounded-xl sm:shadow-xl md:max-w-[44rem] md:p-8 lg:max-w-[56rem]',
        props.className
      )}
      onClick={props.onClick}
    >
      {props.children}
    </div>
  );
};
