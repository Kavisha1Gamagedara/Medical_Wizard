import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Stethoscope, 
  UserCheck, 
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { userService } from '../services/api';
import AdminRegisterUserModal from './AdminRegisterUserModal';

export default function AdminUsersManager({ currentAdmin }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await userService.getUsers({
        role: roleFilter !== 'all' ? roleFilter : undefined,
        search: search.trim() || undefined,
      });
      setUsers(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoadingId(userId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await userService.updateUserRole(userId, newRole);
      setSuccessMsg(`User #${userId} role successfully changed to '${newRole}'.`);
      await fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(`Role update failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.id === currentAdmin.id) {
      alert('You cannot deactivate your own administrative account.');
      return;
    }
    const nextState = !user.is_active;
    const confirmMsg = nextState 
      ? `Reactivate account for @${user.username}?` 
      : `Deactivate account for @${user.username}? They will no longer be able to log in.`;
    
    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(user.id);
    setErrorMsg('');
    try {
      await userService.toggleUserStatus(user.id, nextState);
      setSuccessMsg(`User @${user.username} is now ${nextState ? 'Active' : 'Deactivated'}.`);
      await fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(`Status update failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUserCreated = (newUser) => {
    setSuccessMsg(`Successfully registered new ${newUser.role} account: @${newUser.username} (${newUser.full_name || newUser.username}).`);
    fetchUsers();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '24px',
      marginBottom: '32px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="var(--danger)" />
            Administrator RBAC User Directory
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            System-wide user authority management. Register staff and doctors, reassign roles, or toggle access.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-submit"
            style={{ 
              width: 'auto', 
              padding: '8px 16px', 
              fontSize: '0.82rem', 
              margin: 0,
              background: 'linear-gradient(135deg, #06b6d4, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(6, 182, 212, 0.25)'
            }}
            onClick={() => setIsRegisterModalOpen(true)}
            id="btn-admin-open-register"
          >
            <UserPlus size={15} />
            <span>Register Staff / Doctor</span>
          </button>

          <button
            type="button"
            className="btn-cancel"
            style={{ padding: '8px 14px', fontSize: '0.8rem', margin: 0 }}
            onClick={fetchUsers}
            title="Refresh user list"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert-box" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.35)', color: '#6ee7b7', marginBottom: '14px' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert-box alert-danger" style={{ marginBottom: '14px' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, minWidth: '240px', gap: '8px' }}>
          <div className="input-with-icon" style={{ flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, username, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px', fontSize: '0.84rem' }}
            />
            <Search size={16} className="input-icon" />
          </div>
          <button type="submit" className="btn-cancel" style={{ padding: '0 14px', fontSize: '0.82rem' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'admin', 'doctor', 'staff', 'patient'].map((role) => (
            <button
              key={role}
              type="button"
              className={`specialty-pill-btn ${roleFilter === role ? 'active' : ''}`}
              onClick={() => setRoleFilter(role)}
              style={{ fontSize: '0.78rem', padding: '6px 12px', textTransform: 'capitalize' }}
            >
              {role === 'all' ? 'All Roles' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="appointments-table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 10px' }} />
            <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>Loading system users...</span>
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
            No users match current criteria.
          </div>
        ) : (
          <table className="appointments-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User / Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Specialization</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Role Assignment</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-accent)' }}>#{u.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {u.full_name || u.username}
                    </div>
                    <small style={{ color: 'var(--text-muted)' }}>@{u.username}</small>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className={`role-pill ${u.role}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.specialization ? (
                      <span className="type-badge" style={{ borderColor: 'rgba(6, 182, 212, 0.3)', color: '#67e8f9' }}>
                        {u.specialization}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>&mdash;</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      disabled={actionLoadingId === u.id || u.id === currentAdmin.id}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: u.id === currentAdmin.id ? 'default' : 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: u.is_active ? 'var(--success)' : 'var(--danger)',
                      }}
                      title={u.id === currentAdmin.id ? 'Self account' : 'Click to toggle active status'}
                    >
                      {u.is_active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      <span>{u.is_active ? 'Active' : 'Disabled'}</span>
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <select
                      className="form-input role-select"
                      style={{ width: '110px', fontSize: '0.78rem', padding: '4px 8px' }}
                      value={u.role}
                      disabled={actionLoadingId === u.id || u.id === currentAdmin.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="doctor">Doctor</option>
                      <option value="staff">Staff</option>
                      <option value="patient">Patient</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Admin Register User Modal */}
      <AdminRegisterUserModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
}
