import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, CheckCircle2 } from 'lucide-react';
import { notificationApi } from '../../api/notification.api';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getNotifications();
      const list = res.notifications || res || [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Notification Center</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {unreadCount > 0 ? `You have ${unreadCount} unread notification(s)` : 'All caught up'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            className="btn btn-outline btn-sm"
            onClick={handleMarkAllRead}
            disabled={actionLoading}
          >
            <CheckCheck size={16} /> Mark All as Read
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton height="60px" />
          <Skeleton height="60px" />
          <Skeleton height="60px" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notifications"
          description="You will receive alerts here when teammates invite you, deadlines approach, or submissions are evaluated."
        />
      ) : (
        <div className="card" style={{ padding: 20 }}>
          <div className="feed-list">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`feed-item ${!notif.read ? 'unread' : ''}`}
                style={{ cursor: !notif.read ? 'pointer' : 'default' }}
                onClick={() => !notif.read && handleMarkOneRead(notif._id)}
              >
                <div
                  className="feed-icon-wrap"
                  style={{
                    background: notif.read ? 'var(--bg-app)' : 'var(--primary-light)',
                    color: notif.read ? 'var(--text-light)' : 'var(--primary)',
                  }}
                >
                  <Bell size={18} />
                </div>
                <div className="feed-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="feed-title">{notif.title || notif.message}</div>
                    {!notif.read && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--primary)',
                        }}
                      />
                    )}
                  </div>
                  {notif.description && (
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {notif.description}
                    </p>
                  )}
                  <div className="feed-time" style={{ marginTop: 4 }}>
                    {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'Recently'}
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
