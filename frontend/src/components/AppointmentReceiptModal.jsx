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

  const isCompleted = appointment.status === 'Completed';
  const isCheckedIn = appointment.status === 'Checked In' || appointment.is_verified || isCompleted;
  const isExpired = appointment.status === 'Expired';
  const isCancelled = appointment.status === 'Cancelled';

  return (
    <div className="modal-backdrop receipt-modal-backdrop" style={{ zIndex: 1200 }}>
      <div 
        className="modal-container printable-receipt" 
        style={{ 
          maxWidth: '560px', 
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Receipt Header Bar */}
        <div 
          className="modal-header" 
          style={{ 
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            padding: '20px 26px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-logo-icon" style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7' }}>
              <HeartPulse size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Appointment Receipt &amp; Check-In Pass
                </h2>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '2px 0 0' }}>
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
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <span 
              className="badge-tag" 
              style={{ 
                margin: '0 auto 8px', 
                background: isCompleted ? '#ede9fe' : isExpired ? '#fef3c7' : isCheckedIn ? '#ecfdf5' : '#f0f9ff',
                borderColor: isCompleted ? '#ddd6fe' : isExpired ? '#fde68a' : isCheckedIn ? '#a7f3d0' : '#bae6fd',
                color: isCompleted ? '#6d28d9' : isExpired ? '#b45309' : isCheckedIn ? '#059669' : '#0284c7',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: '20px'
              }}
            >
              {isCompleted ? <CheckCircle2 size={13} /> : isExpired ? <AlertCircle size={13} /> : isCheckedIn ? <CheckCircle2 size={13} /> : <Sparkles size={13} />}
              {isCompleted ? 'Consultation Completed' : isExpired ? 'Appointment Expired' : isCheckedIn ? 'Patient Checked In' : 'Official Hospital Check-In Pass'}
            </span>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Present this pass or scan QR code at hospital reception upon arrival.
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              background: '#f8fafc',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              marginBottom: '20px',
              position: 'relative'
            }}
          >
            <div 
              style={{ 
                background: '#ffffff', 
                padding: '12px', 
                borderRadius: '12px', 
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                position: 'relative',
                border: '1px solid #f1f5f9'
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
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>
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
                    color: '#0284c7'
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
                    borderColor: copied ? '#a7f3d0' : '#cbd5e1',
                    color: copied ? '#059669' : '#475569',
                    borderRadius: '8px'
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
          {isCompleted ? (
            <div 
              style={{ 
                background: '#ede9fe', 
                border: '1px solid #ddd6fe', 
                borderRadius: '12px', 
                padding: '12px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginBottom: '20px'
              }}
            >
              <CheckCircle2 size={24} color="#6d28d9" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, color: '#6d28d9', fontSize: '0.9rem' }}>
                  Consultation Completed
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                  {appointment.verified_by ? `Verified by staff: ${appointment.verified_by}` : 'Completed at clinic'}
                  {appointment.verified_at && ` on ${new Date(appointment.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              </div>
            </div>
          ) : isExpired ? (
            <div 
              style={{ 
                background: '#fef3c7', 
                border: '1px solid #fde68a', 
                borderRadius: '12px', 
                padding: '12px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginBottom: '20px'
              }}
            >
              <AlertCircle size={24} color="#d97706" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, color: '#b45309', fontSize: '0.9rem' }}>
                  Appointment Expired
                </div>
                <div style={{ fontSize: '0.78rem', color: '#78350f' }}>
                  The scheduled consultation time has elapsed without patient attendance or verification.
                </div>
              </div>
            </div>
          ) : isCheckedIn ? (
            <div 
              style={{ 
                background: '#ecfdf5', 
                border: '1px solid #a7f3d0', 
                borderRadius: '12px', 
                padding: '12px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginBottom: '20px'
              }}
            >
              <CheckCircle2 size={24} color="#059669" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.9rem' }}>
                  Patient Arrival Verified &amp; Checked In
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                  {appointment.verified_by ? `Checked in by staff: ${appointment.verified_by}` : 'Checked in at front desk'}
                  {appointment.verified_at && ` on ${new Date(appointment.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              </div>
            </div>
          ) : (
            <div 
              style={{ 
                background: '#f0f9ff', 
                border: '1px solid #bae6fd', 
                borderRadius: '12px', 
                padding: '12px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                marginBottom: '20px'
              }}
            >
              <ShieldCheck size={22} color="#0284c7" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                Status: <strong style={{ color: '#0284c7' }}>Scheduled</strong>. Present this digital slip at reception so staff can verify your booking.
              </div>
            </div>
          )}

          {/* Appointment Data Sheet */}
          <div 
            style={{ 
              background: '#f8fafc', 
              borderRadius: '14px', 
              padding: '18px 20px', 
              border: '1px solid #e2e8f0',
              fontSize: '0.86rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Patient Name</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {appointment.patient_name}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Consulting Doctor</span>
              <span style={{ fontWeight: 700, color: '#0284c7' }}>
                {appointment.doctor}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Date &amp; Time</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {formattedDateTime}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Consultation Type</span>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                {appointment.appointment_type}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Hospital Facility</span>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                Medical Wizard Clinical Suite &bull; Level 2
              </span>
            </div>

            {appointment.notes && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '2px' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', marginBottom: '2px' }}>
                  Clinical / Front-desk Notes:
                </span>
                <span style={{ color: '#334155', fontSize: '0.82rem', whiteSpace: 'pre-line' }}>
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
            background: '#ffffff',
            borderTop: '1px solid #f1f5f9',
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
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem', borderRadius: '10px' }}
              title="Print appointment slip"
            >
              <Printer size={15} />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={handleDownloadQr}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem', borderRadius: '10px' }}
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
            style={{ width: 'auto', padding: '8px 22px', fontSize: '0.84rem', margin: 0, borderRadius: '10px', background: '#0f172a' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
