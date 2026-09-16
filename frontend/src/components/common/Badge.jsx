import React from 'react';

export const Badge = ({ children, variant = 'emerald', className = '', ...props }) => {
  const variantClass = `badge-${variant}`;
  return (
    <span className={`badge ${variantClass} ${className}`} {...props}>
      {children}
    </span>
  );
};
