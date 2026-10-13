import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Mail, 
  User, 
  ArrowLeft,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';
import { authService } from '../services/api';
import doctorHeroImg from '../assets/doctor_login_hero.jpg';

// 4-Point Diamond Sparkle Star SVG Component matching the user reference
function SparkleStar({ color = '#ffffff', size = 24, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill={color} 
      className={className}
      style={{ display: 'inline-block', flexShrink: 0 }}
    >
      <path d="M12 0 C12 6.627 17.373 12 24 12 C17.373 12 12 17.373 12 24 C12 17.373 6.627 12 0 12 C6.627 12 12 6.627 12 0 Z" />
    </svg>
  );
}

export default function CreativeAuthPortal({ onLoginSuccess, onNavigate }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Login inputs
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register inputs
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('patient'); // 'patient' | 'doctor' | 'staff'
  const [regSpecialization, setRegSpecialization] = useState('Cardiology');

  // Status & Notifications
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Load remembered username if saved
  useEffect(() => {
    const saved = localStorage.getItem('mw_remembered_username');
    if (saved) {
      setUsernameOrEmail(saved);
    }
  }, []);

  // Quick 1-Click Demo Fill for Evaluators
  const handleDemoFill = (role, userVal, passVal) => {
    setIsRegisterMode(false);
    setUsernameOrEmail(userVal);
    setPassword(passVal);
    setErrorMsg('');
    setSuccessMsg(`Auto-filled ${role.toUpperCase()} test credentials.`);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!usernameOrEmail.trim() || !password) {
      setErrorMsg('Please enter both your email/username and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.login(usernameOrEmail.trim(), password);
      
      if (rememberMe) {
        localStorage.setItem('mw_remembered_username', usernameOrEmail.trim());
      } else {
        localStorage.removeItem('mw_remembered_username');
      }

      setSuccessMsg(`Welcome, ${result.user.full_name || result.user.username}! Redirecting...`);
      setTimeout(() => {
        onLoginSuccess(result.user);
      }, 400);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid credentials. Please verify and try again.');
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

      setSuccessMsg(`Account created for ${regUsername}! Signing you in...`);
      // Auto login immediately
      const loginRes = await authService.login(regUsername.trim(), regPassword);
      setTimeout(() => {
        onLoginSuccess(loginRes.user);
      }, 500);
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Username or email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="creative-auth-container-wrapper">
      <div className="creative-auth-card">
        {/* ========================================================= */}
        {/* LEFT PANEL: HERO CLINICIAN & ECG HEART GRAPHIC           */}
        {/* ========================================================= */}
        <div className="creative-auth-left-panel">
          {/* Background ECG Heart Vector */}
          <div className="auth-ecg-heart-bg" aria-hidden="true">
            <svg className="auth-heart-outline" viewBox="0 0 400 360" fill="none">
              <path 
                d="M 200 110 C 170 40, 70 40, 45 110 C 20 180, 80 250, 200 340 C 320 250, 380 180, 355 110 C 330 40, 230 40, 200 110 Z" 
                stroke="#e2e8f0" 
                strokeWidth="2.5" 
                strokeDasharray="6 6" 
              />
            </svg>
            <svg className="auth-ecg-trace-line" viewBox="0 0 600 160" fill="none">
              <path 
                d="M 0 80 L 160 80 L 175 50 L 190 120 L 205 20 L 220 145 L 235 65 L 250 95 L 265 80 L 600 80" 
                stroke="#cbd5e1" 
                strokeWidth="2" 
                strokeLinecap="round" 
              />
            </svg>
          </div>

          {/* Purple Sparkle Stars scattered on left side */}
          <div className="sparkle-star purple-star p1">
            <SparkleStar color="#70336e" size={26} />
          </div>
          <div className="sparkle-star purple-star p2">
            <SparkleStar color="#70336e" size={22} />
          </div>
          <div className="sparkle-star purple-star p3">
            <SparkleStar color="#70336e" size={32} />
          </div>

          {/* Doctor Portrait */}
          <div className="creative-doctor-portrait-box">
            <img 
              src={doctorHeroImg} 
              alt="CityCare Specialist Doctor" 
              className="creative-doctor-img" 
            />
          </div>

          {/* Bottom Trust Badge */}
          <div className="creative-left-footer-badge">
            <span className="dot-live" />
            <span>CityCare Medical Wizard &bull; Clinical Practice Portal</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: SLANTED PURPLE LOGIN / SIGN UP FORM         */}
        {/* ========================================================= */}
        <div className="creative-auth-right-panel">
          {/* Slanted Purple Shape Backdrop */}
          <div className="creative-purple-backdrop" />

          {/* White Sparkle Stars on right panel */}
          <div className="sparkle-star white-star w1">
            <SparkleStar color="#ffffff" size={34} />
          </div>
          <div className="sparkle-star white-star w2">
            <SparkleStar color="#ffffff" size={24} />
          </div>
          <div className="sparkle-star white-star w3">
            <SparkleStar color="#ffffff" size={22} />
          </div>

          <div className="creative-form-inner-content">
            {/* Header Titles */}
            <div className="creative-auth-title-group">
              <h1 className="creative-auth-heading">
                {isRegisterMode ? 'Create Account !' : 'Welcome Back !'}
              </h1>
              <p className="creative-auth-subheading">
                {isRegisterMode ? 'Register Your Healthcare Account' : 'Login Your Account'}
              </p>
            </div>

            {/* Error & Success Notification Banners */}
            {errorMsg && (
              <div className="creative-auth-alert alert-error">
                <AlertCircle size={17} />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="creative-auth-alert alert-success">
                <CheckCircle2 size={17} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ==================== LOGIN FORM ==================== */}
            {!isRegisterMode ? (
              <form onSubmit={handleLoginSubmit} className="creative-auth-form">
                <div className="creative-field-group">
                  <label className="creative-input-label" htmlFor="creative-login-email">
                    Username or Email Address
                  </label>
                  <input
                    id="creative-login-email"
                    type="text"
                    className="creative-pill-input"
                    placeholder="e.g. admin or patient"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="creative-field-group">
                  <label className="creative-input-label" htmlFor="creative-login-pass">
                    Password
                  </label>
                  <div className="creative-pass-wrapper">
                    <input
                      id="creative-login-pass"
                      type={showPassword ? 'text' : 'password'}
                      className="creative-pill-input has-toggle"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="creative-eye-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forget Password Row */}
                <div className="creative-form-aux-row">
                  <label className="creative-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="creative-custom-checkbox"
                    />
                    <span>Remember Me</span>
                  </label>

                  <button
                    type="button"
                    className="creative-forgot-link"
                    onClick={() => setShowForgotModal(true)}
                  >
                    Forget Password?
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  className="creative-submit-pill-btn"
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : 'Login'}
                </button>

                {/* Switch to Register */}
                <div className="creative-switch-mode-text">
                  <span>Don't have an account </span>
                  <button
                    type="button"
                    className="creative-switch-btn"
                    onClick={() => {
                      setIsRegisterMode(true);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                  >
                    Register
                  </button>
                </div>
              </form>
            ) : (
              /* ==================== REGISTER FORM ==================== */
              <form onSubmit={handleRegisterSubmit} className="creative-auth-form">
                <div className="creative-field-group">
                  <label className="creative-input-label" htmlFor="reg-fullname">
                    Full Name
                  </label>
                  <input
                    id="reg-fullname"
                    type="text"
                    className="creative-pill-input"
                    placeholder="e.g. Alex Carter"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                  />
                </div>

                <div className="creative-field-group">
                  <label className="creative-input-label" htmlFor="reg-email">
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    className="creative-pill-input"
                    placeholder="alex@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="creative-field-group">
                  <label className="creative-input-label" htmlFor="reg-username">
                    Username
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    className="creative-pill-input"
                    placeholder="alex_carter"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                  />
                </div>

                {/* Account Type Selection */}
                <div className="creative-field-group">
                  <label className="creative-input-label">Account Role</label>
                  <div className="creative-role-pills-row">
                    <button
                      type="button"
                      className={`role-select-pill ${regRole === 'patient' ? 'selected' : ''}`}
                      onClick={() => setRegRole('patient')}
                    >
                      Patient
                    </button>
                    <button
                      type="button"
                      className={`role-select-pill ${regRole === 'doctor' ? 'selected' : ''}`}
                      onClick={() => setRegRole('doctor')}
                    >
                      Doctor
                    </button>
                    <button
                      type="button"
                      className={`role-select-pill ${regRole === 'staff' ? 'selected' : ''}`}
                      onClick={() => setRegRole('staff')}
                    >
                      Staff
                    </button>
                  </div>
                </div>

                {regRole === 'doctor' && (
                  <div className="creative-field-group">
                    <label className="creative-input-label">Clinical Specialization</label>
                    <select
                      className="creative-pill-input"
                      value={regSpecialization}
                      onChange={(e) => setRegSpecialization(e.target.value)}
                      style={{ color: '#0f172a' }}
                    >
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Dentistry">Dentistry</option>
                      <option value="General Medicine">General Medicine</option>
                    </select>
                  </div>
                )}

                <div className="creative-field-group">
                  <label className="creative-input-label" htmlFor="reg-pass">
                    Password
                  </label>
                  <div className="creative-pass-wrapper">
                    <input
                      id="reg-pass"
                      type={showPassword ? 'text' : 'password'}
                      className="creative-pill-input has-toggle"
                      placeholder="Create a strong password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="creative-eye-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Register Button */}
                <button
                  type="submit"
                  className="creative-submit-pill-btn"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Register Account'}
                </button>

                {/* Switch to Login */}
                <div className="creative-switch-mode-text">
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    className="creative-switch-btn"
                    onClick={() => {
                      setIsRegisterMode(false);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                  >
                    Login
                  </button>
                </div>
              </form>
            )}

            {/* Evaluator Quick 1-Click Demo Fillers */}
            <div className="creative-demo-fill-box">
              <span className="demo-fill-label">1-Click Test Accounts:</span>
              <div className="demo-fill-btns-row">
                <button
                  type="button"
                  className="demo-pill-btn"
                  onClick={() => handleDemoFill('Admin', 'admin', 'admin123')}
                  title="Username: admin | Password: admin123"
                >
                  Admin
                </button>
                <button
                  type="button"
                  className="demo-pill-btn"
                  onClick={() => handleDemoFill('Doctor', 'drchen', 'doctor123')}
                  title="Username: drchen | Password: doctor123"
                >
                  Doctor
                </button>
                <button
                  type="button"
                  className="demo-pill-btn"
                  onClick={() => handleDemoFill('Staff', 'reception', 'staff123')}
                  title="Username: reception | Password: staff123"
                >
                  Staff
                </button>
                <button
                  type="button"
                  className="demo-pill-btn"
                  onClick={() => handleDemoFill('Patient', 'patient', 'patient123')}
                  title="Username: patient | Password: patient123"
                >
                  Patient
                </button>
              </div>
            </div>

            {/* Back to Home Button */}
            <button
              type="button"
              className="creative-back-to-home"
              onClick={() => onNavigate && onNavigate('home')}
            >
              <ArrowLeft size={14} />
              <span>Back to Clinic Home</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="citycare-modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div className="citycare-modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="citycare-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="mini-icon-circle blue">
                  <HelpCircle size={20} color="#0284c7" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Password Recovery</h3>
              </div>
              <button 
                type="button" 
                className="citycare-modal-close"
                onClick={() => setShowForgotModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                To maintain HIPAA and patient medical record privacy, password resets require clinical administrator authorization.
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', margin: '16px 0', fontSize: '0.82rem' }}>
                <div><strong>Hospital IT Desk:</strong> it-support@citycare-medical.org</div>
                <div><strong>Helpline:</strong> +1 (800) 432-CARE (Ext. 402)</div>
                <div style={{ marginTop: '6px', color: '#64748b' }}>Or visit any front-desk reception station with your photo ID.</div>
              </div>
              <button
                type="button"
                className="btn-guest-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowForgotModal(false)}
              >
                Got It, Thank You
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
