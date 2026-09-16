import React, { useState, useEffect } from 'react';
import { Building, Plus, MapPin } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

export const AdminColleges = () => {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchColleges = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getColleges();
      const list = res.colleges || res.data?.colleges || (Array.isArray(res) ? res : []);
      setColleges(list);
    } catch (err) {
      console.error('Failed to load colleges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.createCollege({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        city: city.trim(),
        state: stateVal.trim(),
      });
      setModalOpen(false);
      setName('');
      setCode('');
      setCity('');
      setStateVal('');
      fetchColleges();
    } catch (err) {
      setError(err.message || 'Failed to create college');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Institutions & Colleges</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Registered educational institutions participating in YUWA Ecolympics
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Add College
        </button>
      </div>

      {loading ? (
        <Skeleton height="160px" />
      ) : colleges.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No Colleges Registered"
          description="Register participating universities or campuses to allow students to affiliate their teams."
          action={
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Add First College
            </button>
          }
        />
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>College Name</th>
                  <th>Institution Code</th>
                  <th>Location</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {colleges.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td><code>{c.code || '—'}</code></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={14} color="var(--text-light)" />
                        <span>{c.city ? `${c.city}, ${c.state || ''}` : '—'}</span>
                      </div>
                    </td>
                    <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add College Modal */}
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
            <h3 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Add New College</h3>
            {error && (
              <div style={{ color: '#ef4444', background: '#fef2f2', padding: 8, borderRadius: 6, marginBottom: 12, fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>College Name</label>
                <input
                  type="text"
                  required
                  className="search-input"
                  style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                  placeholder="e.g. National Green University"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Code</label>
                <input
                  type="text"
                  required
                  className="search-input"
                  style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                  placeholder="e.g. NGU"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>City</label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>State</label>
                  <input
                    type="text"
                    className="search-input"
                    style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Add College'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
