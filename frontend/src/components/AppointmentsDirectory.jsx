import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  User,
  Stethoscope,
  RefreshCw,
  Plus,
  Lock,
  ArrowRight,
  QrCode
} from 'lucide-react';
import { appointmentService } from '../services/api';
import AppointmentReceiptModal from './AppointmentReceiptModal';
import StaffVerifyPatientModal from './StaffVerifyPatientModal';

export default function AppointmentsDirectory({ onNewBookingClick, currentUser, onNavigate }) {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, scheduled: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // User Role & Permissions
  const userRole = currentUser?.role || 'guest';
  const isPatient = userRole === 'patient';
  const isDoctor = userRole === 'doctor';
  const isStaff = userRole === 'staff';
  const isAdmin = userRole === 'admin';

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState(isPatient || isDoctor ? 'mine' : 'all');

  // Edit State
  const [editingApt, setEditingApt] = useState(null);
  const [editStatus, setEditStatus] = useState('Scheduled');
  const [editNotes, setEditNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null); // { text: '', type: 'success' | 'error' }

  // Verification & Receipt State
  const [selectedReceiptApt, setSelectedReceiptApt] = useState(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [quickVerifyingId, setQuickVerifyingId] = useState(null);

  const showFeedback = (text, type = 'success') => {
    setActionFeedback({ text, type });
    setTimeout(() => {
      setActionFeedback(null);
    }, 3000);
  };

  const isAppointmentUpcoming = (apt) => {
    if (!apt || !apt.appointment_datetime) return false;
    const aptTime = new Date(apt.appointment_datetime).getTime();
    const nowTime = new Date().getTime();
    return aptTime > nowTime && apt.status === 'Scheduled';
  };

  const handleQuickCheckin = async (apt) => {
    setQuickVerifyingId(apt.id);
    try {
      const code = apt.verification_code || `MW-${String(apt.id).padStart(6, '0')}`;
      await appointmentService.verifyPatientArrival(code, 'Quick reception QR check-in & completion');
      await fetchAppointments();
      showFeedback(`Appointment #${apt.id} verified and marked as Completed.`);
    } catch (err) {
      showFeedback(`Check-in failed: ${err.message}`, 'error');
    } finally {
      setQuickVerifyingId(null);
    }
  };

  const fetchAppointments = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const queryParams = {
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      if (isAdmin || isStaff) {
        if (scopeFilter === 'mine') {
          queryParams.search = currentUser.username;
        }
      }

      const [listData, statsData] = await Promise.all([
        appointmentService.getAppointments(queryParams),
        appointmentService.getStats(),
      ]);
      setAppointments(listData);
      setStats(statsData);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAppointments();
    } else {
      setLoading(false);
    }
  }, [currentUser, statusFilter, scopeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAppointments();
  };

  const handleOpenEdit = (apt) => {
    if (!isAppointmentUpcoming(apt)) {
      alert("Past or completed appointments cannot be edited. Only upcoming consultations can be modified.");
      return;
    }
    setEditingApt(apt);
    setEditStatus(apt.status);
    setEditNotes(apt.notes || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingApt) return;
    setSaveLoading(true);
    try {
      const aptId = editingApt.id;
      await appointmentService.updateAppointment(aptId, {
        status: editStatus,
        notes: editNotes.trim() || undefined,
      });
      setEditingApt(null);
      await fetchAppointments();
      showFeedback(`Appointment #${aptId} updated successfully.`);
    } catch (err) {
      showFeedback(`Update failed: ${err.message}`, 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRequestDelete = (apt) => {
    setAppointmentToDelete(apt);
  };

  const confirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    const id = appointmentToDelete.id;
    setDeletingId(id);
    try {
      await appointmentService.deleteAppointment(id);
      setAppointmentToDelete(null);
      await fetchAppointments();
      showFeedback(`Appointment #${id} deleted successfully.`);
    } catch (err) {
      showFeedback(`Deletion failed: ${err.message}`, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status, isVerified = false, datetime = null) => {
    const isPast = datetime ? new Date(datetime).getTime() < new Date().getTime() : false;
    const effectiveStatus = (status === 'Scheduled' && isPast && !isVerified) ? 'Expired' : status;

    switch (effectiveStatus) {
      case 'Expired':
        return (
          <span className="status-badge expired" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem' }}>
            <Clock size={12} /> Expired
          </span>
        );
      case 'Checked In':
        return (
          <span className="status-badge checkedin" style={{ background: '#dcfce7', color: '#059669', border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem' }}>
            <CheckCircle size={12} /> Checked In
          </span>
        );
      case 'Completed':
        return (
          <span className="status-badge completed" style={{ background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem' }}>
            <CheckCircle size={12} /> Completed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="status-badge cancelled" style={{ background: '#ffe4e6', color: '#e11d48', border: '1px solid #fecdd3', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem' }}>
            <XCircle size={12} /> Cancelled
          </span>
        );
      case 'No Show':
        return (
          <span className="status-badge noshow" style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem' }}>
            <AlertCircle size={12} /> No Show
          </span>
        );
      default:
        if (isVerified) {
          return (
            <span className="status-badge completed" style={{ background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem' }}>
              <CheckCircle size={12} /> Completed
            </span>
          );
        }
        return (
          <span className="status-badge scheduled" style={{ background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', fontSize: '0.74rem' }}>
            <Clock size={12} /> Scheduled
          </span>
        );
    }
  };

  if (!currentUser) {
    return (
      <div className="appointments-directory-container">
        <div className="directory-header">
          <div>
            <h2>Clinical Appointments Directory</h2>
            <p>Protected clinical records &bull; Access restricted to authorized practice personnel and patients.</p>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '60px 24px',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '40px auto'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(6, 182, 212, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: 'var(--primary)',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            <Lock size={30} />
          </div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px' }}>
            Sign In Required
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '24px' }}>
            Only logged-in staff and administrators can view all practice appointments. Patients can view their booked consultations, and clinicians can view their assigned patient schedules.
          </p>
          <button
            type="button"
            className="btn-submit"
            style={{ width: 'auto', padding: '10px 24px', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            onClick={() => onNavigate && onNavigate('staff')}
          >
            <span>Sign In to Access Directory</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="appointments-directory-container">
      {/* Header & Stats Widget */}
      <div className="directory-header">
        <div>
          <h2>Clinical Appointments Directory</h2>
          <p>View, filter, edit status, or manage scheduled patient consultations.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {(isAdmin || isStaff) && (
            <button
              type="button"
              className="btn-submit"
              style={{
                width: 'auto',
                padding: '10px 18px',
                margin: 0,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)'
              }}
              onClick={() => setIsVerifyModalOpen(true)}
              id="btn-verify-patient-checkin"
            >
              <QrCode size={16} />
              <span>Verify Patient Check-In</span>
            </button>
          )}

          {!isDoctor && (
            <button 
              type="button" 
              className="btn-submit" 
              style={{ width: 'auto', padding: '10px 20px', margin: 0 }}
              onClick={onNewBookingClick}
              id="btn-book-new-appointment"
            >
              <Plus size={16} />
              <span>Book New Appointment</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="stats-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Consultations</span>
          <div className="kpi-value">{stats.total}</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'rgba(2, 132, 199, 0.3)' }}>
          <span className="kpi-label" style={{ color: '#0284c7' }}>Scheduled</span>
          <div className="kpi-value" style={{ color: '#0284c7' }}>{stats.scheduled}</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <span className="kpi-label" style={{ color: '#059669' }}>Checked In</span>
          <div className="kpi-value" style={{ color: '#059669' }}>{stats.checked_in || 0}</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'rgba(124, 58, 237, 0.3)' }}>
          <span className="kpi-label" style={{ color: '#7c3aed' }}>Completed</span>
          <div className="kpi-value" style={{ color: '#7c3aed' }}>{stats.completed}</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <span className="kpi-label" style={{ color: '#d97706' }}>Expired</span>
          <div className="kpi-value" style={{ color: '#d97706' }}>{stats.expired || 0}</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
          <span className="kpi-label" style={{ color: '#e11d48' }}>Cancelled</span>
          <div className="kpi-value" style={{ color: '#e11d48' }}>{stats.cancelled}</div>
        </div>
      </div>

      {/* Patient Mode Notification Banner */}
      {isPatient && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(147, 51, 234, 0.08))',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="role-pill patient">Patient Account</span>
            <span style={{ fontSize: '0.88rem', color: '#0f172a' }}>
              Logged in as <strong>{currentUser.full_name || currentUser.username}</strong>
            </span>
          </div>
          <button
            type="button"
            className="btn-submit"
            style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem', margin: 0 }}
            onClick={onNewBookingClick}
          >
            <Plus size={14} />
            <span>Book New Consultation</span>
          </button>
        </div>
      )}

      {/* Doctor Mode Notification Banner */}
      {isDoctor && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Stethoscope size={18} color="#0284c7" />
          <span style={{ fontSize: '0.86rem', color: '#0f172a' }}>
            <strong>Clinician Consultation Schedule:</strong> Logged in as <strong>Dr. {currentUser.full_name || currentUser.username}</strong> &bull; Showing only appointments assigned to you.
          </span>
        </div>
      )}

      {/* Staff & Admin Full Directory Banner & Scope Filter */}
      {(isAdmin || isStaff) && (
        <>
          <div style={{
            background: isAdmin ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)',
            border: `1px solid ${isAdmin ? 'rgba(244, 63, 94, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className={`role-pill ${userRole}`}>
                {userRole} Access
              </span>
              <span style={{ fontSize: '0.84rem', color: '#475569' }}>
                {isAdmin && 'Administrator Authority: Practice-wide visibility across all doctors, patients, and schedules.'}
                {isStaff && 'Clinical Staff: Full practice appointment directory visibility and management.'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button
              type="button"
              className={`specialty-pill-btn ${scopeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setScopeFilter('all')}
              style={{ fontSize: '0.84rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Calendar size={14} />
              <span>All Practice Appointments</span>
            </button>
            <button
              type="button"
              className={`specialty-pill-btn ${scopeFilter === 'mine' ? 'active' : ''}`}
              onClick={() => setScopeFilter('mine')}
              style={{ fontSize: '0.84rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <User size={14} />
              <span>My Reception Entries ({currentUser.username})</span>
            </button>
          </div>
        </>
      )}

      {/* Action Feedback Banner (Auto-dismisses after 3 seconds) */}
      {actionFeedback && (
        <div 
          className="citycare-action-feedback-banner"
          style={{
            background: actionFeedback.type === 'error' ? '#fff1f2' : '#ecfdf5',
            border: `1px solid ${actionFeedback.type === 'error' ? '#fecdd3' : '#a7f3d0'}`,
            color: actionFeedback.type === 'error' ? '#e11d48' : '#059669',
            padding: '12px 18px',
            borderRadius: '14px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            fontSize: '0.88rem',
            boxShadow: actionFeedback.type === 'error'
              ? '0 4px 14px rgba(225, 29, 72, 0.1)'
              : '0 4px 14px rgba(16, 185, 129, 0.12)'
          }}
        >
          {actionFeedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{actionFeedback.text}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="appointments-filter-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, gap: '10px' }}>
          <div className="input-with-icon" style={{ flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Filter by patient name, doctor, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px', background: '#ffffff', color: '#0f172a' }}
            />
            <Search size={18} className="input-icon" />
          </div>
          <button type="submit" className="btn-cancel" style={{ padding: '0 18px', fontWeight: 600 }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Filter size={16} color="#64748b" />
          <select
            className="form-input role-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '160px', background: '#ffffff', color: '#0f172a' }}
          >
            <option value="all">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Checked In">Checked In</option>
            <option value="Completed">Completed</option>
            <option value="Expired">Expired</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No Show">No Show</option>
          </select>

          <button
            type="button"
            className="btn-cancel"
            style={{ padding: '10px' }}
            onClick={fetchAppointments}
            title="Refresh list"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="alert-box alert-danger">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Appointments Table */}
      <div className="appointments-table-wrapper">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }} />
            <span style={{ color: '#64748b' }}>Loading appointments...</span>
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
            <Calendar size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <h3 style={{ color: '#0f172a' }}>No Appointments Found</h3>
            <p style={{ fontSize: '0.86rem', marginTop: '4px', color: '#64748b' }}>
              No scheduled appointments match the current search or filters.
            </p>
          </div>
        ) : (
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Ref #</th>
                <th>Patient Name</th>
                <th>Appointment Date &amp; Time</th>
                <th>Doctor</th>
                <th>Type</th>
                <th>Status</th>
                <th>Notes</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => {
                const isUpcoming = isAppointmentUpcoming(apt);
                const isPast = new Date(apt.appointment_datetime).getTime() < new Date().getTime();

                return (
                  <tr key={apt.id}>
                    <td style={{ fontWeight: '700' }}>
                      <div style={{ color: '#0284c7', fontSize: '0.92rem' }}>#{apt.id}</div>
                      {apt.verification_code && (
                        <div 
                          style={{ 
                            fontFamily: 'monospace', 
                            fontSize: '0.72rem', 
                            color: '#0284c7', 
                            letterSpacing: '0.04em',
                            background: '#e0f2fe',
                            border: '1px solid #bae6fd',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginTop: '3px',
                            display: 'inline-block',
                            fontWeight: 700
                          }}
                          title={`Patient Verification Code: ${apt.verification_code}`}
                        >
                          {apt.verification_code}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#f1f5f9',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontWeight: 700
                        }}>
                          <User size={15} />
                        </div>
                        <div>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', display: 'block' }}>
                            {apt.patient_name}
                          </span>
                          {apt.patient_id && currentUser && apt.patient_id === currentUser.id && (
                            <span className="role-pill patient" style={{ fontSize: '0.62rem', padding: '1px 6px', marginTop: '2px', display: 'inline-block' }}>
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ color: '#0f172a', fontSize: '0.88rem', fontWeight: 700 }}>
                        {new Date(apt.appointment_datetime).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <small style={{ color: '#64748b', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                        {new Date(apt.appointment_datetime).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </small>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <Stethoscope size={14} color="#0284c7" />
                        <span style={{ fontWeight: 600, color: '#334155' }}>{apt.doctor}</span>
                      </div>
                    </td>
                    <td>
                      <span className="type-badge" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '3px 8px', fontSize: '0.74rem', fontWeight: 600 }}>
                        {apt.appointment_type}
                      </span>
                    </td>
                    <td>{getStatusBadge(apt.status, apt.is_verified, apt.appointment_datetime)}</td>
                    <td style={{ maxWidth: '200px', fontSize: '0.82rem', color: '#475569' }}>
                      {apt.notes ? (
                        <span title={apt.notes} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {apt.notes}
                        </span>
                      ) : (
                        <em style={{ color: '#94a3b8' }}>None</em>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {/* View Receipt & QR Pass Button */}
                        <button
                          type="button"
                          className="btn-action-icon"
                          onClick={() => setSelectedReceiptApt(apt)}
                          title="View Receipt & QR Check-in Pass"
                          style={{ color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                        >
                          <QrCode size={14} />
                        </button>

                        {/* Quick Front Desk QR Check-in Button for Staff/Admin (marks Completed) */}
                        {(isAdmin || isStaff) && apt.status === 'Scheduled' && !isPast && (
                          <button
                            type="button"
                            className="btn-action-icon"
                            onClick={() => handleQuickCheckin(apt)}
                            disabled={quickVerifyingId === apt.id}
                            title="Verify Patient QR Pass (Mark Completed)"
                            style={{ 
                              color: '#059669', 
                              borderColor: '#a7f3d0', 
                              background: '#ecfdf5' 
                            }}
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}

                        {/* Edit Button - ONLY UPCOMING APPOINTMENTS CAN BE EDITED */}
                        {isUpcoming ? (
                          (isAdmin || isStaff || isDoctor || (isPatient && apt.patient_id === currentUser?.id) || !currentUser) && (
                            <button
                              type="button"
                              className="btn-action-icon edit"
                              onClick={() => handleOpenEdit(apt)}
                              title={isPatient ? 'Cancel or add note' : isDoctor ? 'Update consultation status & notes' : 'Edit upcoming appointment'}
                              style={{ color: '#475569', borderColor: '#e2e8f0', background: '#f8fafc' }}
                            >
                              <Edit size={14} />
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            className="btn-action-icon"
                            disabled
                            style={{ opacity: 0.38, cursor: 'not-allowed', background: '#f1f5f9', borderColor: '#e2e8f0', color: '#94a3b8' }}
                            title="Past or concluded appointments cannot be edited."
                          >
                            <Lock size={13} />
                          </button>
                        )}

                        {/* Delete Button */}
                        {isDoctor ? (
                          <button
                            type="button"
                            className="btn-action-icon delete"
                            disabled
                            style={{ opacity: 0.35, cursor: 'not-allowed' }}
                            title="Doctors cannot delete records"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (isAdmin || isStaff || (isPatient && apt.patient_id === currentUser?.id) || !currentUser) ? (
                          <button
                            type="button"
                            className="btn-action-icon delete"
                            onClick={() => handleRequestDelete(apt)}
                            disabled={deletingId === apt.id}
                            title="Delete consultation"
                            style={{ color: '#e11d48', borderColor: '#fecdd3', background: '#fff1f2' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Appointment Modal - Light Theme */}
      {editingApt && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div
            className="modal-container"
            style={{
              maxWidth: '480px',
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden'
            }}
          >
            <div className="modal-header" style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9', padding: '22px 26px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                {isPatient ? 'Cancel Consultation' : `Edit Appointment #${editingApt.id}`}
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setEditingApt(null)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="modal-body" style={{ padding: '24px 26px' }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px 18px',
                marginBottom: '18px',
                fontSize: '0.86rem',
                color: '#334155'
              }}>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: '#0f172a' }}>Patient:</strong> {editingApt.patient_name}
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: '#0f172a' }}>Doctor:</strong> {editingApt.doctor}
                </div>
                <div>
                  <strong style={{ color: '#0f172a' }}>Scheduled Time:</strong> {new Date(editingApt.appointment_datetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ color: '#475569', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px', display: 'block' }}>
                  Status
                </label>
                <select
                  className="form-input role-select"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  disabled={isPatient && editingApt.status === 'Cancelled'}
                  style={{ width: '100%', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '10px 14px' }}
                >
                  {!isPatient && <option value="Scheduled">Scheduled</option>}
                  {!isPatient && <option value="Checked In">Checked In</option>}
                  {!isPatient && <option value="Completed">Completed</option>}
                  <option value="Cancelled">Cancelled</option>
                  {!isPatient && <option value="No Show">No Show</option>}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ color: '#475569', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px', display: 'block' }}>
                  {isDoctor ? 'Clinical Consultation Notes' : isPatient ? 'Patient Cancellation Reason / Notes' : 'Clinical Notes'}
                </label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={
                    isDoctor 
                      ? 'Add clinical assessment, prescriptions, or follow-up notes...' 
                      : isPatient 
                      ? 'State reason for cancellation or note for clinic...' 
                      : 'Add notes...'
                  }
                  style={{ width: '100%', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '10px 14px', fontSize: '0.86rem' }}
                />
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '16px 0 0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-cancel" onClick={() => setEditingApt(null)} style={{ padding: '10px 18px', borderRadius: '12px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  style={{ width: 'auto', padding: '10px 22px', borderRadius: '12px', background: isPatient ? '#e11d48' : '#0284c7', color: '#ffffff', fontWeight: 700 }}
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Saving...' : isPatient ? 'Confirm Cancellation' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {appointmentToDelete && (
        <div className="modal-backdrop" style={{ zIndex: 1250 }}>
          <div
            className="modal-container"
            style={{
              maxWidth: '440px',
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '28px 28px 22px', textAlign: 'center' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.15)'
              }}>
                <AlertCircle size={28} />
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
                Delete Consultation?
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.86rem', lineHeight: 1.5, margin: '0 0 18px' }}>
                Are you sure you want to delete appointment <strong>#{appointmentToDelete.id}</strong>?
              </p>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px 16px',
                textAlign: 'left',
                fontSize: '0.82rem',
                color: '#334155',
                marginBottom: '20px',
                lineHeight: 1.6
              }}>
                <div><strong style={{ color: '#0f172a' }}>Patient:</strong> {appointmentToDelete.patient_name}</div>
                <div><strong style={{ color: '#0f172a' }}>Doctor:</strong> {appointmentToDelete.doctor}</div>
                <div><strong style={{ color: '#0f172a' }}>Date &amp; Time:</strong> {new Date(appointmentToDelete.appointment_datetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  style={{ flex: 1, padding: '10px 16px', borderRadius: '12px' }}
                  onClick={() => setAppointmentToDelete(null)}
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '12px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)'
                  }}
                  onClick={confirmDeleteAppointment}
                  disabled={deletingId === appointmentToDelete.id}
                >
                  <Trash2 size={15} />
                  <span>{deletingId === appointmentToDelete.id ? 'Deleting...' : 'Yes, Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Appointment Receipt & QR Modal */}
      {selectedReceiptApt && (
        <AppointmentReceiptModal
          appointment={selectedReceiptApt}
          isOpen={Boolean(selectedReceiptApt)}
          onClose={() => setSelectedReceiptApt(null)}
        />
      )}

      {/* Staff Patient Check-In & Code Verification Modal */}
      <StaffVerifyPatientModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        onVerificationSuccess={() => {
          fetchAppointments();
        }}
        currentStaff={currentUser}
      />
    </div>
  );
}

