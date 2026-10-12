import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  CalendarCheck, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Activity,
  Stethoscope
} from 'lucide-react';
import LoginCard from './components/LoginCard';
import DashboardPreview from './components/DashboardPreview';
import { authService } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check saved session on app load
    const verifyExistingSession = async () => {
      const savedUser = authService.getSavedUser();
      const token = authService.getToken();

      if (token && savedUser) {
        try {
          // Verify with backend /api/v1/auth/me
          const verifiedUser = await authService.getCurrentUser();
          setUser(verifiedUser);
        } catch (err) {
          console.warn('Session verification failed, resetting token:', err);
          authService.logout();
          setUser(null);
        }
      }
      setCheckingAuth(false);
    };

    verifyExistingSession();
  }, []);

  const handleLoginSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <div className="auth-page-wrapper" style={{ flexDirection: 'column', gap: '16px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Initializing Medical Wizard Portal...
        </div>
      </div>
    );
  }

  // If user is authenticated, render the dashboard
  if (user) {
    return <DashboardPreview user={user} onLogout={handleLogout} />;
  }

  // Otherwise, render the Login / Auth page
  return (
    <div className="auth-page-wrapper">
      <div className="auth-ambient-glow" />

      <div className="auth-container">
        {/* Left Column: Brand & Product Showcase */}
        <div className="brand-showcase">
          <div className="brand-header">
            <div className="brand-logo-icon">
              <HeartPulse size={26} />
            </div>
            <div className="brand-titles">
              <h1>Medical Wizard</h1>
              <p>Practice Intelligence</p>
            </div>
          </div>

          <div className="brand-hero-content">
            <div className="badge-tag">
              <Sparkles size={13} />
              AI Engineering Assessment Portal
            </div>

            <h2>
              Precision Scheduling for <span>Modern Healthcare</span>.
            </h2>
            <p>
              A robust clinical appointment management platform engineered for medical practices, doctors, and healthcare administrators.
            </p>

            <div className="feature-bullets">
              <div className="feature-bullet-item">
                <div className="bullet-icon">
                  <Check size={14} />
                </div>
                <span>
                  <strong>Full Appointment Lifecycle:</strong> Create, view, edit, and cancel appointments with ease.
                </span>
              </div>

              <div className="feature-bullet-item">
                <div className="bullet-icon">
                  <Check size={14} />
                </div>
                <span>
                  <strong>Instant Search & Filter:</strong> Query appointments dynamically by patient, doctor, status, and dates.
                </span>
              </div>

              <div className="feature-bullet-item">
                <div className="bullet-icon">
                  <Check size={14} />
                </div>
                <span>
                  <strong>Secure Role Access:</strong> Token-based authentication with role permissions for Admins, Doctors, and Staff.
                </span>
              </div>
            </div>
          </div>

          <div style={{ 
            fontSize: '0.78rem', 
            color: 'var(--text-muted)', 
            borderTop: '1px solid var(--border-subtle)', 
            paddingTop: '16px' 
          }}>
            Medical Wizard Assessment &bull; Developed by Kavisha Gamagedara
          </div>
        </div>

        {/* Right Column: Interactive Login / Register Form */}
        <LoginCard onLoginSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
}
