import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ParticipantNavbar from '../components/ParticipantNavbar';

const MyRegistrations = () => {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState({ upcoming: [], past: [], cancelled: [] });
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [showTicket, setShowTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCalendarMenu, setShowCalendarMenu] = useState(null);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCalendarMenu && !event.target.closest('.calendar-dropdown')) {
        setShowCalendarMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendarMenu]);

  const fetchRegistrations = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`\${import.meta.env.VITE_API_URL}/api/registrations/my-registrations`, {
        headers: { Authorization: token }
      });
      setRegistrations(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setLoading(false);
    }
  };

  const viewTicket = (registration) => {
    setSelectedTicket(registration);
    setShowTicket(true);
  };

  const downloadTicket = (registration) => {

    const link = document.createElement('a');
    link.href = registration.qrCode;
    link.download = `ticket-${registration.ticketId}.png`;
    link.click();
  };

  const handleCancelRegistration = async (registrationId) => {
    if (!window.confirm('Are you sure you want to cancel this registration?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/registrations/cancel/${registrationId}`,
        {},
        { headers: { Authorization: token } }
      );
      alert('Registration cancelled successfully');
      fetchRegistrations();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel registration');
    }
  };

  const exportToCalendar = async (registrationId, eventName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/registrations/export-calendar/${registrationId}`,
        {
          headers: { Authorization: token },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${eventName.replace(/[^a-z0-9]/gi, '_')}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShowCalendarMenu(null);
    } catch (err) {
      alert('Failed to export calendar');
    }
  };

  const addToGoogleCalendar = async (registrationId) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/registrations/calendar-links/${registrationId}`,
        { headers: { Authorization: token } }
      );
      window.open(data.google, '_blank');
      setShowCalendarMenu(null);
    } catch (err) {
      alert('Failed to generate Google Calendar link');
    }
  };

  const addToOutlook = async (registrationId) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/registrations/calendar-links/${registrationId}`,
        { headers: { Authorization: token } }
      );
      window.open(data.outlook, '_blank');
      setShowCalendarMenu(null);
    } catch (err) {
      alert('Failed to generate Outlook link');
    }
  };

  const exportAllToCalendar = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `\${import.meta.env.VITE_API_URL}/api/registrations/export-calendar-batch`,
        {
          headers: { Authorization: token },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'my_events.ics');
      document.body.appendChild(link);
      link.click();
      link.remove();
      alert('All upcoming events exported successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export events');
    }
  };

  const renderRegistrationCard = (registration) => {
    const event = registration.event;
    const canCancel = activeTab === 'upcoming' && 
                      new Date(event?.startDate) > new Date() &&
                      registration.status === 'confirmed';
    const isUpcoming = activeTab === 'upcoming' && new Date(event?.startDate) > new Date();

    return (
      <div key={registration._id} className="registration-card">
        <div className="card-header">
          <h3>{event?.name}</h3>
          <span className={`event-type-badge ${event?.eventType}`}>
            {event?.eventType === 'merchandise' ? '🛍️ Merchandise' : '📅 Event'}
          </span>
        </div>

        <div className="card-body">
          <div className="event-info">
            <p><strong>📅 Date:</strong> {new Date(event?.startDate).toLocaleDateString()}</p>
            <p><strong>📍 Location:</strong> {event?.location || event?.venue || 'TBA'}</p>
            <p><strong>🎫 Ticket ID:</strong> <code>{registration.ticketId}</code></p>
            <p><strong>✅ Registered:</strong> {new Date(registration.registrationDate).toLocaleDateString()}</p>
            
            {registration.isMerchandise && registration.itemsPurchased && (
              <div className="merchandise-details">
                <p><strong>Items:</strong></p>
                <ul>
                  {registration.itemsPurchased.map((item, idx) => (
                    <li key={idx}>
                      {item.itemName} (Qty: {item.quantity}) - ₹{item.price * item.quantity}
                    </li>
                  ))}
                </ul>
                <p className="total-amount"><strong>Total: ₹{registration.totalAmount}</strong></p>
              </div>
            )}
          </div>
        </div>

        <div className="card-actions">
          <button onClick={() => viewTicket(registration)} className="btn-primary btn-sm">
            View Ticket
          </button>
          <button onClick={() => downloadTicket(registration)} className="btn-secondary btn-sm">
            Download QR
          </button>
          {isUpcoming && !registration.isMerchandise && (
            <div className="calendar-dropdown">
              <button 
                onClick={() => setShowCalendarMenu(showCalendarMenu === registration._id ? null : registration._id)} 
                className="btn-secondary btn-sm"
              >
                📅 Calendar
              </button>
              {showCalendarMenu === registration._id && (
                <div className="calendar-menu">
                  <button onClick={() => exportToCalendar(registration._id, event.name)}>
                    Download .ics
                  </button>
                  <button onClick={() => addToGoogleCalendar(registration._id)}>
                    Google Calendar
                  </button>
                  <button onClick={() => addToOutlook(registration._id)}>
                    Outlook Calendar
                  </button>
                </div>
              )}
            </div>
          )}
          {canCancel && (
            <button 
              onClick={() => handleCancelRegistration(registration._id)} 
              className="btn-danger btn-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <ParticipantNavbar />
        <div className="page-content">
          <div className="my-registrations-page">
            <p>Loading registrations...</p>
          </div>
        </div>
      </div>
    );
  }

  let currentList;
  if (activeTab === 'normal') {
    currentList = [...registrations.upcoming, ...registrations.past]
      .filter(r => !r.isMerchandise && r.event?.eventType !== 'hackathon');
  } else if (activeTab === 'merchandise') {
    currentList = [...registrations.upcoming, ...registrations.past]
      .filter(r => r.isMerchandise);
  } else {
    currentList = registrations[activeTab] || [];
  }

  return (
    <div className="page-wrapper">
      <ParticipantNavbar />
      <div className="page-content">
      <div className="my-registrations-page">
        <div className="page-header-with-actions">
          <h1>My Registrations</h1>
          {registrations.upcoming.length > 0 && (
            <button onClick={exportAllToCalendar} className="btn-primary">
              📅 Export All to Calendar
            </button>
          )}
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming ({registrations.upcoming.length})
          </button>
          <button
            className={`tab ${activeTab === 'normal' ? 'active' : ''}`}
            onClick={() => setActiveTab('normal')}
          >
            Normal ({registrations.upcoming.filter(r => !r.isMerchandise && r.event?.eventType !== 'hackathon').length + registrations.past.filter(r => !r.isMerchandise && r.event?.eventType !== 'hackathon').length})
          </button>
          <button
            className={`tab ${activeTab === 'merchandise' ? 'active' : ''}`}
            onClick={() => setActiveTab('merchandise')}
          >
            Merchandise ({registrations.upcoming.filter(r => r.isMerchandise).length + registrations.past.filter(r => r.isMerchandise).length})
          </button>
          <button
            className={`tab ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Completed ({registrations.past.length})
          </button>
          <button
            className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled ({registrations.cancelled.length})
          </button>
        </div>

        <div className="registrations-grid">
          {currentList.length === 0 ? (
            <div className="empty-state">
              <p>No {activeTab} registrations found</p>
              <button onClick={() => navigate('/events')} className="btn-primary">
                Browse Events
              </button>
            </div>
          ) : (
            currentList.map(renderRegistrationCard)
          )}
        </div>

        {/* Ticket Modal */}
        {showTicket && selectedTicket && (
          <div className="modal-overlay" onClick={() => setShowTicket(false)}>
            <div className="modal-content ticket-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Your Ticket</h2>
              <div className="ticket-content">
                <div className="ticket-info">
                  <p><strong>Event:</strong> {selectedTicket.event?.name}</p>
                  <p><strong>Date:</strong> {new Date(selectedTicket.event?.startDate).toLocaleString()}</p>
                  <p><strong>Location:</strong> {selectedTicket.event?.location || selectedTicket.event?.venue}</p>
                  <p><strong>Ticket ID:</strong> <code>{selectedTicket.ticketId}</code></p>
                  <p><strong>Status:</strong> {selectedTicket.status}</p>
                  
                  {selectedTicket.isMerchandise && selectedTicket.itemsPurchased && (
                    <div className="merchandise-details">
                      <p><strong>Items:</strong></p>
                      <ul>
                        {selectedTicket.itemsPurchased.map((item, idx) => (
                          <li key={idx}>
                            {item.itemName} x {item.quantity} - ₹{item.price * item.quantity}
                          </li>
                        ))}
                      </ul>
                      <p className="total-amount"><strong>Total: ₹{selectedTicket.totalAmount}</strong></p>
                    </div>
                  )}
                </div>
                <div className="ticket-qr">
                  <img src={selectedTicket.qrCode} alt="Ticket QR Code" />
                  <p className="text-muted">Present this QR code at the event</p>
                </div>
              </div>
              <div className="form-actions">
                <button onClick={() => downloadTicket(selectedTicket)} className="btn-primary">
                  Download QR
                </button>
                <button onClick={() => setShowTicket(false)} className="btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default MyRegistrations;
