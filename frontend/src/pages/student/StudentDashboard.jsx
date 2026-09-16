import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Send,
  Award,
  Bell,
  ArrowRight,
  Calendar,
  Globe,
  CheckCircle2,
  Clock,
  PlusCircle,
  FileCheck,
  AlertCircle,
  Compass
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { eventApi } from '../../api/event.api';
import { teamApi } from '../../api/team.api';
import { notificationApi } from '../../api/notification.api';
import { StatCard } from '../../components/common/StatCard';
import { CalendarWidget } from '../../components/common/CalendarWidget';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Badge } from '../../components/common/Badge';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real backend states
  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamDashboard, setTeamDashboard] = useState(null);
  const [teamSubmissions, setTeamSubmissions] = useState([]);
  const [teamChallenges, setTeamChallenges] = useState([]);
  const [teamActivity, setTeamActivity] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const currentTeamId = user?.teamId || user?.team?._id || user?.team;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Events
      const eventsRes = await eventApi.getEvents({ limit: 6 });
      const eventsList = eventsRes.events || eventsRes.data?.events || (Array.isArray(eventsRes) ? eventsRes : []);
      setEvents(eventsList);
      if (eventsList.length > 0) {
        setCurrentEvent(eventsList[0]);
      }

      // 2. Fetch Notifications (real GET /api/notifications)
      try {
        const notifRes = await notificationApi.getNotifications({ limit: 5 });
        const notifList = notifRes.notifications || notifRes || [];
        setNotifications(Array.isArray(notifList) ? notifList : []);
      } catch {
        setNotifications([]);
      }

      // 3. If user belongs to a team, fetch real team data
      if (currentTeamId) {
        try {
          const [tData, tMembers, tSubs, tChals] = await Promise.all([
            teamApi.getTeam(currentTeamId).catch(() => null),
            teamApi.getTeamMembers(currentTeamId).catch(() => []),
            teamApi.getTeamSubmissions(currentTeamId).catch(() => []),
            teamApi.getTeamChallenges(currentTeamId).catch(() => []),
          ]);

          setTeam(tData);
          setTeamMembers(Array.isArray(tMembers) ? tMembers : []);
          setTeamSubmissions(Array.isArray(tSubs) ? tSubs : []);
          setTeamChallenges(Array.isArray(tChals) ? tChals : []);

          // Fetch team activity
          try {
            const actData = await teamApi.getTeamActivity(currentTeamId);
            setTeamActivity(Array.isArray(actData) ? actData : actData?.activities || []);
          } catch {
            setTeamActivity([]);
          }

          // Fetch team dashboard metrics if available
          try {
            const dashData = await teamApi.getTeamDashboard(currentTeamId);
            setTeamDashboard(dashData);
          } catch {
            setTeamDashboard(null);
          }

          // Set current event from team's event if present
          if (tData?.event) {
            setCurrentEvent(tData.event);
          }
        } catch {
          setTeam(null);
        }
      }
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
      setError('Failed to load dashboard data from backend.');
    } finally {
      setLoading(false);
    }
  }, [currentTeamId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleMarkNotificationRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const isTeamLead = team && (team.leader === user?._id || team.lead === user?._id || team.leader?._id === user?._id);

  // Real submission breakdown
  const submittedSubs = teamSubmissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'EVALUATED').length;
  const pendingSubs = teamSubmissions.filter((s) => s.status === 'DRAFT' || s.status === 'UNDER_REVIEW').length;
  const evaluatedSubs = teamSubmissions.filter((s) => s.status === 'EVALUATED').length;
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  return (
    <div>
      {/* ─── 1. Welcome Section ───────────────────────────────────────────── */}
      <section className="hero-banner">
        <div>
          <div className="hero-tag">
            <Award size={14} /> Official YUWA Ecolympics Platform
          </div>
          <h1 className="hero-title">
            {getGreeting()}, {user?.name || user?.username || 'Champion'} 👋
          </h1>
          <p className="hero-subtitle">
            Track your university team's sustainability challenges, collaborate on environmental solutions, and submit validated deliverables.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn-hero" onClick={() => navigate('/events')}>
              Explore Events <ArrowRight size={16} />
            </button>
            <button
              className="btn btn-outline"
              style={{
                borderRadius: 'var(--radius-full)',
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.4)',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
              }}
              onClick={() => navigate('/submissions/new')}
            >
              Submit Evidence <PlusCircle size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── 7. Quick Actions Row ─────────────────────────────────────────── */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <button
            onClick={() => navigate('/team')}
            className="btn btn-outline"
            style={{ padding: '14px 16px', justifyContent: 'flex-start', background: 'white', gap: 12 }}
          >
            <Users size={18} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>View My Team</span>
          </button>
          <button
            onClick={() => navigate('/challenges')}
            className="btn btn-outline"
            style={{ padding: '14px 16px', justifyContent: 'flex-start', background: 'white', gap: 12 }}
          >
            <Compass size={18} color="#0284c7" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Explore Challenges</span>
          </button>
          <button
            onClick={() => navigate('/submissions/new')}
            className="btn btn-outline"
            style={{ padding: '14px 16px', justifyContent: 'flex-start', background: 'white', gap: 12 }}
          >
            <Send size={18} color="#d97706" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Submit Deliverable</span>
          </button>
          <button
            onClick={() => navigate('/events')}
            className="btn btn-outline"
            style={{ padding: '14px 16px', justifyContent: 'flex-start', background: 'white', gap: 12 }}
          >
            <Calendar size={18} color="#7c3aed" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Event Catalog</span>
          </button>
        </div>
      </section>

      {/* ─── 4. Challenge & Submission Metrics (Real Data Only) ─────────────── */}
      <section className="stat-grid">
        {loading ? (
          <>
            <Skeleton height="100px" borderRadius="var(--radius-lg)" />
            <Skeleton height="100px" borderRadius="var(--radius-lg)" />
            <Skeleton height="100px" borderRadius="var(--radius-lg)" />
            <Skeleton height="100px" borderRadius="var(--radius-lg)" />
          </>
        ) : (
          <>
            <StatCard
              label="Joined Challenges"
              value={teamChallenges.length}
              subtitle="Active challenge tracks"
              icon={Award}
              color="var(--primary)"
              bg="var(--primary-light)"
            />
            <StatCard
              label="Submitted"
              value={submittedSubs}
              subtitle="Final deliverables"
              icon={Send}
              color="#0284c7"
              bg="#e0f2fe"
            />
            <StatCard
              label="Pending Submissions"
              value={pendingSubs}
              subtitle="Drafts or review"
              icon={Clock}
              color="#d97706"
              bg="#fef3c7"
            />
            <StatCard
              label="Evaluated"
              value={evaluatedSubs}
              subtitle="Scored by evaluators"
              icon={FileCheck}
              color="#7c3aed"
              bg="#ede9fe"
            />
          </>
        )}
      </section>

      {/* ─── Two-Column Split Layout ────────────────────────────────────────── */}
      <div className="dashboard-columns">
        {/* Left Column: Current Event + Team Summary + Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* 2. Current Event Section */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="var(--primary)" /> Current Event
              </h3>
              {currentEvent && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate(`/events/${currentEvent._id}`)}
                >
                  View Event
                </button>
              )}
            </div>

            {loading ? (
              <Skeleton height="120px" />
            ) : !currentEvent ? (
              <EmptyState
                icon={Calendar}
                title="No Active Event"
                description="Browse published events and register your team to start competing."
                action={
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/events')}>
                    Browse Events
                  </button>
                }
              />
            ) : (
              <div
                style={{
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-light)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{currentEvent.name || currentEvent.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2, maxWidth: 500 }}>
                      {currentEvent.description || 'University sustainability championship.'}
                    </p>
                  </div>
                  <Badge variant={currentEvent.status === 'ACTIVE' || currentEvent.status === 'PUBLISHED' ? 'emerald' : 'slate'}>
                    {currentEvent.status || 'Active'}
                  </Badge>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <span>
                    <strong>Dates:</strong>{' '}
                    {currentEvent.startDate ? new Date(currentEvent.startDate).toLocaleDateString() : 'TBA'}
                    {currentEvent.endDate ? ` — ${new Date(currentEvent.endDate).toLocaleDateString()}` : ''}
                  </span>
                  {team && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontWeight: 600 }}>
                      <CheckCircle2 size={14} /> Registered with team "{team.name}"
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Team Summary Section */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} color="var(--primary)" /> Team Overview
              </h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/team')}
              >
                {team ? 'Manage Team' : 'Create Team'}
              </button>
            </div>

            {loading ? (
              <Skeleton height="100px" />
            ) : !team ? (
              <EmptyState
                icon={Users}
                title="Not In a Team"
                description="You are currently working independently. Form or join a team to collaborate on challenge submissions."
                action={
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/team')}>
                    Create a Team
                  </button>
                }
              />
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{team.name}</h4>
                      <Badge variant={team.status === 'FINALIZED' ? 'emerald' : 'amber'}>
                        {team.status || 'Active'}
                      </Badge>
                      {isTeamLead && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 4 }}>
                          ★ You are Team Lead
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 2 }}>
                      Team ID: {team.code || team._id}
                    </div>
                  </div>
                </div>

                {/* Team Members Chips */}
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                    Members ({teamMembers.length})
                  </span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {teamMembers.map((m) => (
                      <div
                        key={m._id || m.userId}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                          }}
                        >
                          {m.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span>{m.name}</span>
                        {m._id === team.leader && <span style={{ color: 'var(--primary)', fontSize: '0.7rem' }}>Lead</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Recent Activity (Real API) */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={18} color="var(--primary)" /> Team & Event Activity
              </h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/community')}
              >
                Community Feed
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton height="50px" />
                <Skeleton height="50px" />
              </div>
            ) : teamActivity.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="No Recent Activity"
                description="Actions by your team, such as invites, submissions, and status changes, will appear here."
              />
            ) : (
              <div className="feed-list">
                {teamActivity.slice(0, 5).map((act, idx) => (
                  <div key={act._id || idx} className="feed-item">
                    <div className="feed-icon-wrap">
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="feed-body">
                      <div className="feed-title">{act.message || act.title || 'Activity update'}</div>
                      <div className="feed-time">
                        {act.createdAt ? new Date(act.createdAt).toLocaleString() : 'Recently'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Calendar Widget + Notifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Calendar / Deadlines (Real Dates) */}
          <CalendarWidget realEvents={events} />

          {/* 6. Notifications Section */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={18} color="var(--primary)" /> Notifications
                {unreadNotifCount > 0 && (
                  <span className="badge badge-emerald">{unreadNotifCount} unread</span>
                )}
              </h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/notifications')}
              >
                View All
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton height="50px" />
                <Skeleton height="50px" />
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No Notifications"
                description="You are completely up to date."
              />
            ) : (
              <div className="feed-list">
                {notifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif._id}
                    className={`feed-item ${!notif.read ? 'unread' : ''}`}
                    onClick={() => !notif.read && handleMarkNotificationRead(notif._id)}
                    style={{ cursor: !notif.read ? 'pointer' : 'default' }}
                  >
                    <div
                      className="feed-icon-wrap"
                      style={{ background: notif.read ? '#f1f5f9' : 'var(--primary-light)' }}
                    >
                      <Bell size={18} color={notif.read ? 'var(--text-light)' : 'var(--primary)'} />
                    </div>
                    <div className="feed-body">
                      <div className="feed-title">{notif.title || notif.message}</div>
                      <div className="feed-time">
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : 'Recent'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
