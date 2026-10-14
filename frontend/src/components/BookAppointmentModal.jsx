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
  
  // Format Date/datetime string to local 'YYYY-MM-DDTHH:mm:ss' without timezone conversion
  const formatAppointmentDatetimeToLocal = (dtStr) => {
    if (!dtStr) return '';
    // If it's already YYYY-MM-DDTHH:mm, append :00
    if (dtStr.length === 16) return `${dtStr}:00`;
    // If it already has seconds, take the first 19 chars (YYYY-MM-DDTHH:mm:ss)
    if (dtStr.length >= 19 && dtStr.includes('T')) return dtStr.slice(0, 19);
    return dtStr;
  };

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

  // Check if chosen time is outside doctor's configured working hours
  const isTimeOutOfHours = Boolean(
    daySchedule?.is_available &&
    daySchedule?.start_time &&
    daySchedule?.end_time &&
    (selectedTimeStr < daySchedule.start_time || selectedTimeStr >= daySchedule.end_time)
  );

  // Check if chosen slot is already booked or otherwise unavailable
  const selectedSlotInfo = daySchedule?.time_slots?.find((s) => s.time === selectedTimeStr);
  const isSelectedSlotUnavailable = Boolean(
    selectedSlotInfo && (!selectedSlotInfo.available || selectedSlotInfo.reason === 'booked')
  );

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
    if (!selectedDateStr || (!doctor && !doctorName)) {
      setDaySchedule(null);
      return;
    }

    let isMounted = true;
    const fetchSchedule = async () => {
      setLoadingSchedule(true);
      try {
        const identifier = doctor?.id ?? doctorName;
        const sched = await doctorService.getDoctorSchedule(identifier, selectedDateStr);
        if (isMounted) setDaySchedule(sched);
      } catch (err) {
        if (isMounted) setDaySchedule(null);
      } finally {
        if (isMounted) setLoadingSchedule(false);
      }
    };

    fetchSchedule();

    const handleScheduleUpdated = (e) => {
      if (!e.detail?.doctorName || e.detail.doctorName.toLowerCase().includes(doctorName.toLowerCase()) || doctorName.toLowerCase().includes(e.detail.doctorName.toLowerCase())) {
        fetchSchedule();
      }
    };
    window.addEventListener('mw_schedule_updated', handleScheduleUpdated);

    return () => { 
      isMounted = false;
      window.removeEventListener('mw_schedule_updated', handleScheduleUpdated);
    };
  }, [selectedDateStr, doctorName]);

  // When schedule loads or updates, automatically align chosen time slot to the doctor's available working hours
  useEffect(() => {
    if (daySchedule?.time_slots?.length > 0 && daySchedule.is_available && !daySchedule.is_capacity_reached) {
      const isCurrentSlotAvailable = daySchedule.time_slots.some(
        (s) => s.time === selectedTimeStr && s.available && !isSlotPast(s.time) && s.reason !== 'past'
      );

      // If current time is out of working hours or unavailable, automatically snap to the first available slot
      if (!isCurrentSlotAvailable || isPastDateTime(appointmentDatetime)) {
        const firstAvailable = daySchedule.time_slots.find((s) => {
          const slotTs = new Date(`${selectedDateStr}T${s.time}`).getTime();
          return s.available && s.reason !== 'past' && slotTs > Date.now();
        });
        if (firstAvailable) {
          setAppointmentDatetime(`${selectedDateStr}T${firstAvailable.time}`);
        } else if (daySchedule.start_time) {
          setAppointmentDatetime(`${selectedDateStr}T${daySchedule.start_time}`);
        }
      }
    }
  }, [daySchedule, selectedDateStr]);

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
        const localIso = formatAppointmentDatetimeToLocal(appointmentDatetime);
        const res = await appointmentService.checkAvailability(doctorName, localIso);
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

    if (isTimeOutOfHours) {
      setErrorMsg(`Outside Working Hours: ${doctorName} is only available between ${formatTimeLabel(daySchedule.start_time)} and ${formatTimeLabel(daySchedule.end_time)} on this date.`);
      return;
    }

    if (isSelectedSlotUnavailable) {
      setErrorMsg(`The selected time slot (${formatTimeLabel(selectedTimeStr)}) is unavailable or already booked. Please choose an available slot.`);
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
        appointment_datetime: formatAppointmentDatetimeToLocal(appointmentDatetime),
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Book Clinical Appointment</h2>
              <p style={{ color: '#475569', fontSize: '0.84rem', fontWeight: 500, marginTop: '2px' }}>
                Schedule a consultation with <strong style={{ color: '#0f172a' }}>{doctorName}</strong>
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
              background: '#dcfce7', 
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              border: '2px solid #86efac'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>
              Appointment Confirmed!
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '24px' }}>
              Your appointment request has been scheduled into the Medical Wizard clinical calendar.
            </p>

            <div style={{ 
              background: '#f8fafc', 
              borderRadius: '16px', 
              padding: '20px', 
              textAlign: 'left',
              border: '1.5px solid #e2e8f0',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>Booking Status</span>
                <span style={{ fontWeight: 800, color: '#0284c7' }}>Confirmed</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>Patient Name</span>
                <span style={{ fontWeight: 750, color: '#0f172a' }}>{bookingConfirmed.patient_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>Consulting Doctor</span>
                <span style={{ fontWeight: 750, color: '#0f172a' }}>{bookingConfirmed.doctor}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>Appointment Date & Time</span>
                <span style={{ fontWeight: 750, color: '#0284c7' }}>
                  {new Date(bookingConfirmed.appointment_datetime).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>Check-in Code</span>
                <span style={{ fontWeight: 800, color: '#0369a1', fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '0.08em' }}>
                  {bookingConfirmed.verification_code || 'MW-CONFIRMED'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>Status</span>
                <span style={{ 
                  fontWeight: 800, 
                  color: '#15803d',
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  padding: '3px 10px',
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
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                  fontWeight: 800,
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '10px 18px'
                }}
              >
                <QrCode size={16} />
                <span>View Receipt &amp; QR Pass</span>
              </button>
              <button 
                type="button" 
                className="btn-cancel" 
                onClick={handleClose}
                style={{ flex: 1, background: '#ffffff', border: '1.5px solid #cbd5e1', color: '#334155', fontWeight: 750, borderRadius: '10px' }}
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
              background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)',
              border: '1.5px solid #bae6fd',
              borderRadius: '16px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.06)'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0284c7', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                  Selected Clinician
                </span>
                <div style={{ fontSize: '1.15rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {doctorName}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600, marginTop: '2px' }}>
                  {doctor.email} &bull; {doctor.phone_number || 'Clinic line'}
                </div>
              </div>

              {doctor.specialization && (
                <span style={{
                  background: '#ffffff',
                  color: '#0369a1',
                  border: '1.5px solid #7dd3fc',
                  fontWeight: 750,
                  fontSize: '0.78rem',
                  padding: '5px 14px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 5px rgba(2, 132, 199, 0.1)',
                  letterSpacing: '0.03em'
                }}>
                  <Stethoscope size={14} style={{ color: '#0284c7' }} />
                  <span>{doctor.specialization}</span>
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
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: '12px',
                  padding: '14px 16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#b45309' }}>
                  <Lock size={16} />
                  <span>Sign In Required to Book</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.45, color: '#334155' }}>
                  Only logged-in patients and authorized clinical staff can book appointments. Please sign in or register a patient account to reserve your appointment with <strong style={{ color: '#0f172a' }}>{doctorName}</strong>.
                </p>
                {onNavigate && (
                  <button
                    type="button"
                    className="btn-submit"
                    style={{ 
                      width: 'auto', 
                      alignSelf: 'flex-start', 
                      padding: '8px 18px', 
                      fontSize: '0.84rem', 
                      fontWeight: 750,
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                      color: '#ffffff',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer'
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
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  borderRadius: '12px',
                  padding: '12px 16px'
                }}
              >
                <AlertCircle size={18} color="#b45309" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.86rem', lineHeight: 1.4, color: '#334155' }}>
                  <strong style={{ color: '#b45309' }}>Clinician Notice:</strong> Doctor accounts cannot book appointments. Only patients and authorized clinic staff can schedule consultations.
                </span>
              </div>
            )}

            {errorMsg && (
              <div 
                className="alert-box alert-danger"
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  color: '#b91c1c',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 650,
                  fontSize: '0.88rem'
                }}
              >
                <AlertCircle size={18} color="#dc2626" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Staff / Admin Existing Patient Toggle */}
            {isStaffOrAdmin && (
              <div 
                style={{
                  background: isExistingPatient ? '#eff6ff' : '#f8fafc',
                  border: `1.5px solid ${isExistingPatient ? '#93c5fd' : '#cbd5e1'}`,
                  borderRadius: '12px',
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
                    fontWeight: 750,
                    fontSize: '0.9rem',
                    color: '#0f172a'
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
                      accentColor: '#0284c7',
                      cursor: 'pointer'
                    }}
                  />
                  <span>Existing Patient</span>
                </label>
                <span 
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 750,
                    padding: '3px 12px',
                    borderRadius: '20px',
                    background: isExistingPatient ? '#dbeafe' : '#e2e8f0',
                    color: isExistingPatient ? '#1d4ed8' : '#475569',
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
                      background: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserCheck size={18} color="#15803d" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '8px',
                          color: '#0f172a',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          padding: '4px 12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fee2e2';
                          e.currentTarget.style.borderColor = '#fca5a5';
                          e.currentTarget.style.color = '#dc2626';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.color = '#0f172a';
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
                          background: 'linear-gradient(135deg, #0284c7, #10b981)',
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
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                            Patient Name
                          </span>
                          <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                            {selectedPatient.full_name || selectedPatient.username}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                          Email Address
                        </span>
                        <span style={{ fontSize: '0.86rem', color: '#1e293b', fontWeight: 600 }}>
                          {selectedPatient.email || 'N/A'}
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                          Contact Phone
                        </span>
                        <span style={{ fontSize: '0.86rem', color: '#1e293b', fontWeight: 600 }}>
                          {selectedPatient.phone_number || 'N/A'}
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                          Patient Account
                        </span>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0284c7' }}>
                          @{selectedPatient.username}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Patient Search Query Input with Suggestion Dropdown */
                  <div className="form-group" style={{ position: 'relative', marginBottom: 0 }} ref={dropdownRef}>
                    <label className="form-label" htmlFor="book-patient-search" style={{ color: '#0f172a', fontWeight: 750, fontSize: '0.85rem' }}>
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
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          color: '#0f172a',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          borderRadius: '10px'
                        }}
                        required
                      />
                      <Search size={18} className="input-icon" style={{ color: '#64748b' }} />
                      {searchingPatients && (
                        <span style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '0.74rem',
                          color: '#0284c7',
                          fontWeight: 700
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
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '12px',
                          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.15)',
                          maxHeight: '260px',
                          overflowY: 'auto',
                          zIndex: 100,
                          padding: '6px'
                        }}
                      >
                        {searchingPatients ? (
                          <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.84rem', color: '#64748b', fontWeight: 600 }}>
                            Searching registered patients...
                          </div>
                        ) : patientSearchResults.length > 0 ? (
                          <div>
                            <div style={{ 
                              padding: '6px 10px', 
                              fontSize: '0.72rem', 
                              color: '#64748b', 
                              textTransform: 'uppercase', 
                              fontWeight: 800,
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
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease',
                                  borderBottom: '1px solid #f1f5f9'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #e0f2fe, #dcfce7)',
                                    border: '1.5px solid #bae6fd',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.82rem',
                                    fontWeight: 800,
                                    color: '#0284c7'
                                  }}>
                                    {(pat.full_name || pat.username || 'P').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 750, color: '#0f172a' }}>
                                      {pat.full_name || pat.username}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                                      {pat.email} {pat.phone_number ? `• ${pat.phone_number}` : ''}
                                    </div>
                                  </div>
                                </div>

                                <span style={{
                                  fontSize: '0.74rem',
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  background: '#e0f2fe',
                                  border: '1px solid #7dd3fc',
                                  color: '#0284c7',
                                  fontWeight: 750
                                }}>
                                  Select Patient
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.84rem', color: '#64748b', fontWeight: 500 }}>
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
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="book-patient-name" style={{ color: '#0f172a', fontWeight: 750, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                  Patient Full Name *
                </label>
                <div className="input-with-icon">
                  <input
                    id="book-patient-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. John Doe or Jane Smith"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      color: '#0f172a',
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      paddingLeft: '40px',
                      borderRadius: '10px'
                    }}
                    required
                  />
                  <User size={18} className="input-icon" style={{ color: '#64748b' }} />
                </div>
              </div>
            )}

            {/* Step 1: Consultation Date Picker with Visible Calendar & Shortcuts */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" htmlFor="book-date" style={{ margin: 0, fontWeight: 750, color: '#0f172a', fontSize: '0.85rem' }}>
                  Appointment Date *
                </label>
                <button
                  type="button"
                  onClick={handleOpenCalendar}
                  style={{
                    background: '#e0f2fe',
                    border: '1.5px solid #7dd3fc',
                    color: '#0284c7',
                    fontSize: '0.76rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 12px',
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
                    fontWeight: 750,
                    fontSize: '0.96rem',
                    cursor: 'pointer',
                    width: '100%',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#0f172a',
                    paddingLeft: '40px',
                    borderRadius: '10px'
                  }}
                  required
                />
                <Calendar 
                  size={18} 
                  className="input-icon" 
                  style={{ color: '#0284c7', cursor: 'pointer' }}
                  onClick={handleOpenCalendar}
                />
              </div>

              {/* Quick Date Shortcut Pills */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 750, marginRight: '4px' }}>
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
                        padding: '5px 13px',
                        fontSize: '0.76rem',
                        borderRadius: '16px',
                        border: isSelected ? '1.5px solid #0284c7' : '1.5px solid #cbd5e1',
                        background: isSelected ? '#0284c7' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#1e293b',
                        fontWeight: isSelected ? 800 : 650,
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 2px 6px rgba(2, 132, 199, 0.25)' : '0 1px 2px rgba(0,0,0,0.03)',
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
                    ? '#fef2f2' 
                    : '#f0f9ff',
                  border: `1.5px solid ${(daySchedule.is_capacity_reached || !daySchedule.is_available) ? '#fecaca' : '#bae6fd'}`,
                  borderRadius: '14px',
                  padding: '12px 16px',
                  marginTop: '10px',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: (daySchedule.is_capacity_reached || !daySchedule.is_available) ? '#dc2626' : '#0369a1' }}>
                      <Clock size={15} color={(daySchedule.is_capacity_reached || !daySchedule.is_available) ? '#dc2626' : '#0284c7'} />
                      <span>Doctor Working Hours: {formatTimeLabel(daySchedule.start_time)} - {formatTimeLabel(daySchedule.end_time)}</span>
                    </div>

                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 750,
                      padding: '3px 10px',
                      borderRadius: '10px',
                      background: daySchedule.is_capacity_reached 
                        ? '#fee2e2' 
                        : (daySchedule.is_available ? '#dcfce7' : '#fee2e2'),
                      color: daySchedule.is_capacity_reached 
                        ? '#b91c1c' 
                        : (daySchedule.is_available ? '#15803d' : '#b91c1c'),
                      border: `1px solid ${daySchedule.is_capacity_reached ? '#fca5a5' : (daySchedule.is_available ? '#86efac' : '#fca5a5')}`
                    }}>
                      {daySchedule.is_capacity_reached 
                        ? `Fully Booked (${daySchedule.booked_count}/${daySchedule.max_appointments} capacity)` 
                        : (daySchedule.is_available 
                            ? `${daySchedule.remaining_slots} of ${daySchedule.max_appointments} appointments available` 
                            : 'Off-Duty / Unavailable')}
                    </span>
                  </div>

                  {daySchedule.notes && (
                    <div style={{ fontSize: '0.76rem', color: '#475569', marginBottom: '8px', fontStyle: 'italic', fontWeight: 500 }}>
                      Schedule note: {daySchedule.notes}
                    </div>
                  )}

                  {/* Unavailable / Capacity Reached Alert */}
                  {!daySchedule.is_available && (
                    <div style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 650, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <AlertCircle size={15} />
                      <span>{doctorName} is not available for consultations on this date. Please select another date.</span>
                    </div>
                  )}

                  {daySchedule.is_capacity_reached && daySchedule.is_available && (
                    <div style={{
                      marginTop: '8px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '12px',
                      padding: '12px 14px'
                    }}>
                      <div style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={15} />
                        <span>Daily limit reached: {doctorName} accepts a maximum of {daySchedule.max_appointments} appointments for this date and is fully booked.</span>
                      </div>

                      {/* Priority Waiting List Option */}
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #fca5a5' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                              Join the Priority Waitlist
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                              If any patient cancels, an instant notification will be dispatched so you can reclaim this slot.
                            </div>
                          </div>
                          
                          {waitlistSuccess ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontSize: '0.78rem', fontWeight: 800, background: '#dcfce7', padding: '6px 12px', borderRadius: '8px', border: '1px solid #86efac' }}>
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
                                padding: '7px 16px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
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
                          <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#15803d', fontWeight: 700 }}>
                            {waitlistSuccess}
                          </div>
                        )}
                        {waitlistError && (
                          <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#dc2626', fontWeight: 700 }}>
                            {waitlistError}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Interactive Time Slot Pills */}
                  {daySchedule.is_available && !daySchedule.is_capacity_reached && daySchedule.time_slots?.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '0.74rem', color: '#334155', marginBottom: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Click to select an available consultation slot:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto', padding: '2px' }}>
                        {daySchedule.time_slots.map((slot) => {
                          const isPast = isSlotPast(slot.time) || slot.reason === 'past';
                          const isClickable = slot.available && !isPast;
                          const isSelected = !isPast && appointmentDatetime === `${selectedDateStr}T${slot.time}`;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!isClickable}
                              onClick={isClickable ? () => handleSelectTime(slot.time) : undefined}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                borderRadius: '8px',
                                border: isSelected 
                                  ? '1.5px solid #0284c7' 
                                  : (isClickable ? '1.5px solid #cbd5e1' : '1px dashed #e2e8f0'),
                                background: isSelected 
                                  ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' 
                                  : (isClickable ? '#ffffff' : '#f1f5f9'),
                                color: isSelected 
                                  ? '#ffffff' 
                                  : (isClickable ? '#0f172a' : '#94a3b8'),
                                cursor: isClickable ? 'pointer' : 'not-allowed',
                                opacity: isClickable ? 1 : 0.45,
                                pointerEvents: isClickable ? 'auto' : 'none',
                                fontWeight: isSelected ? 800 : 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                textDecoration: slot.reason === 'booked' ? 'line-through' : 'none',
                                userSelect: 'none',
                                boxShadow: isSelected 
                                  ? '0 3px 8px rgba(2, 132, 199, 0.35)' 
                                  : (isClickable ? '0 1px 2px rgba(0,0,0,0.04)' : 'none'),
                                transform: isSelected ? 'scale(1.02)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                              title={
                                isPast 
                                  ? 'Time slot unavailable' 
                                  : slot.reason === 'booked' 
                                  ? 'Slot already booked' 
                                  : `Select consultation at ${slot.label}`
                              }
                            >
                              <span>{slot.label}</span>
                              {isSelected && <CheckCircle2 size={13} color="#ffffff" />}
                              {!slot.available && slot.reason === 'booked' && (
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#dc2626' }}>Booked</span>
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
                <small style={{ color: '#0284c7', fontSize: '0.78rem', marginTop: '4px', display: 'block', fontWeight: 650 }}>
                  Checking doctor schedule availability...
                </small>
              )}

              {/* Status Warning: Outside Doctor Working Hours */}
              {daySchedule?.is_available && isTimeOutOfHours && (
                <div className="alert-box alert-danger" style={{ marginTop: '8px', padding: '10px 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1.5px solid #fecaca', color: '#b91c1c', borderRadius: '10px' }}>
                  <AlertCircle size={16} color="#dc2626" />
                  <span>Outside Working Hours: {doctorName} is only available between {formatTimeLabel(daySchedule.start_time)} and {formatTimeLabel(daySchedule.end_time)} on this date.</span>
                </div>
              )}

              {/* Status Warning: Unavailable / Day off */}
              {daySchedule && !daySchedule.is_available && (
                <div className="alert-box alert-danger" style={{ marginTop: '8px', padding: '10px 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1.5px solid #fecaca', color: '#b91c1c', borderRadius: '10px' }}>
                  <AlertCircle size={16} color="#dc2626" />
                  <span>Doctor Unavailable: {doctorName} is off-duty / unavailable on {selectedDateStr}. Please select an upcoming available date.</span>
                </div>
              )}

              {conflictWarning && (
                <div className="alert-box alert-danger" style={{ marginTop: '8px', padding: '10px 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1.5px solid #fecaca', color: '#b91c1c', borderRadius: '10px' }}>
                  <AlertCircle size={16} color="#dc2626" />
                  <span>{conflictWarning}</span>
                </div>
              )}

              {!conflictWarning && !isTimeOutOfHours && daySchedule?.is_available && !daySchedule?.is_capacity_reached && !checkingAvailability && appointmentDatetime && !isPastSelected && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '10px',
                  padding: '7px 14px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  color: '#15803d',
                  fontWeight: 750
                }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>Schedule verified: {doctorName} is available at this time.</span>
                </div>
              )}

              {/* Confirmed Consultation Date & Time Summary Card */}
              {appointmentDatetime && (
                <div style={{
                  background: isTimeOutOfHours || daySchedule?.is_available === false
                    ? '#fef2f2' 
                    : '#f0f9ff',
                  border: `1.5px solid ${isTimeOutOfHours || daySchedule?.is_available === false ? '#fecaca' : '#bae6fd'}`,
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: isTimeOutOfHours ? '#dc2626' : '#0369a1' }}>
                    <Calendar size={16} color={isTimeOutOfHours ? '#dc2626' : '#0284c7'} />
                    <span>
                      Chosen Date: <strong style={{ color: '#0f172a' }}>{new Date(`${selectedDateStr}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong> at <strong style={{ color: isTimeOutOfHours ? '#dc2626' : '#0284c7' }}>{formatTimeLabel(selectedTimeStr)}</strong>
                      {isTimeOutOfHours && <span style={{ marginLeft: '8px', fontSize: '0.74rem', color: '#dc2626', fontWeight: 750 }}>(Outside working hours)</span>}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label htmlFor="book-time-adjust" style={{ fontSize: '0.76rem', color: '#334155', fontWeight: 750 }}>
                      Adjust:
                    </label>
                    <input
                      id="book-time-adjust"
                      type="time"
                      min={daySchedule?.start_time || '08:00'}
                      max={daySchedule?.end_time || '18:00'}
                      value={selectedTimeStr}
                      onChange={(e) => handleSelectTime(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        borderRadius: '6px',
                        border: `1.5px solid ${isTimeOutOfHours ? '#ef4444' : '#cbd5e1'}`,
                        background: '#ffffff',
                        color: isTimeOutOfHours ? '#b91c1c' : '#0f172a',
                        cursor: 'pointer',
                        colorScheme: 'light'
                      }}
                      title="Adjust consultation time"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="book-type" style={{ color: '#0f172a', fontWeight: 750, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                Appointment Type *
              </label>
              <select
                id="book-type"
                className="form-input role-select"
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 650,
                  fontSize: '0.9rem',
                  borderRadius: '10px'
                }}
                required
              >
                {APPOINTMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" htmlFor="book-notes" style={{ color: '#0f172a', fontWeight: 750, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                Medical Notes / Symptoms (Optional)
              </label>
              <textarea
                id="book-notes"
                className="form-input"
                rows="3"
                style={{
                  padding: '10px 14px',
                  resize: 'vertical',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  borderRadius: '10px'
                }}
                placeholder="Brief reason for consultation, complaints, or referral details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '16px 26px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={handleClose}
                disabled={loading}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 750,
                  padding: '10px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                style={{ 
                  width: 'auto', 
                  padding: '10px 26px', 
                  margin: 0,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                  opacity: (!isPatientOrStaff || conflictWarning || isPastSelected || !appointmentDatetime || daySchedule?.is_capacity_reached || daySchedule?.is_available === false || isTimeOutOfHours || isSelectedSlotUnavailable) ? 0.45 : 1,
                  cursor: (!isPatientOrStaff || conflictWarning || isPastSelected || !appointmentDatetime || daySchedule?.is_capacity_reached || daySchedule?.is_available === false || isTimeOutOfHours || isSelectedSlotUnavailable) ? 'not-allowed' : 'pointer'
                }}
                disabled={!isPatientOrStaff || loading || Boolean(conflictWarning) || isPastSelected || !appointmentDatetime || Boolean(daySchedule?.is_capacity_reached) || daySchedule?.is_available === false || isTimeOutOfHours || isSelectedSlotUnavailable}
                id="btn-confirm-booking"
                title={
                  !currentUser 
                    ? 'Sign in required: Only logged-in patients and authorized staff can book appointments' 
                    : (isDoctor 
                        ? 'Clinician notice: Doctor accounts cannot book appointments' 
                        : (conflictWarning 
                            ? conflictWarning 
                            : (isTimeOutOfHours 
                                ? `Selected time is outside doctor's working hours (${daySchedule?.start_time} - ${daySchedule?.end_time})`
                                : (isSelectedSlotUnavailable 
                                    ? 'The selected time slot is already booked or unavailable' 
                                    : (isPastSelected ? 'Cannot book an appointment for a past date or time' : undefined)))))
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
