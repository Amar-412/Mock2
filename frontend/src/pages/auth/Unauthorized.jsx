import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Unauthorized = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const handleReturn = () => {
    if (role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (role === 'EVALUATOR') {
      navigate('/evaluator/dashboard');
    } else {
      navigate('/student/dashboard');
    }
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div className="card" style={{ maxWidth: 460, textAlign: 'center', padding: 40 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
          You do not have permission to view this resource. Your current role is <strong>{role}</strong>.
        </p>
        <button onClick={handleReturn} className="btn btn-primary" style={{ margin: '0 auto' }}>
          <ArrowLeft size={16} /> Return to Dashboard
        </button>
      </div>
    </div>
  );
};
