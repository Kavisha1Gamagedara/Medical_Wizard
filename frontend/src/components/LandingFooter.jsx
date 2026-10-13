import React from 'react';
import { 
  HeartPulse, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  ArrowUp
} from 'lucide-react';

export default function LandingFooter({ onNavigate }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer id="citycare-footer" className="citycare-landing-footer">
      <div className="footer-top-container">
        {/* Brand & Summary Column */}
        <div className="footer-col brand-col">
          <div className="footer-brand" onClick={scrollToTop} style={{ cursor: 'pointer' }}>
            <div className="citycare-brand-logo-mark" style={{ width: '36px', height: '36px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                <path d="M12 7V17M7 12H17" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <span className="footer-brand-title">CityCare</span>
              <div className="footer-brand-sub">Medical Wizard Practice</div>
            </div>
          </div>
          <p className="footer-desc">
            Excellence in multi-specialty clinical healthcare, frictionless appointment scheduling, 
            and instant arrival verification passes.
          </p>
          <div className="footer-badge">
            <ShieldCheck size={14} color="#059669" />
            <span>JCI Accredited &bull; ISO 27001 Secure</span>
          </div>
        </div>

        {/* Quick Navigation Column */}
        <div className="footer-col">
          <h4>Navigation</h4>
          <ul className="footer-links">
            <li>
              <button type="button" onClick={scrollToTop}>Home</button>
            </li>
            <li>
              <button type="button" onClick={() => scrollToSection('about-us')}>About Us</button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate && onNavigate('doctors')}>Specialist Doctors</button>
            </li>
            <li>
              <button type="button" onClick={() => scrollToSection('faq')}>FAQ</button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate && onNavigate('staff')}>Sign In / Register</button>
            </li>
          </ul>
        </div>

        {/* Clinical Specialties Column */}
        <div className="footer-col">
          <h4>Clinical Specialties</h4>
          <ul className="footer-links">
            <li>
              <button type="button" onClick={() => onNavigate && onNavigate('doctors')}>Cardiology &amp; Vascular</button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate && onNavigate('doctors')}>Neurology &amp; Neurosurgery</button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate && onNavigate('doctors')}>Pediatrics &amp; Child Health</button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate && onNavigate('doctors')}>Dental &amp; Maxillofacial</button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate && onNavigate('doctors')}>General Practice Consultations</button>
            </li>
          </ul>
        </div>

        {/* Hospital Contact & Emergency Hours */}
        <div className="footer-col contact-col">
          <h4>Hospital Contact</h4>
          <div className="footer-contact-row">
            <MapPin size={16} color="#0284c7" />
            <span>450 CityCare Boulevard, Metro Medical District</span>
          </div>
          <div className="footer-contact-row">
            <Phone size={16} color="#0284c7" />
            <span>Emergency: +1 (800) 432-CARE</span>
          </div>
          <div className="footer-contact-row">
            <Mail size={16} color="#0284c7" />
            <span>care@citycare-medical.org</span>
          </div>
          <div className="footer-contact-row">
            <Clock size={16} color="#0284c7" />
            <span>Emergency: 24/7 &bull; Outpatient: Mon-Sat 8am-8pm</span>
          </div>
        </div>
      </div>

      {/* Footer Bottom Bar */}
      <div className="footer-bottom-bar">
        <div>
          &copy; {new Date().getFullYear()} CityCare Medical Wizard Platform. All Rights Reserved. Confidential &amp; Protected Health System.
        </div>
        <button 
          type="button" 
          className="btn-back-to-top"
          onClick={scrollToTop}
          title="Scroll back to top"
        >
          <span>Back to Top</span>
          <ArrowUp size={14} />
        </button>
      </div>
    </footer>
  );
}
