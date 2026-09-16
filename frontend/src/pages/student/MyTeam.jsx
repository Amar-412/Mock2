import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, UserPlus, CheckCircle, XCircle, Trash2, Award, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { teamApi } from '../../api/team.api';
import { eventApi } from '../../api/event.api';
import { userApi } from '../../api/user.api';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const MyTeam = () => {
  const { teamId: routeTeamId } = useParams();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [events, setEvents] = useState([]);

  // Modals & confirmation dialogs
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [disbandDialogOpen, setDisbandDialogOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);

  // Form states
  const [selectedEventId, setSelectedEventId] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const teamId = routeTeamId || user?.teamId || user?.team?._id || user?.team;
  const isTeamLead = team && (team.leader === user?._id || team.lead === user?._id || team.leader?._id === user?._id);

  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch pending invitations for this student
      try {
        const invRes = await teamApi.getMyInvitations();
        setInvitations(invRes.invitations || invRes || []);
      } catch {
        setInvitations([]);
      }

      // 2. Fetch team details if teamId exists
      if (teamId) {
        try {
          const [teamData, membersData] = await Promise.all([
            teamApi.getTeam(teamId),
            teamApi.getTeamMembers(teamId),
          ]);
          setTeam(teamData);
          setMembers(Array.isArray(membersData) ? membersData : []);
        } catch {
          setTeam(null);
          setMembers([]);
        }
      } else {
        setTeam(null);
        setMembers([]);
      }

      // 3. Fetch events for creating a team
      try {
        const eventsRes = await eventApi.getEvents();
        const evList = eventsRes.events || eventsRes.data?.events || [];
        setEvents(evList);
        if (evList.length > 0 && !selectedEventId) {
          setSelectedEventId(evList[0]._id);
        }
      } catch {
        setEvents([]);
      }
    } catch (err) {
      console.error('Failed to fetch team data:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Handle invitation acceptance
  const handleAcceptInvite = async (invitationId) => {
    setActionLoading(true);
    try {
      await teamApi.acceptInvitation(invitationId);
      showToast('Successfully joined team!', 'success');
      await refreshUser();
      await fetchTeamData();
    } catch (err) {
      showToast(err.message || 'Failed to accept invitation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle invitation rejection
  const handleRejectInvite = async (invitationId) => {
    setActionLoading(true);
    try {
      await teamApi.rejectInvitation(invitationId);
      showToast('Invitation declined', 'info');
      await fetchTeamData();
    } catch (err) {
      showToast(err.message || 'Failed to decline invitation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Create team
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim() || !selectedEventId) return;

    setActionLoading(true);
    try {
      await teamApi.createTeamForEvent(selectedEventId, { name: newTeamName.trim() });
      showToast(`Team "${newTeamName.trim()}" created!`, 'success');
      setCreateModalOpen(false);
      setNewTeamName('');
      await refreshUser();
      await fetchTeamData();
    } catch (err) {
      showToast(err.message || 'Failed to create team', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Search students to invite
  const handleSearchStudents = async (query) => {
    setSearchStudentQuery(query);
    if (!query || query.length < 2) {
      setStudentSearchResults([]);
      return;
    }
    try {
      const res = await userApi.searchStudents(query);
      const list = res.students || res.data?.students || [];
      setStudentSearchResults(list);
    } catch {
      setStudentSearchResults([]);
    }
  };

  // Send invitation
  const handleInviteStudent = async (studentId) => {
    if (!team?._id) return;
    setActionLoading(true);
    try {
      await teamApi.inviteMember(team._id, { inviteeId: studentId });
      showToast('Invitation sent successfully!', 'success');
      setInviteModalOpen(false);
      setSearchStudentQuery('');
      setStudentSearchResults([]);
    } catch (err) {
      showToast(err.message || 'Failed to send invitation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Finalize team
  const handleFinalizeTeamConfirm = async () => {
    setActionLoading(true);
    try {
      await teamApi.finalizeTeam(team._id);
      showToast('Team roster finalized and locked!', 'success');
      setFinalizeDialogOpen(false);
      await fetchTeamData();
    } catch (err) {
      showToast(err.message || 'Failed to finalize team', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Disband team
  const handleDisbandTeamConfirm = async () => {
    setActionLoading(true);
    try {
      await teamApi.disbandTeam(team._id);
      showToast('Team has been disbanded', 'info');
      setDisbandDialogOpen(false);
      await refreshUser();
      await fetchTeamData();
      navigate('/team');
    } catch (err) {
      showToast(err.message || 'Failed to disband team', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton height="140px" style={{ marginBottom: 24 }} />
        <Skeleton height="200px" />
      </div>
    );
  }

  return (
    <div>
      {/* Pending Invitations Banner */}
      {invitations.length > 0 && (
        <div className="card" style={{ marginBottom: 28, borderColor: 'var(--primary)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={20} color="var(--primary)" /> Team Invitations ({invitations.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {invitations.map((inv) => (
              <div
                key={inv._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    {inv.team?.name || 'YUWA Team'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Invited by: {inv.inviter?.name || 'Team Lead'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={actionLoading}
                    onClick={() => handleAcceptInvite(inv._id)}
                  >
                    <CheckCircle size={14} /> Accept
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={actionLoading}
                    onClick={() => handleRejectInvite(inv._id)}
                  >
                    <XCircle size={14} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Details or Empty State */}
      {team ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Team Overview Header Card */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{team.name}</h2>
                  <Badge variant={team.status === 'FINALIZED' ? 'emerald' : 'amber'}>
                    {team.status || 'Active'}
                  </Badge>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Team Code: <strong style={{ color: 'var(--text-main)' }}>{team.code || team._id}</strong>
                </p>
                {team.event && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
                    Event: <strong>{team.event.name || 'Event Registration'}</strong>
                  </p>
                )}
              </div>

              {/* Lead Controls */}
              {isTeamLead && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {team.status !== 'FINALIZED' && (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setInviteModalOpen(true)}
                      >
                        <UserPlus size={16} /> Invite Student
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setFinalizeDialogOpen(true)}
                        disabled={actionLoading}
                      >
                        <Shield size={16} /> Finalize Roster
                      </button>
                    </>
                  )}
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--danger)', borderColor: '#fca5a5' }}
                    onClick={() => setDisbandDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    <Trash2 size={16} /> Disband
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Members Roster */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Team Members ({members.length})</h3>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Role</th>
                    <th>College</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member._id || member.userId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: 'var(--primary-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              color: 'var(--primary)',
                            }}
                          >
                            {member.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{member.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                              @{member.username || 'student'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {member.role === 'LEADER' || member._id === team.leader ? (
                          <Badge variant="emerald">Lead</Badge>
                        ) : (
                          <Badge variant="slate">Member</Badge>
                        )}
                      </td>
                      <td>{member.college?.name || member.college || '—'}</td>
                      <td>
                        <Badge variant="emerald">Active</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <EmptyState
            icon={Users}
            title="You are not part of any team yet"
            description="Create your own student team for an active competition or wait for team invites."
            action={
              <button
                className="btn btn-primary"
                onClick={() => setCreateModalOpen(true)}
              >
                <UserPlus size={16} /> Create a Team
              </button>
            }
          />
        </div>
      )}

      {/* Create Team Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create a New Team"
      >
        <form onSubmit={handleCreateTeam}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Select Event
            </label>
            <select
              className="search-input"
              style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              required
            >
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.name || ev.title}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Team Name
            </label>
            <input
              type="text"
              required
              className="search-input"
              style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
              placeholder="e.g. EcoInnovators"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Invite Member Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Student to Team"
      >
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            className="search-input"
            style={{ borderRadius: 'var(--radius-md)', padding: '0 14px' }}
            placeholder="Search by student name or username..."
            value={searchStudentQuery}
            onChange={(e) => handleSearchStudents(e.target.value)}
          />
        </div>

        <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 20 }}>
          {studentSearchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {searchStudentQuery ? 'No matching students found' : 'Type at least 2 characters to search'}
            </div>
          ) : (
            studentSearchResults.map((student) => (
              <div
                key={student.userId || student._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-app)',
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{student.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    @{student.username || 'student'}
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleInviteStudent(student.userId || student._id)}
                  disabled={actionLoading}
                >
                  Invite
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setInviteModalOpen(false)}
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Confirm Finalize Dialog */}
      <ConfirmDialog
        isOpen={finalizeDialogOpen}
        onClose={() => setFinalizeDialogOpen(false)}
        onConfirm={handleFinalizeTeamConfirm}
        title="Finalize Team Roster"
        message="Are you sure you want to finalize your team? Once finalized, the roster is locked and no more members can be added."
        confirmText="Finalize Roster"
        loading={actionLoading}
      />

      {/* Confirm Disband Dialog */}
      <ConfirmDialog
        isOpen={disbandDialogOpen}
        onClose={() => setDisbandDialogOpen(false)}
        onConfirm={handleDisbandTeamConfirm}
        title="Disband Team"
        message="Are you sure you want to disband this team? This action is permanent and will remove all members from the team."
        confirmText="Disband Team"
        isDestructive={true}
        loading={actionLoading}
      />
    </div>
  );
};
