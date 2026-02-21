import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import OrganizerNavbar from '../components/OrganizerNavbar';

const OrganizerEventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [search, setSearch] = useState('');


  const [pendingPayments, setPendingPayments] = useState([]);
  const [showPaymentProof, setShowPaymentProof] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState('');


  const [teams, setTeams] = useState([]);


  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchEventDetails();
    fetchAnalytics();
    fetchParticipants();
  }, [eventId]);

  useEffect(() => {
    if (event?.eventType === 'merchandise') {
      fetchPendingPayments();
    }
    if (event?.eventType === 'hackathon') {
      fetchTeams();
    }
  }, [event?.eventType]);

  useEffect(() => {
    if (search) {
      setFilteredParticipants(
        participants.filter(p => 
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.email.toLowerCase().includes(search.toLowerCase()) ||
          p.team.toLowerCase().includes(search.toLowerCase())
        )
      );
    } else {
      setFilteredParticipants(participants);
    }
  }, [search, participants]);

  const fetchEventDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/${eventId}`, {
        headers: { Authorization: token }
      });
      setEvent(data);
    } catch (err) {
      console.error('Failed to fetch event:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/${eventId}/analytics`, {
        headers: { Authorization: token }
      });
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchParticipants = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/${eventId}/participants`, {
        headers: { Authorization: token }
      });
      setParticipants(data);
      setFilteredParticipants(data);
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/registrations/event/${eventId}/pending-payments`,
        { headers: { Authorization: token } }
      );
      setPendingPayments(data.registrations);
    } catch (err) {
      console.error('Failed to fetch pending payments:', err);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/teams/event/${eventId}`,
        { headers: { Authorization: token } }
      );
      setTeams(data.teams);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  };

  const handleApprovePayment = async (registrationId) => {
    try {
      setPaymentMessage('');
      const token = localStorage.getItem('token');
      const { data } = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/registrations/approve-payment/${registrationId}`,
        {},
        { headers: { Authorization: token } }
      );
      setPaymentMessage(data.message);
      fetchPendingPayments();
      fetchAnalytics();
    } catch (err) {
      setPaymentMessage(err.response?.data?.message || 'Failed to approve payment');
    }
  };

  const handleRejectPayment = async (registrationId) => {
    if (!window.confirm('Are you sure you want to reject this payment?')) return;
    try {
      setPaymentMessage('');
      const token = localStorage.getItem('token');
      const { data } = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/registrations/reject-payment/${registrationId}`,
        {},
        { headers: { Authorization: token } }
      );
      setPaymentMessage(data.message);
      fetchPendingPayments();
    } catch (err) {
      setPaymentMessage(err.response?.data?.message || 'Failed to reject payment');
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Registration Date', 'Payment Status', 'Team', 'Attendance'];
    const rows = filteredParticipants.map(p => [
      p.name,
      p.email,
      new Date(p.registeredAt).toLocaleDateString(),
      p.paymentStatus,
      p.team,
      p.attended ? 'Yes' : 'No'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.name || 'event'}_participants.csv`;
    a.click();
  };

  if (!event || !analytics) {
    return (
      <div className="page-wrapper">
        <OrganizerNavbar />
        <div className="page-content">
          <div className="event-detail-page">
            <p>Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <OrganizerNavbar />
      <div className="page-content">
      <div className="event-detail-page">
        <div className="event-detail-header">
          <button onClick={() => navigate('/organizer-dashboard')} className="btn-secondary">
            ← Back
          </button>
          <button onClick={() => navigate(`/organizer/edit-event/${eventId}`)} className="btn-primary">
            Edit Event
          </button>
        </div>

        <div className="event-header">
          <h1>{event.name}</h1>
          {event.tags && event.tags.length > 0 && (
            <div className="event-tags">
              {event.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            Participants
          </button>
          {event.eventType === 'merchandise' && (
            <button 
              className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              Payment Approvals {pendingPayments.length > 0 && `(${pendingPayments.length})`}
            </button>
          )}
          {event.eventType === 'hackathon' && (
            <button 
              className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
              onClick={() => setActiveTab('teams')}
            >
              Teams ({teams.length})
            </button>
          )}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
        <div className="event-content">
          <div className="event-main-info">
            <section className="event-section">
              <h2>Overview</h2>
              <div className="event-info-grid">
                <div className="info-item">
                  <span className="icon">📋</span>
                  <div>
                    <strong>Type</strong>
                    <p>{event.eventType}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="icon">🎯</span>
                  <div>
                    <strong>Status</strong>
                    <p className="status-badge">{event.status}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="icon">👥</span>
                  <div>
                    <strong>Eligibility</strong>
                    <p>{event.eligibility}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="icon">⏰</span>
                  <div>
                    <strong>Registration Deadline</strong>
                    <p>{new Date(event.registrationDeadline).toLocaleString()}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="icon">📅</span>
                  <div>
                    <strong>Start Date</strong>
                    <p>{new Date(event.startDate).toLocaleString()}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="icon">📅</span>
                  <div>
                    <strong>End Date</strong>
                    <p>{new Date(event.endDate).toLocaleString()}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="icon">📍</span>
                  <div>
                    <strong>Location</strong>
                    <p>{event.isOnline ? 'Online' : event.location || 'TBA'}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="icon">💰</span>
                  <div>
                    <strong>Entry Fee</strong>
                    <p>{event.entryFee > 0 ? `₹${event.entryFee}` : 'Free'}</p>
                  </div>
                </div>
              </div>
            </section>

            {event.description && (
              <section className="event-section">
                <h2>About</h2>
                <p>{event.description}</p>
              </section>
            )}

            <section className="event-section">
              <h2>Analytics</h2>
              <div className="analytics-grid">
                <div className="analytics-card registrations">
                  <h3>{analytics.totalRegistrations}</h3>
                  <p>Registrations</p>
                </div>
                <div className="analytics-card attendance">
                  <h3>{analytics.attendance}</h3>
                  <p>Attendance</p>
                </div>
                <div className="analytics-card">
                  <h3>{analytics.sales}</h3>
                  <p>Sales</p>
                </div>
                <div className="analytics-card revenue">
                  <h3>₹{analytics.revenue}</h3>
                  <p>Revenue</p>
                </div>
              </div>
              {analytics.teamCompletion > 0 && (
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  Teams Completed: {analytics.teamCompletion}
                </p>
              )}
            </section>
          </div>
        </div>
        )}

        {/* Participants Tab */}
        {activeTab === 'participants' && (
          <section className="event-section">
            <div className="section-header">
              <h2>Participants ({filteredParticipants.length})</h2>
              <div className="participants-actions">
                <input
                  type="text"
                  placeholder="Search participants..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                />
                <button onClick={exportCSV} className="btn-primary">
                  Export CSV
                </button>
              </div>
            </div>

            <div className="participants-table-container">
              <table className="organizers-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Reg Date</th>
                    <th>Payment</th>
                    <th>Team</th>
                    <th>Attended</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((p, idx) => (
                    <tr key={idx}>
                      <td>{p.name}</td>
                      <td>{p.email}</td>
                      <td>{new Date(p.registeredAt).toLocaleDateString()}</td>
                      <td>
                        <span className="status-badge">{p.paymentStatus}</span>
                      </td>
                      <td>{p.team}</td>
                      <td>{p.attended ? '✓' : '−'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredParticipants.length === 0 && (
              <p className="no-data" style={{ textAlign: 'center', padding: '2rem' }}>
                No participants found
              </p>
            )}
          </section>
        )}

        {/* Payment Approvals Tab */}
        {activeTab === 'payments' && event.eventType === 'merchandise' && (
          <section className="event-section">
            <h2>Payment Approvals</h2>
            {paymentMessage && (
              <div className="message success" style={{ marginBottom: '1rem' }}>{paymentMessage}</div>
            )}

            {pendingPayments.length === 0 ? (
              <p className="no-data" style={{ textAlign: 'center', padding: '2rem' }}>
                No pending payment approvals
              </p>
            ) : (
              <div className="payment-approvals-list">
                {pendingPayments.map(reg => (
                  <div key={reg._id} className="payment-approval-card">
                    <div className="payment-approval-info">
                      <p><strong>{reg.participant.firstName} {reg.participant.lastName}</strong></p>
                      <p>{reg.participant.email}</p>
                      <p>Items: {reg.itemsPurchased.map(i => `${i.itemName} x${i.quantity}`).join(', ')}</p>
                      <p>Total: ₹{reg.totalAmount}</p>
                      <p>Status: <span className="status-badge">{reg.paymentStatus}</span></p>
                    </div>
                    <div className="payment-approval-actions">
                      {reg.paymentProof ? (
                        <button 
                          onClick={() => setShowPaymentProof(reg)}
                          className="btn-secondary"
                        >
                          View Proof
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No proof uploaded</span>
                      )}
                      {reg.paymentProof && (
                        <>
                          <button 
                            onClick={() => handleApprovePayment(reg._id)}
                            className="btn-primary"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleRejectPayment(reg._id)}
                            className="btn-secondary"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && event.eventType === 'hackathon' && (
          <section className="event-section">
            <h2>Teams ({teams.length})</h2>

            {teams.length === 0 ? (
              <p className="no-data" style={{ textAlign: 'center', padding: '2rem' }}>
                No teams formed yet
              </p>
            ) : (
              <div className="teams-grid">
                {teams.map(t => (
                  <div key={t._id} className="team-card">
                    <div className="team-card-header">
                      <h3>{t.teamName}</h3>
                      <span className="status-badge">{t.status}</span>
                    </div>
                    <p>Leader: {t.leader.firstName} {t.leader.lastName}</p>
                    <p>Members: {t.members.length} / {t.maxSize}</p>
                    <div className="team-members-list">
                      {t.members.map((m, i) => (
                        <div key={i} className="team-member-item">
                          {m.participant.firstName} {m.participant.lastName}
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                            {m.participant.email}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Payment Proof Modal */}
      {showPaymentProof && (
        <div className="modal-overlay" onClick={() => setShowPaymentProof(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Payment Proof</h2>
            <p><strong>{showPaymentProof.participant.firstName} {showPaymentProof.participant.lastName}</strong></p>
            <p>Total: ₹{showPaymentProof.totalAmount}</p>
            <div style={{ margin: '1rem 0', textAlign: 'center' }}>
              <img 
                src={showPaymentProof.paymentProof} 
                alt="Payment proof" 
                style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '6px', border: '2px solid var(--border-color)' }} 
              />
            </div>
            <div className="form-actions">
              <button onClick={() => { handleApprovePayment(showPaymentProof._id); setShowPaymentProof(null); }} className="btn-primary">
                Approve
              </button>
              <button onClick={() => { handleRejectPayment(showPaymentProof._id); setShowPaymentProof(null); }} className="btn-secondary">
                Reject
              </button>
              <button onClick={() => setShowPaymentProof(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default OrganizerEventDetail;
