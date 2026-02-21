import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const INTEREST_OPTIONS = [
  'Technical', 'Sports', 'Cultural', 'Arts', 
  'Music', 'Dance', 'Drama', 'Photography',
  'Gaming', 'Coding', 'AI/ML', 'Cybersecurity',
  'Web Development', 'Mobile Development',
  'Business', 'Entrepreneurship', 'Social',
  'Environment', 'Health', 'Fitness', 
  'Literature', 'Debate', 'Quizzing'
];

const OnboardingPreferences = () => {
  const navigate = useNavigate();
  const [interests, setInterests] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [followedOrganizers, setFollowedOrganizers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/organizers`);
      setOrganizers(res.data);
    } catch (err) {
      console.error('Error fetching organizers:', err);
    }
  };

  const handleInterestToggle = (interest) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleOrganizerToggle = (organizerId) => {
    setFollowedOrganizers(prev =>
      prev.includes(organizerId)
        ? prev.filter(id => id !== organizerId)
        : [...prev, organizerId]
    );
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/participant/preferences`,
        { interests, followedOrganizers },
        { headers: { Authorization: token } }
      );
      

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.preferencesSet = true;
      localStorage.setItem('user', JSON.stringify(user));
      
      alert('Preferences saved successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving preferences:', err);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/participant/preferences`,
        { interests: [], followedOrganizers: [] },
        { headers: { Authorization: token } }
      );
      

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.preferencesSet = true;
      localStorage.setItem('user', JSON.stringify(user));
      
      navigate('/dashboard');
    } catch (err) {
      console.error('Error skipping onboarding:', err);

      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <h1>Personalize Your Experience</h1>
      <p className="subtitle">Help us recommend events that match your interests</p>
      
      {/* Interests Section */}
      <section className="preferences-section">
        <h2>Select Your Areas of Interest</h2>
        <p className="section-desc">Choose multiple topics that interest you</p>
        <div className="tag-grid">
          {INTEREST_OPTIONS.map(interest => (
            <button
              key={interest}
              className={`tag-btn ${interests.includes(interest) ? 'selected' : ''}`}
              onClick={() => handleInterestToggle(interest)}
            >
              {interest}
            </button>
          ))}
        </div>
        <p className="selection-count">
          {interests.length} interest{interests.length !== 1 ? 's' : ''} selected
        </p>
      </section>

      {/* Organizers Section */}
      <section className="preferences-section">
        <h2>Follow Clubs/Organizers</h2>
        <p className="section-desc">Get updates about events from your favorite organizers</p>
        {organizers.length === 0 ? (
          <p className="no-data">No organizers available at the moment.</p>
        ) : (
          <div className="organizer-list">
            {organizers.map(org => (
              <div 
                key={org._id} 
                className={`organizer-card ${followedOrganizers.includes(org._id) ? 'following' : ''}`}
                onClick={() => handleOrganizerToggle(org._id)}
              >
                <div className="organizer-checkbox">
                  <input
                    type="checkbox"
                    checked={followedOrganizers.includes(org._id)}
                    onChange={() => handleOrganizerToggle(org._id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="organizer-info">
                  <h3>{org.name}</h3>
                  <p className="organizer-category">{org.category}</p>
                  <p className="organizer-desc">{org.description}</p>
                  {org.followerCount > 0 && (
                    <p className="follower-count">{org.followerCount} followers</p>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
        <p className="selection-count">
          {followedOrganizers.length} organizer{followedOrganizers.length !== 1 ? 's' : ''} followed
        </p>
      </section>

      <div className="actions">
        <button 
          onClick={handleSavePreferences} 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
        <button 
          onClick={handleSkip} 
          className="btn btn-secondary"
          disabled={loading}
        >
          Skip for Now
        </button>
      </div>
    </div>
  );
};

export default OnboardingPreferences;
