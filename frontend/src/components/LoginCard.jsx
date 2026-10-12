import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Mail, 
  ShieldCheck, 
  Stethoscope, 
  Users, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Sparkles
} from 'lucide-react';
import { authService } from '../services/api';

export default function LoginCard({ onLoginSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login fields
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register extra fields
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('staff');
  const [regSpecialization, setRegSpecialization] = useState('Neurosurgeon');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1-Click Demo Quick Fill for Evaluators
  const handleDemoFill = (role, username, pwd) => {
    setIsRegisterMode(false);
    setUsernameOrEmail(username);
    setPassword(pwd);
    setErrorMsg('');
    setSuccessMsg(`Auto-filled credentials for ${role.toUpperCase()} role.`);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!usernameOrEmail.trim() || !password) {
      setErrorMsg('Please enter both username/email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.login(usernameOrEmail.trim(), password);
      setSuccessMsg('Authentication successful! Loading dashboard...');
      setTimeout(() => {
        onLoginSuccess(result.user);
      }, 400);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regEmail.trim() || !regUsername.trim() || !regPassword) {
      setErrorMsg('Email, username, and password are required.');
      return;
    }

    setLoading(true);
    try {
      await authService.register({
        email: regEmail.trim(),
        username: regUsername.trim(),
        full_name: regFullName.trim() || undefined,
        password: regPassword,
        role: regRole,
        specialization: regRole === 'doctor' ? regSpecialization : undefined,
      });

      setSuccessMsg(`Account created for ${regUsername}! Automatically signing in...`);
      // Auto login after registration
      const loginRes = await authService.login(regUsername.trim(), regPassword);
      setTimeout(() => {
        onLoginSuccess(loginRes.user);
      }, 500);
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-card">
      <div className="form-header">
        <h2>{isRegisterMode ? 'Create Staff Account' : 'Welcome Back'}</h2>
        <p>
          {isRegisterMode 
            ? 'Register to access the medical appointment portal.' 
            : 'Enter your credentials to access the clinic scheduler.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="auth-tabs">
        <button
          type="button"
          className={`auth-tab-btn ${!isRegisterMode ? 'active' : ''}`}
          onClick={() => {
            setIsRegisterMode(false);
            setErrorMsg('');
            setSuccessMsg('');
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`auth-tab-btn ${isRegisterMode ? 'active' : ''}`}
          onClick={() => {
            setIsRegisterMode(true);
            setErrorMsg('');
            setSuccessMsg('');
          }}
        >
          Register Account
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="alert-box alert-danger">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert-box alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Login Form */}
      {!isRegisterMode ? (
        <form onSubmit={handleLoginSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">
              Username or Email
            </label>
            <div className="input-with-icon">
              <input
                id="login-username"
                type="text"
                className="form-input"
                placeholder="e.g. admin or drsmith"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                autoComplete="username"
                required
              />
              <User size={18} className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <div className="input-with-icon">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <Lock size={18} className="input-icon" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-submit" 
            disabled={loading}
            id="btn-sign-in"
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Register Form */
        <form onSubmit={handleRegisterSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Work Email</label>
            <div className="input-with-icon">
              <input
                id="reg-email"
                type="email"
                className="form-input"
                placeholder="doctor@medicalwizard.com.au"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
              <Mail size={18} className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username</label>
            <div className="input-with-icon">
              <input
                id="reg-username"
                type="text"
                className="form-input"
                placeholder="e.g. dr_watson"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
              />
              <User size={18} className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full Name (Optional)</label>
            <div className="input-with-icon">
              <input
                id="reg-name"
                type="text"
                className="form-input"
                placeholder="Dr. John Watson"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
              />
              <Users size={18} className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-role">Role</label>
            <select
              id="reg-role"
              className="form-input role-select"
              value={regRole}
              onChange={(e) => setRegRole(e.target.value)}
            >
              <option value="staff">Staff / Reception</option>
              <option value="doctor">Doctor / Clinician</option>
              <option value="admin">System Administrator</option>
            </select>
          </div>

          {regRole === 'doctor' && (
            <div className="form-group" style={{ 
              background: 'rgba(6, 182, 212, 0.08)', 
              padding: '12px', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(6, 182, 212, 0.2)' 
            }}>
              <label className="form-label" htmlFor="reg-specialization" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Stethoscope size={15} color="var(--primary)" />
                Doctor Specialization
              </label>
              <select
                id="reg-specialization"
                className="form-input role-select"
                value={regSpecialization}
                onChange={(e) => setRegSpecialization(e.target.value)}
              >
                <option value="Neurosurgeon">Neurosurgeon</option>
                <option value="Dentist">Dentist</option>
                <option value="Cardiologist">Cardiologist</option>
                <option value="Dermatologist">Dermatologist</option>
                <option value="Pediatrician">Pediatrician</option>
                <option value="Orthopedic Surgeon">Orthopedic Surgeon</option>
                <option value="General Practitioner">General Practitioner</option>
                <option value="Psychiatrist">Psychiatrist</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div className="input-with-icon">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Minimum 6 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
              <Lock size={18} className="input-icon" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-submit" 
            disabled={loading}
            id="btn-register"
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <Sparkles size={18} />
              </>
            )}
          </button>
        </form>
      )}

      {/* Quick Demo Credentials Panel */}
      <div className="demo-role-quick-fill">
        <div className="demo-role-title">
          <Sparkles size={14} color="var(--primary)" />
          <span>Quick Demo Logins (Click to autofill)</span>
        </div>
        <div className="demo-role-buttons" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <button
            type="button"
            className="demo-role-btn"
            onClick={() => handleDemoFill('neurosurgeon', 'drsmith', 'DoctorPassword123!')}
          >
            <Stethoscope size={15} color="var(--primary)" />
            <span>Doctor</span>
            <small>Neurosurgeon</small>
          </button>

          <button
            type="button"
            className="demo-role-btn"
            onClick={() => handleDemoFill('dentist', 'drjones', 'DoctorPassword123!')}
          >
            <Stethoscope size={15} color="var(--text-accent)" />
            <span>Doctor</span>
            <small>Dentist</small>
          </button>

          <button
            type="button"
            className="demo-role-btn"
            onClick={() => handleDemoFill('admin', 'admin', 'AdminPassword123!')}
          >
            <ShieldCheck size={15} color="var(--danger)" />
            <span>Admin</span>
            <small>admin</small>
          </button>

          <button
            type="button"
            className="demo-role-btn"
            onClick={() => handleDemoFill('staff', 'reception', 'StaffPassword123!')}
          >
            <Users size={15} color="var(--emerald-accent)" />
            <span>Staff</span>
            <small>reception</small>
          </button>
        </div>
      </div>
    </div>
  );
}
