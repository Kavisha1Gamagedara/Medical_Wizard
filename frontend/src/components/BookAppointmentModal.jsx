import React, { useState, useEffect, useRef } from 'react';
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
  QrCode,
  Search,
  UserCheck
} from 'lucide-react';
import { appointmentService, doctorService, userService, waitlistService } from '../services/api';
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

  const isStaffOrAdmin = currentUser?.role === 'staff' || currentUser?.role === 'admin';

  const [patientName, setPatientName] = useState(
    currentUser?.role === 'patient' 
      ? (currentUser.full_name || currentUser.username) 
      : ''
  );
  const [appointmentDatetime, setAppointmentDatetime] = useState(getTomorrowDefault());
  const [appointmentType, setAppointmentType] = useState(
    doctor.specialization === 'Dentist' ? 'Dental Checkup' : 'Specialist Consultation'
  );
  const [notes, setNotes] = useState('');

  // Existing Patient Search State (for Staff / Admin)
  const [isExistingPatient, setIsExistingPatient] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const dateInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [conflictWarning, setConflictWarning] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Doctor schedule & daily capacity state
  const [daySchedule, setDaySchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Priority Waiting list state
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState('');
  const [waitlistError, setWaitlistError] = useState('');

  // Derived validation: whether user has picked a past date/time
  const isPastSelected = isPastDateTime(appointmentDatetime);
  const selectedDateStr = appointmentDatetime ? appointmentDatetime.slice(0, 10) : '';
  const selectedTimeStr = appointmentDatetime && appointmentDatetime.length >= 16 ? appointmentDatetime.slice(11, 16) : '10:00';

  const getTodayDateStr = () => {
    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const getRelativeDateStr = (daysAhead) => {
    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const handleSelectDate = (newDateStr) => {
    if (!newDateStr) return;
    const currentTime = selectedTimeStr || '10:00';
    setAppointmentDatetime(`${newDateStr}T${currentTime}`);
    if (errorMsg) setErrorMsg('');
  };

  const handleSelectTime = (newTimeStr) => {
    if (!newTimeStr || !selectedDateStr) return;
    setAppointmentDatetime(`${selectedDateStr}T${newTimeStr}`);
    if (errorMsg) setErrorMsg('');
  };

  const handleOpenCalendar = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

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
      setWaitlistSuccess('');
      setWaitlistError('');
      if (currentUser?.role === 'patient') {
        setPatientName(currentUser.full_name || currentUser.username);
      } else {
        setPatientName('');
      }
      setIsExistingPatient(false);
      setSelectedPatient(null);
      setPatientSearchQuery('');
      setPatientSearchResults([]);
      setShowPatientDropdown(false);
      if (doctor?.specialization === 'Dentist') {
        setAppointmentType('Dental Checkup');
      } else {
        setAppointmentType('Specialist Consultation');
      }
    }
  }, [isOpen, doctor?.username, currentUser?.id]);

  const handleJoinWaitlist = async () => {
    if (!currentUser) {
      setWaitlistError('Please log in as a patient to join the priority waitlist.');
      return;
    }
    setJoiningWaitlist(true);
    setWaitlistError('');
    setWaitlistSuccess('');
    try {
      await waitlistService.joinWaitlist({
        doctor: doctorName,
        preferred_date: selectedDateStr,
        preferred_time: selectedTimeStr || undefined,
        notes: notes.trim() || undefined,
      });
      setWaitlistSuccess(`You have successfully joined the Priority Waitlist for Dr. ${doctorName} on ${selectedDateStr}. If any appointment is cancelled, you will be notified immediately!`);
      // Also trigger a storage event so dashboards update
      window.dispatchEvent(new CustomEvent('mw_notification_created'));
    } catch (err) {
      setWaitlistError(err.message || 'Failed to join waitlist. You may already be on the list.');
    } finally {
      setJoiningWaitlist(false);
    }
  };

  // Live query for registered patients when Existing Patient checkbox is checked
  useEffect(() => {
    if (!isStaffOrAdmin || !isExistingPatient) {
      setPatientSearchResults([]);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const results = await userService.searchPatients(patientSearchQuery);
        if (isMounted) {
          setPatientSearchResults(results || []);
        }
      } catch (err) {
        if (isMounted) setPatientSearchResults([]);
      } finally {
        if (isMounted) setSearchingPatients(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [patientSearchQuery, isExistingPatient, isStaffOrAdmin]);

  // Close patient dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectExistingPatient = (pat) => {
    setSelectedPatient(pat);
    const chosenName = pat.full_name || pat.username;
    setPatientName(chosenName);
    setPatientSearchQuery(chosenName);
    setShowPatientDropdown(false);
    setErrorMsg('');
  };

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

    if (isStaffOrAdmin && isExistingPatient && !selectedPatient) {
      setErrorMsg('Please search and select a registered patient from the suggestions, or uncheck "Existing Patient" for walk-in / guest patients.');
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
        patient_id: (isStaffOrAdmin && isExistingPatient && selectedPatient)
          ? selectedPatient.id
          : (currentUser?.role === 'patient' ? currentUser.id : undefined),
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
    setIsExistingPatient(false);
    setSelectedPatient(null);
    setPatientSearchQuery('');
    setPatientSearchResults([]);
    setShowPatientDropdown(false);
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

            {/* Staff / Admin Existing Patient Toggle */}
            {isStaffOrAdmin && (
              <div 
                style={{
                  background: isExistingPatient 
                    ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(16, 185, 129, 0.08))' 
                    : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isExistingPatient ? 'rgba(6, 182, 212, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.25s ease'
                }}
              >
                <label 
                  htmlFor="book-existing-patient-checkbox" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    cursor: 'pointer',
                    userSelect: 'none',
                    margin: 0,
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    color: isExistingPatient ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <input
                    id="book-existing-patient-checkbox"
                    type="checkbox"
                    checked={isExistingPatient}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsExistingPatient(checked);
                      setSelectedPatient(null);
                      setPatientSearchQuery('');
                      setPatientSearchResults([]);
                      setShowPatientDropdown(false);
                      if (!checked) {
                        setPatientName('');
                      }
                      if (errorMsg) setErrorMsg('');
                    }}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--primary)',
                      cursor: 'pointer'
                    }}
                  />
                  <span>Existing Patient</span>
                </label>
                <span 
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: isExistingPatient ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    color: isExistingPatient ? 'var(--text-accent)' : 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {isExistingPatient ? 'Profile Link Mode' : 'Guest / Walk-In'}
                </span>
              </div>
            )}

            {/* Existing Patient Search & Selected Card (Staff / Admin) */}
            {isStaffOrAdmin && isExistingPatient ? (
              <div style={{ marginBottom: '16px' }}>
                {selectedPatient ? (
                  /* Selected Patient Details Card */
                  <div 
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.08))',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserCheck size={18} color="#10b981" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Verified Patient Details Linked
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setPatientName('');
                          setPatientSearchQuery('');
                          setShowPatientDropdown(true);
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        }}
                      >
                        Change Patient
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #06b6d4, #10b981)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          color: '#ffffff',
                          flexShrink: 0
                        }}>
                          {(selectedPatient.full_name || selectedPatient.username || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                            Patient Name
                          </span>
                          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {selectedPatient.full_name || selectedPatient.username}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                          Email Address
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {selectedPatient.email || 'N/A'}
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                          Contact Phone
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {selectedPatient.phone_number || 'N/A'}
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                          Account Identifier
                        </span>
                        <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-accent)' }}>
                          ID #{selectedPatient.id} (@{selectedPatient.username})
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Patient Search Query Input with Suggestion Dropdown */
                  <div className="form-group" style={{ position: 'relative', marginBottom: 0 }} ref={dropdownRef}>
                    <label className="form-label" htmlFor="book-patient-search">
                      Search Patient (by Name or Email) *
                    </label>
                    <div className="input-with-icon" style={{ position: 'relative' }}>
                      <input
                        id="book-patient-search"
                        type="text"
                        className="form-input"
                        placeholder="Type patient name or email (e.g., Sarah or patient@clinic.com)..."
                        value={patientSearchQuery}
                        onChange={(e) => {
                          setPatientSearchQuery(e.target.value);
                          setShowPatientDropdown(true);
                          if (errorMsg) setErrorMsg('');
                        }}
                        onFocus={() => setShowPatientDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault();
                        }}
                        autoComplete="off"
                        required
                      />
                      <Search size={18} className="input-icon" />
                      {searchingPatients && (
                        <span style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '0.74rem',
                          color: 'var(--text-accent)',
                          fontWeight: 600
                        }}>
                          Searching...
                        </span>
                      )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showPatientDropdown && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '6px',
                          background: '#151c2c',
                          border: '1px solid rgba(6, 182, 212, 0.35)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65)',
                          maxHeight: '260px',
                          overflowY: 'auto',
                          zIndex: 100,
                          padding: '6px'
                        }}
                      >
                        {searchingPatients ? (
                          <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                            Searching registered patients...
                          </div>
                        ) : patientSearchResults.length > 0 ? (
                          <div>
                            <div style={{ 
                              padding: '6px 10px', 
                              fontSize: '0.7rem', 
                              color: 'var(--text-muted)', 
                              textTransform: 'uppercase', 
                              fontWeight: 700,
                              letterSpacing: '0.04em' 
                            }}>
                              Matching Registered Patients ({patientSearchResults.length})
                            </div>
                            {patientSearchResults.map((pat) => (
                              <div
                                key={pat.id}
                                onClick={() => handleSelectExistingPatient(pat)}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(6, 182, 212, 0.12)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(16, 185, 129, 0.3))',
                                    border: '1px solid rgba(6, 182, 212, 0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)'
                                  }}>
                                    {(pat.full_name || pat.username || 'P').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {pat.full_name || pat.username}
                                    </div>
                                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                      {pat.email} {pat.phone_number ? `• ${pat.phone_number}` : ''}
                                    </div>
                                  </div>
                                </div>

                                <span style={{
                                  fontSize: '0.72rem',
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  background: 'rgba(6, 182, 212, 0.18)',
                                  border: '1px solid rgba(6, 182, 212, 0.3)',
                                  color: 'var(--text-accent)',
                                  fontWeight: 600
                                }}>
                                  Select Patient
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {patientSearchQuery.trim()
                              ? `No registered patients found matching "${patientSearchQuery}"`
                              : 'Type patient full name or email address to view suggestions'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Regular / Guest Walk-in Patient Full Name Input */
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
            )}

            {/* Step 1: Consultation Date Picker with Visible Calendar & Shortcuts */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" htmlFor="book-date" style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Appointment Date *
                </label>
                <button
                  type="button"
                  onClick={handleOpenCalendar}
                  style={{
                    background: 'rgba(6, 182, 212, 0.12)',
                    border: '1px solid rgba(6, 182, 212, 0.35)',
                    color: 'var(--primary)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Click to open calendar date picker"
                >
                  <Calendar size={13} />
                  <span>Open Calendar</span>
                </button>
              </div>

              <div className="input-with-icon" style={{ position: 'relative' }}>
                <input
                  id="book-date"
                  ref={dateInputRef}
                  type="date"
                  className="form-input"
                  min={getTodayDateStr()}
                  value={selectedDateStr}
                  onChange={(e) => handleSelectDate(e.target.value)}
                  onClick={handleOpenCalendar}
                  style={{ 
                    colorScheme: 'light',
                    fontWeight: 700,
                    fontSize: '0.96rem',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                  required
                />
                <Calendar 
                  size={18} 
                  className="input-icon" 
                  style={{ color: 'var(--primary)', cursor: 'pointer' }}
                  onClick={handleOpenCalendar}
                />
              </div>

              {/* Quick Date Shortcut Pills */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '2px' }}>
                  Quick Dates:
                </span>
                {[
                  { label: 'Today', date: getTodayDateStr() },
                  { label: 'Tomorrow', date: getRelativeDateStr(1) },
                  { label: 'In 2 Days', date: getRelativeDateStr(2) },
                  { label: 'Next Week', date: getRelativeDateStr(7) },
                ].map((shortcut) => {
                  const isSelected = selectedDateStr === shortcut.date;
                  return (
                    <button
                      key={shortcut.label}
                      type="button"
                      onClick={() => handleSelectDate(shortcut.date)}
                      style={{
                        padding: '3px 10px',
                        fontSize: '0.74rem',
                        borderRadius: '14px',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(6, 182, 212, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? 'var(--text-accent)' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {shortcut.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Doctor Schedule & Time Slot Selection */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
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
                    <div style={{
                      marginTop: '8px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '12px',
                      padding: '12px 14px'
                    }}>
                      <div style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={15} />
                        <span>Daily limit reached: {doctorName} accepts a maximum of {daySchedule.max_appointments} appointments for this date and is fully booked.</span>
                      </div>

                      {/* Priority Waiting List Option */}
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                              Join the Priority Waitlist
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                              If any patient cancels, an instant notification will be dispatched so you can reclaim this slot.
                            </div>
                          </div>
                          
                          {waitlistSuccess ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '0.78rem', fontWeight: 700, background: '#f0fdf4', padding: '6px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                              <CheckCircle2 size={14} />
                              <span>Waitlist Confirmed!</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleJoinWaitlist}
                              disabled={joiningWaitlist}
                              style={{
                                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '7px 14px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: joiningWaitlist ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Sparkles size={13} />
                              <span>{joiningWaitlist ? 'Joining Waitlist...' : 'Join Priority Waitlist'}</span>
                            </button>
                          )}
                        </div>

                        {waitlistSuccess && (
                          <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>
                            {waitlistSuccess}
                          </div>
                        )}
                        {waitlistError && (
                          <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600 }}>
                            {waitlistError}
                          </div>
                        )}
                      </div>
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

              {/* Confirmed Consultation Date & Time Summary Card */}
              {appointmentDatetime && (
                <div style={{
                  background: 'rgba(2, 132, 199, 0.08)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#0369a1' }}>
                    <Calendar size={16} color="#0284c7" />
                    <span>
                      Chosen Date: <strong style={{ color: '#0f172a' }}>{new Date(`${selectedDateStr}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong> at <strong style={{ color: '#0284c7' }}>{formatTimeLabel(selectedTimeStr)}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label htmlFor="book-time-adjust" style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                      Adjust:
                    </label>
                    <input
                      id="book-time-adjust"
                      type="time"
                      value={selectedTimeStr}
                      onChange={(e) => handleSelectTime(e.target.value)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        cursor: 'pointer',
                        colorScheme: 'light'
                      }}
                      title="Adjust consultation time"
                    />
                  </div>
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
