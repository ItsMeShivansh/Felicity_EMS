import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import OrganizerNavbar from '../components/OrganizerNavbar';

const CATEGORY_OPTIONS = [
  'Technical', 'Sports', 'Cultural', 'Arts', 
  'Music', 'Dance', 'Drama', 'Photography',
  'Gaming', 'Coding', 'AI/ML', 'Cybersecurity',
  'Web Development', 'Mobile Development',
  'Business', 'Entrepreneurship', 'Social',
  'Environment', 'Health', 'Fitness', 
  'Literature', 'Debate', 'Quizzing'
];

const OrganizerProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [resetReason, setResetReason] = useState('');
  const [resetRequests, setResetRequests] = useState([]);
  const [showResetForm, setShowResetForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    contactEmail: '',
    contactNumber: '',
    discordWebhook: ''
  });

  useEffect(() => {
    fetchProfile();
    fetchResetRequests();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const config = { headers: { Authorization: token } };
      const res = await axios.get(`\${import.meta.env.VITE_API_URL}/api/organizers/profile/me`, config);
      
      setProfile(res.data);
      setFormData({
        name: res.data.name,
        category: res.data.category,
        description: res.data.description,
        contactEmail: res.data.contactEmail,
        contactNumber: res.data.contactNumber,
        discordWebhook: res.data.discordWebhook || ''
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setMessage({ type: 'error', text: 'Failed to load profile' });
      setLoading(false);
    }
  };

  const fetchResetRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: token } };
      const res = await axios.get(`\${import.meta.env.VITE_API_URL}/api/organizers/password-reset-requests`, config);
      setResetRequests(res.data);
    } catch (err) {
      console.error('Error fetching reset requests:', err);
    }
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: token } };
      await axios.post(`\${import.meta.env.VITE_API_URL}/api/organizers/password-reset-request`, { reason: resetReason }, config);
      setMessage({ type: 'success', text: 'Password reset request submitted to admin!' });
      setResetReason('');
      setShowResetForm(false);
      fetchResetRequests();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit request' });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: token } };
      
      const res = await axios.patch(
        `\${import.meta.env.VITE_API_URL}/api/organizers/profile/me`,
        formData,
        config
      );
      
      setProfile(res.data.organizer);
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to update profile' 
      });
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setFormData({
      name: profile.name,
      category: profile.category,
      description: profile.description,
      contactEmail: profile.contactEmail,
      contactNumber: profile.contactNumber,
      discordWebhook: profile.discordWebhook || ''
    });
    setMessage({ type: '', text: '' });
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <OrganizerNavbar />
        <div className="page-content">
          <div className="profile-section">
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <OrganizerNavbar />
      <div className="page-content">
      <div className="profile-section">
        <h1>Organizer Profile</h1>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="profile-section">
          <div className="section-header">
            <h2>Basic Information</h2>
            {!editing && (
              <button onClick={() => setEditing(true)} className="edit-btn">
                Edit Profile
              </button>
            )}
          </div>

          {!editing ? (
            <div className="profile-info">
              <div className="info-row">
                <label>Organization Name:</label>
                <span>{profile.name}</span>
              </div>
              <div className="info-row">
                <label>Category:</label>
                <span>{profile.category}</span>
              </div>
              <div className="info-row">
                <label>Description:</label>
                <span>{profile.description}</span>
              </div>
              <div className="info-row">
                <label>Login Email:</label>
                <span className="non-editable">{profile.loginEmail}</span>
              </div>
              <div className="info-row">
                <label>Contact Email:</label>
                <span>{profile.contactEmail}</span>
              </div>
              <div className="info-row">
                <label>Contact Number:</label>
                <span>{profile.contactNumber}</span>
              </div>
              <div className="info-row">
                <label>Discord Webhook:</label>
                <span>{profile.discordWebhook ? 'Configured' : 'Not configured'}</span>
              </div>
              <div className="info-row">
                <label>Total Events:</label>
                <span>{profile.events?.length || 0}</span>
              </div>
              <div className="info-row">
                <label>Follower Count:</label>
                <span>{profile.followerCount || 0}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label>Organization Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="form-select"
                >
                  <option value="">Select Category</option>
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  required
                  className="form-input textarea"
                />
              </div>

              <div className="form-group">
                <label>Login Email (Non-editable)</label>
                <input
                  type="email"
                  value={profile.loginEmail}
                  disabled
                  className="form-input disabled-input"
                />
                <small>This is your login credential and cannot be changed</small>
              </div>

              <div className="form-group">
                <label>Contact Email *</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
                <small>Public email for event-related inquiries</small>
              </div>

              <div className="form-group">
                <label>Contact Number *</label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Discord Webhook URL</label>
                <input
                  type="url"
                  name="discordWebhook"
                  value={formData.discordWebhook}
                  onChange={handleChange}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="form-input"
                />
                <small>
                  Auto-post new events to your Discord server. 
                  <a 
                    href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ marginLeft: '5px' }}
                  >
                    Learn how to create a webhook
                  </a>
                </small>
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn">Save Changes</button>
                <button type="button" onClick={cancelEdit} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {!editing && (
          <div className="profile-section">
            <div className="section-header">
              <h2>Request Password Reset</h2>
              {!showResetForm && (
                <button onClick={() => setShowResetForm(true)} className="edit-btn">
                  Request Reset
                </button>
              )}
            </div>

            {showResetForm && (
              <form onSubmit={handleResetRequest} className="profile-form">
                <div className="form-group">
                  <label>Reason for Password Reset *</label>
                  <textarea
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    required
                    rows="3"
                    placeholder="Explain why you need a password reset..."
                    className="form-input textarea"
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn">Submit Request</button>
                  <button type="button" onClick={() => { setShowResetForm(false); setResetReason(''); }} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {resetRequests.length > 0 && (
              <div className="reset-history">
                <h3>Request History</h3>
                {resetRequests.map((req) => (
                  <div key={req._id} className="reset-history-item">
                    <div className="reset-history-header">
                      <span className={`status-badge ${req.status}`}>{req.status}</span>
                      <span className="text-muted">{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p><strong>Reason:</strong> {req.reason}</p>
                    {req.adminComment && <p><strong>Admin:</strong> {req.adminComment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default OrganizerProfile;
