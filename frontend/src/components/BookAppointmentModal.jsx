import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { appointmentService } from '../services/api';

const APPOINTMENT_TYPES = [
  'General Consultation',
  'Specialist Consultation',
  'Dental Checkup',
  'Follow-up Review',
  'Comprehensive Diagnostic',
  'Pre-procedure Assessment',
];

export default function BookAppointmentModal({ doctor, currentUser, isOpen, onClose, onBookingSuccess }) {
  if (!isOpen || !doctor) return null;

  const doctorName = doctor.full_name || `Dr. ${doctor.username}`;
  
  // Format Date to local 'YYYY-MM-DDTHH:mm' string for datetime-local input
  const formatToLocalDateTime = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
  };

  // Default datetime to tomorrow at 10:00 AM local time
  const getTomorrowDefault = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return formatToLocalDateTime(d);
  };

  // Minimum allowed datetime (now)
  const getMinLocalDateTime = () => {
    return formatToLocalDateTime(new Date());
  };

  // Check if chosen datetime is in the past (with 30-sec safety buffer)
  const isPastDateTime = (dtStr) => {
    if (!dtStr) return false;
    const parsed = new Date(dtStr).getTime();
    if (isNaN(parsed)) return false;
    return parsed < (Date.now() - 30000);
  };

  const [patientName, setPatientName] = useState(
    currentUser?.role === 'patient' 
      ? (currentUser.full_name || currentUser.username) 
      : (currentUser?.full_name || '')
  );
  const [appointmentDatetime, setAppointmentDatetime] = useState(getTomorrowDefault());
  const [appointmentType, setAppointmentType] = useState(
    doctor.specialization === 'Dentist' ? 'Dental Checkup' : 'Specialist Consultation'
  );
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [conflictWarning, setConflictWarning] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(null);

  // Derived validation: whether user has picked a past date/time
  const isPastSelected = isPastDateTime(appointmentDatetime);

  // Reset form values on modal open or doctor change
  useEffect(() => {
    if (isOpen) {
      setAppointmentDatetime(getTomorrowDefault());
      setErrorMsg('');
      setConflictWarning('');
      setBookingConfirmed(null);
      if (currentUser?.role === 'patient') {
        setPatientName(currentUser.full_name || currentUser.username);
      }
      if (doctor?.specialization === 'Dentist') {
        setAppointmentType('Dental Checkup');
      } else {
        setAppointmentType('Specialist Consultation');
      }
    }
  }, [isOpen, doctor?.username, currentUser?.id]);

  // Live schedule collision check whenever doctor or datetime changes (skips past dates)
  useEffect(() => {
    if (!appointmentDatetime || !doctorName) {
      setConflictWarning('');
      return;
    }

    if (isPastSelected) {
      setConflictWarning('');
      setCheckingAvailability(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const iso = new Date(appointmentDatetime).toISOString();
        const res = await appointmentService.checkAvailability(doctorName, iso);
        if (!res.available) {
          setConflictWarning(res.message);
        } else {
          setConflictWarning('');
        }
      } catch (err) {
        // Silently ignore check errors
      } finally {
        setCheckingAvailability(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [appointmentDatetime, doctorName, isPastSelected]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!patientName.trim()) {
      setErrorMsg('Please enter the patient full name.');
      return;
    }

    if (!appointmentDatetime) {
      setErrorMsg('Please select appointment date and time.');
      return;
    }

    if (isPastDateTime(appointmentDatetime)) {
      setErrorMsg('Invalid Appointment Time: Appointments cannot be scheduled for a past date or time. Please select an upcoming date and time.');
      return;
    }

    if (conflictWarning) {
      setErrorMsg(conflictWarning);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        patient_id: currentUser?.id || undefined,
        patient_name: patientName.trim(),
        doctor: doctorName,
        appointment_datetime: new Date(appointmentDatetime).toISOString(),
        appointment_type: appointmentType,
        status: 'Scheduled',
        notes: notes.trim() || undefined,
      };

      const result = await appointmentService.createAppointment(payload);
      setBookingConfirmed(result);
      if (onBookingSuccess) {
        onBookingSuccess(result);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setBookingConfirmed(null);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: '600px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-logo-icon" style={{ width: '40px', height: '40px' }}>
              <Calendar size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Book Clinical Appointment</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Schedule a consultation with {doctorName}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={handleClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Confirmation State */}
        {bookingConfirmed ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '36px 28px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: 'var(--emerald-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              border: '2px solid rgba(16, 185, 129, 0.4)'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
              Appointment Confirmed!
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Your appointment request has been scheduled into the Medical Wizard clinical calendar.
            </p>

            <div style={{ 
              background: 'var(--bg-input)', 
              borderRadius: 'var(--radius-md)', 
              padding: '20px', 
              textAlign: 'left',
              border: '1px solid var(--border-subtle)',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Booking Ref</span>
                <span style={{ fontWeight: 800, color: 'var(--text-accent)' }}>#APT-{bookingConfirmed.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Patient Name</span>
                <span style={{ fontWeight: 600 }}>{bookingConfirmed.patient_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Consulting Doctor</span>
                <span style={{ fontWeight: 600 }}>{bookingConfirmed.doctor}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Appointment Date & Time</span>
                <span style={{ fontWeight: 600, color: '#38bdf8' }}>
                  {new Date(bookingConfirmed.appointment_datetime).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Status</span>
                <span style={{ 
                  fontWeight: 700, 
                  color: 'var(--emerald-accent)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.78rem'
                }}>
                  {bookingConfirmed.status}
                </span>
              </div>
            </div>

            <button 
              type="button" 
              className="btn-submit" 
              onClick={handleClose}
              style={{ width: '100%' }}
            >
              Done & Return
            </button>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} className="modal-body">
            {/* Selected Doctor Summary Card */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(13, 148, 136, 0.15))',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-accent)', fontWeight: 700 }}>
                  Selected Clinician
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {doctorName}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {doctor.email} &bull; {doctor.phone_number || 'Clinic line'}
                </div>
              </div>

              {doctor.specialization && (
                <span className="role-pill doctor" style={{ background: 'rgba(6, 182, 212, 0.25)', borderColor: 'var(--primary)' }}>
                  <Stethoscope size={13} style={{ marginRight: '4px' }} />
                  {doctor.specialization}
                </span>
              )}
            </div>

            {errorMsg && (
              <div className="alert-box alert-danger">
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="book-patient-name">Patient Full Name *</label>
              <div className="input-with-icon">
                <input
                  id="book-patient-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. John Doe or Jane Smith"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                />
                <User size={18} className="input-icon" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="book-datetime">Appointment Date & Time *</label>
              <div className="input-with-icon">
                <input
                  id="book-datetime"
                  type="datetime-local"
                  className="form-input"
                  min={getMinLocalDateTime()}
                  value={appointmentDatetime}
                  onChange={(e) => {
                    setAppointmentDatetime(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  style={{ 
                    colorScheme: 'dark',
                    borderColor: isPastSelected ? 'rgba(239, 68, 68, 0.75)' : undefined,
                    boxShadow: isPastSelected ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined,
                  }}
                  required
                />
                <Clock size={18} className="input-icon" />
              </div>

              {/* Past Date & Time Validation Alert */}
              {isPastSelected && (
                <div 
                  id="past-datetime-warning"
                  className="alert-box alert-danger" 
                  style={{ 
                    marginTop: '8px', 
                    padding: '10px 14px', 
                    fontSize: '0.82rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    background: 'rgba(239, 68, 68, 0.12)'
                  }}
                >
                  <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span style={{ color: '#fca5a5', fontWeight: 600 }}>
                    Past Date Warning: An appointment cannot be booked for a past date or time. Please select an upcoming slot.
                  </span>
                </div>
              )}
              
              {checkingAvailability && !isPastSelected && (
                <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: '4px', display: 'block' }}>
                  Checking doctor schedule availability...
                </small>
              )}

              {conflictWarning && !isPastSelected && (
                <div className="alert-box alert-danger" style={{ marginTop: '8px', padding: '8px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{conflictWarning}</span>
                </div>
              )}

              {!conflictWarning && !checkingAvailability && !isPastSelected && appointmentDatetime && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.78rem', color: 'var(--emerald-accent)' }}>
                  <CheckCircle2 size={14} />
                  <span>Schedule verified: No collisions for {doctorName} at this time.</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="book-type">Appointment Type *</label>
              <select
                id="book-type"
                className="form-input role-select"
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
                required
              >
                {APPOINTMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="book-notes">Medical Notes / Symptoms (Optional)</label>
              <textarea
                id="book-notes"
                className="form-input"
                rows="3"
                style={{ paddingLeft: '14px', resize: 'vertical' }}
                placeholder="Brief reason for consultation, complaints, or referral details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="modal-footer">
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
                style={{ 
                  width: 'auto', 
                  padding: '10px 24px', 
                  margin: 0,
                  opacity: (conflictWarning || isPastSelected || !appointmentDatetime) ? 0.45 : 1,
                  cursor: (conflictWarning || isPastSelected || !appointmentDatetime) ? 'not-allowed' : 'pointer'
                }}
                disabled={loading || Boolean(conflictWarning) || isPastSelected || !appointmentDatetime}
                id="btn-confirm-booking"
                title={isPastSelected ? 'Cannot book an appointment for a past date or time' : undefined}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    <span>Scheduling...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Booking</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
