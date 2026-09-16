import React, { useState, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';

export const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getEvents();
      const list = res.events || res.data?.events || (Array.isArray(res) ? res : []);
      setEvents(list);
    } catch (err) {
      console.error('Failed to load admin events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.createEvent(formData);
      setModalOpen(false);
      setFormData({ name: '', description: '', startDate: '', endDate: '' });
      fetchEvents();
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Platform Events</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage campus competitions and sustainability challenges
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Create Event
        </button>
      </div>

      {loading ? (
        <Skeleton height="160px" />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Events Found"
          description="Create the first Ecolympics competition to launch team registrations."
          action={
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Create First Event
            </button>
          }
        />
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev._id}>
                    <td style={{ fontWeight: 600 }}>{ev.name || ev.title}</td>
                    <td>
                      {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : 'TBA'}
                      {ev.endDate ? ` — ${new Date(ev.endDate).toLocaleDateString()}` : ''}
                    </td>
                    <td>
                      <Badge variant="emerald">{ev.status || 'Active'}</Badge>
                    </td>
                    <td>{ev.createdAt ? new Date(ev.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
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
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 30 }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Create New Event</h3>
            {error && (
              <div style={{ color: '#ef4444', background: '#fef2f2', padding: 8, borderRadius: 6, marginBottom: 12, fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Event Title</label>
                <input
                  type="text"
                  required
                  className="search-input"
                  style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                  placeholder="e.g. YUWA National Clean Campus 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Description</label>
                <textarea
                  rows={3}
                  className="search-input"
                  style={{ borderRadius: 'var(--radius-md)', padding: 10, height: 'auto', resize: 'vertical' }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Start Date</label>
                  <input
                    type="date"
                    required
                    className="search-input"
                    style={{ borderRadius: 'var(--radius-md)', padding: '0 10px' }}
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>End Date</label>
                  <input
                    type="date"
                    required
                    className="search-input"
                    style={{ borderRadius: 'var(--radius-md)', padding: '0 10px' }}
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
