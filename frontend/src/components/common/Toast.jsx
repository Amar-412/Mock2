import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'info', onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="#059669" />;
      case 'error':
        return <AlertCircle size={18} color="#ef4444" />;
      case 'warning':
        return <AlertTriangle size={18} color="#d97706" />;
      default:
        return <Info size={18} color="#0284c7" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#0284c7';
    }
  };

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        background: '#ffffff',
        borderLeft: `4px solid ${getBorderColor()}`,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        pointerEvents: 'auto',
        minWidth: 280,
        maxWidth: 420,
        animation: 'slideInToast 0.25s ease forwards',
        border: '1px solid var(--border-light)',
      }}
    >
      <div style={{ flexShrink: 0 }}>{getIcon()}</div>
      <div
        style={{
          flex: 1,
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-main)',
          lineHeight: 1.4,
        }}
      >
        {message}
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-light)',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
        }}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};
