import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, MapPin, Users, ArrowRight, Search } from 'lucide-react';
import { eventApi } from '../../api/event.api';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';

export const EventsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialQuery);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await eventApi.getEvents();
        const list = res.events || res.data?.events || (Array.isArray(res) ? res : []);
        setEvents(list);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((ev) => {
    const term = search.toLowerCase();
    const nameMatch = (ev.name || ev.title || '').toLowerCase().includes(term);
    const descMatch = (ev.description || '').toLowerCase().includes(term);
    return nameMatch || descMatch;
  });

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Ecolympics Events</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Discover upcoming environmental challenges, workshops, and hackathons
          </p>
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-light)',
            }}
          />
          <input
            type="text"
            className="search-input"
            placeholder="Filter events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          <Skeleton height="220px" borderRadius="var(--radius-lg)" />
          <Skeleton height="220px" borderRadius="var(--radius-lg)" />
          <Skeleton height="220px" borderRadius="var(--radius-lg)" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Events Found"
          description={search ? `No events match "${search}"` : 'No events have been published yet.'}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredEvents.map((ev) => (
            <div
              key={ev._id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <Badge variant={ev.status === 'ACTIVE' || ev.status === 'PUBLISHED' ? 'emerald' : 'slate'}>
                    {ev.status || 'Active'}
                  </Badge>
                  {ev.registrationEnd && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                      Reg until: {new Date(ev.registrationEnd).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.25rem', marginBottom: 8, fontWeight: 700 }}>
                  {ev.name || ev.title}
                </h3>

                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    marginBottom: 16,
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {ev.description || 'No description provided.'}
                </p>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-subtle)',
                    marginBottom: 16,
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} color="var(--primary)" />
                    <span>
                      {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : 'TBA'}
                      {ev.endDate ? ` - ${new Date(ev.endDate).toLocaleDateString()}` : ''}
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => navigate(`/events/${ev._id}`)}
                >
                  View Details <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
