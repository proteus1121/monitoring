import { Spinner } from './Spinner';

export const Loader = () => {
  return (
    <div className="min-h-screen-minus-header grid place-items-center">
      <Spinner />
    </div>
  );
};
