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

  const isAlreadyCompleted = foundApt && (foundApt.status === 'Completed' || foundApt.status === 'Checked In' || foundApt.is_verified);
  const isCancelled = foundApt && foundApt.status === 'Cancelled';
  const isExpired = foundApt && foundApt.status === 'Expired';

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200 }}>
      <div
        className="modal-container"
        style={{
          maxWidth: '540px',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9', padding: '22px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-logo-icon" style={{ width: '40px', height: '40px', background: '#ecfdf5', borderColor: '#a7f3d0', color: '#059669', borderRadius: '12px' }}>
              <QrCode size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Patient Check-In &amp; Verification
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '2px 0 0' }}>
                Reception terminal &bull; Verify arriving patient by appointment pass code
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '24px 26px' }}>
          {/* Success Check-in State */}
          {successResult ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div 
                style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: '#ecfdf5', 
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  border: '2px solid #a7f3d0',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)'
                }}
              >
                <CheckCircle2 size={34} />
              </div>

              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px', color: '#0f172a' }}>
                Patient Verified &amp; Completed!
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '20px' }}>
                <strong>{successResult.patient_name}</strong> is verified with QR pass and marked as <strong>Completed</strong> for <strong>{successResult.doctor}</strong>.
              </p>

              <div 
                style={{ 
                  background: '#f8fafc', 
                  borderRadius: '14px', 
                  padding: '16px 20px', 
                  textAlign: 'left',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.86rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Verification Code</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7' }}>{successResult.verification_code}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Status</span>
                  <span style={{ fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '2px 8px', borderRadius: '12px', fontSize: '0.74rem' }}>
                    Completed (Verified)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Consulting Doctor</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{successResult.doctor}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Appointment Time</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{new Date(successResult.appointment_datetime).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleReset}
                  style={{ flex: 1, padding: '10px', borderRadius: '12px' }}
                >
                  Verify Another Patient
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={handleClose}
                  style={{ flex: 1, margin: 0, padding: '10px', borderRadius: '12px' }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Code Entry Input */}
              <form onSubmit={handleLookup} style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontWeight: 700, fontSize: '0.82rem', marginBottom: '8px' }}>
                  <span>Patient Verification Pass Code</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 400 }}>
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
                        fontWeight: 700,
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        color: '#0f172a'
                      }}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-submit"
                    style={{ width: 'auto', padding: '0 20px', margin: 0, borderRadius: '12px', background: '#0284c7' }}
                    disabled={lookingUp || !code.trim()}
                  >
                    {lookingUp ? 'Searching...' : 'Lookup'}
                  </button>
                </div>
              </form>

              {/* Error Message Banner */}
              {errorMsg && (
                <div className="alert-box alert-danger" style={{ marginBottom: '16px', borderRadius: '12px' }}>
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Found Appointment Card */}
              {foundApt && (
                <div 
                  style={{ 
                    background: '#f8fafc', 
                    borderRadius: '14px', 
                    border: '1px solid #e2e8f0',
                    padding: '18px',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} color="#0284c7" />
                      <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{foundApt.patient_name}</strong>
                    </div>
                    <span 
                      style={{ 
                        fontSize: '0.74rem', 
                        fontWeight: 700,
                        padding: '3px 10px', 
                        borderRadius: '12px',
                        background: isAlreadyCompleted ? '#ede9fe' : isExpired ? '#fef3c7' : isCancelled ? '#ffe4e6' : '#e0f2fe',
                        color: isAlreadyCompleted ? '#6d28d9' : isExpired ? '#b45309' : isCancelled ? '#e11d48' : '#0284c7',
                        border: `1px solid ${isAlreadyCompleted ? '#ddd6fe' : isExpired ? '#fde68a' : isCancelled ? '#fecdd3' : '#bae6fd'}`
                      }}
                    >
                      {foundApt.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.84rem', marginBottom: '14px', color: '#334155' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Doctor</span>
                      <strong style={{ color: '#0284c7' }}>{foundApt.doctor}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Type</span>
                      <span style={{ fontWeight: 600 }}>{foundApt.appointment_type}</span>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Scheduled Time</span>
                      <strong style={{ color: '#0f172a' }}>
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

                  {/* Warning / Notice for completed, expired, or cancelled */}
                  {isAlreadyCompleted && (
                    <div style={{ background: '#ede9fe', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} />
                      <span>
                        Patient is already marked as <strong>Completed</strong>
                        {foundApt.verified_by ? ` by ${foundApt.verified_by}` : ''}.
                      </span>
                    </div>
                  )}

                  {isExpired && (
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} />
                      <span>This appointment has <strong>Expired</strong> because the scheduled consultation time has passed without attendance.</span>
                    </div>
                  )}

                  {isCancelled && (
                    <div style={{ background: '#ffe4e6', border: '1px solid #fecdd3', borderRadius: '10px', padding: '10px 14px', fontSize: '0.82rem', color: '#e11d48', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} />
                      <span>This appointment has been cancelled and cannot be checked in.</span>
                    </div>
                  )}

                  {/* Optional Check-in Note */}
                  {!isCancelled && !isExpired && !isAlreadyCompleted && (
                    <div style={{ marginTop: '14px' }}>
                      <label className="form-label" style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                        Front-Desk Notes (Optional)
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={frontdeskNotes}
                        onChange={(e) => setFrontdeskNotes(e.target.value)}
                        placeholder="e.g. Arrived on time, Medicare verified..."
                        style={{ fontSize: '0.84rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '9px 12px', width: '100%', color: '#0f172a' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="modal-footer" style={{ padding: 0, marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-cancel" onClick={handleClose} style={{ padding: '10px 16px', borderRadius: '12px' }}>
                  Cancel
                </button>
                {foundApt && !isCancelled && !isExpired && !isAlreadyCompleted && (
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
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{verifying ? 'Verifying...' : 'Verify QR Pass & Complete'}</span>
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


