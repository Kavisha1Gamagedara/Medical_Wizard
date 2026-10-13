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
  Lock,
  Activity,
  QrCode,
  Bell,
  Settings,
  Users,
  UserPlus
} from 'lucide-react';
import CityCareDashboard from './components/CityCareDashboard';
import DoctorsPage from './components/DoctorsPage';
import AppointmentsDirectory from './components/AppointmentsDirectory';
import PatientsDirectory from './components/PatientsDirectory';
import DashboardPreview from './components/DashboardPreview';
import LoginCard from './components/LoginCard';
import StaffVerifyPatientModal from './components/StaffVerifyPatientModal';
import AdminRegisterUserModal from './components/AdminRegisterUserModal';
import { authService } from './services/api';
import citycareAvatar from './assets/citycare_avatar.jpg';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'dashboard' | 'patients' | 'appointments' | 'doctors' | 'analytics' | 'staff'
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isAdminRegisterOpen, setIsAdminRegisterOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setShowProfileMenu(false);
    setActiveTab('home');
    showToast('Signed out successfully.');
  };

  const handleAppointmentCreated = (newApt) => {
    showToast(`Appointment booked successfully for ${newApt.patient_name} with ${newApt.doctor}!`);
    setActiveTab('appointments');
  };

  if (checkingAuth) {
    return (
      <div className="citycare-loading-screen">
        <div className="spinner" style={{ width: '36px', height: '36px', borderWidth: '3px' }} />
        <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
          Initializing CityCare &bull; Medical Wizard Platform...
        </div>
      </div>
    );
  }

  return (
    <div className="citycare-app-root">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="portal-toast-banner">
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. UNIFIED CITYCARE APPLICATION HEADER */}
      <header className="citycare-global-header">
        {/* Brand Group */}
        <div className="citycare-brand-group" onClick={() => setActiveTab('home')}>
          <div className="citycare-brand-logo-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
              <path d="M12 7V17M7 12H17" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <span className="citycare-brand-title">CityCare</span>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Medical Wizard
            </div>
          </div>
        </div>

        {/* Center Pill Menu Tabs */}
        <nav className="citycare-pill-menu">
          <button 
            type="button" 
            className={`citycare-pill-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
            id="tab-home"
          >
            Home
          </button>

          {/* Dashboard button only visible after logged in */}
          {user && (
            <button 
              type="button" 
              className={`citycare-pill-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              id="tab-dashboard"
            >
              Dashboard
            </button>
          )}

          <button 
            type="button" 
            className={`citycare-pill-btn ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
            id="tab-patients"
          >
            Patients
          </button>
          <button 
            type="button" 
            className={`citycare-pill-btn ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
            id="tab-appointments"
          >
            Appointments
          </button>
          <button 
            type="button" 
            className={`citycare-pill-btn ${activeTab === 'doctors' ? 'active' : ''}`}
            onClick={() => setActiveTab('doctors')}
            id="tab-doctors"
          >
            Doctors
          </button>
        </nav>

        {/* Right Controls: Staff Quick Action, Notification Bell, Settings, Avatar */}
        <div className="citycare-nav-right">
          {user && (user.role === 'staff' || user.role === 'admin') && (
            <button
              type="button"
              className="citycare-pill-btn active"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                background: '#0f172a',
                color: '#fff'
              }}
              onClick={() => setIsVerifyModalOpen(true)}
              title="Verify Patient Arrival Code"
            >
              <QrCode size={14} color="#38bdf8" />
              <span>Verify Pass</span>
            </button>
          )}

          {/* Notifications Button */}
          <div style={{ position: 'relative' }}>
            <button 
              type="button" 
              className="citycare-icon-btn" 
              title="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={18} color="#334155" />
              <span className="citycare-badge-dot" />
            </button>

            {showNotifications && (
              <div className="citycare-notifications-popover">
                <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  Clinical Alerts (3)
                </div>
                <div className="citycare-notif-item">
                  <span className="dot danger" />
                  <div>
                    <strong>ICU Beds Below 10%</strong>
                    <small>Emergency ward telemetry &bull; 5m ago</small>
                  </div>
                </div>
                <div className="citycare-notif-item">
                  <span className="dot warning" />
                  <div>
                    <strong>Ventilator Maintenance Due</strong>
                    <small>Unit B-12 calibration &bull; 15m ago</small>
                  </div>
                </div>
                <div className="citycare-notif-item">
                  <span className="dot success" />
                  <div>
                    <strong>Patient Check-In Verified</strong>
                    <small>Dr. Emily Jones consultation &bull; 22m ago</small>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Settings Button */}
          <button 
            type="button" 
            className="citycare-icon-btn" 
            title="System & Account Settings"
            onClick={() => {
              if (user?.role === 'admin') setIsAdminRegisterOpen(true);
              else if (user?.role === 'staff') setIsVerifyModalOpen(true);
              else setActiveTab('staff');
            }}
          >
            <Settings size={18} color="#334155" />
          </button>

          {/* User Profile Area: Sign In / Register button when logged out, Initials Badge when logged in */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <div 
                className="citycare-user-badge-wrap"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                title={`${user.full_name || user.username} (${user.role})`}
              >
                <div className={`citycare-user-avatar-initials ${user.role}`}>
                  {(user.full_name || user.username).slice(0, 2).toUpperCase()}
                </div>
                <div className="citycare-user-nav-info">
                  <span className="user-nav-name">{user.full_name?.split(' ')[0] || user.username}</span>
                  <span className={`user-nav-role-pill ${user.role}`}>{user.role}</span>
                </div>
              </div>

              {showProfileMenu && (
                <div className="citycare-profile-dropdown">
                  <div className="citycare-dropdown-header">
                    <strong>{user.full_name || user.username}</strong>
                    <span className="citycare-dropdown-role">{user.role}</span>
                    <small style={{ color: '#64748b' }}>{user.email}</small>
                  </div>

                  {(user.role === 'staff' || user.role === 'admin') && (
                    <button 
                      type="button" 
                      className="citycare-dropdown-item"
                      onClick={() => { setShowProfileMenu(false); setIsVerifyModalOpen(true); }}
                    >
                      <ShieldCheck size={14} color="#0284c7" />
                      <span>Verify Patient Check-In</span>
                    </button>
                  )}

                  {user.role === 'admin' && (
                    <button 
                      type="button" 
                      className="citycare-dropdown-item"
                      onClick={() => { setShowProfileMenu(false); setIsAdminRegisterOpen(true); }}
                    >
                      <UserPlus size={14} color="#10b981" />
                      <span>Register Doctor / Staff</span>
                    </button>
                  )}

                  <button 
                    type="button" 
                    className="citycare-dropdown-item"
                    onClick={() => { setShowProfileMenu(false); setActiveTab('staff'); }}
                  >
                    <Activity size={14} />
                    <span>Account Portal</span>
                  </button>

                  <button 
                    type="button" 
                    className="citycare-dropdown-item danger"
                    onClick={() => {
                      authService.logout();
                      handleLogout();
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              type="button" 
              className="citycare-nav-signin-btn"
              onClick={() => setActiveTab('staff')}
              id="btn-nav-signin-register"
            >
              <User size={15} />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN APPLICATION CONTENT AREA (UNIFIED CANVAS) */}
      <main className="citycare-main-viewport">
        {/* HOME TAB (PUBLIC CLINICAL PORTAL) */}
        {activeTab === 'home' && (
          <CityCareDashboard 
            currentUser={null}
            onNavigate={setActiveTab}
          />
        )}

        {/* DASHBOARD TAB (ROLE-BASED & ONLY ACCESSIBLE WHEN LOGGED IN) */}
        {activeTab === 'dashboard' && (
          user ? (
            <CityCareDashboard 
              currentUser={user}
              onNavigate={setActiveTab}
            />
          ) : (
            <div className="citycare-outer-frame" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                <div className="mini-icon-circle blue" style={{ width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px auto' }}>
                  <ShieldCheck size={28} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Dashboard Requires Sign In
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '24px' }}>
                  Please sign in to access your role-based patient, clinician, front-desk, or administrative dashboard.
                </p>
                <button
                  type="button"
                  className="btn-guest-primary"
                  style={{ margin: '0 auto' }}
                  onClick={() => setActiveTab('staff')}
                >
                  <User size={15} />
                  <span>Sign In / Register</span>
                </button>
              </div>
            </div>
          )
        )}

        {/* PATIENTS TAB */}
        {activeTab === 'patients' && (
          user ? (
            <PatientsDirectory 
              currentUser={user}
              onNavigate={setActiveTab}
            />
          ) : (
            <div className="citycare-outer-frame" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                <div className="mini-icon-circle blue" style={{ width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px auto' }}>
                  <Stethoscope size={28} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Patient Records Require Authentication
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '24px' }}>
                  Please sign in with a registered clinician, front-desk staff, or practice administrator account to access confidential patient records.
                </p>
                <button
                  type="button"
                  className="btn-guest-primary"
                  style={{ margin: '0 auto' }}
                  onClick={() => setActiveTab('staff')}
                >
                  <User size={15} />
                  <span>Sign In to Your Account</span>
                </button>
              </div>
            </div>
          )
        )}

        {/* APPOINTMENTS TAB */}
        {activeTab === 'appointments' && (
          user ? (
            <AppointmentsDirectory 
              currentUser={user} 
              onNewBookingClick={() => setActiveTab('doctors')} 
              onNavigate={setActiveTab}
            />
          ) : (
            <div className="citycare-outer-frame" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                <div className="mini-icon-circle blue" style={{ width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px auto' }}>
                  <Calendar size={28} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Sign In to Manage Appointments
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '24px' }}>
                  Sign in to view your scheduled consultations, track clinical status, and access printable arrival QR passes.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-guest-primary"
                    onClick={() => setActiveTab('staff')}
                  >
                    <User size={15} />
                    <span>Sign In / Register</span>
                  </button>
                  <button
                    type="button"
                    className="action-pill-btn"
                    onClick={() => setActiveTab('doctors')}
                  >
                    <Calendar size={15} />
                    <span>Browse Doctors</span>
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* DOCTORS TAB */}
        {activeTab === 'doctors' && (
          <DoctorsPage 
            currentUser={user} 
            onAppointmentCreated={handleAppointmentCreated} 
            onNavigate={setActiveTab} 
          />
        )}


        {/* STAFF & ACCOUNT PORTAL / LOGIN */}
        {activeTab === 'staff' && (
          user ? (
            <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 20px' }}>
              <DashboardPreview user={user} onLogout={handleLogout} onNavigate={setActiveTab} />
            </div>
          ) : (
            <div className="citycare-auth-wrapper">
              <div className="citycare-auth-card">
                <div className="citycare-auth-brand">
                  <div className="citycare-brand-logo-mark" style={{ width: '44px', height: '44px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                      <path d="M12 7V17M7 12H17" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>CityCare Access Portal</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Patients &bull; Clinicians &bull; Hospital Administration</p>
                  </div>
                </div>

                <LoginCard onLoginSuccess={handleLoginSuccess} />
              </div>
            </div>
          )
        )}
      </main>

      {/* 3. MODALS */}
      {/* Front-Desk Verification & Check-In Modal */}
      {isVerifyModalOpen && (
        <StaffVerifyPatientModal 
          isOpen={isVerifyModalOpen}
          currentUser={user}
          onClose={() => setIsVerifyModalOpen(false)}
          onCheckInSuccess={(apt) => {
            showToast(`Patient ${apt.patient_name} verified and checked in!`);
          }}
        />
      )}

      {/* Admin User Provisioning Modal */}
      {isAdminRegisterOpen && (
        <AdminRegisterUserModal
          isOpen={isAdminRegisterOpen}
          onClose={() => setIsAdminRegisterOpen(false)}
          onUserRegistered={(newUser) => {
            showToast(`Registered new ${newUser.role}: ${newUser.username}!`);
          }}
        />
      )}
    </div>
  );
}
