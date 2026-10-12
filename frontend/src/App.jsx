import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  Stethoscope, 
  Calendar, 
  ShieldCheck, 
  User, 
  LogOut, 
  Sparkles,
  CheckCircle2,
  Lock
} from 'lucide-react';
import DoctorsPage from './components/DoctorsPage';
import AppointmentsDirectory from './components/AppointmentsDirectory';
import DashboardPreview from './components/DashboardPreview';
import LoginCard from './components/LoginCard';
import { authService } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('doctors'); // 'doctors' | 'appointments' | 'staff'
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // Check saved session on app load
    const verifyExistingSession = async () => {
      const savedUser = authService.getSavedUser();
      const token = authService.getToken();

      if (token && savedUser) {
        try {
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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleLoginSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    showToast(`Welcome back, ${authenticatedUser.full_name || authenticatedUser.username}!`);
  };

  const handleLogout = () => {
    setUser(null);
    showToast('Signed out of staff portal.');
  };

  const handleAppointmentCreated = (newApt) => {
    showToast(`Appointment booked successfully for ${newApt.patient_name} with ${newApt.doctor}!`);
    setActiveTab('appointments');
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

  return (
    <div className="portal-root-wrapper">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="portal-toast-banner">
          <CheckCircle2 size={18} color="var(--emerald-accent)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Clinical Navigation Header */}
      <header className="global-nav-header">
        <div className="nav-brand-group">
          <div className="brand-logo-icon">
            <HeartPulse size={22} />
          </div>
          <div className="brand-titles">
            <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Medical Wizard</h1>
            <p style={{ fontSize: '0.68rem', margin: 0 }}>Clinical Appointment System</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="header-nav-tabs">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'doctors' ? 'active' : ''}`}
            onClick={() => setActiveTab('doctors')}
            id="tab-doctors"
          >
            <Stethoscope size={16} />
            <span>Find Doctors &amp; Book</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
            id="tab-appointments"
          >
            <Calendar size={16} />
            <span>Appointments Directory</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
            id="tab-staff"
          >
            {user ? <User size={16} /> : <Lock size={16} />}
            <span>
              {user 
                ? `${user.role === 'patient' ? 'Patient' : 'Staff'}: ${user.username}` 
                : 'Sign In / Portal'}
            </span>
          </button>
        </nav>

        {/* User Status / Quick Action */}
        <div className="header-user-status">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className={`role-pill ${user.role}`}>
                {user.role}
              </span>
              <button
                type="button"
                className="btn-logout"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                onClick={() => {
                  authService.logout();
                  handleLogout();
                }}
              >
                <LogOut size={13} />
                <span>Exit</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-cancel"
              style={{ fontSize: '0.78rem', padding: '6px 14px' }}
              onClick={() => setActiveTab('staff')}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="portal-main-container">
        {activeTab === 'doctors' && (
          <DoctorsPage currentUser={user} onAppointmentCreated={handleAppointmentCreated} />
        )}

        {activeTab === 'appointments' && (
          <AppointmentsDirectory currentUser={user} onNewBookingClick={() => setActiveTab('doctors')} />
        )}

        {activeTab === 'staff' && (
          user ? (
            <DashboardPreview user={user} onLogout={handleLogout} onNavigate={setActiveTab} />
          ) : (
            <div className="auth-page-wrapper" style={{ minHeight: 'calc(100vh - 75px)', padding: '20px 0' }}>
              <div className="auth-ambient-glow" />
              <div className="auth-container">
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
                      Patient &amp; Staff Access
                    </div>
                    <h2>Secure Medical <span>Appointments &amp; Practice</span></h2>
                    <p>
                      Patients can sign in to book consultations with specialists and review upcoming appointments. Clinical staff can manage schedules and doctor profiles.
                    </p>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                    Medical Wizard &bull; AI Engineering Assessment
                  </div>
                </div>

                <LoginCard onLoginSuccess={handleLoginSuccess} />
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
