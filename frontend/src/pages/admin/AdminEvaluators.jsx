import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Mail } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';

export const AdminEvaluators = () => {
  const [evaluators, setEvaluators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    specialization: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvaluators = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getEvaluators();
      const list = res.evaluators || res.data?.evaluators || (Array.isArray(res) ? res : []);
      setEvaluators(list);
    } catch (err) {
      console.error('Failed to load evaluators:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluators();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.createEvaluator(formData);
      setModalOpen(false);
      setFormData({ name: '', email: '', password: '', specialization: '' });
      fetchEvaluators();
    } catch (err) {
      setError(err.message || 'Failed to create evaluator');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Certified Evaluators</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Academic judges and sustainability experts grading student submissions
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Add Evaluator
        </button>
      </div>

      {loading ? (
        <Skeleton height="160px" />
      ) : evaluators.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Evaluators Assigned"
          description="Add evaluators to grade challenge submissions and evaluate rubrics."
          action={
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Add First Evaluator
            </button>
          }
        />
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Evaluator</th>
                  <th>Email</th>
                  <th>Specialization</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {evaluators.map((ev) => (
                  <tr key={ev._id}>
                    <td style={{ fontWeight: 600 }}>{ev.name || ev.username}</td>
                    <td>{ev.email}</td>
                    <td>{ev.specialization || 'Sustainability'}</td>
                    <td>
                      <Badge variant="emerald">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Evaluator Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 20,
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 30 }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Register New Evaluator</h3>
            {error && (
              <div style={{ color: '#ef4444', background: '#fef2f2', padding: 8, borderRadius: 6, marginBottom: 12, fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Full Name</label>
                <input
                  type="text"
                  required
                  className="search-input"
                  style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Email Address</label>
                <input
                  type="email"
                  required
                  className="search-input"
                  style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Initial Password</label>
                <input
                  type="password"
                  required
                  className="search-input"
                  style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Specialization / Field</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                  placeholder="e.g. Circular Economy, Renewable Energy"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Register Evaluator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
