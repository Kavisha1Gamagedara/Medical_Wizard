import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  ShieldCheck, 
  Stethoscope, 
  Users, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Mail, 
  Phone, 
  FileText, 
  Sparkles,
  ArrowRight,
  KeyRound
} from 'lucide-react';
import { userService } from '../services/api';

const SPECIALTY_OPTIONS = [
  'Neurosurgeon',
  'Dentist',
  'Cardiologist',
  'Pediatrician',
  'General Physician',
  'Orthopedic Surgeon',
  'Dermatologist',
  'Psychiatrist',
  'Other'
];

export default function AdminRegisterUserModal({ isOpen, onClose, onUserCreated }) {
  if (!isOpen) return null;

  const [role, setRole] = useState('doctor'); // 'doctor' | 'staff' | 'admin' | 'patient'
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [specialization, setSpecialization] = useState('Cardiologist');
  const [customSpecialization, setCustomSpecialization] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(`MW_${res}!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || username.trim().length < 3) {
      setErrorMsg('Username must be at least 3 characters and alphanumeric.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    const effectiveSpecialty = role === 'doctor'
      ? (specialization === 'Other' ? customSpecialization.trim() : specialization)
      : undefined;

    if (role === 'doctor' && !effectiveSpecialty) {
      setErrorMsg('Please specify a medical specialization for the doctor.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim() || undefined,
        specialization: effectiveSpecialty || undefined,
        phone_number: phoneNumber.trim() || undefined,
        bio: bio.trim() || undefined,
      };

      const newUser = await userService.createUser(payload);
      if (onUserCreated) {
        onUserCreated(newUser);
      }
      handleClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register new user. Please verify input details.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrorMsg('');
    setFullName('');
    setUsername('');
    setEmail('');
    setPassword('Password123!');
    setSpecialization('Cardiologist');
    setCustomSpecialization('');
    setPhoneNumber('');
    setBio('');
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: '580px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-logo-icon" style={{ width: '40px', height: '40px', background: 'rgba(6, 182, 212, 0.15)', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
              <UserPlus size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="badge-tag" style={{ margin: 0, padding: '2px 8px', fontSize: '0.68rem', background: 'rgba(244, 63, 94, 0.15)', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fca5a5' }}>
                  <ShieldCheck size={11} />
                  Admin Onboarding
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0 0' }}>Register Clinical Account</h2>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>
                Onboard doctors, clinic staff, administrators, or patients directly.
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body">
          {errorMsg && (
            <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role Selection Segmented Buttons */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Assign Account Role *</span>
              <span style={{ color: 'var(--text-accent)', fontSize: '0.72rem', fontWeight: 600 }}>RBAC Permission Tier</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { id: 'doctor', label: 'Doctor', icon: Stethoscope, color: 'var(--primary)' },
                { id: 'staff', label: 'Staff', icon: Users, color: 'var(--emerald-accent)' },
                { id: 'admin', label: 'Admin', icon: ShieldCheck, color: 'var(--danger)' },
                { id: 'patient', label: 'Patient', icon: User, color: '#c084fc' },
              ].map((item) => {
                const IconComponent = item.icon;
                const isSelected = role === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: isSelected ? `2px solid ${item.color}` : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'var(--bg-input)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 700 : 500,
                      transition: 'all 0.2s ease'
                    }}
                    id={`btn-select-role-${item.id}`}
                  >
                    <IconComponent size={16} color={isSelected ? item.color : 'var(--text-muted)'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Doctor Specialization (Conditional) */}
          {role === 'doctor' && (
            <div className="form-group" style={{ 
              background: 'rgba(6, 182, 212, 0.08)', 
              border: '1px solid rgba(6, 182, 212, 0.25)', 
              borderRadius: '8px', 
              padding: '12px 16px' 
            }}>
              <label className="form-label" htmlFor="reg-specialty" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#67e8f9' }}>
                <Stethoscope size={14} />
                <span>Doctor Medical Specialization *</span>
              </label>
              <select
                id="reg-specialty"
                className="form-input role-select"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                required
              >
                {SPECIALTY_OPTIONS.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>

              {specialization === 'Other' && (
                <input
                  type="text"
                  className="form-input"
                  style={{ marginTop: '8px' }}
                  placeholder="Enter custom specialty (e.g. Oncology, Urology)..."
                  value={customSpecialization}
                  onChange={(e) => setCustomSpecialization(e.target.value)}
                  required
                />
              )}
            </div>
          )}

          {/* Name & Username Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-full-name">Full Name *</label>
              <div className="input-with-icon">
                <input
                  id="reg-full-name"
                  type="text"
                  className="form-input"
                  placeholder={role === 'doctor' ? 'e.g. Dr. Sarah Jenkins' : 'e.g. Mark Robinson'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <User size={16} className="input-icon" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-username">Username *</label>
              <div className="input-with-icon">
                <input
                  id="reg-username"
                  type="text"
                  className="form-input"
                  placeholder={role === 'doctor' ? 'e.g. dr_jenkins' : 'e.g. m_robinson'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <UserPlus size={16} className="input-icon" />
              </div>
            </div>
          </div>

          {/* Email & Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address *</label>
              <div className="input-with-icon">
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  placeholder="staff@medicalwizard.com.au"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail size={16} className="input-icon" />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="reg-password">Password *</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 600
                  }}
                  title="Generate a random password"
                >
                  Generate
                </button>
              </div>
              <div className="input-with-icon">
                <input
                  id="reg-password"
                  type="text"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <KeyRound size={16} className="input-icon" />
              </div>
            </div>
          </div>

          {/* Contact Phone & Bio */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-phone">Contact Phone (Optional)</label>
            <div className="input-with-icon">
              <input
                id="reg-phone"
                type="text"
                className="form-input"
                placeholder="+61 2 9876 5432"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <Phone size={16} className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-bio">Clinical Notes / Department Bio (Optional)</label>
            <textarea
              id="reg-bio"
              className="form-input"
              rows="2"
              placeholder={role === 'doctor' ? 'Clinical expertise, certifications, consulting suites...' : 'Department duties, reception shift notes...'}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{ paddingLeft: '14px', resize: 'vertical' }}
            />
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn-cancel"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              style={{ width: 'auto', padding: '10px 24px', margin: 0 }}
              disabled={loading}
              id="btn-confirm-register-user"
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Registering Account...</span>
                </>
              ) : (
                <>
                  <span>Register {role.charAt(0).toUpperCase() + role.slice(1)}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
