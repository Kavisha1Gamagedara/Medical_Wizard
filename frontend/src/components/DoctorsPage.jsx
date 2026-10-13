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

  const getSpecialtyBadgeClass = (specialty) => {
    switch (specialty?.toLowerCase()) {
      case 'neurosurgeon':
        return 'role-pill doctor';
      case 'dentist':
        return 'role-pill staff';
      case 'cardiologist':
        return 'role-pill admin';
      default:
        return 'role-pill doctor';
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
        <form onSubmit={handleSearchSubmit} className="doctors-search-bar" style={{ maxWidth: '640px', marginTop: '20px' }}>
          <div className="input-with-icon" style={{ flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by doctor name or specialty (e.g. Smith, Dentist, Cardio)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '42px', background: 'rgba(11, 19, 35, 0.95)' }}
            />
            <Search size={18} className="input-icon" />
          </div>
          <button type="submit" className="btn-submit" style={{ width: 'auto', padding: '12px 24px', margin: 0 }}>
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
            {doctors.map((doc) => (
              <div key={doc.id} className="doctor-card">
                <div className="doctor-card-top">
                  <div className="doctor-avatar-box">
                    <Stethoscope size={24} />
                  </div>
                  <div>
                    <h3 className="doctor-name">
                      {doc.full_name || `Dr. ${doc.username}`}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span className={getSpecialtyBadgeClass(doc.specialization)}>
                        {doc.specialization || 'General Physician'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="doctor-bio">
                  {doc.bio || 'Consulting physician providing dedicated patient assessments and care.'}
                </p>

                <div className="doctor-meta-list">
                  <div className="doctor-meta-item">
                    <Mail size={14} color="var(--text-muted)" />
                    <span>{doc.email}</span>
                  </div>
                  {doc.phone_number && (
                    <div className="doctor-meta-item">
                      <Phone size={14} color="var(--text-muted)" />
                      <span>{doc.phone_number}</span>
                    </div>
                  )}
                  <div className="doctor-meta-item">
                    <CheckCircle2 size={14} color="var(--emerald-accent)" />
                    <span style={{ color: 'var(--emerald-accent)', fontWeight: '600' }}>
                      Accepting Appointments
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
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

                  {(currentUser?.role === 'admin' || currentUser?.role === 'staff' || (currentUser?.role === 'doctor' && currentUser?.id === doc.id)) && (
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ padding: '0 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}
                      onClick={() => {
                        setActiveDoctorForAvailability(doc);
                        setIsAvailabilityModalOpen(true);
                      }}
                      title="Set available hours & max daily appointments capacity"
                      id={`btn-availability-${doc.username}`}
                    >
                      <Clock size={14} />
                      <span>Availability</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
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
