import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Unauthorized } from './pages/auth/Unauthorized';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { EventsPage } from './pages/student/EventsPage';
import { EventDetailPage } from './pages/student/EventDetailPage';
import { ChallengesPage } from './pages/student/ChallengesPage';
import { ChallengeDetailPage } from './pages/student/ChallengeDetailPage';
import { MyTeam } from './pages/student/MyTeam';
import { SubmissionsPage } from './pages/student/SubmissionsPage';
import { NewSubmission } from './pages/student/NewSubmission';
import { CommunityPage } from './pages/student/CommunityPage';
import { NotificationsPage } from './pages/student/NotificationsPage';
import { ProfilePage } from './pages/student/ProfilePage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminColleges } from './pages/admin/AdminColleges';
import { AdminEvents } from './pages/admin/AdminEvents';
import { AdminEvaluators } from './pages/admin/AdminEvaluators';
import { AdminLeaderboard } from './pages/admin/AdminLeaderboard';

// Evaluator Pages
import { EvaluatorDashboard } from './pages/evaluator/EvaluatorDashboard';
import { EvaluationQueue } from './pages/evaluator/EvaluationQueue';

import { ToastProvider } from './context/ToastContext';

// Root redirector based on authenticated user role
const RootRedirect = () => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-icon" style={{ margin: '0 auto 16px', width: 48, height: 48 }}>🌱</div>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading YUWA Ecolympics...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (role === 'EVALUATOR') {
    return <Navigate to="/evaluator/dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Root Redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Protected Application Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Student Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <MyTeam />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team/:teamId"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <MyTeam />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-team"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <MyTeam />
                  </ProtectedRoute>
                }
              />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:eventId" element={<EventDetailPage />} />
              <Route path="/challenges" element={<ChallengesPage />} />
              <Route path="/challenges/:challengeId" element={<ChallengeDetailPage />} />
              <Route
                path="/submissions"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <SubmissionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submissions/new"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <NewSubmission />
                  </ProtectedRoute>
                }
              />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/colleges"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminColleges />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/evaluators"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminEvaluators />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/leaderboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminLeaderboard />
                </ProtectedRoute>
              }
            />

            {/* Evaluator Routes */}
            <Route
              path="/evaluator/dashboard"
              element={
                <ProtectedRoute allowedRoles={['EVALUATOR']}>
                  <EvaluatorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluator/queue"
              element={
                <ProtectedRoute allowedRoles={['EVALUATOR']}>
                  <EvaluationQueue />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
