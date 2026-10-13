import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  HeartPulse, 
  ShieldCheck, 
  Sparkles,
  AlertCircle,
  FileText
} from 'lucide-react';

export default function AppointmentReceiptModal({ appointment, isOpen, onClose }) {
  if (!isOpen || !appointment) return null;

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(true);

  const verificationCode = appointment.verification_code || `MW-${String(appointment.id).padStart(6, '0')}`;

  // Generate QR code on modal open or code change
  useEffect(() => {
    let isMounted = true;
    const generateQrCode = async () => {
      setGeneratingQr(true);
      try {
        // QR encodes verification code so any front-desk camera or scanner immediately reads the code
        const dataUrl = await QRCode.toDataURL(verificationCode, {
          width: 260,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });
        if (isMounted) {
          setQrDataUrl(dataUrl);
        }
      } catch (err) {
        console.error('Failed to generate appointment QR code:', err);
      } finally {
        if (isMounted) setGeneratingQr(false);
      }
    };

    generateQrCode();
    return () => {
      isMounted = false;
    };
  }, [verificationCode]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(verificationCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `MedicalWizard_QR_${verificationCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formattedDateTime = appointment.appointment_datetime 
    ? new Date(appointment.appointment_datetime).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not scheduled';

  const isCheckedIn = appointment.status === 'Checked In' || appointment.is_verified;

  return (
    <div className="modal-backdrop receipt-modal-backdrop" style={{ zIndex: 1200 }}>
      <div 
        className="modal-container printable-receipt" 
        style={{ 
          maxWidth: '560px', 
          background: 'linear-gradient(180deg, #111a2e 0%, #0c1322 100%)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(6, 182, 212, 0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Receipt Header Bar */}
        <div 
          className="modal-header" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(13, 148, 136, 0.12))',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '18px 24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-logo-icon" style={{ width: '42px', height: '42px', borderRadius: '10px' }}>
              <HeartPulse size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  Appointment Receipt &amp; Check-In Pass
                </h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '2px 0 0' }}>
                Medical Wizard Clinical Practice &bull; Ref #APT-{appointment.id}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="modal-close-btn no-print" 
            onClick={onClose}
            aria-label="Close receipt"
          >
            <X size={18} />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="modal-body" style={{ padding: '24px 28px', maxHeight: '78vh', overflowY: 'auto' }}>
          {/* Hospital Watermark & Subtitle */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span 
              className="badge-tag" 
              style={{ 
                margin: '0 auto 8px', 
                background: isCheckedIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                borderColor: isCheckedIn ? 'rgba(16, 185, 129, 0.4)' : 'rgba(6, 182, 212, 0.4)',
                color: isCheckedIn ? '#6ee7b7' : '#67e8f9'
              }}
            >
              {isCheckedIn ? <CheckCircle2 size={13} /> : <Sparkles size={13} />}
              {isCheckedIn ? 'Patient Checked In & Verified' : 'Official Hospital Check-In Pass'}
            </span>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Present this pass or scan QR code at hospital reception upon arrival.
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              background: 'rgba(15, 23, 42, 0.85)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '20px',
              position: 'relative',
              boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div 
              style={{ 
                background: '#ffffff', 
                padding: '12px', 
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                position: 'relative'
              }}
            >
              {generatingQr ? (
                <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner" style={{ width: '28px', height: '28px' }} />
                </div>
              ) : qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`QR Check-in code ${verificationCode}`} 
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              ) : null}
            </div>

            {/* Random Verification Code Highlight Box */}
            <div style={{ marginTop: '16px', textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                Patient Verification Code
              </div>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '10px', 
                  marginTop: '4px' 
                }}
              >
                <span 
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '1.75rem', 
                    fontWeight: 900, 
                    letterSpacing: '0.15em',
                    color: '#38bdf8',
                    textShadow: '0 0 16px rgba(56, 189, 248, 0.4)'
                  }}
                >
                  {verificationCode}
                </span>
                <button
                  type="button"
                  className="btn-cancel no-print"
                  onClick={handleCopyCode}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '0.76rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    borderColor: copied ? 'var(--emerald-accent)' : undefined,
                    color: copied ? 'var(--emerald-accent)' : undefined
                  }}
                  title="Copy verification code"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Verification Status Banner */}
          {isCheckedIn ? (
            <div 
              style={{ 
                background: 'rgba(16, 185, 129, 0.12)', 
                border: '1px solid rgba(16, 185, 129, 0.35)', 
                borderRadius: '10px', 
                padding: '12px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginBottom: '20px'
              }}
            >
              <CheckCircle2 size={24} color="var(--emerald-accent)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, color: 'var(--emerald-accent)', fontSize: '0.9rem' }}>
                  Patient Arrival Verified &amp; Checked In
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {appointment.verified_by ? `Checked in by staff: ${appointment.verified_by}` : 'Checked in at front desk'}
                  {appointment.verified_at && ` on ${new Date(appointment.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              </div>
            </div>
          ) : (
            <div 
              style={{ 
                background: 'rgba(6, 182, 212, 0.08)', 
                border: '1px solid rgba(6, 182, 212, 0.25)', 
                borderRadius: '10px', 
                padding: '12px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginBottom: '20px'
              }}
            >
              <ShieldCheck size={22} color="var(--primary)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Status: <strong style={{ color: '#38bdf8' }}>Scheduled</strong>. Present this digital slip at reception so staff can verify your booking.
              </div>
            </div>
          )}

          {/* Appointment Data Sheet */}
          <div 
            style={{ 
              background: 'var(--bg-input)', 
              borderRadius: 'var(--radius-md)', 
              padding: '18px 20px', 
              border: '1px solid var(--border-subtle)',
              fontSize: '0.86rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Patient Name</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {appointment.patient_name}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Consulting Doctor</span>
              <span style={{ fontWeight: 700, color: 'var(--teal-accent)' }}>
                {appointment.doctor}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Date &amp; Time</span>
              <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                {formattedDateTime}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Consultation Type</span>
              <span style={{ fontWeight: 600 }}>
                {appointment.appointment_type}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hospital Facility</span>
              <span style={{ fontWeight: 600 }}>
                Medical Wizard Clinical Suite &bull; Level 2
              </span>
            </div>

            {appointment.notes && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '2px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'block', marginBottom: '2px' }}>
                  Clinical / Front-desk Notes:
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', whiteSpace: 'pre-line' }}>
                  {appointment.notes}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer & Actions */}
        <div 
          className="modal-footer no-print" 
          style={{ 
            padding: '16px 24px', 
            background: 'rgba(11, 19, 35, 0.7)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-cancel"
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
              title="Print appointment slip"
            >
              <Printer size={15} />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={handleDownloadQr}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
              title="Download QR code"
            >
              <Download size={15} />
              <span>Save QR</span>
            </button>
          </div>

          <button
            type="button"
            className="btn-submit"
            onClick={onClose}
            style={{ width: 'auto', padding: '8px 22px', fontSize: '0.84rem', margin: 0 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
