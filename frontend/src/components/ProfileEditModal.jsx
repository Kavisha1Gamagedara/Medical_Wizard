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
  Save 
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

export default function ProfileEditModal({ user, isOpen, onClose, onProfileUpdated }) {
  if (!isOpen) return null;

  const isDoctor = user.role === 'doctor';
  
  // Determine initial specialization state
  const initialSpec = user.specialization || (isDoctor ? 'Neurosurgeon' : '');
  const isCustomSpecInitial = isDoctor && initialSpec && !SPECIALIZATION_PRESETS.slice(0, -1).includes(initialSpec);

  const [fullName, setFullName] = useState(user.full_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user.phone_number || '');
  const [bio, setBio] = useState(user.bio || '');
  const [selectedSpec, setSelectedSpec] = useState(
    isCustomSpecInitial ? 'Other' : (initialSpec || 'Neurosurgeon')
  );
  const [customSpec, setCustomSpec] = useState(isCustomSpecInitial ? initialSpec : '');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

    setLoading(true);
    try {
      const updatedUser = await authService.updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim() || null,
        bio: bio.trim() || null,
        specialization: isDoctor ? (finalSpecialization || null) : null,
      });

      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        onProfileUpdated(updatedUser);
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Edit Clinical Profile</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Update your account information, contact details, and clinical credentials.
            </p>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="alert-box alert-danger" style={{ margin: '16px 24px 0' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-box alert-success" style={{ margin: '16px 24px 0' }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="modal-body">
          <div className="form-group">
            <label className="form-label" htmlFor="edit-name">Full Name</label>
            <div className="input-with-icon">
              <input
                id="edit-name"
                type="text"
                className="form-input"
                placeholder="e.g. Dr. Sarah Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <User size={18} className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-email">Email Address</label>
            <div className="input-with-icon">
              <input
                id="edit-email"
                type="email"
                className="form-input"
                placeholder="doctor@medicalwizard.com.au"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={18} className="input-icon" />
            </div>
          </div>

          {/* DOCTOR SPECIFIC: Specialized Type Dropdown */}
          {isDoctor && (
            <div className="doctor-specialization-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Stethoscope size={18} color="var(--primary)" />
                <label className="form-label" htmlFor="edit-specialization" style={{ margin: 0 }}>
                  Doctor Medical Specialization
                </label>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Select your clinical specialty area (e.g. Neurosurgeon, Dentist, Cardiologist):
              </p>

              <select
                id="edit-specialization"
                className="form-input role-select"
                value={selectedSpec}
                onChange={(e) => setSelectedSpec(e.target.value)}
              >
                {SPECIALIZATION_PRESETS.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>

              {selectedSpec === 'Other' && (
                <div style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type custom specialty (e.g. Oncologist, Radiologist)"
                    value={customSpec}
                    onChange={(e) => setCustomSpec(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="edit-phone">Contact Phone Number</label>
            <div className="input-with-icon">
              <input
                id="edit-phone"
                type="text"
                className="form-input"
                placeholder="e.g. +61 3 9876 5432"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <Phone size={18} className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-bio">
              {isDoctor ? 'Clinical Bio / Practice Summary' : 'Department Notes / Bio'}
            </label>
            <textarea
              id="edit-bio"
              className="form-input"
              rows="3"
              style={{ paddingLeft: '14px', resize: 'vertical' }}
              placeholder="Brief description of practice expertise, consulting hours, or duties..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              style={{ width: 'auto', padding: '10px 24px', margin: 0 }}
              disabled={loading}
              id="btn-save-profile"
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
