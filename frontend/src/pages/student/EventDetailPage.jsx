import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Award, CheckCircle, Clock } from 'lucide-react';
import { eventApi } from '../../api/event.api';
import { Skeleton } from '../../components/common/Skeleton';
import { Badge } from '../../components/common/Badge';

export const EventDetailPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, chalRes] = await Promise.all([
        eventApi.getEventById(eventId),
        eventApi.getEventChallenges(eventId),
      ]);

      setEvent(evRes);
      setChallenges(Array.isArray(chalRes) ? chalRes : []);

      try {
        const regRes = await eventApi.getEventRegistration(eventId);
        setRegistration(regRes);
      } catch {
        setRegistration(null);
      }
    } catch (err) {
      console.error('Failed to load event details:', err);
      setError('Event not found or server error.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleRegister = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await eventApi.registerForEvent(eventId, {});
      await fetchDetails();
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton height="200px" style={{ marginBottom: 20 }} />
        <Skeleton height="150px" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <h3>Event Not Found</h3>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/events')} style={{ marginTop: 12 }}>
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        className="btn btn-outline btn-sm"
        onClick={() => navigate('/events')}
        style={{ marginBottom: 20 }}
      >
        <ArrowLeft size={14} /> Back to Events
      </button>

      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 'var(--radius-md)',
            background: '#fef2f2',
            color: '#ef4444',
            marginBottom: 20,
            border: '1px solid #fecaca',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Main Details Card */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>{event.name || event.title}</h1>
              <Badge variant="emerald">{event.status || 'Active'}</Badge>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: 650, lineHeight: 1.6 }}>
              {event.description}
            </p>
          </div>

          <div>
            {registration ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 700 }}>
                <CheckCircle size={20} /> Registered
              </div>
            ) : (
              <button
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={handleRegister}
              >
                {actionLoading ? 'Registering...' : 'Register for Event'}
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
              Event Dates
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontWeight: 600 }}>
              <Calendar size={16} color="var(--primary)" />
              <span>
                {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBA'}
                {event.endDate ? ` — ${new Date(event.endDate).toLocaleDateString()}` : ''}
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
              Registration Window
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontWeight: 600 }}>
              <Clock size={16} color="var(--warning)" />
              <span>
                {event.registrationStart ? new Date(event.registrationStart).toLocaleDateString() : 'Now open'}
                {event.registrationEnd ? ` — ${new Date(event.registrationEnd).toLocaleDateString()}` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Challenges Belonging to this Event */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Event Challenges ({challenges.length})</h3>
        </div>

        {challenges.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No specific challenges have been linked to this event yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {challenges.map((ch) => (
              <div
                key={ch._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-light)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{ch.title}</h4>
                    {ch.track && <Badge variant="blue">{ch.track}</Badge>}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {ch.description}
                  </p>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate(`/challenges/${ch._id}`)}
                >
                  View Challenge
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
