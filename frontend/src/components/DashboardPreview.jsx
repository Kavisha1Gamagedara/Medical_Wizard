import React, { useState } from 'react';
import { 
  CheckCircle2, 
  LogOut, 
  ShieldCheck, 
  Stethoscope, 
  Users, 
  Calendar, 
  Search, 
  Activity,
  HeartPulse,
  Database,
  Edit3,
  Phone,
  FileText,
  Sparkles
} from 'lucide-react';
import { authService } from '../services/api';
import ProfileEditModal from './ProfileEditModal';

export default function DashboardPreview({ user, onLogout }) {
  const [currentUser, setCurrentUser] = useState(user);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isDoctor = currentUser.role === 'doctor';

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

  const handleProfileUpdated = (updatedUser) => {
    setCurrentUser(updatedUser);
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
              {currentUser.full_name || currentUser.username}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {isDoctor && currentUser.specialization ? (
                <span style={{ color: 'var(--text-accent)', fontWeight: '600' }}>
                  {currentUser.specialization} &bull;{' '}
                </span>
              ) : null}
              {currentUser.email}
            </div>
          </div>

          <span className={`role-pill ${currentUser.role}`}>
            {getRoleIcon(currentUser.role)}
            <span style={{ marginLeft: '4px' }}>{currentUser.role}</span>
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
                Profile System Active
              </span>
              {isDoctor && currentUser.specialization && (
                <span className="badge-tag" style={{ margin: 0, background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#6ee7b7' }}>
                  <Stethoscope size={13} />
                  {currentUser.specialization}
                </span>
              )}
            </div>
            <h2>Welcome, {currentUser.full_name || currentUser.username}!</h2>
            <p>
              Your clinical profile is fully authenticated and editable. Manage your personal details and clinical credentials below.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-submit"
              style={{ 
                margin: 0, 
                width: 'auto', 
                padding: '10px 20px', 
                fontSize: '0.86rem',
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(13, 148, 136, 0.3))',
                border: '1px solid var(--primary)',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)'
              }}
              onClick={() => setIsEditModalOpen(true)}
              id="btn-open-edit-profile"
            >
              <Edit3 size={15} />
              <span>Edit Profile</span>
            </button>
            <div className="status-badge-verified">
              <CheckCircle2 size={18} />
              <div>
                <div>Verified</div>
                <small style={{ fontWeight: '400', opacity: 0.85 }}>Bearer JWT</small>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile Card */}
        <div style={{ 
          background: 'var(--bg-surface)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: 'var(--radius-md)', 
          padding: '24px',
          marginBottom: '32px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="var(--primary)" />
              Clinical User Profile Details
            </h3>
            <button
              type="button"
              style={{
                background: 'none',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-accent)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit3 size={13} />
              <span>Update Details</span>
            </button>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '16px',
            background: 'var(--bg-input)',
            padding: '20px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User ID</span>
              <div style={{ fontWeight: '700', color: 'var(--text-accent)', fontSize: '0.95rem' }}>#{currentUser.id}</div>
            </div>
            
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</span>
              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{currentUser.full_name || 'Not specified'}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</span>
              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{currentUser.username}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</span>
              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{currentUser.email}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Role</span>
              <div style={{ fontWeight: '600', textTransform: 'capitalize', fontSize: '0.95rem' }}>{currentUser.role}</div>
            </div>

            {/* Specialization Field (Doctor Highlight) */}
            {isDoctor && (
              <div style={{ 
                background: 'rgba(6, 182, 212, 0.12)', 
                padding: '10px 14px', 
                borderRadius: '8px',
                border: '1px solid rgba(6, 182, 212, 0.3)' 
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Stethoscope size={13} />
                  Doctor Medical Specialization
                </span>
                <div style={{ fontWeight: '800', color: '#67e8f9', fontSize: '1rem', marginTop: '2px' }}>
                  {currentUser.specialization || 'Not specified (Click edit to select)'}
                </div>
              </div>
            )}

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Phone</span>
              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{currentUser.phone_number || 'None provided'}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
              <div style={{ fontWeight: '600', color: 'var(--success)', fontSize: '0.95rem' }}>Active (Verified)</div>
            </div>
          </div>

          {currentUser.bio && (
            <div style={{ 
              marginTop: '16px', 
              padding: '14px 18px', 
              background: 'rgba(11, 19, 35, 0.6)', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)' 
            }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={13} />
                {isDoctor ? 'Clinical Bio & Specialization Scope' : 'Department Notes'}
              </span>
              <p style={{ marginTop: '4px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {currentUser.bio}
              </p>
            </div>
          )}
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

      {/* Edit Profile Modal */}
      <ProfileEditModal
        user={currentUser}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}
