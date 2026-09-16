import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Calendar,
  Award,
  Users,
  Send,
  Globe,
  Bell,
  User,
  ShieldCheck,
  Building,
  CheckCircle,
  BarChart3,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { role } = useAuth();

  const studentLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/team', label: 'My Team', icon: Users },
    { to: '/events', label: 'Events', icon: Calendar },
    { to: '/challenges', label: 'Challenges', icon: Award },
    { to: '/submissions', label: 'Submissions', icon: Send },
    { to: '/community', label: 'Community', icon: Globe },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Admin Overview', icon: BarChart3 },
    { to: '/admin/colleges', label: 'Colleges', icon: Building },
    { to: '/admin/events', label: 'Events', icon: Calendar },
    { to: '/admin/evaluators', label: 'Evaluators', icon: ShieldCheck },
    { to: '/admin/leaderboard', label: 'Leaderboard', icon: Award },
  ];

  const evaluatorLinks = [
    { to: '/evaluator/dashboard', label: 'Dashboard', icon: BarChart3 },
    { to: '/evaluator/queue', label: 'Evaluation Queue', icon: CheckCircle },
  ];

  const links =
    role === 'ADMIN'
      ? adminLinks
      : role === 'EVALUATOR'
      ? evaluatorLinks
      : studentLinks;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 35,
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-logo">
            <div className="brand-icon">🌱</div>
            <span>YUWA Ecolympics</span>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'none',
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-light)',
            }}
            className="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-category">Navigation</div>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (window.innerWidth <= 768 && onClose) {
                    onClose();
                  }
                }}
              >
                <Icon size={18} className="nav-icon" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-light)' }}>
            YUWA Sustainability Platform &copy; 2026
          </div>
        </div>
      </aside>
    </>
  );
};
