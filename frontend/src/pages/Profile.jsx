import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ParticipantNavbar from '../components/ParticipantNavbar';

const INTEREST_OPTIONS = [
  'Technical', 'Sports', 'Cultural', 'Arts', 
  'Music', 'Dance', 'Drama', 'Photography',
  'Gaming', 'Coding', 'AI/ML', 'Cybersecurity',
  'Web Development', 'Mobile Development',
  'Business', 'Entrepreneurship', 'Social',
  'Environment', 'Health', 'Fitness', 
  'Literature', 'Debate', 'Quizzing'
];

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allOrganizers, setAllOrganizers] = useState([]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    contactNumber: '',
    collegeName: '',
    interests: [],
    followedOrganizers: []
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const config = { headers: { Authorization: token } };
      const res = await axios.get(`\${import.meta.env.VITE_API_URL}/api/participant/profile`, config);
      
      setProfile(res.data);
      setFormData({
        firstName: res.data.firstName,
        lastName: res.data.lastName,
        contactNumber: res.data.contactNumber,
        collegeName: res.data.collegeName || '',
        interests: res.data.interests || [],
        followedOrganizers: res.data.followedOrganizers.map(org => org._id)
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleOrganizerToggle = (orgId) => {
    setFormData(prev => ({
      ...prev,
      followedOrganizers: prev.followedOrganizers.includes(orgId)
        ? prev.followedOrganizers.filter(id => id !== orgId)
        : [...prev.followedOrganizers, orgId]
    }));
  };

  const fetchOrganizers = async () => {
    try {
      const res = await axios.get(`\${import.meta.env.VITE_API_URL}/api/organizers`);
      setAllOrganizers(res.data);
    } catch (err) {
      console.error('Error fetching organizers:', err);
    }
  };

  const handleEditClick = () => {
    setEditing(true);
    fetchOrganizers();
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: token } };
      
      await axios.patch(`\${import.meta.env.VITE_API_URL}/api/participant/profile`, formData, config);
      
      alert('Profile updated successfully!');
      setEditing(false);
      fetchProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: token } };
      
      await axios.patch(`\${import.meta.env.VITE_API_URL}/api/participant/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, config);
      
      alert('Password changed successfully!');
      setChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change password');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!profile) return <div className="loading">Profile not found</div>;

  return (
    <div className="page-wrapper">
      <ParticipantNavbar />
      
      <div className="page-content">
        <h1>My Profile</h1>

        {!editing ? (
          <div className="profile-view">
            <div className="profile-section">
              <h3>Personal Information</h3>
              <div className="profile-field">
                <label>Name:</label>
                <span>{profile.firstName} {profile.lastName}</span>
              </div>
              <div className="profile-field">
                <label>Email:</label>
                <span>{profile.email}</span>
              </div>
              <div className="profile-field">
                <label>Participant Type:</label>
                <span>{profile.type}</span>
              </div>
              <div className="profile-field">
                <label>Contact Number:</label>
                <span>{profile.contactNumber}</span>
              </div>
              <div className="profile-field">
                <label>College/Organization:</label>
                <span>{profile.collegeName || 'Not specified'}</span>
              </div>
            </div>

            <div className="profile-section">
              <h3>Interests</h3>
              <div className="interests-display">
                {profile.interests.length === 0 ? (
                  <p className="no-data">No interests selected</p>
                ) : (
                  profile.interests.map((interest, index) => (
                    <span key={index} className="interest-tag">{interest}</span>
                  ))
                )}
              </div>
            </div>

            <div className="profile-section">
              <h3>Followed Clubs ({profile.followedOrganizers.length})</h3>
              <div className="followed-list">
                {profile.followedOrganizers.length === 0 ? (
                  <p className="no-data">Not following any clubs</p>
                ) : (
                  profile.followedOrganizers.map((org) => (
                    <div key={org._id} className="followed-item">
                      <span>{org.name}</span>
                      <span className="org-category">{org.category}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="profile-actions">
              <button onClick={handleEditClick} className="btn btn-primary">
                Edit Profile
              </button>
              <button onClick={() => setChangingPassword(true)} className="btn btn-secondary">
                Change Password
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="profile-edit">
            <div className="profile-section">
              <h3>Edit Personal Information</h3>
              <div className="form-group">
                <label>First Name:</label>
                <input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name:</label>
                <input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact Number:</label>
                <input
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>College/Organization:</label>
                <input
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Optional"
                />
              </div>
              <div className="form-group">
                <label>Email (Not Editable):</label>
                <input
                  value={profile.email}
                  className="form-input"
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Participant Type (Not Editable):</label>
                <input
                  value={profile.type}
                  className="form-input"
                  disabled
                />
              </div>
            </div>

            <div className="profile-section">
              <h3>Interests</h3>
              <div className="tag-grid">
                {INTEREST_OPTIONS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    className={`tag-btn ${formData.interests.includes(interest) ? 'selected' : ''}`}
                    onClick={() => handleInterestToggle(interest)}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div className="profile-section">
              <h3>Followed Clubs</h3>
              <div className="organizer-list">
                {allOrganizers.map((org) => (
                  <div
                    key={org._id}
                    className={`organizer-card ${formData.followedOrganizers.includes(org._id) ? 'following' : ''}`}
                    onClick={() => handleOrganizerToggle(org._id)}
                  >
                    <div className="organizer-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.followedOrganizers.includes(org._id)}
                        onChange={() => {}}
                      />
                    </div>
                    <div className="organizer-info">
                      <h4>{org.name}</h4>
                      <span className="organizer-category">{org.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="profile-actions">
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        )}

        {changingPassword && (
          <div className="modal-overlay" onClick={() => setChangingPassword(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Change Password</h2>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label>Current Password:</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Password:</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password:</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Change Password</button>
                  <button type="button" onClick={() => setChangingPassword(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
