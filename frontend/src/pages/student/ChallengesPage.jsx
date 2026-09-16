import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ArrowRight, Layers } from 'lucide-react';
import { challengeApi } from '../../api/challenge.api';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';

export const ChallengesPage = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      setLoading(true);
      try {
        const res = await challengeApi.getChallenges();
        const list = res.challenges || res.data?.challenges || (Array.isArray(res) ? res : []);
        setChallenges(list);
      } catch (err) {
        console.error('Failed to load challenges:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Challenge Tracks</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Explore campus sustainability missions, waste reduction goals, and green initiatives
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          <Skeleton height="200px" borderRadius="var(--radius-lg)" />
          <Skeleton height="200px" borderRadius="var(--radius-lg)" />
        </div>
      ) : challenges.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No Active Challenges"
          description="There are currently no challenges open for participation."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {challenges.map((ch) => (
            <div
              key={ch._id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Badge variant="blue">{ch.track || 'Sustainability'}</Badge>
                  {ch.difficulty && <Badge variant="slate">{ch.difficulty}</Badge>}
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: 8, fontWeight: 700 }}>
                  {ch.title}
                </h3>

                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    marginBottom: 16,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {ch.description}
                </p>
              </div>

              <div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => navigate(`/challenges/${ch._id}`)}
                >
                  View Mission Details <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
