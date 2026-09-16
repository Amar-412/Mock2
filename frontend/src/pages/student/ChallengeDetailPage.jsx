import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, ArrowLeft, CheckCircle, ShieldAlert } from 'lucide-react';
import { challengeApi } from '../../api/challenge.api';
import { teamApi } from '../../api/team.api';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../../components/common/Skeleton';
import { Badge } from '../../components/common/Badge';

export const ChallengeDetailPage = () => {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [challenge, setChallenge] = useState(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const teamId = user?.teamId || user?.team?._id || user?.team;

  const fetchChallenge = useCallback(async () => {
    setLoading(true);
    try {
      const res = await challengeApi.getChallengeById(challengeId);
      setChallenge(res);

      if (teamId) {
        try {
          const teamChallenges = await teamApi.getTeamChallenges(teamId);
          const isJoined = teamChallenges.some(
            (c) => c._id === challengeId || c.challengeId === challengeId
          );
          setJoined(isJoined);
        } catch {
          setJoined(false);
        }
      }
    } catch (err) {
      console.error('Failed to load challenge:', err);
      setError('Challenge not found or server error.');
    } finally {
      setLoading(false);
    }
  }, [challengeId, teamId]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  const handleJoinChallenge = async () => {
    if (!teamId) {
      alert('You must be in a team to participate in challenges.');
      navigate('/my-team');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await teamApi.joinTeamChallenge(teamId, challengeId);
      setJoined(true);
    } catch (err) {
      setError(err.message || 'Failed to join challenge.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveChallenge = async () => {
    if (!window.confirm('Are you sure you want to leave this challenge track?')) return;
    setActionLoading(true);
    setError(null);
    try {
      await teamApi.leaveTeamChallenge(teamId, challengeId);
      setJoined(false);
    } catch (err) {
      setError(err.message || 'Failed to leave challenge.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <Skeleton height="250px" />;
  }

  if (!challenge) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <h3>Challenge Not Found</h3>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/challenges')} style={{ marginTop: 12 }}>
          Back to Challenges
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        className="btn btn-outline btn-sm"
        onClick={() => navigate('/challenges')}
        style={{ marginBottom: 20 }}
      >
        <ArrowLeft size={14} /> Back to Challenges
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

      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>{challenge.title}</h1>
              <Badge variant="blue">{challenge.track || 'Sustainability'}</Badge>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: 650, lineHeight: 1.6 }}>
              {challenge.description}
            </p>
          </div>

          <div>
            {joined ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 700 }}>
                  <CheckCircle size={20} /> Active Track
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger)', borderColor: '#fca5a5' }}
                  disabled={actionLoading}
                  onClick={handleLeaveChallenge}
                >
                  Leave Track
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={handleJoinChallenge}
              >
                {actionLoading ? 'Joining...' : 'Join Challenge Track'}
              </button>
            )}
          </div>
        </div>

        {/* Rules & Requirements */}
        {challenge.rules && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>Rules & Guidelines</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>
              {challenge.rules}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
