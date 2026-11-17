import React from 'react';

interface BananaLogoIconProps {
  className?: string;
}

export const BananaLogoIcon: React.FC<BananaLogoIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <path
      d="M17 47 C31 47, 45 36.5, 48 16.5 C48.5 13.5, 45.2 12.5, 43.5 15 C38.2 26, 28.5 34.5, 15.5 37.5 C12.5 38.2, 13 47, 17 47 Z"
      fill="#FACC15"
      stroke="#CA8A04"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <path
      d="M20.5 43 C31.5 41.5, 41.5 33, 45 18"
      stroke="#FEF08A"
      strokeWidth="2.2"
      strokeLinecap="round"
      opacity="0.9"
    />
    <path
      d="M45 15 L48.5 10.5"
      stroke="#78350F"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  </svg>
);
