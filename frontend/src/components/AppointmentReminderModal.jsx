import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Mail, 
  MessageSquare, 
  Bell, 
  Clock, 
  Calendar, 
  User, 
  Stethoscope, 
  CheckCircle2, 
  Sparkles,
  Smartphone,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export default function AppointmentReminderModal({ appointment, isOpen, onClose, onNotificationSent }) {
  if (!isOpen || !appointment) return null;

  const [reminderChannel, setReminderChannel] = useState('all'); // 'all' | 'dashboard' | 'sms' | 'email'
  const [reminderTiming, setReminderTiming] = useState('24h'); // 'immediate' | '24h' | '2h'
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [customNote, setCustomNote] = useState('');

  const formattedDate = new Date(appointment.appointment_datetime).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = new Date(appointment.appointment_datetime).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Simulated email & phone lookup
  const patientEmail = appointment.patient_email || `${appointment.patient_name?.toLowerCase().replace(/\s+/g, '.')}@email.com`;
  const patientPhone = appointment.patient_phone || '+61 400 123 456';
  const checkinCode = appointment.verification_code || `MW-${String(appointment.id).padStart(6, '0')}`;

  const defaultSmsPreview = `[CityCare Medical] Reminder: Dr. ${appointment.doctor} consultation on ${formattedDate} at ${formattedTime}. Your check-in code is ${checkinCode}. Arrive 10m early.`;
  const defaultEmailSubject = `Appointment Confirmation & Reminder: Dr. ${appointment.doctor} on ${formattedDate}`;

  const handleSendReminder = async () => {
    setSending(true);
    setSentSuccess(false);

    // Simulate sending network request (SMS Gateway + SMTP Server + In-App notification service)
    await new Promise((r) => setTimeout(r, 650));

    // Save reminder audit record and patient dashboard notification to localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('mw_sent_reminders') || '[]');
      const newReminder = {
        id: Date.now(),
        appointmentId: appointment.id,
        patientName: appointment.patient_name,
        patientId: appointment.patient_id,
        doctor: appointment.doctor,
        channel: reminderChannel,
        timing: reminderTiming,
        timestamp: new Date().toISOString(),
        customNote: customNote.trim() || undefined
      };
      localStorage.setItem('mw_sent_reminders', JSON.stringify([newReminder, ...stored.slice(0, 49)]));

      // Push to Patient In-App Dashboard Notifications (if 'all', 'dashboard', or any notification channel selected)
      const existingNotifs = JSON.parse(localStorage.getItem('mw_patient_notifications') || '[]');
      const patientNotification = {
        id: `notif-${Date.now()}`,
        patientId: appointment.patient_id,
        patientName: appointment.patient_name,
        appointmentId: appointment.id,
        title: `Consultation Reminder: Dr. ${appointment.doctor}`,
        message: customNote.trim() 
          ? `Your consultation with Dr. ${appointment.doctor} is on ${formattedDate} at ${formattedTime}. Note: ${customNote.trim()} (Arrival Pass: ${checkinCode})`
          : `Your consultation with Dr. ${appointment.doctor} is scheduled for ${formattedDate} at ${formattedTime}. Please arrive 10 minutes early. (Arrival Pass: ${checkinCode})`,
        doctor: appointment.doctor,
        appointmentDatetime: appointment.appointment_datetime,
        channel: reminderChannel === 'dashboard' ? 'In-App Dashboard' : reminderChannel === 'all' ? 'Dashboard + SMS + Email' : reminderChannel.toUpperCase(),
        timing: reminderTiming,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'reminder'
      };
      localStorage.setItem('mw_patient_notifications', JSON.stringify([patientNotification, ...existingNotifs.slice(0, 49)]));
      
      // Dispatch custom window event so open dashboards and navbar update in real-time
      window.dispatchEvent(new CustomEvent('mw_notification_created', { detail: patientNotification }));
    } catch {
      // Storage fallback
    }

    setSending(false);
    setSentSuccess(true);
    if (onNotificationSent) {
      onNotificationSent({
        appointmentId: appointment.id,
        channel: reminderChannel,
        patientName: appointment.patient_name
      });
    }

    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1250 }}>
      <div 
        className="modal-container"
        style={{
          maxWidth: '580px',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7, #0d9488)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}>
              <Bell size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Send Patient Notification &amp; Reminder
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Dispatch in-app dashboard alerts, automated SMS, and email notices
              </span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '22px 24px', maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
          {sentSuccess ? (
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '16px',
              padding: '28px 20px',
              textAlign: 'center',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#14532d', margin: '0 0 6px' }}>
                Notification Dispatched Successfully!
              </h4>
              <p style={{ color: '#166534', fontSize: '0.85rem', margin: 0 }}>
                {reminderChannel === 'dashboard'
                  ? `In-app alert delivered directly to ${appointment.patient_name}'s patient dashboard & bell inbox.`
                  : reminderChannel === 'all'
                  ? `Notification delivered to ${appointment.patient_name}'s Patient Dashboard, SMS (${patientPhone}), and Email (${patientEmail}).`
                  : reminderChannel === 'sms'
                  ? `SMS notification delivered to ${patientPhone}.`
                  : `Confirmation email delivered to ${patientEmail}.`}
              </p>
            </div>
          ) : (
            <>
              {/* Consultation Summary Card */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px 18px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} color="#0284c7" />
                    <strong style={{ color: '#0f172a', fontSize: '0.94rem' }}>{appointment.patient_name}</strong>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#e0f2fe',
                    color: '#0369a1'
                  }}>
                    Pass: {checkinCode}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem', color: '#475569' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Stethoscope size={14} color="#0d9488" />
                    <span>Dr. {appointment.doctor}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="#0284c7" />
                    <span>{formattedDate}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="#6366f1" />
                    <span>{formattedTime}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Smartphone size={14} color="#64748b" />
                    <span>{patientPhone}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Channel Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                  Notification Delivery Channel
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setReminderChannel('all')}
                    style={{
                      padding: '9px 8px',
                      borderRadius: '10px',
                      border: reminderChannel === 'all' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                      background: reminderChannel === 'all' ? '#f0f9ff' : '#ffffff',
                      color: reminderChannel === 'all' ? '#0369a1' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Sparkles size={14} />
                    <span>All Channels</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReminderChannel('dashboard')}
                    style={{
                      padding: '9px 8px',
                      borderRadius: '10px',
                      border: reminderChannel === 'dashboard' ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                      background: reminderChannel === 'dashboard' ? '#f5f3ff' : '#ffffff',
                      color: reminderChannel === 'dashboard' ? '#6d28d9' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Bell size={14} />
                    <span>Patient App</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReminderChannel('sms')}
                    style={{
                      padding: '9px 8px',
                      borderRadius: '10px',
                      border: reminderChannel === 'sms' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                      background: reminderChannel === 'sms' ? '#f0f9ff' : '#ffffff',
                      color: reminderChannel === 'sms' ? '#0369a1' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <MessageSquare size={14} />
                    <span>SMS Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReminderChannel('email')}
                    style={{
                      padding: '9px 8px',
                      borderRadius: '10px',
                      border: reminderChannel === 'email' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                      background: reminderChannel === 'email' ? '#f0f9ff' : '#ffffff',
                      color: reminderChannel === 'email' ? '#0369a1' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Mail size={14} />
                    <span>Email Only</span>
                  </button>
                </div>
              </div>


              {/* Reminder Timing Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                  Dispatch Schedule
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'immediate', label: 'Send Now', desc: 'Instant dispatch' },
                    { id: '24h', label: '24 Hours Prior', desc: 'Standard reminder' },
                    { id: '2h', label: '2 Hours Prior', desc: 'Urgent reminder' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setReminderTiming(t.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: reminderTiming === t.id ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                        background: reminderTiming === t.id ? '#f0fdfa' : '#ffffff',
                        color: reminderTiming === t.id ? '#0f766e' : '#64748b',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>{t.label}</div>
                      <small style={{ fontSize: '0.68rem', fontWeight: 500, opacity: 0.8 }}>{t.desc}</small>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Live Preview Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px 16px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 800, marginBottom: '8px' }}>
                  Live Notification Preview:
                </div>

                {/* Patient App In-App Alert Preview */}
                {(reminderChannel === 'all' || reminderChannel === 'dashboard') && (
                  <div style={{
                    background: '#f5f3ff',
                    border: '1.5px solid #ddd6fe',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                    color: '#4c1d95',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <Bell size={13} color="#7c3aed" />
                      <strong style={{ color: '#6d28d9' }}>Patient Dashboard In-App Notification:</strong>
                    </div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Consultation Reminder: Dr. {appointment.doctor}</div>
                    <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px' }}>
                      Your consultation with Dr. {appointment.doctor} is scheduled for {formattedDate} at {formattedTime}. (Arrival Pass: {checkinCode})
                      {customNote ? ` Note: ${customNote}` : ''}
                    </div>
                  </div>
                )}

                {/* SMS Preview */}
                {(reminderChannel === 'all' || reminderChannel === 'sms') && (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                    color: '#334155',
                    marginBottom: (reminderChannel === 'all') ? '8px' : '0',
                    fontFamily: 'monospace'
                  }}>
                    <strong style={{ color: '#0284c7' }}>📱 SMS ({patientPhone}):</strong><br />
                    {defaultSmsPreview}
                    {customNote ? ` Note: ${customNote}` : ''}
                  </div>
                )}

                {/* Email Preview */}
                {(reminderChannel === 'all' || reminderChannel === 'email') && (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                    color: '#334155'
                  }}>
                    <strong style={{ color: '#0d9488' }}>✉️ Email ({patientEmail}):</strong><br />
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{defaultEmailSubject}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                      Includes verified appointment details, QR arrival pass, and clinic location map.
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Add-on Note */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                  Special Instructions or Preparation Notes (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Please bring recent blood test reports and Medicare card..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '0.84rem'
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!sentSuccess && (
          <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: '10px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendReminder}
              disabled={sending}
              style={{
                padding: '9px 22px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7, #0d9488)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                transition: 'all 0.2s ease'
              }}
            >
              {sending ? (
                <>
                  <span className="spinner" style={{ width: '14px', height: '14px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  <span>Dispatching Notification...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Send Automated Reminder</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
