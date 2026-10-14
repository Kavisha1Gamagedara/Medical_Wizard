import React, { useState, useEffect, useCallback } from 'react';
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
  Users,
  UserPlus,
  Glasses,
  Zap,
  AlertTriangle
} from 'lucide-react';
import CityCareDashboard from './components/CityCareDashboard';
import DoctorsPage from './components/DoctorsPage';
import AppointmentsDirectory from './components/AppointmentsDirectory';
import PatientsDirectory from './components/PatientsDirectory';
import CreativeAuthPortal from './components/CreativeAuthPortal';
import StaffVerifyPatientModal from './components/StaffVerifyPatientModal';
import AdminRegisterUserModal from './components/AdminRegisterUserModal';
import UserProfileCardModal from './components/UserProfileCardModal';
import { authService, notificationApiService } from './services/api';
import citycareAvatar from './assets/citycare_avatar.jpg';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'dashboard' | 'patients' | 'appointments' | 'doctors' | 'analytics' | 'staff'
  const [activeSection, setActiveSection] = useState('home'); // 'home' | 'about' | 'faq'
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Elder Vision Accessibility Mode state (persisted in localStorage)
  const [elderVision, setElderVision] = useState(() => {
    try {
      return localStorage.getItem('medical_wizard_elder_vision') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Sync elder vision class to document for global stylesheet scaling
  useEffect(() => {
    try {
      if (elderVision) {
        document.documentElement.classList.add('elder-vision-mode');
        document.body.classList.add('elder-vision-mode');
        localStorage.setItem('medical_wizard_elder_vision', 'true');
      } else {
        document.documentElement.classList.remove('elder-vision-mode');
        document.body.classList.remove('elder-vision-mode');
        localStorage.setItem('medical_wizard_elder_vision', 'false');
      }
    } catch (e) {
      // ignore localStorage errors in sandboxed environments
    }
  }, [elderVision]);

  const toggleElderVision = () => {
    setElderVision((prev) => {
      const next = !prev;
      showToast(next
        ? '👓 Elder Vision Enabled: Font sizes, images, and contrast scaled for clear reading.'
        : '👓 Elder Vision Disabled: Standard view restored.'
      );
      return next;
    });
  };

  // Modals state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isAdminRegisterOpen, setIsAdminRegisterOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  // Notifications state — fetched from backend API
  const [showNotifications, setShowNotifications] = useState(false);
  const [apiNotifications, setApiNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const fetchNotificationsFromApi = useCallback(async () => {
    if (!user) {
      setApiNotifications([]);
      return;
    }
    try {
      setNotifLoading(true);
      const data = await notificationApiService.getNotifications();
      if (Array.isArray(data)) {
        setApiNotifications(data);
      }
    } catch (err) {
      // Silently fail — don't disrupt user session for a notification fetch error
      console.warn('Notification fetch error:', err);
    } finally {
      setNotifLoading(false);
    }
  }, [user]);

  // Fetch notifications on login and periodically every 45s
  useEffect(() => {
    fetchNotificationsFromApi();
    if (!user) return;
    const interval = setInterval(fetchNotificationsFromApi, 45000);
    return () => clearInterval(interval);
  }, [user, fetchNotificationsFromApi]);

  // Also refresh notifications when booking or cancellation events fire
  useEffect(() => {
    const handleRefresh = () => fetchNotificationsFromApi();
    window.addEventListener('mw_notification_created', handleRefresh);
    window.addEventListener('mw_appointment_cancelled', handleRefresh);
    return () => {
      window.removeEventListener('mw_notification_created', handleRefresh);
      window.removeEventListener('mw_appointment_cancelled', handleRefresh);
    };
  }, [fetchNotificationsFromApi]);

  const userNotifications = user ? apiNotifications.filter(n => n.patient_id === user.id) : [];
  const unreadCount = userNotifications.filter(n => !n.is_read).length;

  const markAllNotifsRead = async () => {
    if (!user) return;
    try {
      await notificationApiService.markAllRead();
      setApiNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn('Mark all read error:', err);
    }
  };


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

  // Seamless navigation handler that scrolls to page sections on Home
  const handleNavClick = (target) => {
    if (target === 'profile') {
      setShowProfileCard(true);
      return;
    }

    if (target === 'about' || target === 'faq') {
      const targetId = target === 'about' ? 'about-us' : 'faq';
      setActiveSection(target);
      if (activeTab !== 'home') {
        setActiveTab('home');
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 120);
      } else {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      setActiveTab(target);
      if (target === 'home') {
        setActiveSection('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setActiveSection('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  // Auto-scroll listener to highlight navbar pill as user scrolls through Home
  useEffect(() => {
    if (activeTab !== 'home') return;

    const handleScroll = () => {
      const aboutEl = document.getElementById('about-us');
      const faqEl = document.getElementById('faq');
      if (!aboutEl || !faqEl) return;

      const scrollPos = window.scrollY + 240;
      const faqTop = faqEl.offsetTop;
      const aboutTop = aboutEl.offsetTop;

      if (scrollPos >= faqTop) {
        setActiveSection('faq');
      } else if (scrollPos >= aboutTop) {
        setActiveSection('about');
      } else {
        setActiveSection('home');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  // Handle direct tab switches for 'about' or 'faq'
  useEffect(() => {
    if (activeTab === 'about') {
      handleNavClick('about');
    } else if (activeTab === 'faq') {
      handleNavClick('faq');
    }
  }, [activeTab]);

  // Guaranteed auto-dismiss for all toast messages after exactly 3 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg) => {
    setToastMessage(msg);
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
    setActiveSection('home');
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
      {/* Toast Notification Banner (Auto-dismisses in 3s or on click) */}
      {toastMessage && (
        <div
          className="portal-toast-banner"
          onClick={() => setToastMessage('')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          title="Click to dismiss"
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setToastMessage('');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0 0 0 6px',
              fontSize: '1.1rem',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. UNIFIED CITYCARE APPLICATION HEADER */}
      <header className="citycare-global-header">
        {/* Brand Group */}
        <div className="citycare-brand-group" onClick={() => handleNavClick('home')}>
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
            className={`citycare-pill-btn ${activeTab === 'home' && activeSection === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
            id="tab-home"
          >
            Home
          </button>

          {/* Dashboard button only visible after logged in */}
          {user && (
            <button
              type="button"
              className={`citycare-pill-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
              id="tab-dashboard"
            >
              Dashboard
            </button>
          )}

          {/* Patients button only visible to logged in staff and admin */}
          {user && (user.role === 'staff' || user.role === 'admin') && (
            <button
              type="button"
              className={`citycare-pill-btn ${activeTab === 'patients' ? 'active' : ''}`}
              onClick={() => handleNavClick('patients')}
              id="tab-patients"
            >
              Patients
            </button>
          )}

          {/* Appointments button visible to logged in staff, admin, and patients */}
          {user && (user.role === 'staff' || user.role === 'admin' || user.role === 'patient' || user.role === 'doctor') && (
            <button
              type="button"
              className={`citycare-pill-btn ${activeTab === 'appointments' ? 'active' : ''}`}
              onClick={() => handleNavClick('appointments')}
              id="tab-appointments"
            >
              Appointments
            </button>
          )}

          <button
            type="button"
            className={`citycare-pill-btn ${activeTab === 'doctors' ? 'active' : ''}`}
            onClick={() => handleNavClick('doctors')}
            id="tab-doctors"
          >
            Doctors
          </button>

          <button
            type="button"
            className={`citycare-pill-btn ${activeTab === 'home' && activeSection === 'about' ? 'active' : ''}`}
            onClick={() => handleNavClick('about')}
            id="tab-about"
          >
            About Us
          </button>

          <button
            type="button"
            className={`citycare-pill-btn ${activeTab === 'home' && activeSection === 'faq' ? 'active' : ''}`}
            onClick={() => handleNavClick('faq')}
            id="tab-faq"
          >
            FAQ
          </button>
        </nav>

        {/* Right Controls: Elder Vision Accessibility, Staff Quick Action, Notification Bell, Settings, Avatar */}
        <div className="citycare-nav-right">
          {/* Elder Vision Accessibility Toggle */}
          <button
            type="button"
            className={`citycare-elder-vision-toggle ${elderVision ? 'active' : ''}`}
            onClick={toggleElderVision}
            title={elderVision ? "Elder Vision is ACTIVE (Click to switch to standard view)" : "Turn ON Elder Vision (Large text, bigger images & high contrast)"}
            aria-label="Toggle Elder Vision accessibility mode"
            aria-pressed={elderVision}
            id="nav-elder-vision-toggle"
          >
            <Glasses size={17} className="elder-vision-icon" />
            <span className="elder-vision-text">Elder Vision</span>
            <span className={`elder-vision-switch-indicator ${elderVision ? 'on' : 'off'}`}>
              <span className="elder-vision-switch-knob" />
            </span>
          </button>

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
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 900,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="citycare-notifications-popover" style={{ width: '340px', padding: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '10px', 
                  borderBottom: '1px solid #f1f5f9', 
                  paddingBottom: '8px' 
                }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                    {user?.role === 'patient' ? 'My Consultation Alerts' : user?.role === 'doctor' ? 'Clinician Alerts' : 'Clinic Notifications'}
                    {unreadCount > 0 && (
                      <span style={{ 
                        marginLeft: '6px', 
                        fontSize: '0.72rem', 
                        background: '#e0f2fe', 
                        color: '#0284c7', 
                        padding: '2px 8px', 
                        borderRadius: '999px',
                        fontWeight: 700
                      }}>
                        {unreadCount} New
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotifsRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                {notifLoading && userNotifications.length === 0 ? (
                  <div style={{ padding: '18px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                    Loading notifications...
                  </div>
                ) : userNotifications.length === 0 ? (
                  <div style={{ padding: '18px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                    {user 
                      ? (user.role === 'patient' 
                          ? 'No notifications yet. Consultation reminders and waitlist slot alerts will appear here.'
                          : user.role === 'doctor'
                          ? 'No clinician alerts yet. Daily patient schedule updates and arrival notifications will appear here.'
                          : 'No clinic notifications yet.') 
                      : 'Sign in to see your notifications.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                    {userNotifications.slice(0, 12).map((notif) => {
                      const isSlotAlert = notif.title && (notif.title.includes('Slot Reclaimed') || notif.title.includes('\u26a1'));
                      const isWaitlistConfirm = notif.title && (notif.title.includes('Waitlist Confirmed') || notif.title.includes('\u2705'));
                      return (
                        <div
                          key={notif.id}
                          className="citycare-notif-item"
                          style={{
                            background: isSlotAlert
                              ? 'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(251,191,36,0.05))'
                              : isWaitlistConfirm
                              ? 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05))'
                              : notif.is_read ? '#f8fafc' : '#f0f9ff',
                            border: isSlotAlert
                              ? '1.5px solid rgba(245,158,11,0.4)'
                              : isWaitlistConfirm
                              ? '1px solid rgba(99,102,241,0.3)'
                              : notif.is_read ? '1px solid #e2e8f0' : '1px solid #bae6fd',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px'
                          }}
                        >
                          <span className={`dot ${notif.is_read ? 'success' : 'warning'}`} style={{ marginTop: '4px', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <strong style={{
                              fontSize: '0.82rem',
                              color: isSlotAlert ? '#92400e' : isWaitlistConfirm ? '#3730a3' : '#0f172a',
                              display: 'block',
                              lineHeight: 1.3
                            }}>
                              {notif.title}
                            </strong>
                            <p style={{ fontSize: '0.76rem', color: '#475569', margin: '3px 0 4px', lineHeight: 1.35 }}>
                              {notif.message}
                            </p>
                            {isSlotAlert && user?.role === 'patient' && (
                              <button
                                type="button"
                                onClick={() => { setShowNotifications(false); handleNavClick('appointments'); }}
                                style={{
                                  background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  marginTop: '4px',
                                  marginBottom: '2px',
                                  display: 'inline-block',
                                  boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                                }}
                              >
                                \u26a1 Book Now \u2192
                              </button>
                            )}
                            <small style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block', marginTop: '3px' }}>
                              {notif.created_at
                                ? new Date(notif.created_at + 'Z').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                : ''}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

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
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowProfileCard(true);
                    }}
                    id="btn-user-dropdown-profile"
                  >
                    <User size={14} color="#0284c7" />
                    <span>Profile</span>
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
              onClick={() => handleNavClick('staff')}
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
            currentUser={user}
            isHomeView={true}
            onNavigate={handleNavClick}
          />
        )}

        {/* DASHBOARD TAB (ROLE-BASED & ONLY ACCESSIBLE WHEN LOGGED IN) */}
        {activeTab === 'dashboard' && (
          user ? (
            <CityCareDashboard
              currentUser={user}
              onNavigate={handleNavClick}
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
          user && (user.role === 'staff' || user.role === 'admin') ? (
            <PatientsDirectory
              currentUser={user}
              onNavigate={handleNavClick}
            />
          ) : (
            <div className="citycare-outer-frame" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ maxWidth: '480px', margin: '0 auto' }}>
                <div className="mini-icon-circle blue" style={{ width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px auto' }}>
                  <Stethoscope size={28} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Patient Records Require Staff Authentication
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '24px' }}>
                  Access to the complete patient records directory is strictly reserved for authorized clinical staff and practice administrators.
                </p>
                <button
                  type="button"
                  className="btn-guest-primary"
                  style={{ margin: '0 auto' }}
                  onClick={() => handleNavClick(user ? (user.role === 'patient' ? 'appointments' : 'dashboard') : 'staff')}
                >
                  <User size={15} />
                  <span>{user ? (user.role === 'patient' ? 'View My Appointments' : 'Go to Dashboard') : 'Sign In to Your Account'}</span>
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
              onNewBookingClick={() => handleNavClick('doctors')}
              onNavigate={handleNavClick}
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
                    onClick={() => handleNavClick('staff')}
                  >
                    <User size={15} />
                    <span>Sign In / Register</span>
                  </button>
                  <button
                    type="button"
                    className="action-pill-btn"
                    onClick={() => handleNavClick('doctors')}
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
            onNavigate={handleNavClick}
          />
        )}


        {/* GUEST AUTH PORTAL / LOGGED IN DASHBOARD */}
        {activeTab === 'staff' && (
          user ? (
            <CityCareDashboard
              currentUser={user}
              onNavigate={handleNavClick}
            />
          ) : (
            <CreativeAuthPortal
              onLoginSuccess={handleLoginSuccess}
              onNavigate={handleNavClick}
            />
          )
        )}
      </main>

      {/* 3. MODALS */}
      {/* User Profile Card Modal */}
      {showProfileCard && user && (
        <UserProfileCardModal
          user={user}
          isOpen={showProfileCard}
          onClose={() => setShowProfileCard(false)}
          onProfileUpdated={(updatedUser) => {
            setUser(updatedUser);
            showToast('Profile updated successfully!');
          }}
          onLogout={() => {
            setShowProfileCard(false);
            authService.logout();
            handleLogout();
          }}
        />
      )}

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
