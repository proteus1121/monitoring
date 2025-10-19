import "./Logo.css";

const Logo = () => {
  return (
    <div className="relative w-8 h-8 rounded-full bg-transparent  animate-[spin_10s_linear] overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="blade"
          style={{ transform: `rotate(${i * 60}deg)` }}
        >
          <div
            className="absolute top-0 left-[35%] w-1/2 h-[35%] bg-white  origin-bottom-left"
            style={{ transform: "skewY(-30deg)" }}
          />
        </div>
      ))}
    </div>
  );
};

export default Logo;
