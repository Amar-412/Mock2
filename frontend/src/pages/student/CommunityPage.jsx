import React, { useState, useEffect } from 'react';
import { Globe, CheckCircle2, Award, Calendar } from 'lucide-react';
import { communityApi } from '../../api/community.api';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';

export const CommunityPage = () => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      try {
        const res = await communityApi.getFeed();
        const list = res.feed || res.activities || (Array.isArray(res) ? res : []);
        setFeed(list);
      } catch (err) {
        console.error('Failed to load community feed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Community Feed</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Real-time activity and sustainability achievements from university teams across the network
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Skeleton height="70px" />
          <Skeleton height="70px" />
          <Skeleton height="70px" />
        </div>
      ) : feed.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No Community Activities Yet"
          description="When teams submit projects, achieve challenge goals, or join events, their milestones will be broadcast here."
        />
      ) : (
        <div className="card" style={{ padding: 24 }}>
          <div className="feed-list">
            {feed.map((item, idx) => (
              <div key={item._id || idx} className="feed-item">
                <div className="feed-icon-wrap">
                  <Award size={20} />
                </div>
                <div className="feed-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="feed-title" style={{ fontSize: '0.95rem' }}>
                      {item.message || item.title || 'Team achieved milestone'}
                    </div>
                    {item.type && <Badge variant="emerald">{item.type}</Badge>}
                  </div>
                  <div className="feed-time" style={{ marginTop: 4 }}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recently'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
