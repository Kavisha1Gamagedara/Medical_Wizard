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
      await fetchSchedules();
      if (onScheduleUpdated) onScheduleUpdated();
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
      if (onScheduleUpdated) onScheduleUpdated();
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

          {/* Doctor Badge */}
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(13, 148, 136, 0.15))',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-accent)', fontWeight: 700 }}>
                Doctor Profile
              </span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {doctorName}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {targetDoctor?.specialization || 'Clinical Practitioner'} &bull; {targetDoctor?.email}
              </div>
            </div>
            <div className="badge-tag" style={{ margin: 0 }}>
              <Sparkles size={13} />
              Active Scheduling
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSubmit} style={{ 
            background: 'var(--bg-input)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: 'var(--radius-md)', 
            padding: '20px',
            marginBottom: '28px'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} color="var(--primary)" />
              Set Available Times &amp; Daily Limits
            </h3>

            {/* Schedule Type Toggle */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                type="button"
                className={`btn-cancel ${scheduleType === 'date' ? 'active' : ''}`}
                style={{ 
                  flex: 1, 
                  fontSize: '0.82rem', 
                  padding: '8px 12px',
                  background: scheduleType === 'date' ? 'rgba(6, 182, 212, 0.2)' : 'var(--bg-surface)',
                  borderColor: scheduleType === 'date' ? 'var(--primary)' : 'var(--border-subtle)',
                  color: scheduleType === 'date' ? 'var(--text-accent)' : 'var(--text-secondary)'
                }}
                onClick={() => setScheduleType('date')}
              >
                Specific Calendar Date
              </button>
              <button
                type="button"
                className={`btn-cancel ${scheduleType === 'weekday' ? 'active' : ''}`}
                style={{ 
                  flex: 1, 
                  fontSize: '0.82rem', 
                  padding: '8px 12px',
                  background: scheduleType === 'weekday' ? 'rgba(6, 182, 212, 0.2)' : 'var(--bg-surface)',
                  borderColor: scheduleType === 'weekday' ? 'var(--primary)' : 'var(--border-subtle)',
                  color: scheduleType === 'weekday' ? 'var(--text-accent)' : 'var(--text-secondary)'
                }}
                onClick={() => setScheduleType('weekday')}
              >
                Weekly Recurring Schedule
              </button>
            </div>

            {/* Date / Day selection */}
            {scheduleType === 'date' ? (
              <div className="form-group">
                <label className="form-label" htmlFor="avail-date">Specific Date *</label>
                <div className="input-with-icon">
                  <input
                    id="avail-date"
                    type="date"
                    className="form-input"
                    min={getTodayStr()}
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    required
                  />
                  <Calendar size={18} className="input-icon" />
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="avail-day">Recurring Day of Week *</label>
                <select
                  id="avail-day"
                  className="form-input role-select"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
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

            {/* Working Hours: Start & End */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="avail-start">Available Start Time *</label>
                <div className="input-with-icon">
                  <input
                    id="avail-start"
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    required
                  />
                  <Clock size={18} className="input-icon" />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="avail-end">Available End Time *</label>
                <div className="input-with-icon">
                  <input
                    id="avail-end"
                    type="time"
                    className="form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    required
                  />
                  <Clock size={18} className="input-icon" />
                </div>
              </div>
            </div>

            {/* Max Appointments Capacity & Slot Duration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="avail-max-apts">
                  Max Appointments for this Date *
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
                    required
                  />
                  <Users size={18} className="input-icon" />
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                  Doctor's daily capacity limit before marked as fully booked.
                </small>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="avail-slot-duration">
                  Consultation Slot Duration
                </label>
                <select
                  id="avail-slot-duration"
                  className="form-input role-select"
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(e.target.value)}
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes (Standard)</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes (Comprehensive)</option>
                </select>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                  Interval between booking options.
                </small>
              </div>
            </div>

            {/* Status toggle & Notes */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', marginTop: '6px' }}>
              <input
                id="avail-active"
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <label htmlFor="avail-active" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                Doctor is Available for Consultations (Uncheck to mark this day off / unavailable)
              </label>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="avail-notes">Schedule Notes / Details (Optional)</label>
              <input
                id="avail-notes"
                type="text"
                className="form-input"
                placeholder="e.g. Morning clinic only; afternoon surgery rounds"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-submit"
              style={{ width: '100%', margin: 0 }}
              disabled={saving}
              id="btn-save-availability"
            >
              {saving ? (
                <>
                  <span className="spinner" />
                  <span>Saving Schedule...</span>
                </>
              ) : (
                <>
                  <CalendarCheck size={16} />
                  <span>Save Availability &amp; Daily Limit</span>
                </>
              )}
            </button>
          </form>

          {/* Configured Rules List */}
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Configured Schedule Rules ({availabilities.length})</span>
              {loading && <span className="spinner" style={{ width: '14px', height: '14px' }} />}
            </h3>

            {availabilities.length === 0 ? (
              <div style={{ 
                padding: '24px', 
                textAlign: 'center', 
                background: 'var(--bg-surface)', 
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                border: '1px dashed var(--border-subtle)'
              }}>
                <Info size={20} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                No custom schedule rules configured yet. Standard clinic default (09:00 AM - 05:00 PM, max 10 appointments) is currently active.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availabilities.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          {rule.specific_date ? `Date: ${rule.specific_date}` : `Weekly: ${rule.day_of_week === 'ALL' ? 'Every Day' : rule.day_of_week}`}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: rule.is_available ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: rule.is_available ? 'var(--emerald-accent)' : '#f87171'
                        }}>
                          {rule.is_available ? 'Available' : 'Off-Duty'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span>
                          <Clock size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                          {formatTimeLabel(rule.start_time)} - {formatTimeLabel(rule.end_time)} ({rule.slot_duration_minutes}m slots)
                        </span>
                        <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>
                          <Users size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                          Max {rule.max_appointments} appointments
                        </span>
                      </div>

                      {rule.notes && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                          Note: {rule.notes}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn-delete"
                      style={{ padding: '7px 12px', fontSize: '0.78rem' }}
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

        <div className="modal-footer">
          <button
            type="button"
            className="btn-submit"
            onClick={onClose}
            style={{ width: 'auto', padding: '9px 24px', margin: 0 }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
