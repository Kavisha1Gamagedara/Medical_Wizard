import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  PhoneCall, 
  Mail, 
  MessageSquare, 
  Copy, 
  Check, 
  Send, 
  Clock, 
  Calendar, 
  User, 
  Stethoscope, 
  FileText, 
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function ContactPatientModal({ isOpen, onClose, appointment, patient }) {
  if (!isOpen || !appointment) return null;

  const patientName = appointment.patient_name || 'Patient';
  const doctorName = appointment.doctor || 'Doctor';
  const aptType = appointment.appointment_type || 'Consultation';
  const aptCode = appointment.verification_code || `MW-${String(appointment.id).padStart(6, '0')}`;
  const scheduledTimeStr = new Date(appointment.appointment_datetime).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const phoneNumber = patient?.phone_number || '+61 498 765 432';
  const emailAddress = patient?.email || `${patientName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@medicalwizard.com.au`;
  const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');

  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('reminder');
  const [customMessage, setCustomMessage] = useState('');
  const [logNote, setLogNote] = useState('');
  const [logSuccess, setLogSuccess] = useState(false);

  const templates = {
    reminder: `Hello ${patientName}, this is a reminder for your upcoming ${aptType} appointment with Dr. ${doctorName} scheduled for ${scheduledTimeStr}. Please show your check-in code ${aptCode} upon arrival at CityCare Medical Wizard.`,
    delayed: `Hello ${patientName}, Dr. ${doctorName} is running approximately 15 minutes behind schedule today due to an urgent procedure. We apologize for the wait and will notify you as soon as the consulting suite is ready.`,
    ready: `Hello ${patientName}, Dr. ${doctorName} is ready to see you now for your ${aptType}. Please proceed directly to Clinical Suite #2.`,
    prep: `Hello ${patientName}, ahead of your ${aptType} consultation with Dr. ${doctorName}, please ensure you bring your Medicare/insurance card and any recent diagnostic reports or medication lists.`
  };

  const activeMessage = customMessage || templates[selectedTemplateKey];

  const handleSelectTemplate = (key) => {
    setSelectedTemplateKey(key);
    setCustomMessage(templates[key]);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(phoneNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailAddress);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(activeMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleSaveLog = (e) => {
    e.preventDefault();
    if (!logNote.trim()) return;
    setLogSuccess(true);
    setTimeout(() => {
      setLogSuccess(false);
      setLogNote('');
    }, 2800);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200 }}>
      <div 
        className="modal-container" 
        style={{ 
          maxWidth: '620px', 
          width: '95%',
          borderRadius: '24px', 
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)'
        }}
      >
        {/* Header */}
        <div 
          className="modal-header" 
          style={{ 
            padding: '20px 24px', 
            background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)',
            borderBottom: '1px solid #e2e8f0' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #dcfce7, #ccfbf1)',
              border: '1.5px solid #86efac',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.15)'
            }}>
              <PhoneCall size={22} color="#059669" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#047857',
                  fontWeight: 700,
                  borderRadius: '12px'
                }}>
                  Direct Patient Dispatch
                </span>
                <span style={{
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  background: appointment.status === 'Checked In' ? '#ecfdf5' : '#f0f9ff',
                  border: `1px solid ${appointment.status === 'Checked In' ? '#a7f3d0' : '#bae6fd'}`,
                  color: appointment.status === 'Checked In' ? '#047857' : '#0369a1',
                  fontWeight: 700,
                  borderRadius: '12px'
                }}>
                  {appointment.status}
                </span>
              </div>
              <h2 style={{ fontSize: '1.28rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
                Contact {patientName}
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                {aptType} &bull; Dr. {doctorName} &bull; Ref #{appointment.id}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose} 
            aria-label="Close contact modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '78vh', overflowY: 'auto' }}>
          
          {/* Appointment Quick Context Bar */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '12px 16px',
            marginBottom: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px'
          }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Consultation Time
              </span>
              <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{scheduledTimeStr}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Clinician on Duty
              </span>
              <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>Dr. {doctorName}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Pass Verification Code
              </span>
              <code style={{ fontSize: '0.86rem', color: '#0284c7', fontWeight: 800, fontFamily: 'monospace' }}>
                {aptCode}
              </code>
            </div>
          </div>

          {/* Contact Channels Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            {/* Phone Channel Card */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #bbf7d0',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: '#dcfce7',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Phone size={16} />
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                    Telephone Contact
                  </span>
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{phoneNumber}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <a
                  href={`tel:${cleanPhone}`}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <PhoneCall size={13} />
                  <span>Call Now</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyPhone}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Copy phone number to clipboard"
                >
                  {copiedPhone ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                  <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Email Channel Card */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #bae6fd',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Mail size={16} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                    Email Address
                  </span>
                  <strong style={{ fontSize: '0.86rem', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', overflow: 'hidden' }} title={emailAddress}>
                    {emailAddress}
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <a
                  href={`mailto:${emailAddress}?subject=${encodeURIComponent(`CityCare Medical Notice - Consultation with Dr. ${doctorName}`)}&body=${encodeURIComponent(activeMessage)}`}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0284c7, #0d9488)',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                  }}
                >
                  <Mail size={13} />
                  <span>Send Email</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Copy email address to clipboard"
                >
                  {copiedEmail ? <Check size={13} color="#0284c7" /> : <Copy size={13} />}
                  <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Clinical Dispatch Templates Section */}
          <div style={{ 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '16px', 
            padding: '16px',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={16} color="#0284c7" />
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                  1-Click Clinical Dispatch &amp; SMS
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                Select a message template
              </span>
            </div>

            {/* Template Selector Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {[
                { key: 'reminder', label: '📍 Arrival Reminder' },
                { key: 'delayed', label: '⏳ Running Late (15m)' },
                { key: 'ready', label: '🩺 Suite Ready Now' },
                { key: 'prep', label: '📋 Medicare / Pre-Docs' },
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleSelectTemplate(t.key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: selectedTemplateKey === t.key ? '1px solid #0284c7' : '1px solid #e2e8f0',
                    background: selectedTemplateKey === t.key ? '#f0f9ff' : '#f8fafc',
                    color: selectedTemplateKey === t.key ? '#0284c7' : '#475569',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Message Box */}
            <textarea
              className="form-input"
              rows="3"
              value={activeMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              style={{
                width: '100%',
                fontSize: '0.82rem',
                lineHeight: 1.5,
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                resize: 'vertical',
                marginBottom: '10px'
              }}
              placeholder="Type custom dispatch message to patient..."
            />

            {/* Message Actions */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCopyMessage}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {copiedMessage ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                <span>{copiedMessage ? 'Message Copied!' : 'Copy Text'}</span>
              </button>

              <a
                href={`sms:${cleanPhone}?body=${encodeURIComponent(activeMessage)}`}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                }}
              >
                <MessageSquare size={13} />
                <span>Launch SMS</span>
              </a>

              <a
                href={`https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(activeMessage)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                }}
              >
                <Send size={13} />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Log Internal Contact Record */}
          <form onSubmit={handleSaveLog} style={{
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '14px',
            padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                Log Clinical Contact Note (Internal Audit)
              </span>
              {logSuccess && (
                <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} />
                  <span>Contact attempt logged!</span>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Spoke to patient, confirmed ETA at 2:40 PM..."
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                style={{ flex: 1, fontSize: '0.78rem', padding: '7px 12px', background: '#ffffff' }}
              />
              <button
                type="submit"
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Save Note
              </button>
            </div>
          </form>

        </div>

        {/* Footer */}
        <div 
          className="modal-footer" 
          style={{ 
            padding: '14px 24px', 
            background: '#ffffff', 
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: '10px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
