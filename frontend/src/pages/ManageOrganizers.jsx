import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar';

const ManageOrganizers = () => {
  const [organizers, setOrganizers] = useState([]);
  const [showCredentials, setShowCredentials] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    contactEmail: '',
    contactNumber: ''
  });

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/organizers`, {
        headers: { Authorization: token }
      });
      setOrganizers(res.data);
    } catch (err) {
      console.error('Error fetching organizers:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddOrganizer = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/add-organizer`, formData, {
        headers: { Authorization: token }
      });
      

      setShowCredentials(res.data.credentials);
      
      setFormData({
        name: '',
        category: '',
        description: '',
        contactEmail: '',
        contactNumber: ''
      });
      fetchOrganizers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add organizer');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'disable' : 'enable'} this organizer?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/admin/organizers/${id}/toggle-status`, {}, {
        headers: { Authorization: token }
      });
      fetchOrganizers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this organizer?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/organizers/${id}`, {
        headers: { Authorization: token }
      });
      alert('Organizer deleted successfully!');
      fetchOrganizers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete organizer');
    }
  };

  return (
    <div className="page-wrapper">
      <AdminNavbar />
      <div className="page-content">
        <h1>Manage Clubs/Organizers</h1>

        <div className="admin-form">
          <h2>Add New Club/Organizer</h2>
          <form onSubmit={handleAddOrganizer}>
            <div className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="form-select"
                >
                  <option value="">Select category...</option>
                  <option value="cultural">Cultural</option>
                  <option value="technical">Technical</option>
                  <option value="sports">Sports</option>
                  <option value="social">Social</option>
                </select>
              </div>

              <div className="form-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Contact Number</label>
                <input
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  className="form-input textarea"
                />
              </div>
            </div>
            <button type="submit" className="btn-submit">Add Organizer</button>
            <small style={{ display: 'block', marginTop: '10px', color: '#666' }}>
              Login credentials will be auto-generated and displayed after creation
            </small>
          </form>
        </div>

        <div className="organizers-section">
          <h2>All Clubs/Organizers</h2>
          {organizers.length === 0 ? (
            <p className="no-organizers">No organizers found.</p>
          ) : (
            <table className="organizers-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Email</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizers.map((org) => (
                  <tr key={org._id} className={org.isActive ? '' : 'disabled'}>
                    <td>{org.name}</td>
                    <td className="text-muted">{org.category}</td>
                    <td className="text-muted">{org.contactEmail}</td>
                    <td className="text-muted">{org.contactNumber}</td>
                    <td>
                      <span className={`status-indicator ${org.isActive ? 'active' : 'inactive'}`}>
                        {org.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-action btn-toggle" 
                          onClick={() => handleToggleStatus(org._id, org.isActive)}
                        >
                          {org.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button 
                          className="btn-action btn-delete" 
                          onClick={() => handleDelete(org._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Credentials Modal */}
        {showCredentials && (
          <div className="modal-overlay" onClick={() => setShowCredentials(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>✅ Organizer Created Successfully!</h2>
              <p style={{ marginBottom: '20px' }}>
                Please share these login credentials with <strong>{showCredentials.name}</strong>:
              </p>
              <div className="credentials-box">
                <div className="credential-row">
                  <strong>Login Email:</strong>
                  <code>{showCredentials.loginEmail}</code>
                </div>
                <div className="credential-row">
                  <strong>Password:</strong>
                  <code>{showCredentials.password}</code>
                </div>
              </div>
              <p style={{ color: '#d32f2f', marginTop: '15px', fontSize: '14px' }}>
                ⚠️ Save these credentials now! They cannot be retrieved later.
              </p>
              <button 
                className="btn-submit" 
                onClick={() => setShowCredentials(null)}
                style={{ marginTop: '20px' }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageOrganizers;
