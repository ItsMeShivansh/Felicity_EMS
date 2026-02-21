import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import OrganizerNavbar from '../components/OrganizerNavbar';

const OngoingEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('all');

  useEffect(() => {
    fetchOngoingEvents();
  }, [search, eventType]);

  const fetchOngoingEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ status: 'ongoing' });
      if (search) params.append('search', search);
      if (eventType !== 'all') params.append('eventType', eventType);

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/browse/all?${params}`);
      setEvents(res.data);
    } catch (err) {
      console.error('Error fetching ongoing events:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="page-wrapper">
      <OrganizerNavbar />
      <div className="page-content">
        <div className="page-header" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <h1>Ongoing Events</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Events that are currently in progress
          </p>
        </div>

        {/* Filters */}
        <div className="filters-section" style={{ marginBottom: '1.5rem' }}>
          <div className="filters-grid" style={{ gridTemplateColumns: '1fr auto' }}>
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Search events or organizers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Type</label>
              <select
                className="filter-select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="normal">Normal</option>
                <option value="hackathon">Hackathon</option>
                <option value="merchandise">Merchandise</option>
              </select>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="loading">Loading ongoing events...</div>
        ) : events.length === 0 ? (
          <div className="events-section">
            <p className="no-events-message" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No ongoing events right now. Check back later!
            </p>
          </div>
        ) : (
          <div className="events-grid">
            {events.map(event => (
              <div
                key={event._id}
                className="event-card"
                onClick={() => navigate(`/events/${event._id}`)}
                style={{ cursor: 'pointer' }}
              >
                {event.bannerImage && (
                  <img
                    src={event.bannerImage}
                    alt={event.name}
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.75rem' }}
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>{event.name}</h3>
                  <span className="status-badge ongoing" style={{ flexShrink: 0, marginLeft: '0.5rem' }}>
                    ● Live
                  </span>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0' }}>
                  {event.organizer?.name}
                </p>

                {event.tags?.length > 0 && (
                  <div className="event-tags" style={{ marginBottom: '0.75rem' }}>
                    {event.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="tag" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>{tag}</span>
                    ))}
                  </div>
                )}

                <p className="event-description" style={{ WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                  {event.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <span>📅 Ends: {formatDate(event.endDate)}</span>
                  <span className="event-type">{event.eventType}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OngoingEvents;
