import { clsx } from 'clsx';
import './Logo.css';

const Logo = (props: { className?: string }) => {
  return (
    <div
      className={clsx(
        'relative animate-[spin_10s_linear_infinite] overflow-hidden rounded-full bg-transparent',
        props.className
      )}
    >
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="blade"
          style={{ transform: `rotate(${i * 60}deg)` }}
        >
          <div
            className="absolute top-0 left-[35%] h-[35%] w-1/2 origin-bottom-left bg-white"
            style={{ transform: 'skewY(-30deg)' }}
          />
        </div>
      ))}
    </div>
  );
};

export default Logo;
