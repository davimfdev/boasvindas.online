
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "w-12 h-12" }) => {
  return (
    <svg 
      viewBox="0 0 512 512" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Brown Trunk */}
      <path 
        d="M256 180V460M256 360L140 280M256 360L372 280" 
        stroke="#5D4017" 
        strokeWidth="40" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* Yellow Circles */}
      <circle cx="256" cy="110" r="85" fill="#F4B400" />
      <circle cx="110" cy="275" r="85" fill="#F4B400" />
      <circle cx="402" cy="275" r="85" fill="#F4B400" />
    </svg>
  );
};

export default Logo;
