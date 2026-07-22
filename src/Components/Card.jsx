import React from 'react';

const Card = ({ children, className = '', onClick, hoverable = false, ...props }) => {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-transparent backdrop-blur-2xl border border-white/10 rounded-3xl p-3 transition-all duration-300 ${hoverable ? ' hover:border-blue-500/30' : ''
        } ${onClick ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
