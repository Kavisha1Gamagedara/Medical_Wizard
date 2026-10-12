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
  Plus
} from 'lucide-react';
import { appointmentService } from '../services/api';

export default function AppointmentsDirectory({ onNewBookingClick, currentUser }) {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, scheduled: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const isPatient = currentUser?.role === 'patient';
  const [scopeFilter, setScopeFilter] = useState(isPatient ? 'mine' : 'all');

  // Edit State
  const [editingApt, setEditingApt] = useState(null);
  const [editStatus, setEditStatus] = useState('Scheduled');
  const [editNotes, setEditNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState(null);

  const fetchAppointments = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const queryParams = {
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      if (scopeFilter === 'mine' && currentUser?.id) {
        queryParams.patient_id = currentUser.id;
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
    fetchAppointments();
  }, [statusFilter, scopeFilter]);

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <span className="status-badge completed"><CheckCircle size={12} /> Completed</span>;
      case 'Cancelled':
        return <span className="status-badge cancelled"><XCircle size={12} /> Cancelled</span>;
      case 'No Show':
        return <span className="status-badge noshow"><AlertCircle size={12} /> No Show</span>;
      default:
        return <span className="status-badge scheduled"><Clock size={12} /> Scheduled</span>;
    }
  };

  return (
    <div className="appointments-directory-container">
      {/* Header & Stats Widget */}
      <div className="directory-header">
        <div>
          <h2>Clinical Appointments Directory</h2>
          <p>View, filter, edit status, or manage scheduled patient consultations.</p>
        </div>

        <button 
          type="button" 
          className="btn-submit" 
          style={{ width: 'auto', padding: '10px 20px', margin: 0 }}
          onClick={onNewBookingClick}
        >
          <Plus size={16} />
          <span>Book New Appointment</span>
        </button>
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
              Logged in as <strong>{currentUser.full_name || currentUser.username}</strong> &bull; Managing your doctor appointments and clinical consultations.
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

      {/* Directory Scope Filter Buttons */}
      {currentUser && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button
            type="button"
            className={`specialty-pill-btn ${scopeFilter === 'mine' ? 'active' : ''}`}
            onClick={() => setScopeFilter('mine')}
            style={{ fontSize: '0.84rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <User size={14} />
            <span>{isPatient ? 'My Bookings' : `My Account Appointments (${currentUser.username})`}</span>
          </button>
          <button
            type="button"
            className={`specialty-pill-btn ${scopeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setScopeFilter('all')}
            style={{ fontSize: '0.84rem', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Calendar size={14} />
            <span>All Directory Appointments</span>
          </button>
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
                  <td style={{ fontWeight: '700', color: 'var(--text-accent)' }}>#{apt.id}</td>
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
                  <td>{getStatusBadge(apt.status)}</td>
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
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn-action-icon edit"
                        onClick={() => handleOpenEdit(apt)}
                        title="Edit status/notes"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-action-icon delete"
                        onClick={() => handleDelete(apt.id)}
                        disabled={deletingId === apt.id}
                        title="Delete appointment"
                      >
                        <Trash2 size={14} />
                      </button>
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
              <h3>Edit Appointment #{editingApt.id}</h3>
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
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="No Show">No Show</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Clinical Notes</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add prescription, outcome notes, or cancellation reasons..."
                  style={{ paddingLeft: '14px' }}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setEditingApt(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" style={{ width: 'auto' }} disabled={saveLoading}>
                  {saveLoading ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
