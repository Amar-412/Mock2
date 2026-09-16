import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, FileText, ArrowRight } from 'lucide-react';
import { evaluatorApi } from '../../api/evaluator.api';
import { StatCard } from '../../components/common/StatCard';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorState } from '../../components/common/ErrorState';

export const EvaluatorDashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await evaluatorApi.getDashboard();
      setStats(res.data || res);
    } catch (err) {
      console.error('Failed to load evaluator dashboard:', err);
      setError(err.message || 'Failed to fetch evaluator metrics from Core Platform.');
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

  const assigned = stats?.assignedCount ?? stats?.totalAssigned ?? 0;
  const completed = stats?.completedCount ?? stats?.totalCompleted ?? 0;
  const pending = stats?.pendingCount ?? stats?.totalPending ?? (assigned - completed);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Evaluator Portal</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Evaluate student deliverables, review submitted evidence, and assign scores
        </p>
      </div>

      <div className="stat-grid">
        {loading ? (
          <>
            <Skeleton height="100px" borderRadius="var(--radius-lg)" />
            <Skeleton height="100px" borderRadius="var(--radius-lg)" />
            <Skeleton height="100px" borderRadius="var(--radius-lg)" />
          </>
        ) : (
          <>
            <StatCard
              label="Assigned Submissions"
              value={assigned}
              subtitle="Total submissions in your pool"
              icon={FileText}
              color="#0284c7"
              bg="#e0f2fe"
            />
            <StatCard
              label="Pending Evaluations"
              value={pending}
              subtitle="Requiring grading"
              icon={Clock}
              color="#d97706"
              bg="#fef3c7"
            />
            <StatCard
              label="Completed"
              value={completed}
              subtitle="Scores finalized"
              icon={CheckCircle}
              color="var(--primary)"
              bg="var(--primary-light)"
            />
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>
              Evaluation Queue
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Access pending student deliverables and rubric evaluation forms.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate('/evaluator/queue')}
          >
            Open Evaluation Queue <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
