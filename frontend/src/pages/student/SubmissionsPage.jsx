import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Plus,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  CloudOff,
  RefreshCw,
  Eye,
  Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { teamApi } from '../../api/team.api';
import { getOfflineSubmissions, syncPendingSubmissions } from '../../utils/offlineSync';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const SubmissionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [submissions, setSubmissions] = useState([]);
  const [offlineSubs, setOfflineSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);

  const teamId = user?.teamId || user?.team?._id || user?.team;

  const fetchSubmissions = useCallback(async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [onlineList, offlineList] = await Promise.all([
        teamApi.getTeamSubmissions(teamId).catch(() => []),
        getOfflineSubmissions().catch(() => []),
      ]);

      setSubmissions(Array.isArray(onlineList) ? onlineList : []);
      setOfflineSubs(Array.isArray(offlineList) ? offlineList : []);
    } catch (err) {
      console.error('Failed to load team submissions:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleManualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await syncPendingSubmissions();
      showToast(`Synced ${res.syncedCount} submissions with the backend!`, 'success');
      await fetchSubmissions();
    } catch (err) {
      showToast(err.message || 'Offline sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

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
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Submissions</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Track project deliverables, attached evidence, evaluation status, and offline sync queue
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {offlineSubs.length > 0 && (
            <button
              className="btn btn-outline"
              onClick={handleManualSync}
              disabled={syncing}
              style={{ color: '#d97706', borderColor: '#fde68a' }}
            >
              <RefreshCw size={16} className={syncing ? 'spin' : ''} />
              {syncing ? 'Syncing...' : `Sync Offline Queue (${offlineSubs.length})`}
            </button>
          )}

          {teamId && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/submissions/new')}
            >
              <Plus size={16} /> New Submission
            </button>
          )}
        </div>
      </div>

      {/* Offline Drafts / Sync Queue Section */}
      {offlineSubs.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: '#fde68a', background: '#fffdf5' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b45309' }}>
              <CloudOff size={18} /> Offline Queue ({offlineSubs.length})
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>
              Will auto-sync when online
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {offlineSubs.map((item) => (
              <div
                key={item.clientSubmissionId}
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  background: 'white',
                  border: '1px solid #fef3c7',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Saved locally: {new Date(item.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <Badge variant={item.syncStatus === 'syncing' ? 'blue' : 'amber'}>
                  {item.syncStatus === 'syncing' ? 'Syncing...' : 'Queued'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Submissions List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Skeleton height="80px" />
          <Skeleton height="80px" />
        </div>
      ) : !teamId ? (
        <EmptyState
          icon={Send}
          title="Team Required"
          description="You need to belong to an active team to submit deliverables."
          action={
            <button className="btn btn-primary" onClick={() => navigate('/team')}>
              Go to My Team
            </button>
          }
        />
      ) : submissions.length === 0 && offlineSubs.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No Submissions Yet"
          description="Your team has not submitted any challenge deliverables yet."
          action={
            <button className="btn btn-primary" onClick={() => navigate('/submissions/new')}>
              <Plus size={16} /> Create First Submission
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {submissions.map((sub) => (
            <div
              key={sub._id}
              className="card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 20,
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{sub.title}</h3>
                  <Badge
                    variant={
                      sub.status === 'EVALUATED' || sub.status === 'SUBMITTED'
                        ? 'emerald'
                        : sub.status === 'UNDER_REVIEW'
                        ? 'blue'
                        : 'slate'
                    }
                  >
                    {sub.status || 'DRAFT'}
                  </Badge>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 600 }}>
                  {sub.summary || sub.description || 'No summary provided.'}
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    fontSize: '0.75rem',
                    color: 'var(--text-light)',
                    marginTop: 8,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} />
                    {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'Recent'}
                  </span>
                  {sub.evidence?.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={12} />
                      {sub.evidence.length} Evidence Attached
                    </span>
                  )}
                  {sub.status === 'EVALUATED' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontWeight: 700 }}>
                      <Award size={12} /> Evaluation Complete
                    </span>
                  )}
                </div>
              </div>

              <button
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedSub(sub)}
              >
                <Eye size={14} /> View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Submission Detail Modal */}
      <Modal
        isOpen={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        title={selectedSub?.title || 'Submission Details'}
        maxWidth={580}
      >
        {selectedSub && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Badge variant={selectedSub.status === 'EVALUATED' ? 'emerald' : 'blue'}>
                {selectedSub.status}
              </Badge>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                Submitted on {new Date(selectedSub.createdAt || Date.now()).toLocaleString()}
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                Summary & Reflection
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                {selectedSub.summary || selectedSub.description || 'No description provided.'}
              </p>
            </div>

            {selectedSub.quantitativeMetrics && Object.keys(selectedSub.quantitativeMetrics).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Impact Metrics
                </h4>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  {selectedSub.quantitativeMetrics.co2SavedKg > 0 && (
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
                      🌱 {selectedSub.quantitativeMetrics.co2SavedKg} kg CO₂ Avoided
                    </div>
                  )}
                  {selectedSub.quantitativeMetrics.wasteDivertedKg > 0 && (
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0284c7' }}>
                      ♻️ {selectedSub.quantitativeMetrics.wasteDivertedKg} kg Waste Diverted
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedSub.evidence?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Attached Evidence ({selectedSub.evidence.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {selectedSub.evidence.map((ev, idx) => (
                    <div
                      key={ev._id || idx}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-app)',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <FileText size={16} color="var(--primary)" />
                      <span>{ev.filename || ev.title || 'Evidence Attachment'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedSub(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
