import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Settings, 
  MoreHorizontal, 
  ChevronUp, 
  ChevronDown, 
  Paperclip, 
  ArrowRight,
  Activity,
  Users,
  Calendar,
  Clock,
  Sparkles,
  Stethoscope,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertCircle,
  UserPlus,
  BarChart3,
  TrendingUp,
  UserCheck,
  Award,
  Layers,
  QrCode,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  User,
  Lock
} from 'lucide-react';
import { appointmentService, doctorService, userService, authService } from '../services/api';
import citycareHeroBg from '../assets/citycare_hero_bg.jpg';
import AdminUsersManager from './AdminUsersManager';
import AboutUsSection from './AboutUsSection';
import FAQSection from './FAQSection';
import LandingFooter from './LandingFooter';
import AppointmentsDirectory from './AppointmentsDirectory';
import PatientsDirectory from './PatientsDirectory';
import AdminRegisterUserModal from './AdminRegisterUserModal';
import StaffVerifyPatientModal from './StaffVerifyPatientModal';

export default function CityCareDashboard({ currentUser, onNavigate, onOpenLogin, onOpenVerifyCheckIn }) {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'system';
  const isDoctor = currentUser?.role === 'doctor';
  const isStaff = currentUser?.role === 'staff';
  const isPatient = currentUser?.role === 'patient';
  const isGuest = !currentUser;

  // Navigation / View states
  const [adminSection, setAdminSection] = useState('overview'); // 'overview' | 'users' | 'appointments' | 'patients'
  const [chartViewMode, setChartViewMode] = useState('weekly'); // 'weekly' | 'status'
  const [hoveredDay, setHoveredDay] = useState('Tue');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [loadingRealData, setLoadingRealData] = useState(false);

  // Real data state collections
  const [adminSummary, setAdminSummary] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);

  // Live Metric Counts
  const [stats, setStats] = useState({
    totalPatients: 5,
    totalUsers: 7,
    dutyDoctors: 4,
    appointmentsCount: 6,
    scheduledCount: 4,
    checkedInCount: 1,
    completedCount: 1,
    cancelledCount: 0,
    userBreakdown: {
      patients: 1,
      doctors: 4,
      staff: 1,
      admins: 1,
    },
    specialties: {
      Neurosurgeon: 1,
      Dentist: 1,
      Cardiologist: 1,
      Pediatrician: 1,
    },
    weekdayTrend: {
      Sun: 1,
      Mon: 0,
      Tue: 2,
      Wed: 2,
      Thu: 1,
      Fri: 0,
      Sat: 0,
    }
  });

  const loadRealData = async () => {
    setLoadingRealData(true);
    try {
      const [summaryRes, aptsRes, docsRes] = await Promise.allSettled([
        userService.getAdminSummary(),
        appointmentService.getAppointments(),
        doctorService.getAllDoctors()
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        const sum = summaryRes.value;
        setAdminSummary(sum);
        setStats(prev => ({
          ...prev,
          totalUsers: sum.user_counts?.total ?? prev.totalUsers,
          totalPatients: sum.total_patients ?? prev.totalPatients,
          dutyDoctors: sum.doctors_count ?? prev.dutyDoctors,
          appointmentsCount: sum.booking_counts?.total ?? prev.appointmentsCount,
          scheduledCount: sum.booking_counts?.scheduled ?? prev.scheduledCount,
          checkedInCount: sum.booking_counts?.checked_in ?? prev.checkedInCount,
          completedCount: sum.booking_counts?.completed ?? prev.completedCount,
          cancelledCount: sum.booking_counts?.cancelled ?? prev.cancelledCount,
          userBreakdown: sum.user_counts || prev.userBreakdown,
          specialties: sum.specialties || prev.specialties,
          weekdayTrend: sum.weekday_trend || prev.weekdayTrend,
        }));
      }

      if (aptsRes.status === 'fulfilled' && Array.isArray(aptsRes.value)) {
        setRecentAppointments(aptsRes.value.slice(0, 5));
        if (summaryRes.status !== 'fulfilled') {
          const allApts = aptsRes.value;
          setStats(prev => ({
            ...prev,
            appointmentsCount: allApts.length,
            scheduledCount: allApts.filter(a => a.status === 'Scheduled').length,
            checkedInCount: allApts.filter(a => a.status === 'Checked In' || a.is_verified).length,
            completedCount: allApts.filter(a => a.status === 'Completed').length,
            cancelledCount: allApts.filter(a => a.status === 'Cancelled').length,
          }));
        }
      }

      if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value)) {
        setDoctorsList(docsRes.value);
        if (summaryRes.status !== 'fulfilled') {
          setStats(prev => ({
            ...prev,
            dutyDoctors: docsRes.value.length,
          }));
        }
      }
    } catch (err) {
      console.warn('Real data sync notice:', err);
    } finally {
      setLoadingRealData(false);
    }
  };

  useEffect(() => {
    loadRealData();
  }, [currentUser]);

  // Dynamic calculations for Weekday Volume Area Curve
  const getDynamicTrendPoints = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const xCoords = [30, 85, 140, 195, 250, 305, 360];
    const trendSource = adminSummary?.weekday_trend || stats.weekdayTrend;

    const maxVal = Math.max(...days.map(d => trendSource[d] || 0), 4);

    return days.map((day, idx) => {
      const rawVal = trendSource[day] !== undefined ? trendSource[day] : 0;
      const ratio = rawVal / (maxVal || 1);
      const yVal = Math.round(175 - (ratio * 125));

      return {
        day,
        value: rawVal,
        coordX: xCoords[idx],
        coordY: yVal,
      };
    });
  };

  const trendPoints = getDynamicTrendPoints();
  const currentHoverPoint = trendPoints.find(d => d.day === hoveredDay) || trendPoints[2];

  // SVG Spline path computation
  const svgPathD = trendPoints.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.coordX} ${pt.coordY}`;
    const prev = arr[i - 1];
    const cpX1 = prev.coordX + (pt.coordX - prev.coordX) / 2;
    const cpY1 = prev.coordY;
    const cpX2 = prev.coordX + (pt.coordX - prev.coordX) / 2;
    const cpY2 = pt.coordY;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.coordX} ${pt.coordY}`;
  }, '');

  const svgAreaD = `${svgPathD} L ${trendPoints[trendPoints.length - 1].coordX} 185 L ${trendPoints[0].coordX} 185 Z`;

  // Dynamic Donut Calculations for User Breakdown
  const totalUsersCount = stats.totalUsers || 1;
  const patientsCount = stats.userBreakdown.patients || 0;
  const doctorsCount = stats.userBreakdown.doctors || 0;
  const staffCount = stats.userBreakdown.staff || 0;
  const adminsCount = stats.userBreakdown.admins || 0;

  const pctPatients = Math.round((patientsCount / totalUsersCount) * 100);
  const pctDoctors = Math.round((doctorsCount / totalUsersCount) * 100);
  const pctStaff = Math.round((staffCount / totalUsersCount) * 100);
  const pctAdmins = Math.max(1, 100 - pctPatients - pctDoctors - pctStaff);

  const circumference = 238.76;
  const strokePatients = (pctPatients / 100) * circumference;
  const strokeDoctors = (pctDoctors / 100) * circumference;
  const strokeStaff = (pctStaff / 100) * circumference;
  const strokeAdmins = (pctAdmins / 100) * circumference;

  const offsetPatients = 0;
  const offsetDoctors = -strokePatients;
  const offsetStaff = -(strokePatients + strokeDoctors);
  const offsetAdmins = -(strokePatients + strokeDoctors + strokeStaff);

  // Dynamic Calculations for Booking Telemetry
  const totalApts = stats.appointmentsCount || 1;
  const schedPct = Math.round((stats.scheduledCount / totalApts) * 100);
  const checkPct = Math.round((stats.checkedInCount / totalApts) * 100);
  const compPct = Math.round((stats.completedCount / totalApts) * 100);
  const cancPct = Math.round((stats.cancelledCount / totalApts) * 100);

  const checkinVerificationRate = Math.round(((stats.checkedInCount + stats.completedCount) / totalApts) * 100);

  // =========================================================================
  // RBAC VIEW 1: GUEST / SIGNED OUT (NO AUTHENTICATION)
  // =========================================================================
  if (isGuest) {
    return (
      <div className="citycare-outer-frame" id="home-landing-view">
        {/* Guest Public Welcome Header Card */}
        <div className="citycare-guest-hero-card" id="home-hero">
          <div className="citycare-hero-bg-art">
            <img src={citycareHeroBg} alt="Clinical Architecture" />
          </div>

          <div className="guest-hero-content">
            <div className="guest-badge-pill">
              <Sparkles size={14} color="#0284c7" />
              <span>CityCare Medical Wizard &bull; Clinical Healthcare Portal</span>
            </div>

            <h1 className="guest-hero-title">
              Specialist Medical Consultations &amp; Fast Arrival Check-In
            </h1>
            <p className="guest-hero-sub">
              Book specialist consultations across Cardiology, Neurology, Dentistry, and Pediatrics. Every confirmed appointment includes an instant digital arrival verification pass for seamless hospital check-in.
            </p>

            <div className="guest-cta-row">
              <button
                type="button"
                className="btn-guest-primary"
                onClick={() => onNavigate && onNavigate('staff')}
                id="btn-guest-signin"
              >
                <User size={16} />
                <span>Sign In / Patient Registration</span>
              </button>

              <button
                type="button"
                className="btn-guest-secondary"
                onClick={() => onNavigate && onNavigate('doctors')}
                id="btn-guest-browse-doctors"
              >
                <Calendar size={16} />
                <span>Browse Specialists &amp; Book</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Pillars of Care */}
        <div className="citycare-guest-pillars-grid">
          <div className="guest-pillar-card">
            <div className="pillar-icon-box blue"><Stethoscope size={22} /></div>
            <h3>Specialist Clinicians</h3>
            <p>Direct appointments with consultant neurosurgeons, dental surgeons, interventional cardiologists, and pediatricians.</p>
            <button type="button" className="pillar-link-btn" onClick={() => onNavigate && onNavigate('doctors')}>
              Browse Specialists &rarr;
            </button>
          </div>

          <div className="guest-pillar-card">
            <div className="pillar-icon-box teal"><QrCode size={22} /></div>
            <h3>Digital Arrival QR Pass</h3>
            <p>Every confirmed booking generates a unique verification code and printable QR pass for express front-desk check-in.</p>
            <button type="button" className="pillar-link-btn" onClick={() => onNavigate && onNavigate('staff')}>
              Access Pass Portal &rarr;
            </button>
          </div>

          <div className="guest-pillar-card">
            <div className="pillar-icon-box purple"><ShieldCheck size={22} /></div>
            <h3>Secure Patient Portal</h3>
            <p>Patients manage scheduled consultations, review doctor availability slots, and download official clinical receipts.</p>
            <button type="button" className="pillar-link-btn" onClick={() => onNavigate && onNavigate('staff')}>
              Sign In to Portal &rarr;
            </button>
          </div>
        </div>

        {/* Clinical Specialties Showcase */}
        <div className="guest-specialties-banner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Clinical Specialists on Duty</h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Consultants currently accepting appointments at CityCare Medical Wizard</p>
            </div>
            <button 
              type="button" 
              className="citycare-pill-btn active"
              onClick={() => onNavigate && onNavigate('doctors')}
            >
              View Full Doctor Directory &rarr;
            </button>
          </div>

          <div className="guest-specialties-grid">
            {doctorsList.slice(0, 4).map(doc => (
              <div key={doc.id} className="guest-doc-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="guest-doc-avatar">🩺</div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>{doc.full_name || doc.username}</strong>
                    <span className="guest-doc-spec">{doc.specialization || 'General Practitioner'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-book-slot-small"
                  onClick={() => onNavigate && onNavigate('doctors')}
                >
                  Book Consultation
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* About Us Section */}
        <AboutUsSection onNavigate={onNavigate} />

        {/* Frequently Asked Questions (FAQ) Section */}
        <FAQSection onNavigate={onNavigate} />

        {/* Global Hospital Landing Footer */}
        <LandingFooter onNavigate={onNavigate} />
      </div>
    );
  }

  // =========================================================================
  // RBAC VIEW 2: PATIENT PORTAL
  // =========================================================================
  if (isPatient) {
    return (
      <div className="citycare-outer-frame">
        <div className="patient-portal-header-card">
          <div>
            <div className="guest-badge-pill" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
              <UserCheck size={14} />
              <span>Registered Patient Portal</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px 0' }}>
              Hello, {currentUser.full_name || currentUser.username}!
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
              Manage your healthcare consultations, digital arrival QR passes, and specialist appointments.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-guest-primary"
              onClick={() => onNavigate && onNavigate('doctors')}
            >
              <Calendar size={15} />
              <span>+ Book an Appointment</span>
            </button>
            <button
              type="button"
              className="action-pill-btn"
              onClick={() => onNavigate && onNavigate('appointments')}
            >
              <ExternalLink size={14} />
              <span>My Appointments Directory</span>
            </button>
          </div>
        </div>

        <div style={{ padding: '24px 32px' }}>
          <AppointmentsDirectory 
            currentUser={currentUser}
            onNewBookingClick={() => onNavigate && onNavigate('doctors')}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    );
  }

  // =========================================================================
  // RBAC VIEW 3: DOCTOR CLINICAL PORTAL
  // =========================================================================
  if (isDoctor) {
    return (
      <div className="citycare-outer-frame">
        <div className="patient-portal-header-card">
          <div>
            <div className="guest-badge-pill" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed' }}>
              <Stethoscope size={14} />
              <span>Clinician Clinical Portal</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px 0' }}>
              Welcome, Dr. {currentUser.full_name?.replace(/^Dr\.?\s*/i, '') || currentUser.username}!
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
              Specialization: <strong>{currentUser.specialization || 'Clinical Specialist'}</strong> &bull; Practice Consultations &bull; Daily Schedule
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="action-pill-btn highlight"
              onClick={() => onNavigate && onNavigate('doctors')}
            >
              <Clock size={14} />
              <span>Configure My Schedule / Working Hours</span>
            </button>
          </div>
        </div>

        <div style={{ padding: '24px 32px' }}>
          <AppointmentsDirectory 
            currentUser={currentUser}
            onNewBookingClick={() => {}} // Disabled for doctors as requested
            onNavigate={onNavigate}
          />
        </div>
      </div>
    );
  }

  // =========================================================================
  // RBAC VIEW 4: STAFF FRONT-DESK RECEPTION PORTAL
  // =========================================================================
  if (isStaff) {
    return (
      <div className="citycare-outer-frame">
        <div className="patient-portal-header-card">
          <div>
            <div className="guest-badge-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
              <ShieldCheck size={14} />
              <span>Practice Front-Desk Reception</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px 0' }}>
              Hello, {currentUser.full_name || currentUser.username}!
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
              Patient Arrival Verification &bull; Practice Appointment Schedule &bull; Digital QR Passes
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-guest-primary"
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
              onClick={() => setIsVerifyModalOpen(true)}
            >
              <QrCode size={15} />
              <span>Verify Arriving Patient Pass</span>
            </button>
          </div>
        </div>

        <div style={{ padding: '24px 32px' }}>
          <AppointmentsDirectory 
            currentUser={currentUser}
            onNewBookingClick={() => onNavigate && onNavigate('doctors')}
            onNavigate={onNavigate}
          />
        </div>

        {isVerifyModalOpen && (
          <StaffVerifyPatientModal
            isOpen={isVerifyModalOpen}
            currentUser={currentUser}
            onClose={() => setIsVerifyModalOpen(false)}
            onCheckInSuccess={() => loadRealData()}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // RBAC VIEW 5: ADMINISTRATOR CLINICAL COMMAND CENTER (ADMIN ONLY)
  // =========================================================================
  const greetingName = currentUser?.full_name?.split(' ')[0] || currentUser?.username || 'Administrator';

  return (
    <div className="citycare-outer-frame">
      {/* ADMINISTRATOR COMMAND BAR & NAVIGATION */}
      <div className="citycare-admin-command-bar">
        <div className="citycare-admin-badge-group">
          <div className="citycare-admin-shield-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className="citycare-admin-title">
                Administrator Clinical Command Center
              </span>
              <span className="citycare-admin-live-tag">
                <span className="live-dot" /> Live DB Synchronized
              </span>
              <button
                type="button"
                onClick={loadRealData}
                className="citycare-refresh-btn"
                title="Reload latest database records"
                disabled={loadingRealData}
              >
                <RefreshCw size={13} className={loadingRealData ? 'spinning-icon' : ''} />
                <span>{loadingRealData ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
            <p className="citycare-admin-sub">
              Live practice telemetry: {stats.totalUsers} registered users, {stats.appointmentsCount} bookings, {stats.dutyDoctors} active doctors across {Object.keys(stats.specialties).length} specialties.
            </p>
          </div>
        </div>

        {/* Section Switcher Tabs */}
        <div className="citycare-admin-subnav-row">
          <div className="citycare-admin-tabs">
            <button
              type="button"
              className={`citycare-admin-tab-btn ${adminSection === 'overview' ? 'active' : ''}`}
              onClick={() => setAdminSection('overview')}
              id="btn-admin-tab-overview"
            >
              <BarChart3 size={15} />
              <span>Real Telemetry &amp; Charts</span>
            </button>

            <button
              type="button"
              className={`citycare-admin-tab-btn ${adminSection === 'users' ? 'active' : ''}`}
              onClick={() => setAdminSection('users')}
              id="btn-admin-tab-users"
            >
              <Users size={15} />
              <span>User Management ({stats.totalUsers})</span>
            </button>

            <button
              type="button"
              className={`citycare-admin-tab-btn ${adminSection === 'appointments' ? 'active' : ''}`}
              onClick={() => setAdminSection('appointments')}
              id="btn-admin-tab-appointments"
            >
              <Calendar size={15} />
              <span>Appointments ({stats.appointmentsCount})</span>
            </button>

            <button
              type="button"
              className={`citycare-admin-tab-btn ${adminSection === 'patients' ? 'active' : ''}`}
              onClick={() => setAdminSection('patients')}
              id="btn-admin-tab-patients"
            >
              <Stethoscope size={15} />
              <span>Patients Records ({stats.totalPatients})</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="citycare-admin-tab-btn"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0284c7' }}
              onClick={() => setIsVerifyModalOpen(true)}
              title="Verify arriving patient check-in code"
            >
              <QrCode size={15} />
              <span>Verify Patient Pass</span>
            </button>

            <button
              type="button"
              className="citycare-admin-register-btn"
              onClick={() => setIsRegisterModalOpen(true)}
              id="btn-admin-register-modal-open"
            >
              <UserPlus size={15} />
              <span>+ Register Doctor / Staff</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: EMBEDDED RBAC USERS MANAGEMENT TABLE */}
      {adminSection === 'users' && (
        <div style={{ padding: '24px 32px' }}>
          <AdminUsersManager 
            currentAdmin={currentUser || { id: 1, role: 'admin' }} 
            onUserCreatedSuccess={loadRealData} 
          />
        </div>
      )}

      {/* VIEW 2: EMBEDDED APPOINTMENTS MANAGEMENT DIRECTORY */}
      {adminSection === 'appointments' && (
        <div style={{ padding: '12px 16px' }}>
          <AppointmentsDirectory 
            currentUser={currentUser}
            onNewBookingClick={() => onNavigate && onNavigate('doctors')}
            onNavigate={onNavigate}
          />
        </div>
      )}

      {/* VIEW 3: EMBEDDED PATIENTS RECORDS DIRECTORY */}
      {adminSection === 'patients' && (
        <div style={{ padding: '12px 16px' }}>
          <PatientsDirectory 
            currentUser={currentUser}
            onNavigate={onNavigate}
          />
        </div>
      )}

      {/* VIEW 4: EXECUTIVE OVERVIEW WITH REAL DYNAMIC CHARTS */}
      {adminSection === 'overview' && (
        <>
          <div className="citycare-upper-canvas">
            {/* LEFT COLUMN: REAL USERS & APPOINTMENTS TELEMETRY */}
            <div className="citycare-hero-card" style={{ padding: '26px' }}>
              <div className="citycare-hero-bg-art">
                <img src={citycareHeroBg} alt="Clinical Telemetry Aura" />
              </div>

              <div className="citycare-hero-content">
                <div className="citycare-hero-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h2>Hello! {greetingName}</h2>
                      <p>Real-time system telemetry and live clinical performance metrics</p>
                    </div>
                    <span className="citycare-admin-live-tag" style={{ background: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                      <span className="live-dot" /> Live DB Sync
                    </span>
                  </div>
                </div>

                {/* REAL CHART 1: USERS ROLE DISTRIBUTION DONUT */}
                <div className="real-chart-hero-box">
                  <div className="real-chart-hero-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="mini-icon-circle blue"><Users size={14} /></div>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                        User Roles Distribution ({stats.totalUsers} Total)
                      </span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Active RBAC Accounts</span>
                  </div>

                  <div className="real-donut-layout">
                    <div className="real-donut-wrap">
                      <svg width="105" height="105" viewBox="0 0 105 105" className="real-donut-svg">
                        <circle cx="52.5" cy="52.5" r="38" fill="none" stroke="#f1f5f9" strokeWidth="11" />
                        <circle
                          cx="52.5"
                          cy="52.5"
                          r="38"
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="11"
                          strokeDasharray={`${strokePatients} ${circumference - strokePatients}`}
                          strokeDashoffset={offsetPatients}
                          strokeLinecap="round"
                        />
                        <circle
                          cx="52.5"
                          cy="52.5"
                          r="38"
                          fill="none"
                          stroke="#8b5cf6"
                          strokeWidth="11"
                          strokeDasharray={`${strokeDoctors} ${circumference - strokeDoctors}`}
                          strokeDashoffset={offsetDoctors}
                          strokeLinecap="round"
                        />
                        <circle
                          cx="52.5"
                          cy="52.5"
                          r="38"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="11"
                          strokeDasharray={`${strokeStaff} ${circumference - strokeStaff}`}
                          strokeDashoffset={offsetStaff}
                          strokeLinecap="round"
                        />
                        <circle
                          cx="52.5"
                          cy="52.5"
                          r="38"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="11"
                          strokeDasharray={`${strokeAdmins} ${circumference - strokeAdmins}`}
                          strokeDashoffset={offsetAdmins}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="real-donut-center">
                        <span className="donut-num">{stats.totalUsers}</span>
                        <span className="donut-sub">Users</span>
                      </div>
                    </div>

                    <div className="real-donut-legend-grid">
                      <div className="legend-chip">
                        <span className="dot" style={{ background: '#0284c7' }} />
                        <span className="name">Patients</span>
                        <strong className="count">{patientsCount}</strong>
                        <small className="pct">({pctPatients}%)</small>
                      </div>
                      <div className="legend-chip">
                        <span className="dot" style={{ background: '#8b5cf6' }} />
                        <span className="name">Doctors</span>
                        <strong className="count">{doctorsCount}</strong>
                        <small className="pct">({pctDoctors}%)</small>
                      </div>
                      <div className="legend-chip">
                        <span className="dot" style={{ background: '#10b981' }} />
                        <span className="name">Staff</span>
                        <strong className="count">{staffCount}</strong>
                        <small className="pct">({pctStaff}%)</small>
                      </div>
                      <div className="legend-chip">
                        <span className="dot" style={{ background: '#f59e0b' }} />
                        <span className="name">Admins</span>
                        <strong className="count">{adminsCount}</strong>
                        <small className="pct">({pctAdmins}%)</small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* REAL CHART 2: CLINICAL APPOINTMENTS STATUS BREAKDOWN */}
                <div className="real-chart-hero-box" style={{ marginTop: '14px' }}>
                  <div className="real-chart-hero-title">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="mini-icon-circle green"><Calendar size={14} /></div>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                        Clinical Bookings Breakdown ({stats.appointmentsCount} Total)
                      </span>
                    </div>
                    <span className="status-rate-badge">
                      {checkinVerificationRate}% Verified / Completed
                    </span>
                  </div>

                  <div className="telemetry-progress-track" style={{ height: '12px', margin: '10px 0 12px 0' }}>
                    <div 
                      className="bar scheduled" 
                      style={{ width: `${schedPct}%` }} 
                      title={`Scheduled: ${stats.scheduledCount} (${schedPct}%)`}
                    />
                    <div 
                      className="bar checkedin" 
                      style={{ width: `${checkPct}%` }} 
                      title={`Checked In: ${stats.checkedInCount} (${checkPct}%)`}
                    />
                    <div 
                      className="bar completed" 
                      style={{ width: `${compPct}%` }} 
                      title={`Completed: ${stats.completedCount} (${compPct}%)`}
                    />
                    <div 
                      className="bar cancelled" 
                      style={{ width: `${cancPct}%` }} 
                      title={`Cancelled: ${stats.cancelledCount} (${cancPct}%)`}
                    />
                  </div>

                  <div className="telemetry-legend" style={{ justifyContent: 'space-between' }}>
                    <span><i className="dot scheduled" /> Scheduled: <strong>{stats.scheduledCount}</strong></span>
                    <span><i className="dot checkedin" /> Checked-In: <strong>{stats.checkedInCount}</strong></span>
                    <span><i className="dot completed" /> Completed: <strong>{stats.completedCount}</strong></span>
                    <span><i className="dot cancelled" /> Cancelled: <strong>{stats.cancelledCount}</strong></span>
                  </div>
                </div>

                {/* BOTTOM ACTION BAR */}
                <div className="citycare-hero-bottom-bar" style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Quick Actions:</span>
                    <button
                      type="button"
                      className="action-pill-btn"
                      onClick={() => setAdminSection('users')}
                    >
                      <Users size={13} />
                      <span>Manage Users</span>
                    </button>
                    <button
                      type="button"
                      className="action-pill-btn"
                      onClick={() => setAdminSection('appointments')}
                    >
                      <Calendar size={13} />
                      <span>Appointments</span>
                    </button>
                    <button
                      type="button"
                      className="action-pill-btn highlight"
                      onClick={() => setIsRegisterModalOpen(true)}
                    >
                      <UserPlus size={13} />
                      <span>+ Add Staff/Doctor</span>
                    </button>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} color="#10b981" />
                    <span>Real SQLite Records</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: 2x2 REAL STAT CARDS & DYNAMIC SVG TREND CHART */}
            <div className="citycare-right-column">
              <div className="citycare-stat-grid-2x2">
                <div className="citycare-stat-card" onClick={() => setAdminSection('patients')} style={{ cursor: 'pointer' }}>
                  <div className="citycare-stat-top">
                    <span className="citycare-stat-title">Total Patients</span>
                    <button type="button" className="citycare-more-btn" title="View Patient Records"><ArrowRight size={15} /></button>
                  </div>
                  <div className="citycare-stat-bottom">
                    <span className="citycare-stat-number">{stats.totalPatients}</span>
                    <span className="citycare-stat-trend-pill" style={{ background: '#0284c7' }}>
                      Practice Directory
                    </span>
                  </div>
                </div>

                <div className="citycare-stat-card" onClick={() => setAdminSection('users')} style={{ cursor: 'pointer' }}>
                  <div className="citycare-stat-top">
                    <span className="citycare-stat-title">System Users</span>
                    <button type="button" className="citycare-more-btn" title="Manage RBAC Users"><ArrowRight size={15} /></button>
                  </div>
                  <div className="citycare-stat-bottom">
                    <span className="citycare-stat-number">{stats.totalUsers}</span>
                    <span className="citycare-stat-trend-pill" style={{ background: '#8b5cf6' }}>
                      RBAC Active
                    </span>
                  </div>
                </div>

                <div className="citycare-stat-card" onClick={() => onNavigate && onNavigate('doctors')} style={{ cursor: 'pointer' }}>
                  <div className="citycare-stat-top">
                    <span className="citycare-stat-title">Duty Doctors</span>
                    <button type="button" className="citycare-more-btn" title="View Doctor Directory"><ArrowRight size={15} /></button>
                  </div>
                  <div className="citycare-stat-bottom">
                    <span className="citycare-stat-number">{stats.dutyDoctors}</span>
                    <span className="citycare-stat-trend-pill" style={{ background: '#10b981' }}>
                      {Object.keys(stats.specialties).length} Specialties
                    </span>
                  </div>
                </div>

                <div className="citycare-stat-card" onClick={() => setAdminSection('appointments')} style={{ cursor: 'pointer' }}>
                  <div className="citycare-stat-top">
                    <span className="citycare-stat-title">Clinical Bookings</span>
                    <button type="button" className="citycare-more-btn" title="View All Appointments"><ArrowRight size={15} /></button>
                  </div>
                  <div className="citycare-stat-bottom">
                    <span className="citycare-stat-number">{stats.appointmentsCount}</span>
                    <span className="citycare-stat-trend-pill" style={{ background: '#0f172a' }}>
                      {stats.scheduledCount} Scheduled
                    </span>
                  </div>
                </div>
              </div>

              {/* REAL CHART 3: 7-DAY APPOINTMENTS VOLUME TREND */}
              <div className="citycare-trend-chart-card">
                <div className="citycare-trend-header">
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={16} color="#0284c7" />
                      Appointments &amp; Booking Volume Trend
                    </h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                      Aggregated weekly appointment bookings across clinical practice
                    </p>
                  </div>

                  <div className="citycare-trend-period-toggles">
                    <button 
                      type="button" 
                      className={`citycare-toggle-btn ${chartViewMode === 'weekly' ? 'active' : ''}`}
                      onClick={() => setChartViewMode('weekly')}
                    >
                      Weekly Trend
                    </button>
                    <button 
                      type="button" 
                      className={`citycare-toggle-btn ${chartViewMode === 'status' ? 'active' : ''}`}
                      onClick={() => setChartViewMode('status')}
                    >
                      Status Ratio
                    </button>
                  </div>
                </div>

                {chartViewMode === 'weekly' ? (
                  <div className="citycare-svg-chart-container">
                    <svg viewBox="0 0 400 200" className="citycare-trend-svg" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="realTrendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                          <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      <line x1="20" y1="50" x2="380" y2="50" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="20" y1="100" x2="380" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="20" y1="150" x2="380" y2="150" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

                      <path d={svgAreaD} fill="url(#realTrendGradient)" />
                      <path d={svgPathD} fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />

                      {trendPoints.map((pt) => {
                        const isHovered = hoveredDay === pt.day;
                        return (
                          <g key={pt.day} onClick={() => setHoveredDay(pt.day)} style={{ cursor: 'pointer' }}>
                            <circle
                              cx={pt.coordX}
                              cy={pt.coordY}
                              r={isHovered ? 7 : 4}
                              fill={isHovered ? '#0f172a' : '#ffffff'}
                              stroke={isHovered ? '#38bdf8' : '#0284c7'}
                              strokeWidth={isHovered ? 3 : 2}
                            />
                            {pt.value > 0 && (
                              <text
                                x={pt.coordX}
                                y={pt.coordY - 10}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="800"
                                fill="#0f172a"
                              >
                                {pt.value}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      <line
                        x1={currentHoverPoint.coordX}
                        y1={currentHoverPoint.coordY}
                        x2={currentHoverPoint.coordX}
                        y2="175"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                    </svg>

                    <div
                      className="citycare-chart-tooltip-bubble"
                      style={{
                        left: `${(currentHoverPoint.coordX / 400) * 100}%`,
                        top: `${Math.max(10, currentHoverPoint.coordY - 24)}px`,
                      }}
                    >
                      <strong>{currentHoverPoint.value}</strong>
                      <span style={{ fontSize: '0.68rem', marginLeft: '3px' }}>bookings</span>
                    </div>

                    <div className="citycare-chart-x-labels">
                      {trendPoints.map((pt) => (
                        <span
                          key={pt.day}
                          className={`x-label ${hoveredDay === pt.day ? 'active' : ''}`}
                          onClick={() => setHoveredDay(pt.day)}
                        >
                          {pt.day}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '16px 0', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Scheduled Bookings</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7', margin: '4px 0' }}>
                        {stats.scheduledCount}
                      </div>
                      <small style={{ color: '#64748b' }}>{schedPct}% of total volume</small>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Checked-In Arrivals</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
                        {stats.checkedInCount}
                      </div>
                      <small style={{ color: '#64748b' }}>{checkPct}% verified with pass</small>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Completed Consultations</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6366f1', margin: '4px 0' }}>
                        {stats.completedCount}
                      </div>
                      <small style={{ color: '#64748b' }}>{compPct}% finished treatment</small>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Cancelled Slots</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f43f5e', margin: '4px 0' }}>
                        {stats.cancelledCount}
                      </div>
                      <small style={{ color: '#64748b' }}>{cancPct}% released back</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* INTEGRATED CLINICAL OPERATIONS & TELEMETRY SECTION         */}
          {/* ========================================================= */}
          <div className="citycare-operations-grid">
            {/* COLUMN 1: RECENT APPOINTMENTS STREAM */}
            <div className="operations-card">
              <div className="operations-card-header">
                <div className="operations-header-title">
                  <div className="mini-icon-circle blue">
                    <Calendar size={15} color="#0284c7" />
                  </div>
                  <div>
                    <h4>Recent Consultations</h4>
                    <p>Live patient bookings &amp; arrival pass status</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="operations-link-btn"
                  onClick={() => setAdminSection('appointments')}
                >
                  View All &rarr;
                </button>
              </div>

              <div className="operations-stream-list">
                {recentAppointments.length === 0 ? (
                  <div className="operations-empty-state">
                    <p>No appointments currently scheduled.</p>
                    <button
                      type="button"
                      className="btn-book-slot-small"
                      onClick={() => onNavigate && onNavigate('doctors')}
                    >
                      Book First Consultation
                    </button>
                  </div>
                ) : (
                  recentAppointments.slice(0, 5).map((apt) => (
                    <div key={apt.id} className="operations-stream-item">
                      <div className="operations-item-left">
                        <div className="operations-avatar blue">
                          {apt.patient_name ? apt.patient_name.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <strong className="operations-patient-name">{apt.patient_name}</strong>
                          <span className="operations-doctor-name">with {apt.doctor}</span>
                          <small className="operations-time-label">
                            {new Date(apt.appointment_datetime).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(apt.appointment_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </small>
                        </div>
                      </div>

                      <div className="operations-item-right">
                        <span className={`status-badge-pill ${apt.status?.toLowerCase().replace(' ', '')}`}>
                          {apt.status}
                        </span>
                        {apt.verification_code && (
                          <span className="stream-code-badge" title="Express Arrival Code">
                            <QrCode size={11} />
                            {apt.verification_code}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: ACTIVE CLINICIANS ON DUTY */}
            <div className="operations-card">
              <div className="operations-card-header">
                <div className="operations-header-title">
                  <div className="mini-icon-circle green">
                    <Stethoscope size={15} color="#10b981" />
                  </div>
                  <div>
                    <h4>Specialists on Duty</h4>
                    <p>{doctorsList.length || stats.dutyDoctors} verified medical specialists</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="operations-link-btn green"
                  onClick={() => onNavigate && onNavigate('doctors')}
                >
                  Browse Doctors &rarr;
                </button>
              </div>

              <div className="operations-stream-list">
                {doctorsList.length === 0 ? (
                  <div className="operations-empty-state">
                    <p>Loading practicing specialists roster...</p>
                  </div>
                ) : (
                  doctorsList.slice(0, 5).map((doc) => (
                    <div key={doc.id} className="operations-stream-item">
                      <div className="operations-item-left">
                        <div className="operations-avatar green">
                          🩺
                        </div>
                        <div>
                          <strong className="operations-patient-name">{doc.full_name || doc.username}</strong>
                          <span className="operations-doctor-spec">
                            {doc.specialization || 'Clinical Specialist'}
                          </span>
                          <small className="operations-time-label">{doc.phone_number || doc.email}</small>
                        </div>
                      </div>

                      <div className="operations-item-right">
                        <span className="duty-status-pill green">
                          <span className="dot" /> On Duty
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 3: PRACTICE GOVERNANCE & QUICK ACTIONS */}
            <div className="operations-card">
              <div className="operations-card-header">
                <div className="operations-header-title">
                  <div className="mini-icon-circle purple">
                    <ShieldCheck size={15} color="#7c3aed" />
                  </div>
                  <div>
                    <h4>Practice Authority</h4>
                    <p>Administrative governance &amp; RBAC</p>
                  </div>
                </div>
              </div>

              <div className="operations-authority-box">
                <div className="auth-stat-row">
                  <span>Administrators:</span>
                  <strong>{adminsCount} active account</strong>
                </div>
                <div className="auth-stat-row">
                  <span>Consultant Clinicians:</span>
                  <strong>{doctorsCount} active</strong>
                </div>
                <div className="auth-stat-row">
                  <span>Practice Reception:</span>
                  <strong>{staffCount} on duty</strong>
                </div>
                <div className="auth-stat-row">
                  <span>Registered Patients:</span>
                  <strong>{patientsCount} in directory</strong>
                </div>
              </div>

              <div className="operations-actions-stack">
                <button
                  type="button"
                  className="btn-op-action primary"
                  onClick={() => setIsRegisterModalOpen(true)}
                >
                  <UserPlus size={15} />
                  <span>+ Register Doctor / Staff</span>
                </button>

                <button
                  type="button"
                  className="btn-op-action secondary"
                  onClick={() => setIsVerifyModalOpen(true)}
                >
                  <QrCode size={15} />
                  <span>Verify Arriving Patient Pass</span>
                </button>

                <button
                  type="button"
                  className="btn-op-action outline"
                  onClick={() => setAdminSection('users')}
                >
                  <Users size={15} />
                  <span>Manage Role Permissions (RBAC)</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Admin Register Doctor/Staff Modal */}
      {isRegisterModalOpen && (
        <AdminRegisterUserModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onUserRegistered={(newUser) => {
            loadRealData();
          }}
        />
      )}

      {/* Staff Verify Patient Modal */}
      {isVerifyModalOpen && (
        <StaffVerifyPatientModal
          isOpen={isVerifyModalOpen}
          currentUser={currentUser}
          onClose={() => setIsVerifyModalOpen(false)}
          onCheckInSuccess={(apt) => {
            loadRealData();
          }}
        />
      )}
    </div>
  );
}
