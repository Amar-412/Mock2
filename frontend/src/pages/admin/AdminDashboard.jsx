import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building,
  Calendar,
  ShieldCheck,
  Award,
  ArrowRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { StatCard } from '../../components/common/StatCard';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { Badge } from '../../components/common/Badge';

export const AdminDashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDashboard();
      const stats = res.data || res;
      setDashboardData(stats);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setError(err.message || 'Failed to fetch admin overview from Core Platform.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (error) {
    return <ErrorState message={error} onRetry={fetchStats} />;
  }

  const overview = dashboardData?.overview || dashboardData || {};

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Platform Administration</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Real-time metrics, event oversight, and participant analytics from the Core Platform
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="stat-grid">
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
              label="Registered Colleges"
              value={overview.totalColleges ?? overview.collegesCount ?? 0}
              subtitle="Participating institutions"
              icon={Building}
              color="#0284c7"
              bg="#e0f2fe"
            />
            <StatCard
              label="Total Teams"
              value={overview.totalTeams ?? overview.teamsCount ?? 0}
              subtitle="Formed student teams"
              icon={Users}
              color="var(--primary)"
              bg="var(--primary-light)"
            />
            <StatCard
              label="Active Events"
              value={overview.totalEvents ?? overview.activeEventsCount ?? 0}
              subtitle="Ecolympics competitions"
              icon={Calendar}
              color="#d97706"
              bg="#fef3c7"
            />
            <StatCard
              label="Evaluators"
              value={overview.totalEvaluators ?? overview.evaluatorsCount ?? 0}
              subtitle="Certified judges"
              icon={ShieldCheck}
              color="#7c3aed"
              bg="#ede9fe"
            />
          </>
        )}
      </div>

      {/* Quick Action Navigation Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 10 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div className="brand-icon" style={{ width: 42, height: 42, background: '#e0f2fe', color: '#0284c7' }}>
              <Building size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Colleges</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Institutions & campuses</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Manage approved collegiate partners and institution-level student rosters.
          </p>
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => navigate('/admin/colleges')}>
            Manage Colleges <ArrowRight size={14} />
          </button>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div className="brand-icon" style={{ width: 42, height: 42, background: '#fef3c7', color: '#d97706' }}>
              <Calendar size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Events</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Competitions & tracks</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Publish new university Ecolympics events and define submission timelines.
          </p>
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => navigate('/admin/events')}>
            Manage Events <ArrowRight size={14} />
          </button>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div className="brand-icon" style={{ width: 42, height: 42, background: '#ede9fe', color: '#7c3aed' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Evaluators</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Judges & rubrics</p>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Assign accredited evaluators to judging queues and oversee grading workflows.
          </p>
          <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => navigate('/admin/evaluators')}>
            Manage Evaluators <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
