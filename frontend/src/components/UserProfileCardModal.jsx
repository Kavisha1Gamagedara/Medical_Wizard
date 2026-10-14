import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Stethoscope, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  LogOut, 
  ShieldCheck, 
  Save, 
  Calendar,
  Lock,
  ArrowRight
} from 'lucide-react';
import { authService } from '../services/api';

const SPECIALIZATION_PRESETS = [
  'Neurosurgeon',
  'Dentist',
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'Orthopedic Surgeon',
  'General Practitioner',
  'Psychiatrist',
  'Other',
];

export default function UserProfileCardModal({ user, isOpen, onClose, onProfileUpdated, onLogout }) {
  if (!isOpen || !user) return null;

  const isDoctor = user.role === 'doctor';
  const isPatient = user.role === 'patient';
  const isAdmin = user.role === 'admin';
  const isStaff = user.role === 'staff';

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user.phone_number || '');
  const [bio, setBio] = useState(user.bio || '');

  const initialSpec = user.specialization || (isDoctor ? 'Neurosurgeon' : '');
  const isCustomSpecInitial = isDoctor && initialSpec && !SPECIALIZATION_PRESETS.slice(0, -1).includes(initialSpec);

  const [selectedSpec, setSelectedSpec] = useState(
    isCustomSpecInitial ? 'Other' : (initialSpec || 'Neurosurgeon')
  );
  const [customSpec, setCustomSpec] = useState(isCustomSpecInitial ? initialSpec : '');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const initials = (user.full_name || user.username || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Full name cannot be empty.');
      return;
    }

    if (!email.trim() || !email.trim().includes('@') || !email.trim().includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const finalSpecialization = isDoctor
      ? (selectedSpec === 'Other' ? customSpec.trim() : selectedSpec)
      : undefined;

    if (isDoctor && !finalSpecialization) {
      setErrorMsg('Please specify a medical specialization.');
      return;
    }

    setSaving(true);
    try {
      const updatedUser = await authService.updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim() || null,
        bio: bio.trim() || null,
        specialization: isDoctor ? (finalSpecialization || null) : null,
      });

      setSuccessMsg('Profile updated successfully!');
      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }
      setIsEditing(false);
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'patient':
        return { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' };
      case 'doctor':
        return { bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd' };
      case 'staff':
        return { bg: '#dcfce7', color: '#059669', border: '#a7f3d0' };
      case 'admin':
        return { bg: '#ffe4e6', color: '#e11d48', border: '#fecdd3' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  const roleStyle = getRoleBadgeStyle(user.role);

  return (
    <div className="modal-backdrop" style={{ zIndex: 1300 }} onClick={onClose}>
      <div 
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Profile Card Header */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            padding: '28px 28px 20px',
            borderBottom: '1px solid #f1f5f9',
            position: 'relative',
            textAlign: 'center'
          }}
        >
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            style={{ position: 'absolute', top: '18px', right: '18px' }}
            aria-label="Close profile card"
          >
            <X size={18} />
          </button>

          {/* User Avatar Circle */}
          <div 
            style={{ 
              width: '76px', 
              height: '76px', 
              borderRadius: '50%', 
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '1.6rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              border: `4px solid ${roleStyle.bg}`,
              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.15)'
            }}
          >
            {initials}
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            {user.full_name || user.username}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span 
              style={{ 
                background: roleStyle.bg,
                color: roleStyle.color,
                border: `1px solid ${roleStyle.border}`,
                padding: '3px 12px',
                borderRadius: '20px',
                fontSize: '0.74rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              {user.role}
            </span>

            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
              @{user.username}
            </span>

            <span 
              style={{ 
                fontSize: '0.74rem', 
                color: '#0284c7', 
                background: '#e0f2fe', 
                border: '1px solid #bae6fd', 
                padding: '2px 8px', 
                borderRadius: '6px', 
                fontWeight: 700 
              }}
            >
              ID #{user.id}
            </span>
          </div>

          <div style={{ marginTop: '10px' }}>
            <span 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '5px', 
                background: '#ecfdf5', 
                color: '#059669', 
                border: '1px solid #a7f3d0',
                padding: '2px 10px',
                borderRadius: '16px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}
            >
              <CheckCircle2 size={12} />
              <span>Verified Account</span>
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', maxHeight: '68vh', overflowY: 'auto' }}>
          {errorMsg && (
            <div className="alert-box alert-danger" style={{ marginBottom: '16px', borderRadius: '12px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-box alert-success" style={{ marginBottom: '16px', borderRadius: '12px' }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {!isEditing ? (
            /* VIEW MODE */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {/* Email */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Email Address</span>
                    <span style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 700, wordBreak: 'break-all' }}>{user.email || 'None'}</span>
                  </div>
                </div>

                {/* Phone */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Contact Phone</span>
                    <span style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 700 }}>{user.phone_number || 'Not provided'}</span>
                  </div>
                </div>

                {/* Specialization (Doctor) */}
                {isDoctor && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Stethoscope size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Clinical Specialty</span>
                      <span style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 700 }}>{user.specialization || 'General Practitioner'}</span>
                    </div>
                  </div>
                )}

                {/* Bio / Department Notes */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'block' }}>
                      {isDoctor ? 'Clinical Bio' : isPatient ? 'Patient Notes' : 'Department Notes'}
                    </span>
                    <span style={{ fontSize: '0.84rem', color: '#334155', fontWeight: 500, lineHeight: 1.5 }}>
                      {user.bio || (isPatient ? 'Registered clinical patient with active healthcare plan.' : 'Authorized practice member.')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in View Mode */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={() => setIsEditing(true)}
                  style={{ 
                    flex: 1, 
                    margin: 0, 
                    padding: '11px', 
                    borderRadius: '12px', 
                    background: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: 700
                  }}
                  id="btn-profile-card-edit"
                >
                  <Edit3 size={15} />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  className="btn-cancel"
                  onClick={onLogout}
                  style={{ 
                    padding: '11px 18px', 
                    borderRadius: '12px', 
                    color: '#e11d48',
                    borderColor: '#fecdd3',
                    background: '#fff1f2',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700
                  }}
                  title="Sign out of your session"
                  id="btn-profile-card-logout"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* EDIT FORM MODE */
            <form onSubmit={handleSave}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ color: '#334155', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px', display: 'block' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '10px 14px', color: '#0f172a' }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ color: '#334155', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px', display: 'block' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '10px 14px', color: '#0f172a' }}
                  required
                />
              </div>

              {/* Specialization (Doctor only) */}
              {isDoctor && (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ color: '#334155', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px', display: 'block' }}>
                    Specialization
                  </label>
                  <select
                    className="form-input role-select"
                    value={selectedSpec}
                    onChange={(e) => setSelectedSpec(e.target.value)}
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '10px 14px', color: '#0f172a' }}
                  >
                    {SPECIALIZATION_PRESETS.map((spec) => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                  {selectedSpec === 'Other' && (
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Specify specialty..."
                      value={customSpec}
                      onChange={(e) => setCustomSpec(e.target.value)}
                      style={{ marginTop: '8px', width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '10px 14px', color: '#0f172a' }}
                      required
                    />
                  )}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ color: '#334155', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px', display: 'block' }}>
                  Contact Phone
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. +61 411 222 333"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '10px 14px', color: '#0f172a' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ color: '#334155', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px', display: 'block' }}>
                  {isDoctor ? 'Clinical Bio' : 'Department Notes / Bio'}
                </label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '10px 14px', color: '#0f172a', fontSize: '0.86rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setIsEditing(false);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  style={{ padding: '10px 18px', borderRadius: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  style={{ width: 'auto', padding: '10px 22px', borderRadius: '12px', background: '#0284c7', color: '#ffffff', fontWeight: 700 }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
