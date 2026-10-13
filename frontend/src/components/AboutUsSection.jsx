import React from 'react';
import { 
  Sparkles, 
  Stethoscope, 
  ShieldCheck, 
  QrCode, 
  Award, 
  Clock, 
  Building2, 
  HeartPulse, 
  Users, 
  CheckCircle2,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function AboutUsSection({ onNavigate }) {
  return (
    <section id="about-us" className="citycare-landing-section about-section">
      {/* Section Header */}
      <div className="citycare-section-header">
        <div className="citycare-section-badge blue">
          <Sparkles size={14} color="#0284c7" />
          <span>About CityCare &bull; Medical Wizard</span>
        </div>
        <h2 className="citycare-section-title">
          Pioneering Advanced Medicine &amp; Intelligent Clinical Care
        </h2>
        <p className="citycare-section-sub">
          CityCare brings together world-class specialist clinicians, cutting-edge diagnostic technology, 
          and express digital arrival check-in workflows to deliver rapid, dignified, and patient-first medical care.
        </p>
      </div>

      {/* Key Practice Statistics */}
      <div className="about-stats-grid">
        <div className="about-stat-card">
          <div className="about-stat-icon-wrapper blue">
            <Users size={22} />
          </div>
          <div className="about-stat-value">40+</div>
          <div className="about-stat-label">Senior Consultant Specialists</div>
          <div className="about-stat-desc">Leading specialists across Cardiology, Neurology, Dentistry &amp; Pediatrics</div>
        </div>

        <div className="about-stat-card">
          <div className="about-stat-icon-wrapper teal">
            <HeartPulse size={22} />
          </div>
          <div className="about-stat-value">15,000+</div>
          <div className="about-stat-label">Consultations Delivered</div>
          <div className="about-stat-desc">Trusted by families and referring physicians across the metropolitan region</div>
        </div>

        <div className="about-stat-card">
          <div className="about-stat-icon-wrapper purple">
            <Award size={22} />
          </div>
          <div className="about-stat-value">99.4%</div>
          <div className="about-stat-label">Patient Satisfaction</div>
          <div className="about-stat-desc">Verified positive feedback on clinical precision and empathetic care</div>
        </div>

        <div className="about-stat-card">
          <div className="about-stat-icon-wrapper emerald">
            <Clock size={22} />
          </div>
          <div className="about-stat-value">&lt; 4 min</div>
          <div className="about-stat-label">Average Check-In Time</div>
          <div className="about-stat-desc">Express reception processing via our instant Arrival QR Pass</div>
        </div>
      </div>

      {/* 3 Core Clinical Values */}
      <div className="about-values-grid">
        <div className="about-value-card">
          <div className="value-header">
            <div className="value-icon-box blue">
              <Stethoscope size={24} />
            </div>
            <span className="value-tag">Clinical Excellence</span>
          </div>
          <h3>Consultant-Led Medical Care</h3>
          <p>
            Every patient receives direct, unhurried consultations with certified specialists. 
            From interventional cardiology to pediatric neurology, our team formulates personalized 
            treatment roadmaps grounded in the latest evidence-based clinical guidelines.
          </p>
          <ul className="value-checklist">
            <li><CheckCircle2 size={16} color="#0284c7" /> Rigorously vetted senior consultants</li>
            <li><CheckCircle2 size={16} color="#0284c7" /> Multi-disciplinary clinical case reviews</li>
            <li><CheckCircle2 size={16} color="#0284c7" /> Comprehensive digital treatment histories</li>
          </ul>
        </div>

        <div className="about-value-card">
          <div className="value-header">
            <div className="value-icon-box teal">
              <QrCode size={24} />
            </div>
            <span className="value-tag">Intelligent Workflow</span>
          </div>
          <h3>Digital Arrival &amp; Smart Scheduling</h3>
          <p>
            We eliminate outdated paper registration forms and long hospital queues. 
            Every confirmed booking provides an instant digital QR arrival code that allows 
            express check-in at front desk receptionists or automated digital kiosks.
          </p>
          <ul className="value-checklist">
            <li><CheckCircle2 size={16} color="#059669" /> Zero double-booking slot protection</li>
            <li><CheckCircle2 size={16} color="#059669" /> Real-time clinician availability telemetry</li>
            <li><CheckCircle2 size={16} color="#059669" /> Printable &amp; smartphone-ready QR passes</li>
          </ul>
        </div>

        <div className="about-value-card">
          <div className="value-header">
            <div className="value-icon-box purple">
              <ShieldCheck size={24} />
            </div>
            <span className="value-tag">Privacy &amp; Trust</span>
          </div>
          <h3>Strict Role-Based Confidentiality</h3>
          <p>
            Patient privacy is paramount. CityCare enforces enterprise-grade Role-Based Access Control (RBAC), 
            ensuring confidential clinical notes are accessible solely by authorized treating physicians, 
            while reception staff manage arrivals without exposing medical records.
          </p>
          <ul className="value-checklist">
            <li><CheckCircle2 size={16} color="#7c3aed" /> End-to-end encrypted session security</li>
            <li><CheckCircle2 size={16} color="#7c3aed" /> Strict segregation of patient data</li>
            <li><CheckCircle2 size={16} color="#7c3aed" /> ISO 27001 compliant infrastructure</li>
          </ul>
        </div>
      </div>

      {/* Facilities & Infrastructure Banner */}
      <div className="about-facilities-banner">
        <div className="facilities-content">
          <div className="facilities-badge">
            <Building2 size={15} color="#0284c7" />
            <span>State-of-the-Art Infrastructure</span>
          </div>
          <h3>Modern Diagnostic &amp; Outpatient Center</h3>
          <p>
            Located in the heart of the Medical District, our modern clinical facility features 
            high-resolution digital diagnostic imaging, fully sterile minor procedure suites, 
            dedicated specialist consultation rooms, and comfortable waiting lounges designed for patient peace of mind.
          </p>
          <div className="facilities-features-row">
            <div className="facility-pill">
              <Activity size={15} color="#0284c7" />
              <span>24/7 Emergency Triage Support</span>
            </div>
            <div className="facility-pill">
              <ShieldCheck size={15} color="#059669" />
              <span>JCI Accredited Protocols</span>
            </div>
            <div className="facility-pill">
              <Clock size={15} color="#7c3aed" />
              <span>Mon - Sat Extended Consultation Hours</span>
            </div>
          </div>
        </div>

        <div className="facilities-action-box">
          <h4>Looking for a Specialist?</h4>
          <p>Browse our current roster of active consultants and book your consultation in less than 2 minutes.</p>
          <button 
            type="button" 
            className="btn-guest-primary"
            onClick={() => onNavigate && onNavigate('doctors')}
          >
            <span>Explore Specialists Directory</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
