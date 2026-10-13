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
  ArrowRight,
  Lock,
  QrCode
} from 'lucide-react';
import { appointmentService, doctorService } from '../services/api';
import AppointmentReceiptModal from './AppointmentReceiptModal';

const APPOINTMENT_TYPES = [
  'General Consultation',
  'Specialist Consultation',
  'Dental Checkup',
  'Follow-up Review',
  'Comprehensive Diagnostic',
  'Pre-procedure Assessment',
];

export default function BookAppointmentModal({ doctor, currentUser, isOpen, onClose, onBookingSuccess, onNavigate }) {
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

  // Check if a specific slot on the selected date is in the past
  const isSlotPast = (slotTime) => {
    if (!selectedDateStr || !slotTime) return false;
    const parsed = new Date(`${selectedDateStr}T${slotTime}`).getTime();
    if (isNaN(parsed)) return false;
    return parsed < Date.now();
  };

  const formatTimeLabel = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hourNum = parseInt(h, 10);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
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
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Doctor schedule & daily capacity state
  const [daySchedule, setDaySchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Derived validation: whether user has picked a past date/time
  const isPastSelected = isPastDateTime(appointmentDatetime);
  const selectedDateStr = appointmentDatetime ? appointmentDatetime.slice(0, 10) : '';

  // Role and Authentication checks: strictly patients and staff/admin can book
  const isPatientOrStaff = Boolean(
    currentUser && (currentUser.role === 'patient' || currentUser.role === 'staff' || currentUser.role === 'admin')
  );
  const isDoctor = currentUser?.role === 'doctor';
  const isAnonymous = !currentUser;

  // Fetch doctor's available times and daily appointment capacity for chosen date
  useEffect(() => {
    if (!selectedDateStr || !doctorName) {
      setDaySchedule(null);
      return;
    }

    let isMounted = true;
    const fetchSchedule = async () => {
      setLoadingSchedule(true);
      try {
        const sched = await doctorService.getDoctorSchedule(doctorName, selectedDateStr);
        if (isMounted) setDaySchedule(sched);
      } catch (err) {
        if (isMounted) setDaySchedule(null);
      } finally {
        if (isMounted) setLoadingSchedule(false);
      }
    };

    fetchSchedule();
    return () => { isMounted = false; };
  }, [selectedDateStr, doctorName]);

  // When schedule loads, if selected time slot is in the past, automatically select the first upcoming available slot
  useEffect(() => {
    if (daySchedule?.time_slots?.length > 0 && daySchedule.is_available && !daySchedule.is_capacity_reached) {
      if (isPastDateTime(appointmentDatetime)) {
        const firstUpcoming = daySchedule.time_slots.find((s) => {
          const slotTs = new Date(`${selectedDateStr}T${s.time}`).getTime();
          return s.available && s.reason !== 'past' && slotTs > Date.now();
        });
        if (firstUpcoming) {
          setAppointmentDatetime(`${selectedDateStr}T${firstUpcoming.time}`);
        }
      }
    }
  }, [daySchedule, selectedDateStr, appointmentDatetime]);

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
          const doc = res.conflict_doctor || doctorName;
          setConflictWarning(`${doc} already has an appointment scheduled for the selected time`);
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

    if (!currentUser) {
      setErrorMsg('Sign In Required: Only logged-in patients and authorized staff can create clinical appointments.');
      return;
    }

    if (!isPatientOrStaff) {
      setErrorMsg('Access Denied: Only patients and clinic staff can create appointments. Doctor accounts cannot book consultations.');
      return;
    }

    if (!patientName.trim()) {
      setErrorMsg('Please enter the patient full name.');
      return;
    }

    if (!appointmentDatetime) {
      setErrorMsg('Please select appointment date and time.');
      return;
    }

    if (isPastDateTime(appointmentDatetime)) {
      const firstUpcoming = daySchedule?.time_slots?.find((s) => {
        const slotTs = new Date(`${selectedDateStr}T${s.time}`).getTime();
        return s.available && s.reason !== 'past' && slotTs > Date.now();
      });
      if (firstUpcoming) {
        setAppointmentDatetime(`${selectedDateStr}T${firstUpcoming.time}`);
        return;
      }
      setErrorMsg('No upcoming consultation slots remaining for this date. Please select another upcoming date.');
      return;
    }

    if (daySchedule && daySchedule.is_available === false) {
      setErrorMsg(`Doctor Unavailable: ${doctorName} is off-duty / unavailable on ${selectedDateStr}. Please select another date.`);
      return;
    }

    if (daySchedule && daySchedule.is_capacity_reached) {
      setErrorMsg(`Booking Limit Reached: ${doctorName} accepts a maximum of ${daySchedule.max_appointments} appointments on this date and is fully booked. Please select another date.`);
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
      const msg = err.message || '';
      if (err.status === 409 || msg.includes('Conflict') || msg.includes('already has')) {
        setErrorMsg(`${doctorName} already has an appointment scheduled for the selected time`);
      } else {
        setErrorMsg(msg || 'Unable to book appointment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (time24) => {
    if (!selectedDateStr) return;
    if (isSlotPast(time24)) return; // Past slots are completely not clickable
    setAppointmentDatetime(`${selectedDateStr}T${time24}`);
    setErrorMsg('');
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Check-in Code</span>
                <span style={{ fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.08em' }}>
                  {bookingConfirmed.verification_code || `#APT-${bookingConfirmed.id}`}
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

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button 
                type="button" 
                className="btn-submit" 
                onClick={() => setShowReceiptModal(true)}
                style={{ 
                  flex: 1.2, 
                  margin: 0,
                  background: 'linear-gradient(135deg, #06b6d4, #0d9488)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)'
                }}
              >
                <QrCode size={16} />
                <span>View Receipt &amp; QR Pass</span>
              </button>
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={handleClose}
                style={{ flex: 1 }}
              >
                Done &amp; Return
              </button>
            </div>
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

            {isAnonymous && (
              <div 
                className="alert-box alert-warning" 
                style={{ 
                  marginBottom: '18px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderColor: 'rgba(245, 158, 11, 0.35)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#f59e0b' }}>
                  <Lock size={16} />
                  <span>Sign In Required to Book</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                  Only logged-in patients and authorized clinical staff can book appointments. Please sign in or register a patient account to reserve your appointment with {doctorName}.
                </p>
                {onNavigate && (
                  <button
                    type="button"
                    className="btn-submit"
                    style={{ 
                      width: 'auto', 
                      alignSelf: 'flex-start', 
                      padding: '7px 16px', 
                      fontSize: '0.82rem', 
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onClick={() => {
                      handleClose();
                      onNavigate('staff');
                    }}
                  >
                    <span>Sign In / Register</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}

            {isDoctor && (
              <div 
                className="alert-box alert-warning" 
                style={{ 
                  marginBottom: '18px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderColor: 'rgba(245, 158, 11, 0.35)'
                }}
              >
                <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.84rem', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#f59e0b' }}>Clinician Notice:</strong> Doctor accounts cannot book appointments. Only patients and authorized clinic staff can schedule consultations.
                </span>
              </div>
            )}

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
                  style={{ colorScheme: 'dark' }}
                  required
                />
                <Clock size={18} className="input-icon" />
              </div>

              {/* Doctor Working Hours & Daily Appointment Capacity Widget */}
              {daySchedule && (
                <div style={{
                  background: (daySchedule.is_capacity_reached || !daySchedule.is_available)
                    ? 'rgba(239, 68, 68, 0.1)' 
                    : 'rgba(6, 182, 212, 0.08)',
                  border: `1px solid ${(daySchedule.is_capacity_reached || !daySchedule.is_available) ? 'rgba(239, 68, 68, 0.35)' : 'rgba(6, 182, 212, 0.25)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  marginTop: '10px',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: (daySchedule.is_capacity_reached || !daySchedule.is_available) ? '#f87171' : 'var(--text-accent)' }}>
                      <Clock size={14} />
                      <span>Doctor Working Hours: {formatTimeLabel(daySchedule.start_time)} - {formatTimeLabel(daySchedule.end_time)}</span>
                    </div>

                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '2px 10px',
                      borderRadius: '10px',
                      background: daySchedule.is_capacity_reached 
                        ? 'rgba(239, 68, 68, 0.2)' 
                        : (daySchedule.is_available ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.2)'),
                      color: daySchedule.is_capacity_reached 
                        ? '#fca5a5' 
                        : (daySchedule.is_available ? 'var(--emerald-accent)' : '#fca5a5')
                    }}>
                      {daySchedule.is_capacity_reached 
                        ? `Fully Booked (${daySchedule.booked_count}/${daySchedule.max_appointments} capacity)` 
                        : (daySchedule.is_available 
                            ? `${daySchedule.remaining_slots} of ${daySchedule.max_appointments} appointments available` 
                            : 'Off-Duty / Unavailable')}
                    </span>
                  </div>

                  {daySchedule.notes && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '8px', fontStyle: 'italic' }}>
                      Schedule note: {daySchedule.notes}
                    </div>
                  )}

                  {/* Unavailable / Capacity Reached Alert */}
                  {!daySchedule.is_available && (
                    <div style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <AlertCircle size={14} />
                      <span>{doctorName} is not available for consultations on this date. Please select another date.</span>
                    </div>
                  )}

                  {daySchedule.is_capacity_reached && daySchedule.is_available && (
                    <div style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <AlertCircle size={14} />
                      <span>Daily limit reached: {doctorName} accepts a maximum of {daySchedule.max_appointments} appointments for this date and is fully booked. Please select another date.</span>
                    </div>
                  )}

                  {/* Interactive Time Slot Pills */}
                  {daySchedule.is_available && !daySchedule.is_capacity_reached && daySchedule.time_slots?.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Click to select an available consultation slot:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto', padding: '2px' }}>
                        {daySchedule.time_slots.map((slot) => {
                          const isPast = isSlotPast(slot.time) || slot.reason === 'past';
                          const isClickable = slot.available && !isPast;
                          const isSelected = !isPast && appointmentDatetime === `${selectedDateStr}T${slot.time}`;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!isClickable}
                              onClick={isClickable ? () => handleSelectSlot(slot.time) : undefined}
                              style={{
                                padding: '6px 11px',
                                fontSize: '0.74rem',
                                borderRadius: '6px',
                                border: isSelected 
                                  ? '1px solid var(--primary)' 
                                  : (isClickable ? '1px solid var(--border-subtle)' : '1px solid rgba(255,255,255,0.05)'),
                                background: isSelected 
                                  ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(13, 148, 136, 0.45))' 
                                  : (isClickable ? 'var(--bg-surface)' : 'rgba(255, 255, 255, 0.02)'),
                                color: isSelected 
                                  ? '#fff' 
                                  : (isClickable ? 'var(--text-primary)' : 'rgba(148, 163, 184, 0.3)'),
                                cursor: isClickable ? 'pointer' : 'not-allowed',
                                opacity: isClickable ? 1 : 0.32,
                                pointerEvents: isClickable ? 'auto' : 'none',
                                fontWeight: isSelected ? 700 : 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                textDecoration: slot.reason === 'booked' ? 'line-through' : 'none',
                                userSelect: 'none'
                              }}
                              title={
                                isPast 
                                  ? 'Time slot unavailable' 
                                  : slot.reason === 'booked' 
                                  ? 'Slot already booked' 
                                  : `Select consultation at ${slot.label}`
                              }
                            >
                              {slot.label}
                              {isSelected && <CheckCircle2 size={12} color="var(--emerald-accent)" />}
                              {!slot.available && slot.reason === 'booked' && (
                                <span style={{ fontSize: '0.62rem', opacity: 0.8, color: '#f87171' }}>Booked</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {checkingAvailability && (
                <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: '4px', display: 'block' }}>
                  Checking doctor schedule availability...
                </small>
              )}

              {conflictWarning && (
                <div className="alert-box alert-danger" style={{ marginTop: '8px', padding: '8px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{conflictWarning}</span>
                </div>
              )}

              {!conflictWarning && !checkingAvailability && appointmentDatetime && !isPastSelected && (
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
                  opacity: (!isPatientOrStaff || conflictWarning || isPastSelected || !appointmentDatetime || daySchedule?.is_capacity_reached || daySchedule?.is_available === false) ? 0.45 : 1,
                  cursor: (!isPatientOrStaff || conflictWarning || isPastSelected || !appointmentDatetime || daySchedule?.is_capacity_reached || daySchedule?.is_available === false) ? 'not-allowed' : 'pointer'
                }}
                disabled={!isPatientOrStaff || loading || Boolean(conflictWarning) || isPastSelected || !appointmentDatetime || Boolean(daySchedule?.is_capacity_reached) || daySchedule?.is_available === false}
                id="btn-confirm-booking"
                title={
                  !currentUser 
                    ? 'Sign in required: Only logged-in patients and authorized staff can book appointments' 
                    : (isDoctor 
                        ? 'Clinician notice: Doctor accounts cannot book appointments' 
                        : (conflictWarning 
                            ? conflictWarning 
                            : (isPastSelected ? 'Cannot book an appointment for a past date or time' : undefined)))
                }
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

      {/* Official Receipt & QR Pass Modal */}
      {bookingConfirmed && (
        <AppointmentReceiptModal
          appointment={bookingConfirmed}
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            handleClose();
          }}
        />
      )}
    </div>
  );
}
