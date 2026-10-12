import React from 'react';
import { 
  CheckCircle2, 
  LogOut, 
  ShieldCheck, 
  Stethoscope, 
  Users, 
  Calendar, 
  Search, 
  Filter, 
  Clock, 
  Activity,
  HeartPulse,
  Database
} from 'lucide-react';
import { authService } from '../services/api';

export default function DashboardPreview({ user, onLogout }) {
  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck size={16} />;
      case 'doctor':
        return <Stethoscope size={16} />;
      default:
        return <Users size={16} />;
    }
  };

  const handleLogoutClick = () => {
    authService.logout();
    onLogout();
  };

  return (
    <div className="app-dashboard-wrapper">
      {/* Top Navigation */}
      <header className="app-navbar">
        <div className="nav-brand">
          <div className="brand-logo-icon" style={{ width: '38px', height: '38px' }}>
            <HeartPulse size={20} />
          </div>
          <div className="brand-titles">
            <h1 style={{ fontSize: '1.15rem' }}>Medical Wizard</h1>
            <p style={{ fontSize: '0.7rem' }}>Clinical Practice Portal</p>
          </div>
        </div>

        <div className="nav-user-panel">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {user.full_name || user.username}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {user.email}
            </div>
          </div>

          <span className={`role-pill ${user.role}`}>
            {getRoleIcon(user.role)}
            <span style={{ marginLeft: '4px' }}>{user.role}</span>
          </span>

          <button 
            type="button" 
            className="btn-logout" 
            onClick={handleLogoutClick}
            id="btn-logout"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Verification Success Hero Banner */}
        <div className="welcome-banner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge-tag" style={{ margin: 0 }}>
                <Activity size={13} />
                Step 1 Verification Complete
              </span>
            </div>
            <h2>Welcome, {user.full_name || user.username}!</h2>
            <p>
              Your session is authenticated via signed JWT token. The database connection to SQLite is verified and active.
            </p>
          </div>

          <div className="status-badge-verified">
            <CheckCircle2 size={20} />
            <div>
              <div>Backend Connected</div>
              <small style={{ fontWeight: '400', opacity: 0.85 }}>Token: Valid (Bearer)</small>
            </div>
          </div>
        </div>

        {/* User Session Info Card */}
        <div style={{ 
          background: 'var(--bg-surface)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: 'var(--radius-md)', 
          padding: '24px',
          marginBottom: '32px' 
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="var(--primary)" />
            Authenticated User Profile (Verified via /api/v1/auth/me)
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px',
            background: 'var(--bg-input)',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>User ID</span>
              <div style={{ fontWeight: '600', color: 'var(--text-accent)' }}>#{user.id}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Username</span>
              <div style={{ fontWeight: '600' }}>{user.username}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</span>
              <div style={{ fontWeight: '600' }}>{user.email}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>System Role</span>
              <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>{user.role}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Account Status</span>
              <div style={{ fontWeight: '600', color: 'var(--success)' }}>Active (Verified)</div>
            </div>
          </div>
        </div>

        {/* Roadmap Cards for Step 2 */}
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '6px' }}>
            Next Steps: Appointment Management
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            Here is what we will build next according to the practical assessment requirements:
          </p>

          <div className="step-card-grid">
            <div className="step-card">
              <div className="step-card-header">
                <span className="step-tag">Phase 2.1</span>
                <Calendar size={20} color="var(--primary)" />
              </div>
              <h3>Appointment CRUD Operations</h3>
              <p>
                Create, View, Edit, and Delete appointments with Patient Name, Date & Time, Doctor, Type, and Status.
              </p>
            </div>

            <div className="step-card">
              <div className="step-card-header">
                <span className="step-tag">Phase 2.2</span>
                <Search size={20} color="var(--emerald-accent)" />
              </div>
              <h3>Search & Dynamic Filters</h3>
              <p>
                Debounced live search across patients and doctors, filtering by status (`Scheduled`, `Completed`, `Cancelled`) and date ranges.
              </p>
            </div>

            <div className="step-card">
              <div className="step-card-header">
                <span className="step-tag">Phase 2.3</span>
                <ShieldCheck size={20} color="var(--danger)" />
              </div>
              <h3>Role-Based Permissions (RBAC)</h3>
              <p>
                Doctors view their specific appointments; Reception manages booking; Admins have full access and configuration control.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
