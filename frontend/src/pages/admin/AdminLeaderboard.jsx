import React, { useState, useEffect } from 'react';
import { Award, Trophy, Medal } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';

export const AdminLeaderboard = () => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingEvents(true);
      try {
        const res = await adminApi.getEvents();
        const list = res.events || res.data?.events || (Array.isArray(res) ? res : []);
        setEvents(list);
        if (list.length > 0) {
          setSelectedEventId(list[0]._id);
        }
      } catch (err) {
        console.error('Failed to load events for leaderboard:', err);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    const fetchLeaderboard = async () => {
      setLoadingBoard(true);
      try {
        const res = await adminApi.getLeaderboard(selectedEventId);
        const board = res.leaderboard || res.data?.leaderboard || (Array.isArray(res) ? res : []);
        setLeaderboard(board);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
        setLeaderboard([]);
      } finally {
        setLoadingBoard(false);
      }
    };
    fetchLeaderboard();
  }, [selectedEventId]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Competition Leaderboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Official ranked evaluation standings across university teams
          </p>
        </div>

        {events.length > 0 && (
          <div>
            <select
              className="search-input"
              style={{ borderRadius: 'var(--radius-md)', padding: '0 14px' }}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.name || ev.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loadingEvents || loadingBoard ? (
        <Skeleton height="200px" />
      ) : leaderboard.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No Rankings Available"
          description="Submissions for this event are either still being submitted or under evaluation."
        />
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Rank</th>
                  <th>Team</th>
                  <th>College</th>
                  <th>Final Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <tr key={entry.teamId || entry._id || index}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
                          {rank === 1 ? (
                            <Trophy size={18} color="#eab308" />
                          ) : rank === 2 ? (
                            <Medal size={18} color="#94a3b8" />
                          ) : rank === 3 ? (
                            <Medal size={18} color="#b45309" />
                          ) : null}
                          <span>#{rank}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{entry.teamName || entry.name}</td>
                      <td>{entry.collegeName || entry.college || '—'}</td>
                      <td>
                        <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                          {entry.score ?? entry.totalScore ?? '—'}
                        </strong>
                      </td>
                      <td>
                        <Badge variant="emerald">Evaluated</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
