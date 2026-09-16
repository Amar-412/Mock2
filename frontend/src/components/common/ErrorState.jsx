import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const ErrorState = ({ title = 'Failed to load data', message, onRetry }) => {
  return (
    <div className="empty-state" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
      <div className="empty-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
        <AlertCircle size={28} />
      </div>
      <h3 className="empty-title">{title}</h3>
      {message && <p className="empty-description">{message}</p>}
      {onRetry && (
        <button className="btn btn-outline btn-sm" onClick={onRetry} style={{ marginTop: 12 }}>
          <RefreshCw size={14} /> Try Again
        </button>
      )}
    </div>
  );
};
