import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  Calendar, 
  QrCode, 
  Stethoscope, 
  ShieldCheck, 
  Phone, 
  Mail, 
  ArrowRight,
  MessageCircle,
  FileCheck2
} from 'lucide-react';

const FAQ_ITEMS = [
  {
    id: 1,
    category: 'appointments',
    question: 'How do I book an appointment with a specialist?',
    answer: 'Navigate to the Doctors directory tab to view all practicing clinicians. Filter by specialty (Cardiology, Neurology, Pediatrics, Dentistry), review doctor credentials and consultation fees, then click "Book Consultation" to pick an open time slot and confirm your booking instantly.'
  },
  {
    id: 2,
    category: 'arrival',
    question: 'What is the Digital Arrival QR Pass and how do I use it?',
    answer: 'Every confirmed appointment immediately generates a unique verification code and printable QR pass. When you arrive at CityCare, simply present your digital pass on your smartphone or printout to the front-desk reception or scan at the express kiosk. Staff will verify your booking in seconds without requiring manual paperwork.'
  },
  {
    id: 3,
    category: 'appointments',
    question: 'Can patients view their scheduled and past appointments?',
    answer: 'Yes! When signed in with a Patient account, the Appointments tab and your personalized Patient Dashboard display all your scheduled, checked-in, and completed consultations. You can also view digital arrival codes and download official clinical receipts anytime.'
  },
  {
    id: 4,
    category: 'booking',
    question: 'How does CityCare prevent double-booking or scheduling collisions?',
    answer: 'Our clinical backend uses strict atomic validation and real-time collision prevention. Once an appointment slot is selected or confirmed, the system immediately locks that specific time window across all platforms, ensuring doctors are never double-booked.'
  },
  {
    id: 5,
    category: 'privacy',
    question: 'Who has access to my personal medical consultations and records?',
    answer: 'CityCare enforces enterprise Role-Based Access Control (RBAC). Only you (the patient) and your authorized treating clinicians have permission to inspect your consultation details. Front-desk staff only see arrival verification codes and check-in statuses, safeguarding your confidential medical history.'
  },
  {
    id: 6,
    category: 'booking',
    question: 'Do I need to create an account before browsing available doctors?',
    answer: 'No. The specialist directory, doctor profiles, clinical qualifications, and practice working schedules are publicly accessible to all guests. An account or quick patient registration is only requested when finalizing an appointment or accessing personal medical passes.'
  },
  {
    id: 7,
    category: 'arrival',
    question: 'Can I reschedule or cancel a booked appointment?',
    answer: 'Yes. Patients can manage their scheduled appointments directly from their account portal, or contact the front-desk reception desk with their 8-digit arrival code (e.g., MW-000104) to request a schedule adjustment.'
  },
  {
    id: 8,
    category: 'doctors',
    question: 'What should I bring with me on the day of my appointment?',
    answer: 'Please bring a valid photo identification card, any previous medical records or diagnostic reports pertinent to your consultation, and your CityCare Arrival QR Pass (accessible directly from your smartphone or printed receipt).'
  }
];

export default function FAQSection({ onNavigate }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItemIds, setOpenItemIds] = useState([1, 2]); // First two open by default

  const toggleItem = (id) => {
    setOpenItemIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const filteredItems = activeCategory === 'all'
    ? FAQ_ITEMS
    : FAQ_ITEMS.filter(item => {
        if (activeCategory === 'appointments') return item.category === 'appointments' || item.category === 'booking';
        if (activeCategory === 'arrival') return item.category === 'arrival';
        if (activeCategory === 'privacy') return item.category === 'privacy';
        if (activeCategory === 'doctors') return item.category === 'doctors' || item.category === 'appointments';
        return true;
      });

  return (
    <section id="faq" className="citycare-landing-section faq-section">
      {/* Section Header */}
      <div className="citycare-section-header">
        <div className="citycare-section-badge green">
          <HelpCircle size={14} color="#059669" />
          <span>Patient Help &amp; Support</span>
        </div>
        <h2 className="citycare-section-title">
          Frequently Asked Questions
        </h2>
        <p className="citycare-section-sub">
          Everything you need to know about booking specialist consultations, 
          using your express arrival QR pass, and navigating CityCare Medical Wizard.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="faq-categories-row">
        <button
          type="button"
          className={`faq-cat-pill ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All Questions ({FAQ_ITEMS.length})
        </button>
        <button
          type="button"
          className={`faq-cat-pill ${activeCategory === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveCategory('appointments')}
        >
          <Calendar size={14} />
          <span>Appointments &amp; Booking</span>
        </button>
        <button
          type="button"
          className={`faq-cat-pill ${activeCategory === 'arrival' ? 'active' : ''}`}
          onClick={() => setActiveCategory('arrival')}
        >
          <QrCode size={14} />
          <span>Arrival Pass &amp; QR Check-In</span>
        </button>
        <button
          type="button"
          className={`faq-cat-pill ${activeCategory === 'doctors' ? 'active' : ''}`}
          onClick={() => setActiveCategory('doctors')}
        >
          <Stethoscope size={14} />
          <span>Clinicians &amp; Care</span>
        </button>
        <button
          type="button"
          className={`faq-cat-pill ${activeCategory === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveCategory('privacy')}
        >
          <ShieldCheck size={14} />
          <span>Security &amp; Privacy</span>
        </button>
      </div>

      {/* Interactive FAQ Accordion List */}
      <div className="faq-accordion-list">
        {filteredItems.map(item => {
          const isOpen = openItemIds.includes(item.id);
          return (
            <div 
              key={item.id} 
              className={`faq-accordion-item ${isOpen ? 'open' : ''}`}
            >
              <button
                type="button"
                className="faq-question-btn"
                onClick={() => toggleItem(item.id)}
                aria-expanded={isOpen}
              >
                <span className="faq-question-text">{item.question}</span>
                <span className={`faq-chevron-icon ${isOpen ? 'rotated' : ''}`}>
                  <ChevronDown size={18} />
                </span>
              </button>

              {isOpen && (
                <div className="faq-answer-pane">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 24/7 Concierge Support Banner */}
      <div className="faq-support-banner">
        <div className="faq-support-info">
          <div className="support-icon-box">
            <MessageCircle size={24} color="#0284c7" />
          </div>
          <div>
            <h3>Still have questions or need clinical guidance?</h3>
            <p>Our dedicated patient concierge team and nursing desk are available 24/7 to assist with bookings and inquiries.</p>
          </div>
        </div>

        <div className="faq-support-contact">
          <div className="support-contact-item">
            <Phone size={16} color="#0284c7" />
            <span>+1 (800) 432-CARE</span>
          </div>
          <div className="support-contact-item">
            <Mail size={16} color="#0284c7" />
            <span>care@citycare-medical.org</span>
          </div>
          <button
            type="button"
            className="btn-guest-primary"
            onClick={() => onNavigate && onNavigate('doctors')}
          >
            <span>Book an Appointment</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
