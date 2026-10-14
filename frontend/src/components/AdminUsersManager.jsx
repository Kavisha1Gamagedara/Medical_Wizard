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
      background: '#ffffff',
      border: '1.5px solid #e2e8f0',
      borderRadius: '24px',
      padding: '28px',
      marginBottom: '32px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #e0f2fe, #dcfce7)',
            border: '1.5px solid #bae6fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284c7'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.01em', margin: 0 }}>
              Administrator RBAC User Directory
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '3px', fontWeight: 500, margin: 0 }}>
              System-wide user authority management. Register staff and doctors, reassign roles, or toggle access.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-submit"
            style={{ 
              width: 'auto', 
              padding: '9px 18px', 
              fontSize: '0.84rem', 
              fontWeight: 800,
              margin: 0,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '10px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              cursor: 'pointer'
            }}
            onClick={() => setIsRegisterModalOpen(true)}
            id="btn-admin-open-register"
          >
            <UserPlus size={16} />
            <span>Register Staff / Doctor</span>
          </button>

          <button
            type="button"
            className="btn-cancel"
            style={{
              padding: '9px 16px',
              fontSize: '0.84rem',
              fontWeight: 750,
              margin: 0,
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#334155',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            onClick={fetchUsers}
            title="Refresh user list"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert-box" style={{ background: '#f0fdf4', border: '1.5px solid #86efac', color: '#15803d', fontWeight: 700, borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="#16a34a" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert-box alert-danger" style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#b91c1c', fontWeight: 700, borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} color="#dc2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: 1, minWidth: '260px', gap: '8px' }}>
          <div className="input-with-icon" style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, username, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: '40px',
                fontSize: '0.88rem',
                fontWeight: 600,
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#0f172a',
                borderRadius: '12px',
                width: '100%',
                paddingTop: '10px',
                paddingBottom: '10px'
              }}
            />
            <Search size={17} className="input-icon" style={{ color: '#64748b' }} />
          </div>
          <button
            type="submit"
            className="btn-cancel"
            style={{
              padding: '0 18px',
              fontSize: '0.84rem',
              fontWeight: 750,
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#0f172a',
              borderRadius: '12px',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'admin', 'doctor', 'staff', 'patient'].map((role) => {
            const isActive = roleFilter === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                style={{
                  fontSize: '0.8rem',
                  padding: '7px 16px',
                  textTransform: 'capitalize',
                  borderRadius: '9999px',
                  border: isActive ? '1.5px solid #0284c7' : '1.5px solid #cbd5e1',
                  background: isActive ? '#0284c7' : '#ffffff',
                  color: isActive ? '#ffffff' : '#334155',
                  fontWeight: isActive ? 800 : 650,
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 8px rgba(2, 132, 199, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {role === 'all' ? 'All Roles' : role}
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Table */}
      <div className="appointments-table-wrapper" style={{ maxHeight: '460px', overflowY: 'auto', border: '1.5px solid #e2e8f0', borderRadius: '16px', background: '#ffffff' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px 0' }}>
            <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 10px' }} />
            <span style={{ fontSize: '0.86rem', color: '#64748b', fontWeight: 650 }}>Loading system users...</span>
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
            No users match current criteria.
          </div>
        ) : (
          <table className="appointments-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', color: '#475569', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User / Name</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', color: '#475569', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', color: '#475569', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', color: '#475569', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Specialization</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', color: '#475569', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', color: '#475569', fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role Assignment</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const getRoleBadgeStyle = (r) => {
                  switch (r) {
                    case 'admin':
                      return { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' };
                    case 'doctor':
                      return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
                    case 'staff':
                      return { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
                    default:
                      return { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' };
                  }
                };

                const badge = getRoleBadgeStyle(u.role);

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: u.role === 'admin' ? 'linear-gradient(135deg, #fee2e2, #fecdd3)' : (u.role === 'doctor' ? 'linear-gradient(135deg, #e0f2fe, #bae6fd)' : (u.role === 'staff' ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : 'linear-gradient(135deg, #dcfce7, #bbf7d0)')),
                          border: `1.5px solid ${u.role === 'admin' ? '#fca5a5' : (u.role === 'doctor' ? '#7dd3fc' : (u.role === 'staff' ? '#fcd34d' : '#86efac'))}`,
                          color: u.role === 'admin' ? '#b91c1c' : (u.role === 'doctor' ? '#0369a1' : (u.role === 'staff' ? '#b45309' : '#15803d')),
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.94rem' }}>
                            {u.full_name || u.username}
                          </div>
                          <small style={{ color: '#64748b', fontWeight: 650, fontSize: '0.78rem' }}>@{u.username}</small>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '0.86rem', color: '#334155', fontWeight: 600 }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        ...badge,
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        padding: '4px 12px',
                        borderRadius: '16px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        display: 'inline-block'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {u.specialization ? (
                        <span style={{
                          background: '#f0f9ff',
                          color: '#0369a1',
                          border: '1.5px solid #bae6fd',
                          fontWeight: 750,
                          fontSize: '0.76rem',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <Stethoscope size={13} color="#0284c7" />
                          <span>{u.specialization}</span>
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.84rem', fontWeight: 600 }}>&mdash;</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        disabled={actionLoadingId === u.id || u.id === currentAdmin.id}
                        style={{
                          background: u.is_active ? '#dcfce7' : '#fee2e2',
                          border: `1px solid ${u.is_active ? '#86efac' : '#fca5a5'}`,
                          borderRadius: '16px',
                          cursor: u.id === currentAdmin.id ? 'default' : 'pointer',
                          padding: '4px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 750,
                          color: u.is_active ? '#15803d' : '#b91c1c',
                          transition: 'all 0.15s ease'
                        }}
                        title={u.id === currentAdmin.id ? 'Self account' : 'Click to toggle active status'}
                      >
                        {u.is_active ? <CheckCircle2 size={13} color="#16a34a" /> : <XCircle size={13} color="#dc2626" />}
                        <span>{u.is_active ? 'Active' : 'Disabled'}</span>
                      </button>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <select
                        style={{
                          width: '110px',
                          fontSize: '0.82rem',
                          fontWeight: 750,
                          padding: '6px 10px',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          color: '#0f172a',
                          borderRadius: '8px',
                          cursor: u.id === currentAdmin.id ? 'not-allowed' : 'pointer',
                          outline: 'none'
                        }}
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
                );
              })}
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
