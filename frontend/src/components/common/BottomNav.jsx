import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Award, Users, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const BottomNav = () => {
  const { role } = useAuth();

  // Only student role uses the mobile bottom navigation bar
  if (role !== 'STUDENT') return null;

  const links = [
    { to: '/dashboard', label: 'Home', icon: Home },
    { to: '/events', label: 'Events', icon: Calendar },
    { to: '/challenges', label: 'Missions', icon: Award },
    { to: '/team', label: 'Team', icon: Users },
    { to: '/submissions', label: 'Uploads', icon: Send },
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 35,
        padding: '0 8px',
      }}
    >
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '0.7rem',
              fontWeight: isActive ? 700 : 500,
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              transition: 'var(--transition)',
              textDecoration: 'none',
              minWidth: 56,
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{link.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};
