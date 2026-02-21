import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ParticipantNavbar from '../components/ParticipantNavbar';

const BrowseEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [followedOrganizers, setFollowedOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    search: '',
    eventType: 'all',
    eligibility: 'all',
    startDate: '',
    endDate: '',
    followedOnly: false
  });

  useEffect(() => {
    fetchUserData();
    fetchTrending();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const config = { headers: { Authorization: token } };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/participant/preferences`, config);
      setFollowedOrganizers(res.data.followedOrganizers.filter(org => org).map(org => org._id));
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const fetchTrending = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/browse/trending`);
      setTrendingEvents(res.data);
    } catch (err) {
      console.error('Error fetching trending:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.eventType !== 'all') params.append('eventType', filters.eventType);
      if (filters.eligibility !== 'all') params.append('eligibility', filters.eligibility);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.followedOnly && followedOrganizers.length > 0) {
        params.append('followedClubs', followedOrganizers.join(','));
      }

      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/browse/all?${params}`);
      setEvents(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching events:', err);
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      eventType: 'all',
      eligibility: 'all',
      startDate: '',
      endDate: '',
      followedOnly: false
    });
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="page-wrapper">
      <ParticipantNavbar />
      
      <div className="page-content">
        <h1>Browse Events</h1>

        {/* Trending Section */}
        {trendingEvents.length > 0 && (
          <div className="trending-section">
            <h2>🔥 Trending (Last 24h)</h2>
            <div className="trending-grid">
              {trendingEvents.map((event) => (
                <div 
                  key={event._id} 
                  className="trending-card"
                  onClick={() => navigate(`/events/${event._id}`)}
                >
                  <h3>{event.name}</h3>
                  <p className="organizer-name">By {event.organizer?.name}</p>
                  <span className="event-date">📅 {formatDate(event.startDate)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="filters-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search events or organizers..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters-grid">
            <div className="filter-group">
              <label>Event Type:</label>
              <select
                value={filters.eventType}
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
                className="filter-select"
              >
                <option value="all">All Types</option>
                <option value="normal">Normal Event</option>
                <option value="merchandise">Merchandise</option>
                <option value="hackathon">Hackathon</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Eligibility:</label>
              <select
                value={filters.eligibility}
                onChange={(e) => handleFilterChange('eligibility', e.target.value)}
                className="filter-select"
              >
                <option value="all">All</option>
                <option value="IIIT Only">IIIT Only</option>
                <option value="Open to All">Open to All</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>End Date:</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={filters.followedOnly}
                  onChange={(e) => handleFilterChange('followedOnly', e.target.checked)}
                />
                Followed Clubs Only
              </label>
            </div>
          </div>

          <button onClick={clearFilters} className="clear-btn">
            Clear Filters
          </button>
        </div>

        {/* Events List */}
        <div className="events-section">
          <h2>All Events ({events.length})</h2>
          
          {loading ? (
            <div className="loading">Loading events...</div>
          ) : events.length === 0 ? (
            <p className="no-events">No events found. Try adjusting your filters.</p>
          ) : (
            <div className="events-grid">
              {events.map((event) => (
                <div 
                  key={event._id} 
                  className="event-card"
                  onClick={() => navigate(`/events/${event._id}`)}
                >
                  <div className="event-header">
                    <h3>{event.name}</h3>
                    <span className={`status-badge ${event.status}`}>{event.status}</span>
                  </div>
                  
                  <p className="event-meta">
                    By <strong>{event.organizer?.name}</strong>
                    <span className="category-badge">{event.organizer?.category}</span>
                  </p>
                  
                  <p className="event-description">{event.description}</p>
                  
                  <div className="event-meta">
                    <span className="event-type">{event.eventType}</span>
                    <span className="event-eligibility">{event.eligibility}</span>
                  </div>
                  
                  <div className="event-details">
                    <span>📅 {formatDate(event.startDate)}</span>
                    {event.location && <span>📍 {event.location}</span>}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowseEvents;
