import React, { useState } from 'react';
import { 
  X, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  User, 
  Stethoscope, 
  ShieldCheck, 
  Sparkles,
  FileText,
  QrCode
} from 'lucide-react';
import { appointmentService } from '../services/api';

export default function StaffVerifyPatientModal({ isOpen, onClose, onVerificationSuccess, currentStaff }) {
  if (!isOpen) return null;

  const [code, setCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [foundApt, setFoundApt] = useState(null);
  const [frontdeskNotes, setFrontdeskNotes] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const normalizeCodeInput = (input) => {
    return input.trim().toUpperCase().replace(/\s+/g, '');
  };

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = normalizeCodeInput(code);
    if (!cleanCode) {
      setErrorMsg('Please enter an appointment verification code.');
      return;
    }

    setLookingUp(true);
    setErrorMsg('');
    setFoundApt(null);
    setSuccessResult(null);

    try {
      const apt = await appointmentService.lookupVerification(cleanCode);
      setFoundApt(apt);
    } catch (err) {
      setErrorMsg(err.message || `No appointment found with verification code '${cleanCode}'. Please check and try again.`);
    } finally {
      setLookingUp(false);
    }
  };

  const handleConfirmCheckin = async () => {
    if (!foundApt) return;
    setVerifying(true);
    setErrorMsg('');

    try {
      const cleanCode = foundApt.verification_code || normalizeCodeInput(code);
      const res = await appointmentService.verifyPatientArrival(cleanCode, frontdeskNotes);
      setSuccessResult(res.appointment || foundApt);
      if (onVerificationSuccess) {
        onVerificationSuccess(res.appointment || foundApt);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Check-in verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleReset = () => {
    setCode('');
    setFoundApt(null);
    setErrorMsg('');
    setFrontdeskNotes('');
    setSuccessResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const isAlreadyCheckedIn = foundApt && (foundApt.status === 'Checked In' || foundApt.is_verified);
  const isCancelled = foundApt && foundApt.status === 'Cancelled';

  return (
    <div className="modal-backdrop" style={{ zIndex: 1150 }}>
      <div className="modal-container" style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-logo-icon" style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
              <QrCode size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                Patient Check-In &amp; Verification
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '2px 0 0' }}>
                Reception terminal &bull; Verify arriving patient by appointment code
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '24px' }}>
          {/* Success Check-in State */}
          {successResult ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div 
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: 'rgba(16, 185, 129, 0.15)', 
                  color: 'var(--emerald-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  border: '2px solid rgba(16, 185, 129, 0.4)'
                }}
              >
                <CheckCircle2 size={34} />
              </div>

              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>
                Patient Verified &amp; Checked In!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
                <strong>{successResult.patient_name}</strong> is now checked in for <strong>{successResult.doctor}</strong>.
              </p>

              <div 
                style={{ 
                  background: 'var(--bg-input)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '16px 20px', 
                  textAlign: 'left',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.86rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Verification Code</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>{successResult.verification_code}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <span style={{ fontWeight: 700, color: 'var(--emerald-accent)' }}>Checked In (Verified)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Consulting Doctor</span>
                  <span style={{ fontWeight: 600 }}>{successResult.doctor}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Appointment Time</span>
                  <span style={{ fontWeight: 600 }}>{new Date(successResult.appointment_datetime).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleReset}
                  style={{ flex: 1 }}
                >
                  Verify Another Patient
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={handleClose}
                  style={{ flex: 1, margin: 0 }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Code Entry Input */}
              <form onSubmit={handleLookup} style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Patient Verification Code</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>
                    e.g. MW-849201 or 849201
                  </span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      className="form-input"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setErrorMsg('');
                      }}
                      placeholder="Enter verification code..."
                      style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '1.05rem', 
                        letterSpacing: '0.08em', 
                        textTransform: 'uppercase',
                        paddingLeft: '14px',
                        fontWeight: 700
                      }}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-submit"
                    style={{ width: 'auto', padding: '0 20px', margin: 0 }}
                    disabled={lookingUp || !code.trim()}
                  >
                    {lookingUp ? 'Searching...' : 'Lookup'}
                  </button>
                </div>
              </form>

              {/* Error Message Banner */}
              {errorMsg && (
                <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Found Appointment Card */}
              {foundApt && (
                <div 
                  style={{ 
                    background: 'var(--bg-surface)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border-subtle)',
                    padding: '18px',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} color="var(--primary)" />
                      <strong style={{ fontSize: '1rem' }}>{foundApt.patient_name}</strong>
                    </div>
                    <span 
                      style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        padding: '3px 8px', 
                        borderRadius: '6px',
                        background: isAlreadyCheckedIn ? 'rgba(16, 185, 129, 0.15)' : isCancelled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: isAlreadyCheckedIn ? '#6ee7b7' : isCancelled ? '#fca5a5' : '#38bdf8'
                      }}
                    >
                      {foundApt.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.84rem', marginBottom: '14px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Doctor</span>
                      <strong style={{ color: 'var(--teal-accent)' }}>{foundApt.doctor}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Type</span>
                      <span>{foundApt.appointment_type}</span>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Scheduled Time</span>
                      <strong style={{ color: '#e2e8f0' }}>
                        {new Date(foundApt.appointment_datetime).toLocaleString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </strong>
                    </div>
                  </div>

                  {/* Warning / Notice for already checked in or cancelled */}
                  {isAlreadyCheckedIn && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} />
                      <span>
                        Patient is already marked as <strong>Checked In</strong>
                        {foundApt.verified_by ? ` by ${foundApt.verified_by}` : ''}.
                      </span>
                    </div>
                  )}

                  {isCancelled && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} />
                      <span>This appointment has been cancelled and cannot be checked in.</span>
                    </div>
                  )}

                  {/* Optional Check-in Note */}
                  {!isCancelled && !isAlreadyCheckedIn && (
                    <div style={{ marginTop: '14px' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>
                        Front-Desk Arrival Notes (Optional)
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={frontdeskNotes}
                        onChange={(e) => setFrontdeskNotes(e.target.value)}
                        placeholder="e.g. Arrived on time, Medicare card verified..."
                        style={{ fontSize: '0.84rem' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
                <button type="button" className="btn-cancel" onClick={handleClose}>
                  Cancel
                </button>
                {foundApt && !isCancelled && !isAlreadyCheckedIn && (
                  <button
                    type="button"
                    className="btn-submit"
                    onClick={handleConfirmCheckin}
                    disabled={verifying}
                    style={{ 
                      width: 'auto', 
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{verifying ? 'Verifying...' : 'Confirm Patient Check-In'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
