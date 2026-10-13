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

  // Verification & Receipt State
  const [selectedReceiptApt, setSelectedReceiptApt] = useState(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [quickVerifyingId, setQuickVerifyingId] = useState(null);

  const handleQuickCheckin = async (apt) => {
    setQuickVerifyingId(apt.id);
    try {
      const code = apt.verification_code || `MW-${String(apt.id).padStart(6, '0')}`;
      await appointmentService.verifyPatientArrival(code, 'Quick reception check-in');
      await fetchAppointments();
    } catch (err) {
      alert(`Check-in failed: ${err.message}`);
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
    setEditingApt(apt);
    setEditStatus(apt.status);
    setEditNotes(apt.notes || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingApt) return;
    setSaveLoading(true);
    try {
      await appointmentService.updateAppointment(editingApt.id, {
        status: editStatus,
        notes: editNotes.trim() || undefined,
      });
      setEditingApt(null);
      await fetchAppointments();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete appointment #${id}?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await appointmentService.deleteAppointment(id);
      await fetchAppointments();
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status, isVerified = false) => {
    switch (status) {
      case 'Checked In':
        return (
          <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
            <CheckCircle size={12} /> Checked In
          </span>
        );
      case 'Completed':
        return <span className="status-badge completed"><CheckCircle size={12} /> Completed</span>;
      case 'Cancelled':
        return <span className="status-badge cancelled"><XCircle size={12} /> Cancelled</span>;
      case 'No Show':
        return <span className="status-badge noshow"><AlertCircle size={12} /> No Show</span>;
      default:
        if (isVerified) {
          return (
            <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <CheckCircle size={12} /> Checked In
            </span>
          );
        }
        return <span className="status-badge scheduled"><Clock size={12} /> Scheduled</span>;
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
        <div className="kpi-card" style={{ borderColor: 'rgba(6, 182, 212, 0.3)' }}>
          <span className="kpi-label" style={{ color: '#38bdf8' }}>Scheduled</span>
          <div className="kpi-value" style={{ color: '#38bdf8' }}>{stats.scheduled}</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <span className="kpi-label" style={{ color: '#34d399' }}>Checked In</span>
          <div className="kpi-value" style={{ color: '#34d399' }}>{stats.checked_in || 0}</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <span className="kpi-label" style={{ color: '#34d399' }}>Completed</span>
          <div className="kpi-value" style={{ color: '#34d399' }}>{stats.completed}</div>
        </div>
        <div className="kpi-card" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
          <span className="kpi-label" style={{ color: '#fda4af' }}>Cancelled</span>
          <div className="kpi-value" style={{ color: '#fda4af' }}>{stats.cancelled}</div>
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
            <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              Logged in as <strong>{currentUser.full_name || currentUser.username}</strong> &bull; Showing only consultations booked by you.
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
          <Stethoscope size={18} color="var(--primary)" />
          <span style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>
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
              <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
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
              style={{ paddingLeft: '40px' }}
            />
            <Search size={18} className="input-icon" />
          </div>
          <button type="submit" className="btn-cancel" style={{ padding: '0 18px' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Filter size={16} color="var(--text-muted)" />
          <select
            className="form-input role-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="all">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Checked In">Checked In</option>
            <option value="Completed">Completed</option>
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
            <span style={{ color: 'var(--text-secondary)' }}>Loading appointments...</span>
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
            <Calendar size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <h3>No Appointments Found</h3>
            <p style={{ fontSize: '0.86rem', marginTop: '4px' }}>
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
              {appointments.map((apt) => (
                <tr key={apt.id}>
                  <td style={{ fontWeight: '700', color: 'var(--text-accent)' }}>
                    <div>#{apt.id}</div>
                    {apt.verification_code && (
                      <div 
                        style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.72rem', 
                          color: '#38bdf8', 
                          letterSpacing: '0.05em',
                          background: 'rgba(56, 189, 248, 0.1)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          marginTop: '3px',
                          display: 'inline-block'
                        }}
                        title={`Patient Verification Code: ${apt.verification_code}`}
                      >
                        {apt.verification_code}
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={15} color="var(--primary)" />
                      <span>{apt.patient_name}</span>
                      {apt.patient_id && currentUser && apt.patient_id === currentUser.id && (
                        <span className="role-pill patient" style={{ fontSize: '0.62rem', padding: '2px 7px' }}>
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ color: '#e2e8f0', fontSize: '0.86rem' }}>
                      {new Date(apt.appointment_datetime).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>
                      {new Date(apt.appointment_datetime).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Stethoscope size={14} color="var(--teal-accent)" />
                      <span style={{ fontWeight: '500' }}>{apt.doctor}</span>
                    </div>
                  </td>
                  <td>
                    <span className="type-badge">{apt.appointment_type}</span>
                  </td>
                  <td>{getStatusBadge(apt.status, apt.is_verified)}</td>
                  <td style={{ maxWidth: '200px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {apt.notes ? (
                      <span title={apt.notes} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {apt.notes}
                      </span>
                    ) : (
                      <em style={{ color: 'var(--text-muted)' }}>None</em>
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
                        style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                      >
                        <QrCode size={14} />
                      </button>

                      {/* Quick Front Desk Check-in Button for Staff/Admin */}
                      {(isAdmin || isStaff) && apt.status === 'Scheduled' && (
                        <button
                          type="button"
                          className="btn-action-icon"
                          onClick={() => handleQuickCheckin(apt)}
                          disabled={quickVerifyingId === apt.id}
                          title="Verify Patient Arrival (Check-In)"
                          style={{ 
                            color: 'var(--emerald-accent)', 
                            borderColor: 'rgba(16, 185, 129, 0.4)', 
                            background: 'rgba(16, 185, 129, 0.1)' 
                          }}
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}

                      {/* Edit Button - Patients can only edit/cancel their own appointment */}
                      {(isAdmin || isStaff || isDoctor || (isPatient && apt.patient_id === currentUser?.id) || !currentUser) && (
                        <button
                          type="button"
                          className="btn-action-icon edit"
                          onClick={() => handleOpenEdit(apt)}
                          title={isPatient ? 'Cancel or add note' : isDoctor ? 'Update consultation status & notes' : 'Edit appointment'}
                        >
                          <Edit size={14} />
                        </button>
                      )}

                      {/* Delete Button - Doctors cannot delete records to preserve medical audit trail */}
                      {isDoctor ? (
                        <button
                          type="button"
                          className="btn-action-icon delete"
                          disabled
                          style={{ opacity: 0.35, cursor: 'not-allowed' }}
                          title="Doctors cannot delete records (update status to Cancelled or No Show instead)"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (isAdmin || isStaff || (isPatient && apt.patient_id === currentUser?.id) || !currentUser) ? (
                        <button
                          type="button"
                          className="btn-action-icon delete"
                          onClick={() => handleDelete(apt.id)}
                          disabled={deletingId === apt.id}
                          title="Delete appointment"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Appointment Modal */}
      {editingApt && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>{isPatient ? 'Cancel Consultation' : `Edit Appointment #${editingApt.id}`}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setEditingApt(null)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="modal-body">
              <div style={{ marginBottom: '14px', fontSize: '0.88rem' }}>
                <div><strong>Patient:</strong> {editingApt.patient_name}</div>
                <div><strong>Doctor:</strong> {editingApt.doctor}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input role-select"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  disabled={isPatient && editingApt.status === 'Cancelled'}
                >
                  {!isPatient && <option value="Scheduled">Scheduled</option>}
                  {!isPatient && <option value="Checked In">Checked In</option>}
                  {!isPatient && <option value="Completed">Completed</option>}
                  <option value="Cancelled">Cancelled</option>
                  {!isPatient && <option value="No Show">No Show</option>}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
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
                  style={{ paddingLeft: '14px' }}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setEditingApt(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" style={{ width: 'auto' }} disabled={saveLoading}>
                  {saveLoading ? 'Saving...' : isPatient ? 'Confirm Cancellation' : 'Update Status'}
                </button>
              </div>
            </form>
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

