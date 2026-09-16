import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, Star, ArrowRight } from 'lucide-react';
import { evaluatorApi } from '../../api/evaluator.api';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';

export const EvaluationQueue = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active evaluation modal state
  const [activeEval, setActiveEval] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await evaluatorApi.listEvaluations();
      const list = res.evaluations || res.data?.evaluations || (Array.isArray(res) ? res : []);
      setEvaluations(list);
    } catch (err) {
      console.error('Failed to load evaluation queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleOpenEvaluation = (ev) => {
    setActiveEval(ev);
    setScore(ev.score ?? '');
    setFeedback(ev.feedback ?? '');
    setError(null);
  };

  const handleSaveDraft = async () => {
    if (!activeEval) return;
    setActionLoading(true);
    setError(null);
    try {
      await evaluatorApi.patchEvaluation(activeEval._id, {
        score: parseFloat(score) || 0,
        feedback: feedback.trim(),
      });
      alert('Evaluation draft saved.');
      fetchQueue();
    } catch (err) {
      setError(err.message || 'Failed to save evaluation draft');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (!activeEval) return;
    if (!score || parseFloat(score) < 0) {
      setError('Please provide a valid score before submitting.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await evaluatorApi.patchEvaluation(activeEval._id, {
        score: parseFloat(score),
        feedback: feedback.trim(),
      });
      await evaluatorApi.submitEvaluation(activeEval._id);
      setActiveEval(null);
      fetchQueue();
    } catch (err) {
      setError(err.message || 'Failed to submit evaluation');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Evaluation Queue</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Assigned student submissions awaiting rubric review and scoring
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Skeleton height="80px" />
          <Skeleton height="80px" />
        </div>
      ) : evaluations.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Queue is Empty"
          description="You currently have no pending submissions assigned to you for evaluation."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {evaluations.map((ev) => (
            <div
              key={ev._id}
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 20,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                    {ev.submission?.title || ev.title || 'Challenge Submission'}
                  </h3>
                  <Badge variant={ev.status === 'COMPLETED' ? 'emerald' : 'amber'}>
                    {ev.status || 'PENDING'}
                  </Badge>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Team: <strong>{ev.team?.name || 'Assigned Team'}</strong>
                  {ev.score !== undefined && ev.score !== null && (
                    <span style={{ marginLeft: 16, color: 'var(--primary)', fontWeight: 700 }}>
                      Score: {ev.score}/100
                    </span>
                  )}
                </div>
              </div>

              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleOpenEvaluation(ev)}
              >
                {ev.status === 'COMPLETED' ? 'View Review' : 'Grade Submission'} <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Grading Modal */}
      {activeEval && (
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
          <div className="card" style={{ width: '100%', maxWidth: 540, padding: 30 }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: 8 }}>
              {activeEval.submission?.title || 'Deliverable Evaluation'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Team: <strong>{activeEval.team?.name || 'Student Team'}</strong>
            </p>

            {error && (
              <div style={{ color: '#ef4444', background: '#fef2f2', padding: 10, borderRadius: 6, marginBottom: 14, fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Evaluation Score (0 - 100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                className="search-input"
                style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                placeholder="e.g. 85"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                disabled={activeEval.status === 'COMPLETED'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Evaluator Feedback & Qualitative Notes
              </label>
              <textarea
                rows={4}
                className="search-input"
                style={{ borderRadius: 'var(--radius-md)', padding: 12, height: 'auto', resize: 'vertical' }}
                placeholder="Critique methodology, impact verification, and suggest improvements..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={activeEval.status === 'COMPLETED'}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setActiveEval(null)}
              >
                Close
              </button>

              {activeEval.status !== 'COMPLETED' && (
                <>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleSaveDraft}
                    disabled={actionLoading}
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmitFinal}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Submitting...' : 'Submit Evaluation'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
