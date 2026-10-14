import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Search, 
  Calendar, 
  Phone, 
  Mail, 
  Sparkles, 
  Award, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { doctorService } from '../services/api';
import BookAppointmentModal from './BookAppointmentModal';
import DoctorAvailabilityModal from './DoctorAvailabilityModal';

const SPECIALTY_FILTERS = [
  { id: 'all', label: 'All Specialists' },
  { id: 'Neurosurgeon', label: 'Neurosurgeons' },
  { id: 'Dentist', label: 'Dentists' },
  { id: 'Cardiologist', label: 'Cardiologists' },
  { id: 'Pediatrician', label: 'Pediatricians' },
];

export default function DoctorsPage({ currentUser, onAppointmentCreated, onNavigate }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  // Selected doctor for booking modal
  const [activeDoctorToBook, setActiveDoctorToBook] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Selected doctor for availability configuration modal
  const [activeDoctorForAvailability, setActiveDoctorForAvailability] = useState(null);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await doctorService.getDoctors({
        specialization: selectedSpecialty,
        search: searchQuery.trim() || undefined,
      });
      setDoctors(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load doctors list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [selectedSpecialty]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDoctors();
  };

  const handleOpenBooking = (doctor) => {
    setActiveDoctorToBook(doctor);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = (newAppointment) => {
    if (onAppointmentCreated) {
      onAppointmentCreated(newAppointment);
    }
  };

  const getSpecialtyTheme = (specialty) => {
    switch (specialty?.toLowerCase()) {
      case 'neurosurgeon':
        return {
          bg: '#f5f3ff',
          color: '#6d28d9',
          border: '#ddd6fe',
          avatarBg: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
          avatarColor: '#7c3aed',
          label: specialty || 'Neurosurgeon'
        };
      case 'dentist':
        return {
          bg: '#ecfdf5',
          color: '#047857',
          border: '#a7f3d0',
          avatarBg: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
          avatarColor: '#059669',
          label: specialty || 'Dentist'
        };
      case 'cardiologist':
        return {
          bg: '#fff1f2',
          color: '#be123c',
          border: '#fecdd3',
          avatarBg: 'linear-gradient(135deg, #ffe4e6, #fecdd3)',
          avatarColor: '#e11d48',
          label: specialty || 'Cardiologist'
        };
      case 'pediatrician':
        return {
          bg: '#f0f9ff',
          color: '#0369a1',
          border: '#bae6fd',
          avatarBg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
          avatarColor: '#0284c7',
          label: specialty || 'Pediatrician'
        };
      default:
        return {
          bg: '#f0fdfa',
          color: '#0f766e',
          border: '#99f6e4',
          avatarBg: 'linear-gradient(135deg, #ccfbf1, #99f6e4)',
          avatarColor: '#0d9488',
          label: specialty || 'General Physician'
        };
    }
  };

  return (
    <div className="doctors-directory-container">
      {/* Hero Search Section */}
      <div className="doctors-hero-banner">
        <div className="badge-tag" style={{ margin: '0 0 12px' }}>
          <Sparkles size={13} />
          Certified Clinical Specialists
        </div>
        <h2>Find Your Specialist &amp; Book an Appointment</h2>
        <p>
          Browse our certified physicians and medical specialists. Select a doctor to apply for an appointment directly.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="doctors-search-bar">
          <div className="input-with-icon" style={{ flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by doctor name or specialty (e.g. Smith, Dentist, Cardio)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '44px' }}
            />
            <Search size={18} className="input-icon" />
          </div>
          <button type="submit" className="btn-submit" style={{ width: 'auto', padding: '12px 28px', margin: 0 }}>
            Search
          </button>
        </form>

        {/* Filter Pills */}
        <div className="specialty-filter-pills">
          {SPECIALTY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`specialty-pill-btn ${selectedSpecialty === f.id ? 'active' : ''}`}
              onClick={() => setSelectedSpecialty(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="alert-box alert-danger" style={{ maxWidth: '1200px', margin: '20px auto' }}>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Doctors Grid */}
      <div className="doctors-grid-wrapper">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', width: '100%' }}>
            <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 16px', borderWidth: '3px' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Loading clinical specialists...
            </div>
          </div>
        ) : doctors.length === 0 ? (
          <div className="doctors-empty-state">
            <Stethoscope size={48} color="var(--text-muted)" style={{ marginBottom: '14px' }} />
            <h3>No Doctors Found</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              No specialists matched "{searchQuery}" under {selectedSpecialty} category.
            </p>
            <button
              type="button"
              className="btn-cancel"
              style={{ marginTop: '16px' }}
              onClick={() => {
                setSearchQuery('');
                setSelectedSpecialty('all');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="doctors-cards-grid">
            {doctors.map((doc) => {
              const theme = getSpecialtyTheme(doc.specialization);
              return (
                <div key={doc.id} className="doctor-card">
                  <div className="doctor-card-top">
                    <div 
                      className="doctor-avatar-box"
                      style={{
                        background: theme.avatarBg,
                        color: theme.avatarColor,
                        border: `1.5px solid ${theme.border}`
                      }}
                    >
                      <Stethoscope size={26} />
                    </div>
                    <div>
                      <h3 className="doctor-name">
                        {doc.full_name || `Dr. ${doc.username}`}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <span 
                          className="doctor-specialty-pill"
                          style={{
                            background: theme.bg,
                            color: theme.color,
                            border: `1px solid ${theme.border}`
                          }}
                        >
                          {theme.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="doctor-bio">
                    {doc.bio || 'Consulting physician providing dedicated patient assessments and care.'}
                  </p>

                  <div className="doctor-meta-list">
                    <div className="doctor-meta-item">
                      <div className="meta-icon-bubble email">
                        <Mail size={14} />
                      </div>
                      <span className="meta-text">{doc.email}</span>
                    </div>
                    {doc.phone_number && (
                      <div className="doctor-meta-item">
                        <div className="meta-icon-bubble phone">
                          <Phone size={14} />
                        </div>
                        <span className="meta-text">{doc.phone_number}</span>
                      </div>
                    )}
                    <div className="doctor-status-badge">
                      <span className="status-indicator-dot" />
                      <span className="status-badge-text">Accepting Appointments</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    {currentUser?.role !== 'doctor' && (
                      <button
                        type="button"
                        className="btn-book-doctor"
                        style={{ flex: 1, margin: 0 }}
                        onClick={() => handleOpenBooking(doc)}
                        id={`btn-book-${doc.username}`}
                      >
                        <Calendar size={15} />
                        <span>Book Appointment</span>
                        <ArrowRight size={14} />
                      </button>
                    )}

                    {(currentUser?.role === 'admin' || currentUser?.role === 'staff' || (currentUser?.role === 'doctor' && currentUser?.id === doc.id)) && (
                      <button
                        type="button"
                        className="btn-doctor-availability"
                        style={{ 
                          flex: currentUser?.role === 'doctor' ? 1 : undefined,
                          padding: currentUser?.role === 'doctor' ? '12px 18px' : '0 14px', 
                          fontSize: '0.82rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '6px', 
                          margin: 0
                        }}
                        onClick={() => {
                          setActiveDoctorForAvailability(doc);
                          setIsAvailabilityModalOpen(true);
                        }}
                        title="Set available hours & max daily appointments capacity"
                        id={`btn-availability-${doc.username}`}
                      >
                        <Clock size={14} />
                        <span>{currentUser?.role === 'doctor' ? 'My Availability & Capacity' : 'Availability'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookAppointmentModal
        doctor={activeDoctorToBook}
        currentUser={currentUser}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onBookingSuccess={handleBookingSuccess}
        onNavigate={onNavigate}
      />

      {/* Doctor Availability & Daily Capacity Modal */}
      <DoctorAvailabilityModal
        doctor={activeDoctorForAvailability}
        currentUser={currentUser}
        isOpen={isAvailabilityModalOpen}
        onClose={() => {
          setIsAvailabilityModalOpen(false);
          setActiveDoctorForAvailability(null);
        }}
      />
    </div>
  );
}
