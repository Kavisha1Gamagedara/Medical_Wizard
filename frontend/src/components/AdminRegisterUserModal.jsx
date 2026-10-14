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
      <div className="modal-container" style={{ maxWidth: '580px', borderRadius: '24px', overflow: 'hidden' }}>
        {/* Header */}
        <div className="modal-header" style={{ padding: '22px 26px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #e0f2fe, #ccfbf1)',
              border: '1.5px solid #bae6fd',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.12)'
            }}>
              <UserPlus size={22} color="#0284c7" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  margin: 0,
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: '#e11d48',
                  fontWeight: 700,
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <ShieldCheck size={12} color="#e11d48" />
                  Admin Onboarding
                </span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                Register Clinical Account
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Onboard doctors, clinic staff, administrators, or patients directly.
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '24px 26px' }}>
          {errorMsg && (
            <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role Selection Segmented Buttons */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#0f172a', fontWeight: 700 }}>Assign Account Role *</span>
              <span style={{ color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>
                RBAC Permission Tier
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { 
                  id: 'doctor', 
                  label: 'Doctor', 
                  icon: Stethoscope, 
                  selectedBg: '#ecfeff', 
                  selectedBorder: '#06b6d4', 
                  selectedColor: '#0e7490', 
                  selectedIcon: '#0891b2' 
                },
                { 
                  id: 'staff', 
                  label: 'Staff', 
                  icon: Users, 
                  selectedBg: '#ecfdf5', 
                  selectedBorder: '#10b981', 
                  selectedColor: '#047857', 
                  selectedIcon: '#059669' 
                },
                { 
                  id: 'admin', 
                  label: 'Admin', 
                  icon: ShieldCheck, 
                  selectedBg: '#fff1f2', 
                  selectedBorder: '#f43f5e', 
                  selectedColor: '#be123c', 
                  selectedIcon: '#e11d48' 
                },
                { 
                  id: 'patient', 
                  label: 'Patient', 
                  icon: User, 
                  selectedBg: '#f5f3ff', 
                  selectedBorder: '#8b5cf6', 
                  selectedColor: '#6d28d9', 
                  selectedIcon: '#7c3aed' 
                },
              ].map((item) => {
                const IconComponent = item.icon;
                const isSelected = role === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: isSelected ? `2px solid ${item.selectedBorder}` : '1.5px solid #e2e8f0',
                      background: isSelected ? item.selectedBg : '#ffffff',
                      color: isSelected ? item.selectedColor : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 800 : 600,
                      boxShadow: isSelected ? `0 4px 14px ${item.selectedBorder}33` : '0 2px 6px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    id={`btn-select-role-${item.id}`}
                  >
                    <IconComponent size={18} color={isSelected ? item.selectedIcon : '#94a3b8'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Doctor Specialization (Conditional) */}
          {role === 'doctor' && (
            <div className="form-group" style={{ 
              background: 'linear-gradient(135deg, #f0fdfa, #ecfeff)', 
              border: '1.5px solid #99f6e4', 
              borderRadius: '14px', 
              padding: '14px 16px',
              marginTop: '8px',
              marginBottom: '16px'
            }}>
              <label className="form-label" htmlFor="reg-specialty" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f766e', fontWeight: 800, marginBottom: '8px' }}>
                <Stethoscope size={15} color="#0d9488" />
                <span>Doctor Medical Specialization *</span>
              </label>
              <select
                id="reg-specialty"
                className="form-input role-select"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #a7f3d0',
                  color: '#0f172a',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  padding: '10px 14px',
                  width: '100%'
                }}
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
                  style={{ marginTop: '8px', background: '#ffffff', border: '1.5px solid #a7f3d0' }}
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
                <User size={16} className="input-icon" color="#64748b" />
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
                <UserPlus size={16} className="input-icon" color="#64748b" />
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
                <Mail size={16} className="input-icon" color="#64748b" />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" htmlFor="reg-password" style={{ margin: 0 }}>Password *</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    color: '#0284c7',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Generate a secure random password"
                >
                  <Sparkles size={11} color="#0284c7" />
                  <span>Generate</span>
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
                <KeyRound size={16} className="input-icon" color="#64748b" />
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
              <Phone size={16} className="input-icon" color="#64748b" />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
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
          <div className="modal-footer" style={{ marginTop: '20px', padding: '16px 0 0 0', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn-cancel"
              onClick={handleClose}
              disabled={loading}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontWeight: 600,
                padding: '11px 22px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              style={{
                width: 'auto',
                padding: '11px 26px',
                margin: 0,
                background: 'linear-gradient(135deg, #0284c7, #0d9488)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.88rem',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.28)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
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
