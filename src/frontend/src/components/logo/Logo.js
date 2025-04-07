import React from "react";
import "./Logo.css";

const Logo = () => {
    return (
        <div className="aperture-wrapper">
            {[...Array(6)].map((_, i) => (
                <div
                    key={i}
                    className="blade"
                    style={{transform: `rotate(${i * 60}deg)`}}
                >
                    <div className="blade-shape"/>
                </div>
            ))}
        </div>
    );
};

export default Logo;