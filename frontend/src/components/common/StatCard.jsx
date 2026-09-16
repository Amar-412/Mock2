import React from 'react';

export const StatCard = ({ label, value, subtitle, icon: Icon, color = 'var(--primary)', bg = 'var(--primary-light)' }) => {
  return (
    <div className="stat-card">
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value ?? '—'}</span>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
      {Icon && (
        <div className="stat-icon-wrapper" style={{ color, background: bg }}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
};
