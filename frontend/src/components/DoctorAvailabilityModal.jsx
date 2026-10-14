import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  Sparkles,
  Stethoscope,
  Info,
  CalendarCheck
} from 'lucide-react';
import { doctorService } from '../services/api';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'ALL'];

export default function DoctorAvailabilityModal({ doctor, currentUser, isOpen, onClose, onScheduleUpdated }) {
  if (!isOpen) return null;

  const isStaffOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'staff';
  const targetDoctor = doctor || (currentUser?.role === 'doctor' ? currentUser : null);
  const doctorName = targetDoctor?.full_name || (targetDoctor ? `Dr. ${targetDoctor.username}` : '');
  const doctorId = targetDoctor?.id;

  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [scheduleType, setScheduleType] = useState('date'); // 'date' | 'weekday'
  
  // Format today as YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const [specificDate, setSpecificDate] = useState(getTodayStr());
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [maxAppointments, setMaxAppointments] = useState(8);
  const [slotDuration, setSlotDuration] = useState(30);
  const [isAvailable, setIsAvailable] = useState(true);
  const [notes, setNotes] = useState('');

  const fetchSchedules = async () => {
    if (!doctorName && !doctorId) return;
    setLoading(true);
    try {
      const res = await doctorService.getDoctorAvailabilities(doctorId || doctorName);
      setAvailabilities(res || []);
    } catch (err) {
      console.warn('Failed to fetch doctor availabilities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      fetchSchedules();
    }
  }, [isOpen, doctorId, doctorName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (startTime >= endTime) {
      setErrorMsg('End time must be later than start time.');
      return;
    }

    if (maxAppointments < 1) {
      setErrorMsg('Max appointments must be at least 1.');
      return;
    }

    // Mathematical validation: Available minutes vs slot duration and capacity
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const maxAptsNum = parseInt(maxAppointments, 10);
    const slotMinsNum = parseInt(slotDuration, 10);

    const maxAllowedSlotDuration = Math.floor(totalMinutes / maxAptsNum);

    if (maxAllowedSlotDuration < 5) {
      setErrorMsg(
        `Mathematical Conflict: Cannot schedule ${maxAptsNum} appointments across ${totalMinutes} available minutes. Each appointment would be under 5 minutes.`
      );
      return;
    }

    if (maxAptsNum * slotMinsNum > totalMinutes) {
      setErrorMsg(
        `Mathematical Conflict: ${maxAptsNum} appointments at ${slotMinsNum} minutes each requires ${maxAptsNum * slotMinsNum} minutes, but your shift only has ${totalMinutes} minutes (${startTime} to ${endTime}). For ${maxAptsNum} appointments in ${totalMinutes} minutes, your maximum slot duration is ${maxAllowedSlotDuration} minutes.`
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        doctor_id: doctorId,
        doctor_name: doctorName,
        specific_date: scheduleType === 'date' ? specificDate : null,
        day_of_week: scheduleType === 'weekday' ? dayOfWeek : null,
        start_time: startTime,
        end_time: endTime,
        max_appointments: parseInt(maxAppointments, 10),
        slot_duration_minutes: parseInt(slotDuration, 10),
        is_available: isAvailable,
        notes: notes.trim() || undefined,
      };

      await doctorService.saveDoctorAvailability(payload);
      setSuccessMsg(
        scheduleType === 'date'
          ? `Availability and capacity of ${maxAppointments} appointments saved for ${specificDate}!`
          : `Weekly schedule (${dayOfWeek}) saved with max ${maxAppointments} appointments/day!`
      );
      setTimeout(() => setSuccessMsg(''), 3000);
      await fetchSchedules();
      if (onScheduleUpdated) onScheduleUpdated();
      window.dispatchEvent(new CustomEvent('mw_schedule_updated', { detail: { doctorName, doctorId } }));
    } catch (err) {
      setErrorMsg(err.message || 'Unable to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Are you sure you want to remove this availability rule?')) return;
    try {
      await doctorService.deleteDoctorAvailability(ruleId);
      setAvailabilities(prev => prev.filter(a => a.id !== ruleId));
      setSuccessMsg('Availability rule removed.');
      setTimeout(() => setSuccessMsg(''), 3000);
      if (onScheduleUpdated) onScheduleUpdated();
      window.dispatchEvent(new CustomEvent('mw_schedule_updated', { detail: { doctorName, doctorId } }));
    } catch (err) {
      setErrorMsg(err.message || 'Unable to delete rule.');
    }
  };

  const formatTimeLabel = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hourNum = parseInt(h, 10);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: '720px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-logo-icon" style={{ width: '40px', height: '40px' }}>
              <CalendarCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Doctor Availability &amp; Capacity</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Manage working hours and daily appointment limits for {doctorName}
              </p>
            </div>
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

        <div className="modal-body" style={{ maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
          {errorMsg && (
            <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert-box" style={{ 
              marginBottom: '16px', 
              background: 'rgba(16, 185, 129, 0.15)', 
              border: '1px solid rgba(16, 185, 129, 0.4)', 
              color: '#34d399' 
            }}>
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Doctor Profile Banner */}
          <div style={{ 
            background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)',
            border: '1px solid #bae6fd',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '22px',
            boxShadow: '0 2px 8px rgba(14, 165, 233, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0284c7, #0d9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)'
              }}>
                <Stethoscope size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0369a1', fontWeight: 800 }}>
                  Doctor Profile
                </span>
                <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {doctorName}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500, marginTop: '2px' }}>
                  {targetDoctor?.specialization || 'Clinical Specialist'} &bull; <span style={{ color: '#0284c7' }}>{targetDoctor?.email}</span>
                </div>
              </div>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: '#ccfbf1',
              color: '#0f766e',
              border: '1px solid #99f6e4',
              fontSize: '0.78rem',
              fontWeight: 700,
              boxShadow: '0 1px 3px rgba(15, 118, 110, 0.1)'
            }}>
              <Sparkles size={14} />
              Active Scheduling
            </div>
          </div>

          {/* Configuration Form Card */}
          <form onSubmit={handleSubmit} style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '16px', 
            padding: '24px',
            marginBottom: '28px',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#e0f2fe',
                  color: '#0284c7'
                }}>
                  <Plus size={16} strokeWidth={2.8} />
                </span>
                Set Available Times &amp; Daily Limits
              </h3>
            </div>

            {/* Schedule Type Segmented Selector */}
            <div style={{ 
              display: 'flex', 
              background: '#f1f5f9', 
              padding: '4px', 
              borderRadius: '12px', 
              gap: '6px', 
              marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                style={{ 
                  flex: 1, 
                  fontSize: '0.85rem', 
                  fontWeight: scheduleType === 'date' ? 700 : 500,
                  padding: '9px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: scheduleType === 'date' ? '#ffffff' : 'transparent',
                  color: scheduleType === 'date' ? '#0284c7' : '#64748b',
                  boxShadow: scheduleType === 'date' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onClick={() => setScheduleType('date')}
              >
                <Calendar size={15} />
                Specific Calendar Date
              </button>
              <button
                type="button"
                style={{ 
                  flex: 1, 
                  fontSize: '0.85rem', 
                  fontWeight: scheduleType === 'weekday' ? 700 : 500,
                  padding: '9px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background: scheduleType === 'weekday' ? '#ffffff' : 'transparent',
                  color: scheduleType === 'weekday' ? '#0284c7' : '#64748b',
                  boxShadow: scheduleType === 'weekday' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onClick={() => setScheduleType('weekday')}
              >
                <Clock size={15} />
                Weekly Recurring Schedule
              </button>
            </div>

            {/* Date / Day selection */}
            {scheduleType === 'date' ? (
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" htmlFor="avail-date" style={{ color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Select Date *
                </label>
                <div className="input-with-icon">
                  <input
                    id="avail-date"
                    type="date"
                    className="form-input"
                    min={getTodayStr()}
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    style={{ 
                      colorScheme: 'light', 
                      background: '#ffffff', 
                      borderColor: '#cbd5e1', 
                      color: '#0f172a',
                      fontWeight: 600,
                      borderRadius: '10px',
                      padding: '11px 14px 11px 40px'
                    }}
                    required
                  />
                  <Calendar size={18} className="input-icon" style={{ color: '#0284c7' }} />
                </div>
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" htmlFor="avail-day" style={{ color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Recurring Day of Week *
                </label>
                <select
                  id="avail-day"
                  className="form-input role-select"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  style={{ 
                    background: '#ffffff', 
                    borderColor: '#cbd5e1', 
                    color: '#0f172a',
                    fontWeight: 600,
                    borderRadius: '10px'
                  }}
                  required
                >
                  {WEEKDAYS.map((day) => (
                    <option key={day} value={day}>
                      {day === 'ALL' ? 'Every Day (Monday - Sunday)' : `Every ${day}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Interactive Availability Toggle Card */}
            <div style={{
              background: isAvailable ? '#f0fdf4' : '#fffbeb',
              border: `1.5px solid ${isAvailable ? '#86efac' : '#fde68a'}`,
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              transition: 'all 0.25s ease'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: isAvailable ? '#14532d' : '#78350f' }}>
                    {scheduleType === 'date' ? 'Date Availability Status' : 'Schedule Day Status'}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: isAvailable ? '#bbf7d0' : '#fef3c7',
                    color: isAvailable ? '#15803d' : '#b45309'
                  }}>
                    {isAvailable ? 'AVAILABLE FOR CONSULTATIONS' : 'DAY OFF / OFF-DUTY'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: isAvailable ? '#166534' : '#92400e', lineHeight: 1.4 }}>
                  {isAvailable 
                    ? 'Doctor is marked ON-DUTY. Patients can book slots according to the working hours below.' 
                    : 'Doctor is marked OFF-DUTY / UNAVAILABLE. Consultation bookings will be disabled for this date.'}
                </div>
              </div>

              {/* Toggle Switch Component */}
              <button
                type="button"
                id="toggle-doctor-available"
                role="switch"
                aria-checked={isAvailable}
                onClick={() => setIsAvailable(!isAvailable)}
                style={{
                  position: 'relative',
                  width: '56px',
                  height: '30px',
                  borderRadius: '999px',
                  background: isAvailable ? '#10b981' : '#cbd5e1',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '3px',
                  transition: 'background-color 0.25s ease',
                  flexShrink: 0,
                  outline: 'none',
                  boxShadow: isAvailable ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none'
                }}
                title={isAvailable ? 'Click to mark as Day Off / Unavailable' : 'Click to mark as Available'}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                  transform: isAvailable ? 'translateX(26px)' : 'translateX(0)',
                  transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px'
                }}>
                  {isAvailable ? (
                    <span style={{ color: '#10b981', fontWeight: 900, lineHeight: 1 }}>✓</span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontWeight: 900, lineHeight: 1 }}>✕</span>
                  )}
                </div>
              </button>
            </div>

            {/* Working Hours: Start & End */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px', 
              marginBottom: '16px',
              opacity: isAvailable ? 1 : 0.65,
              transition: 'opacity 0.2s ease'
            }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="avail-start" style={{ color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Available Start Time *
                </label>
                <div className="input-with-icon">
                  <input
                    id="avail-start"
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ 
                      colorScheme: 'light', 
                      background: '#ffffff', 
                      borderColor: '#cbd5e1', 
                      color: '#0f172a',
                      fontWeight: 600,
                      borderRadius: '10px',
                      padding: '11px 14px 11px 40px'
                    }}
                    required
                  />
                  <Clock size={18} className="input-icon" style={{ color: '#0284c7' }} />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="avail-end" style={{ color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Available End Time *
                </label>
                <div className="input-with-icon">
                  <input
                    id="avail-end"
                    type="time"
                    className="form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{ 
                      colorScheme: 'light', 
                      background: '#ffffff', 
                      borderColor: '#cbd5e1', 
                      color: '#0f172a',
                      fontWeight: 600,
                      borderRadius: '10px',
                      padding: '11px 14px 11px 40px'
                    }}
                    required
                  />
                  <Clock size={18} className="input-icon" style={{ color: '#0284c7' }} />
                </div>
              </div>
            </div>

            {/* Max Appointments Capacity & Slot Duration */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px', 
              marginBottom: '16px',
              opacity: isAvailable ? 1 : 0.65,
              transition: 'opacity 0.2s ease'
            }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="avail-max-apts" style={{ color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Max Patient Appointments *
                </label>
                <div className="input-with-icon">
                  <input
                    id="avail-max-apts"
                    type="number"
                    min="1"
                    max="50"
                    className="form-input"
                    value={maxAppointments}
                    onChange={(e) => setMaxAppointments(e.target.value)}
                    style={{ 
                      background: '#ffffff', 
                      borderColor: '#cbd5e1', 
                      color: '#0f172a',
                      fontWeight: 600,
                      borderRadius: '10px',
                      padding: '11px 14px 11px 40px'
                    }}
                    required
                  />
                  <Users size={18} className="input-icon" style={{ color: '#0284c7' }} />
                </div>
                <small style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                  Daily capacity limit before marked fully booked.
                </small>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="avail-slot-duration" style={{ color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Slot Duration
                </label>
                <select
                  id="avail-slot-duration"
                  className="form-input role-select"
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(e.target.value)}
                  style={{ 
                    background: '#ffffff', 
                    borderColor: '#cbd5e1', 
                    color: '#0f172a',
                    fontWeight: 600,
                    borderRadius: '10px'
                  }}
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes (Standard)</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes (Comprehensive)</option>
                </select>
                <small style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                  Interval between booking options.
                </small>
              </div>
            </div>

            {/* Dynamic Mathematical Allocation Helper */}
            {(() => {
              const [sH, sM] = (startTime || '09:00').split(':').map(Number);
              const [eH, eM] = (endTime || '17:00').split(':').map(Number);
              const totalMins = (eH * 60 + eM) - (sH * 60 + sM);
              const numApts = parseInt(maxAppointments, 10) || 1;
              const slotMins = parseInt(slotDuration, 10) || 30;
              const maxSlotAllowed = totalMins > 0 ? Math.floor(totalMins / numApts) : 0;
              const isExceeded = totalMins > 0 && (numApts * slotMins > totalMins);

              return (
                <div style={{
                  background: isExceeded ? '#fef2f2' : '#f0fdfa',
                  border: `1.5px solid ${isExceeded ? '#fca5a5' : '#99f6e4'}`,
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div>
                    <span style={{ fontWeight: 800, color: isExceeded ? '#b91c1c' : '#0f766e' }}>
                      {isExceeded ? '⚠️ Capacity Overbooking:' : '⏱ Mathematical Slot Allocation:'}
                    </span>{' '}
                    <span style={{ color: isExceeded ? '#991b1b' : '#134e4a' }}>
                      {totalMins > 0 ? `${totalMins} minutes available (${Math.floor(totalMins / 60)}h ${totalMins % 60}m)` : 'Invalid hours'}. For <strong>{numApts} appointments</strong>, max slot length is <strong>{maxSlotAllowed} min</strong>.
                    </span>
                  </div>
                  {isExceeded && (
                    <button
                      type="button"
                      onClick={() => {
                        if (maxSlotAllowed >= 15) setSlotDuration(15);
                        else if (maxSlotAllowed >= 10) setSlotDuration(10);
                        else setMaxAppointments(Math.floor(totalMins / slotMins));
                      }}
                      style={{
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Auto-Fix Duration
                    </button>
                  )}
                </div>
              );
            })()}

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="avail-notes" style={{ color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                Schedule Notes / Details (Optional)
              </label>
              <input
                id="avail-notes"
                type="text"
                className="form-input"
                placeholder="e.g. Morning clinic only; afternoon surgery rounds"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ 
                  background: '#ffffff', 
                  borderColor: '#cbd5e1', 
                  color: '#0f172a',
                  borderRadius: '10px',
                  padding: '11px 14px'
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.28)',
                transition: 'all 0.2s ease'
              }}
              disabled={saving}
              id="btn-save-availability"
            >
              {saving ? (
                <>
                  <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#ffffff' }} />
                  <span>Saving Schedule...</span>
                </>
              ) : (
                <>
                  <CalendarCheck size={18} />
                  <span>Save Availability &amp; Limits</span>
                </>
              )}
            </button>
          </form>

          {/* Configured Rules List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Configured Schedule Rules
                <span style={{ 
                  background: '#e0f2fe', 
                  color: '#0369a1', 
                  fontSize: '0.78rem', 
                  fontWeight: 800, 
                  padding: '2px 10px', 
                  borderRadius: '999px' 
                }}>
                  {availabilities.length}
                </span>
              </h3>
              {loading && <span className="spinner" style={{ width: '16px', height: '16px' }} />}
            </div>

            {availabilities.length === 0 ? (
              <div style={{ 
                padding: '24px', 
                textAlign: 'center', 
                background: '#f8fafc', 
                borderRadius: '14px',
                color: '#64748b',
                fontSize: '0.85rem',
                border: '1.5px dashed #cbd5e1'
              }}>
                <Info size={22} style={{ margin: '0 auto 8px', color: '#0284c7' }} />
                No custom schedule rules configured yet. Standard clinic default (09:00 AM - 05:00 PM, max 10 appointments) is currently active.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availabilities.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.96rem' }}>
                          {rule.specific_date ? `Date: ${rule.specific_date}` : `Weekly: ${rule.day_of_week === 'ALL' ? 'Every Day' : rule.day_of_week}`}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          background: rule.is_available ? '#dcfce7' : '#fee2e2',
                          color: rule.is_available ? '#15803d' : '#b91c1c',
                          letterSpacing: '0.02em'
                        }}>
                          {rule.is_available ? 'Available' : 'Off-Duty'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={14} style={{ color: '#0284c7' }} />
                          {formatTimeLabel(rule.start_time)} - {formatTimeLabel(rule.end_time)} ({rule.slot_duration_minutes}m slots)
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0369a1', fontWeight: 600 }}>
                          <Users size={14} />
                          Max {rule.max_appointments} appointments
                        </span>
                      </div>

                      {rule.notes && (
                        <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px', fontStyle: 'italic' }}>
                          Note: {rule.notes}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      style={{
                        padding: '8px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1px solid #fee2e2',
                        background: '#fef2f2',
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => handleDelete(rule.id)}
                      title="Delete this schedule rule"
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ 
          background: '#f8fafc', 
          borderTop: '1px solid #e2e8f0',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{ 
              padding: '10px 24px', 
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
