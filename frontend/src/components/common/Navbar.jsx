import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Cloud, CloudOff, RefreshCw, Menu, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationApi } from '../../api/notification.api';
import { getPendingOfflineCount, syncPendingSubmissions } from '../../utils/offlineSync';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Poll or fetch notifications and offline queue count
  useEffect(() => {
    let isMounted = true;

    const checkCounts = async () => {
      try {
        if (role === 'STUDENT') {
          const notifRes = await notificationApi.getNotifications({ limit: 10 });
          if (isMounted) {
            const list = notifRes.notifications || notifRes || [];
            const unread = list.filter((n) => !n.read).length;
            setUnreadCount(unread);
          }

          const offlineCount = await getPendingOfflineCount();
          if (isMounted) {
            setPendingSyncCount(offlineCount);
          }
        }
      } catch {
        // Silently handle if unauthenticated or network issue
      }
    };

    checkCounts();
    const interval = setInterval(checkCounts, 30000); // 30s interval
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [role]);

  const handleSync = async () => {
    if (isSyncing || pendingSyncCount === 0) return;
    setIsSyncing(true);
    try {
      await syncPendingSubmissions();
      const remaining = await getPendingOfflineCount();
      setPendingSyncCount(remaining);
    } catch (err) {
      console.error('Offline sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (role === 'STUDENT') {
      navigate(`/events?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-main)',
          }}
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="search-bar-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search events, challenges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="topbar-actions">
        {/* Offline Sync Indicator */}
        {role === 'STUDENT' && (
          <button
            onClick={handleSync}
            className="btn btn-outline btn-sm"
            style={{
              borderColor: pendingSyncCount > 0 ? 'var(--warning)' : 'var(--border-light)',
              color: pendingSyncCount > 0 ? 'var(--warning)' : 'var(--text-muted)',
              gap: 6,
            }}
            title={pendingSyncCount > 0 ? `${pendingSyncCount} offline submissions ready to sync` : 'All submissions synced'}
          >
            {isSyncing ? (
              <RefreshCw size={14} className="spin" />
            ) : pendingSyncCount > 0 ? (
              <CloudOff size={14} />
            ) : (
              <Cloud size={14} color="var(--primary)" />
            )}
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {isSyncing ? 'Syncing...' : pendingSyncCount > 0 ? `${pendingSyncCount} Queued` : 'Synced'}
            </span>
          </button>
        )}

        {/* Notification Bell */}
        {role === 'STUDENT' && (
          <button
            className="action-btn"
            onClick={() => navigate('/notifications')}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="unread-indicator" />}
          </button>
        )}

        {/* User Profile Area */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-light)',
              background: 'white',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--primary-light)',
                color: 'var(--primary-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'User'}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                user?.name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || <User size={16} />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.2, color: 'var(--text-main)' }}>
                {user?.name || user?.username || 'User'}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)' }}>
                {role}
              </span>
            </div>
          </div>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                width: 180,
                background: 'white',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-light)',
                padding: '8px 0',
                zIndex: 50,
              }}
            >
              {role === 'STUDENT' && (
                <div
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/profile');
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--text-main)',
                  }}
                  className="dropdown-hover"
                >
                  <User size={16} /> Profile
                </div>
              )}
              <div
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                  navigate('/login');
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--danger)',
                  borderTop: '1px solid var(--border-subtle)',
                }}
                className="dropdown-hover"
              >
                <LogOut size={16} /> Log Out
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
