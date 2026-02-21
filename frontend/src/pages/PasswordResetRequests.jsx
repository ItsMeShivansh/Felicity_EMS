import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar';

const PasswordResetRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [showPassword, setShowPassword] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/password-reset-requests`, {
        headers: { Authorization: token }
      });
      setRequests(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/admin/password-reset-requests/${id}/approve`,
        { comment },
        { headers: { Authorization: token } }
      );
      setShowPassword({ id, password: res.data.newPassword });
      setActiveId(null);
      setComment('');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/admin/password-reset-requests/${id}/reject`,
        { comment },
        { headers: { Authorization: token } }
      );
      setActiveId(null);
      setComment('');
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="page-wrapper">
      <AdminNavbar />
      <div className="page-content">
        <h1>Password Reset Requests</h1>

        <div className="tabs-container">
          <button
            className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({requests.length})
          </button>
          <button
            className={`tab-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({pendingCount})
          </button>
          <button
            className={`tab-btn ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Approved
          </button>
          <button
            className={`tab-btn ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            Rejected
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : filteredRequests.length === 0 ? (
          <p className="no-organizers">No {filter === 'all' ? '' : filter} requests found.</p>
        ) : (
          <div className="reset-requests-list">
            {filteredRequests.map((req) => (
              <div key={req._id} className="reset-request-card">
                <div className="reset-request-header">
                  <div>
                    <h3>{req.organizer?.name || 'Deleted Organizer'}</h3>
                    <p className="text-muted">{req.organizer?.loginEmail}</p>
                  </div>
                  <span className={`status-badge ${req.status}`}>{req.status}</span>
                </div>

                <div className="reset-request-body">
                  <div className="reset-request-detail">
                    <strong>Category:</strong> {req.organizer?.category || 'N/A'}
                  </div>
                  <div className="reset-request-detail">
                    <strong>Contact:</strong> {req.organizer?.contactEmail || 'N/A'}
                  </div>
                  <div className="reset-request-detail">
                    <strong>Reason:</strong> {req.reason}
                  </div>
                  <div className="reset-request-detail">
                    <strong>Requested:</strong> {formatDate(req.createdAt)}
                  </div>
                  {req.adminComment && (
                    <div className="reset-request-detail">
                      <strong>Admin Comment:</strong> {req.adminComment}
                    </div>
                  )}
                </div>

                {req.status === 'pending' && (
                  <div className="reset-request-actions">
                    {activeId === req._id ? (
                      <div className="comment-section">
                        <input
                          type="text"
                          placeholder="Add a comment (optional)"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="form-input"
                        />
                        <div className="action-buttons">
                          <button className="btn-action btn-success" onClick={() => handleApprove(req._id)}>
                            Approve
                          </button>
                          <button className="btn-action btn-danger" onClick={() => handleReject(req._id)}>
                            Reject
                          </button>
                          <button className="btn-action btn-secondary" onClick={() => { setActiveId(null); setComment(''); }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn-action" onClick={() => setActiveId(req._id)}>
                        Review
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* New Password Modal */}
        {showPassword && (
          <div className="modal-overlay" onClick={() => setShowPassword(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Password Reset Approved</h2>
              <p>New password has been generated. Share it with the organizer:</p>
              <div className="credentials-box">
                <div className="credential-row">
                  <strong>New Password:</strong>
                  <code>{showPassword.password}</code>
                </div>
              </div>
              <p style={{ color: '#d32f2f', marginTop: '15px', fontSize: '14px' }}>
                ⚠️ Save this password now! It cannot be retrieved later.
              </p>
              <button className="btn-submit" onClick={() => setShowPassword(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResetRequests;
