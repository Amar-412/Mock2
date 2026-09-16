import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  ArrowLeft,
  ArrowRight,
  CloudOff,
  CheckCircle,
  FileText,
  Award,
  BarChart2,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { teamApi } from '../../api/team.api';
import { submissionApi } from '../../api/submission.api';
import { saveOfflineSubmission } from '../../utils/offlineSync';
import { FileUploader } from '../../components/common/FileUploader';
import { Badge } from '../../components/common/Badge';

export const NewSubmission = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const teamId = user?.teamId || user?.team?._id || user?.team;

  // Step state: 1 (Challenge), 2 (Reflection), 3 (Metrics), 4 (Evidence), 5 (Review)
  const [currentStep, setCurrentStep] = useState(1);

  const [challenges, setChallenges] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [co2Saved, setCo2Saved] = useState('');
  const [wasteDiverted, setWasteDiverted] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchTeamChallenges = async () => {
      if (!teamId) return;
      try {
        const list = await teamApi.getTeamChallenges(teamId);
        setChallenges(list);
        if (list.length > 0 && !selectedChallengeId) {
          setSelectedChallengeId(list[0]._id || list[0].challengeId);
        }
      } catch (err) {
        console.error('Failed to load team challenges:', err);
      }
    };
    fetchTeamChallenges();
  }, [teamId]);

  const selectedChallenge = challenges.find(
    (c) => (c._id || c.challengeId) === selectedChallengeId
  );

  const handleNextStep = () => {
    setError(null);
    if (currentStep === 1 && !selectedChallengeId) {
      setError('Please select a challenge track to proceed.');
      return;
    }
    if (currentStep === 2 && (!title.trim() || !summary.trim())) {
      setError('Please provide both a project title and reflection summary.');
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !selectedChallengeId) {
      setError('Missing title or challenge selection.');
      return;
    }

    setLoading(true);
    setError(null);

    const submissionPayload = {
      teamId,
      challengeId: selectedChallengeId,
      title: title.trim(),
      summary: summary.trim(),
      quantitativeMetrics: {
        co2SavedKg: parseFloat(co2Saved) || 0,
        wasteDivertedKg: parseFloat(wasteDiverted) || 0,
      },
    };

    // If browser is offline or fails online, queue in IndexedDB
    if (isOffline) {
      try {
        await saveOfflineSubmission(submissionPayload);
        showToast("You're offline. Your submission will sync automatically when you're back online.", 'warning');
        navigate('/submissions');
      } catch (idbErr) {
        setError('Failed to queue submission offline: ' + idbErr.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // 1. Create submission online
      const created = await submissionApi.createSubmission(submissionPayload);
      const subId = created._id;

      // 2. Upload evidence file if attached
      if (selectedFile && subId) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', `${title} Evidence`);
        try {
          await submissionApi.uploadEvidence(subId, formData);
        } catch (uploadErr) {
          console.warn('Evidence upload failed:', uploadErr);
        }
      }

      // 3. Finalize deliverable
      if (subId) {
        await submissionApi.finalizeSubmission(subId);
      }

      showToast('Deliverable finalized & submitted successfully!', 'success');
      navigate('/submissions');
    } catch (err) {
      console.warn('Online submission failed, falling back to IndexedDB:', err);
      try {
        await saveOfflineSubmission(submissionPayload);
        showToast("Server unreachable. Submission queued in IndexedDB for auto-sync.", 'warning');
        navigate('/submissions');
      } catch (idbErr) {
        setError('Submission failed: ' + (err.message || 'Unknown network error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Challenge', 'Reflection', 'Metrics', 'Evidence', 'Review'];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <button
        className="btn btn-outline btn-sm"
        onClick={() => navigate('/submissions')}
        style={{ marginBottom: 20 }}
      >
        <ArrowLeft size={14} /> Back to Submissions
      </button>

      {/* Offline Status Alert */}
      {isOffline && (
        <div
          style={{
            padding: 14,
            borderRadius: 'var(--radius-md)',
            background: '#fffbeb',
            color: '#b45309',
            marginBottom: 20,
            border: '1px solid #fde68a',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <CloudOff size={18} />
          <span>You are offline. Your submission will sync automatically when connection returns.</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 14,
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

      {/* Step Progress Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, position: 'relative' }}>
        {stepLabels.map((label, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                zIndex: 1,
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isDone ? 'var(--primary)' : isCurrent ? 'var(--primary-light)' : '#f1f5f9',
                  border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                  color: isDone ? 'white' : isCurrent ? 'var(--primary)' : 'var(--text-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'var(--transition)',
                }}
              >
                {isDone ? <Check size={16} /> : stepNum}
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? 'var(--primary)' : 'var(--text-muted)',
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="card">
        {/* STEP 1: Select Challenge */}
        {currentStep === 1 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>
              Step 1: Select Challenge Track
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Choose the joined sustainability challenge for which you are submitting project deliverables.
            </p>

            {challenges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, background: 'var(--bg-app)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
                  Your team hasn't joined any challenge tracks yet.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/challenges')}>
                  Browse Challenges
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {challenges.map((ch) => {
                  const cId = ch._id || ch.challengeId;
                  const isSelected = selectedChallengeId === cId;
                  return (
                    <div
                      key={cId}
                      onClick={() => setSelectedChallengeId(cId)}
                      style={{
                        padding: 16,
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-light)'}`,
                        background: isSelected ? 'var(--primary-light)' : 'white',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{ch.title || ch.name}</h4>
                        {ch.track && <Badge variant="blue">{ch.track}</Badge>}
                      </div>
                      {ch.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6 }}>
                          {ch.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Reflection & Summary */}
        {currentStep === 2 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>
              Step 2: Project Deliverable & Reflection
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Provide clear documentation of the action undertaken, outcomes, and community impact.
            </p>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Project Title
              </label>
              <input
                type="text"
                required
                className="search-input"
                style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                placeholder="e.g. Campus Organic Composting Pilot"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Implementation Notes & Reflection
              </label>
              <textarea
                rows={5}
                required
                className="search-input"
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  height: 'auto',
                  resize: 'vertical',
                }}
                placeholder="Detail your solution, execution methodology, challenges faced, and results achieved..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 3: Quantitative Metrics */}
        {currentStep === 3 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>
              Step 3: Quantitative Impact Metrics
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Enter measurable data points if applicable to your project.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Estimated CO₂ Avoided (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="search-input"
                  style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                  placeholder="e.g. 35.5"
                  value={co2Saved}
                  onChange={(e) => setCo2Saved(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Waste Diverted (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="search-input"
                  style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                  placeholder="e.g. 110"
                  value={wasteDiverted}
                  onChange={(e) => setWasteDiverted(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Mobile Evidence Upload */}
        {currentStep === 4 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>
              Step 4: Evidence Attachment
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Attach field photos, PDF reports, or proof of execution. Supports mobile camera directly.
            </p>

            <FileUploader
              file={selectedFile}
              onFileSelect={(f) => setSelectedFile(f)}
              onFileRemove={() => setSelectedFile(null)}
              maxSizeMB={10}
            />
          </div>
        )}

        {/* STEP 5: Review & Submit */}
        {currentStep === 5 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>
              Step 5: Review & Confirm Submission
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Verify all details before finalizing. Submissions are scored by university evaluators.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                padding: 16,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-light)',
                marginBottom: 20,
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Challenge Track
                </span>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {selectedChallenge?.title || 'Selected Track'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Project Title
                </span>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Summary / Notes
                </span>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'pre-line' }}>
                  {summary}
                </div>
              </div>

              {(co2Saved || wasteDiverted) && (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                    Metrics
                  </span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {co2Saved && `${co2Saved} kg CO₂ Avoided `}
                    {wasteDiverted && `• ${wasteDiverted} kg Waste Diverted`}
                  </div>
                </div>
              )}

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Evidence Attachment
                </span>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginTop: 2 }}>
                  {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)` : 'No file attached'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 28,
            paddingTop: 20,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {currentStep > 1 ? (
            <button type="button" className="btn btn-outline" onClick={handlePrevStep} disabled={loading}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNextStep}
              disabled={challenges.length === 0}
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading}
              style={{ minWidth: 180 }}
            >
              <Send size={16} /> {loading ? 'Submitting...' : 'Finalize & Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
