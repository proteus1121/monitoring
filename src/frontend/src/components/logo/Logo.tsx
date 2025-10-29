import './Logo.css';

const Logo = () => {
  return (
    <div className="relative h-8 w-8 animate-[spin_10s_linear_infinite] overflow-hidden rounded-full bg-transparent">
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
