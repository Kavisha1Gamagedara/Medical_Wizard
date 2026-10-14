import React, { useState } from 'react';
import { Clock, Bell, CheckCircle, AlertCircle, X, CalendarPlus, User, Stethoscope } from 'lucide-react';
import { waitlistService } from '../services/api';

export default function WaitlistModal({ isOpen, onClose, doctor, preferredDate, currentUser, onJoined }) {
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');

    if (!doctor || !preferredDate) {
      setError('Doctor and preferred date are required.');
      return;
    }

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = new Date(preferredDate);
    if (chosen < today) {
      setError('Cannot join a waitlist for a past date. Please select an upcoming date.');
      return;
    }

    if (!currentUser || currentUser.role !== 'patient') {
      setError('Only patients can join the waitlist. Please log in as a patient.');
      return;
    }

    setLoading(true);
    try {
      const entry = await waitlistService.joinWaitlist({
        doctor: doctor,
        preferred_date: preferredDate,
        preferred_time: preferredTime || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      if (onJoined) onJoined(entry);
    } catch (err) {
      setError(err.message || 'Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess(false);
    setPreferredTime('');
    setNotes('');
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1300 }}>
      <div
        className="modal-container"
        style={{
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.28)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            padding: '22px 26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', fontWeight: 800 }}>
                Join Priority Waitlist
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.8)' }}>
                Get notified instantly when a slot opens
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          /* Success State */
          <div style={{ padding: '36px 26px', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)',
              }}
            >
              <CheckCircle size={32} color="#059669" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              You're on the Waitlist! 🎉
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.6, marginBottom: '6px' }}>
              You've been added to the priority waitlist for{' '}
              <strong>{doctor}</strong> on <strong>{preferredDate}</strong>.
            </p>
            <p style={{ fontSize: '0.82rem', color: '#6366f1', fontWeight: 600, marginBottom: '24px' }}>
              ⚡ You will receive an instant in-app alert as soon as any cancellation opens a slot!
            </p>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px 18px',
                textAlign: 'left',
                fontSize: '0.8rem',
                color: '#475569',
                marginBottom: '20px',
                lineHeight: 1.7,
              }}
            >
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>📋 Cancellation Policy</div>
              <div>• Slots are offered on a <strong>first-come-first-served</strong> basis among waitlisted patients.</div>
              <div>• You have <strong>30 minutes</strong> to claim an alerted slot before it is offered to the next patient.</div>
              <div>• You can cancel your waitlist request at any time from your notifications or dashboard.</div>
            </div>
            <button
              type="button"
              className="btn-submit"
              style={{ width: '100%', borderRadius: '12px', padding: '12px' }}
              onClick={handleClose}
            >
              Done — I'll Watch for My Alert
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleJoin} style={{ padding: '22px 26px' }}>
            {/* Cancellation Policy Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.06))',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '18px',
                fontSize: '0.78rem',
                color: '#4338ca',
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: '4px' }}>⚡ How Slot Reclaim Works</div>
              <div>When a patient <strong>cancels their appointment</strong> with {doctor}, you'll be instantly alerted via this dashboard. You'll have <strong>30 minutes</strong> to claim the slot and book your appointment.</div>
            </div>

            {/* Doctor & Date Summary */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#334155' }}>
                <Stethoscope size={15} color="#6366f1" />
                <span>
                  <strong>Doctor:</strong> {doctor}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#334155' }}>
                <CalendarPlus size={15} color="#6366f1" />
                <span>
                  <strong>Preferred Date:</strong> {preferredDate}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#334155' }}>
                <User size={15} color="#6366f1" />
                <span>
                  <strong>Patient:</strong> {currentUser?.full_name || currentUser?.username}
                </span>
              </div>
            </div>

            {/* Optional preferred time */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Preferred Time (Optional)
              </label>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '0.86rem',
                  colorScheme: 'light',
                  boxSizing: 'border-box',
                }}
              />
              <small style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                Indicate your ideal time slot — we'll try to match your preference.
              </small>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Additional Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Urgent follow-up needed, any time from 2pm..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '0.84rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecdd3',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={handleClose}
                style={{ flex: 1, padding: '11px', borderRadius: '12px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '11px',
                  borderRadius: '12px',
                  background: loading
                    ? '#a5b4fc'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.35)',
                  transition: 'all 0.2s ease',
                }}
                id="btn-join-waitlist-confirm"
              >
                <Bell size={16} />
                <span>{loading ? 'Joining Waitlist...' : 'Join Priority Waitlist'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
