import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ParticipantNavbar from '../components/ParticipantNavbar';

const OrganizerDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [organizer, setOrganizer] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizerDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const config = { headers: { Authorization: token } };
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/organizers/${id}`, config);
        
        setOrganizer(res.data.organizer);
        setUpcomingEvents(res.data.events.upcoming);
        setPastEvents(res.data.events.past);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching organizer details:', err);
        setLoading(false);
      }
    };

    fetchOrganizerDetails();
  }, [id, navigate]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) return <div className="loading">Loading...</div>;

  if (!organizer) return <div className="loading">Organizer not found</div>;

  return (
    <div className="page-wrapper">
      <ParticipantNavbar />
      
      <div className="page-content">
        <div className="organizer-header">
          <button onClick={() => navigate(-1)} className="btn-back">← Back</button>
          <div className="organizer-name">
            <h1>{organizer.name}</h1>
            <span className="category-badge">{organizer.category}</span>
          </div>
          
          <div className="org-stats">
            <span>👥 {organizer.followerCount || 0} Followers</span>
          </div>
        </div>

        <div className="event-content">
          <div className="review-card">
            <h3>Description</h3>
            <p>{organizer.description}</p>
          </div>

          <div className="review-card">
            <h3>Contact</h3>
            <p>📧 {organizer.contactEmail}</p>
          </div>
        </div>

        <div className="events-section">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming Events ({upcomingEvents.length})
            </button>
            <button 
              className={`tab ${activeTab === 'past' ? 'active' : ''}`}
              onClick={() => setActiveTab('past')}
            >
              Past Events ({pastEvents.length})
            </button>
          </div>

          <div className="events-grid">
            {activeTab === 'upcoming' && (
              upcomingEvents.length === 0 ? (
                <p className="no-events">No upcoming events</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event._id} className="event-card">
                    <div className="event-header">
                      <h3>{event.name}</h3>
                      <span className={`status-badge ${event.status}`}>{event.status}</span>
                    </div>
                    <p className="event-description">{event.description}</p>
                    <div className="event-details">
                      <span>📅 {formatDate(event.startDate)}</span>
                      <span>📍 {event.location}</span>
                      {event.capacity && (
                        <span>👥 {event.registeredCount || 0}/{event.capacity}</span>
                      )}
                    </div>
                    {event.tags && event.tags.length > 0 && (
                      <div className="event-tags">
                        {event.tags.map((tag, index) => (
                          <span key={index} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )
            )}

            {activeTab === 'past' && (
              pastEvents.length === 0 ? (
                <p className="no-events">No past events</p>
              ) : (
                pastEvents.map((event) => (
                  <div key={event._id} className="event-card past">
                    <div className="event-header">
                      <h3>{event.name}</h3>
                      <span className={`status-badge ${event.status}`}>{event.status}</span>
                    </div>
                    <p className="event-description">{event.description}</p>
                    <div className="event-details">
                      <span>📅 {formatDate(event.startDate)}</span>
                      <span>📍 {event.location}</span>
                      {event.capacity && (
                        <span>👥 {event.registeredCount || 0}/{event.capacity}</span>
                      )}
                    </div>
                    {event.tags && event.tags.length > 0 && (
                      <div className="event-tags">
                        {event.tags.map((tag, index) => (
                          <span key={index} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDetail;
