import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import OrganizerNavbar from '../components/OrganizerNavbar';


const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchAnalytics();
    fetchEvents();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`\${import.meta.env.VITE_API_URL}/api/events/analytics/overall`, {
        headers: { Authorization: token }
      });
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`\${import.meta.env.VITE_API_URL}/api/events/my-events`, {
        headers: { Authorization: token }
      });
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  const handleDeleteEvent = async (eventId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this draft event? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/events/${eventId}`, {
        headers: { Authorization: token }
      });
      

      fetchEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert(err.response?.data?.message || 'Failed to delete event');
    }
  };

  return (
    <div className="page-wrapper">
      <OrganizerNavbar />
      <div className="page-content">
        <h1>Organizer Dashboard</h1>

        {analytics && (
          <div className="analytics-grid">
            <div className="analytics-card registrations">
              <h3>{analytics.totalRegistrations}</h3>
              <p>Total Registrations</p>
            </div>
            <div className="analytics-card attendance">
              <h3>{analytics.totalAttendance}</h3>
              <p>Total Attendance</p>
            </div>
            <div className="analytics-card revenue">
              <h3>₹{analytics.totalRevenue}</h3>
              <p>Total Revenue</p>
            </div>
          </div>
        )}

        <div className="events-header">
          <h2>My Events</h2>
          <button className="btn-create" onClick={() => navigate('/organizer/create-event')}>
            + Create Event
          </button>
        </div>

        <div className="events-grid">
          {events.map(event => (
            <div key={event._id} className="event-card-organizer" 
                 onClick={() => navigate(`/organizer/event/${event._id}`)}>
              <h3>{event.name}</h3>
              <p className="event-type">Type: {event.eventType}</p>
              <div className="event-card-footer">
                <span className={`status-badge ${event.status}`}>
                  {event.status}
                </span>
                <span className="registration-count">
                  {event.currentRegistrations}/{event.registrationLimit}
                </span>
              </div>
              {event.status === 'draft' && (
                <button 
                  className="btn-delete-draft" 
                  onClick={(e) => handleDeleteEvent(event._id, e)}
                  title="Delete draft"
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          ))}
          {events.length === 0 && (
            <p className="no-events-message">
              No events created yet. Create your first event!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;