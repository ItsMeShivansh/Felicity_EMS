import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ParticipantNavbar from '../components/ParticipantNavbar';

const EventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [showTicket, setShowTicket] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });


  const [team, setTeam] = useState(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');


  const [registration, setRegistration] = useState(null);
  const [showPaymentUpload, setShowPaymentUpload] = useState(false);
  const [paymentProof, setPaymentProof] = useState('');


  const [showMerchandiseForm, setShowMerchandiseForm] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    fetchEventDetails();
    checkRegistrationStatus();
  }, [eventId]);


  useEffect(() => {
    if (event?.eventType === 'hackathon') {
      fetchTeamInfo();
    }
  }, [event?.eventType]);

  const fetchEventDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/${eventId}`, {
        headers: { Authorization: token }
      });
      setEvent(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching event:', err);
      setMessage({ type: 'error', text: 'Failed to load event details' });
      setLoading(false);
    }
  };

  const checkRegistrationStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/registrations/check/${eventId}`, {
        headers: { Authorization: token }
      });
      setIsRegistered(data.isRegistered);
      if (data.registration) {
        setTicket(data.registration);
        setRegistration(data.registration);
      }
    } catch (err) {
      console.error('Error checking registration:', err);
    }
  };

  const fetchTeamInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/teams/my-team/${eventId}`, {
        headers: { Authorization: token }
      });
      setTeam(data.team);
    } catch (err) {
      console.error('Error fetching team:', err);
    }
  };

  const handleCreateTeam = async () => {
    try {
      setMessage({ type: '', text: '' });
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `\${import.meta.env.VITE_API_URL}/api/teams/create`,
        { eventId, teamName },
        { headers: { Authorization: token } }
      );
      setMessage({ type: 'success', text: data.message });
      setShowCreateTeam(false);
      setTeamName('');
      fetchTeamInfo();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create team' });
    }
  };

  const handleJoinTeam = async () => {
    try {
      setMessage({ type: '', text: '' });
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `\${import.meta.env.VITE_API_URL}/api/teams/join`,
        { inviteCode },
        { headers: { Authorization: token } }
      );
      setMessage({ type: 'success', text: data.message });
      setShowJoinTeam(false);
      setInviteCode('');
      fetchTeamInfo();
      checkRegistrationStatus();
      fetchEventDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to join team' });
    }
  };

  const handleCompleteTeam = async () => {
    try {
      setMessage({ type: '', text: '' });
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/teams/${team._id}/complete`,
        {},
        { headers: { Authorization: token } }
      );
      setMessage({ type: 'success', text: data.message });
      fetchTeamInfo();
      checkRegistrationStatus();
      fetchEventDetails();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to complete team' });
    }
  };

  const handlePaymentProofUpload = async () => {
    try {
      setMessage({ type: '', text: '' });
      if (!paymentProof) {
        setMessage({ type: 'error', text: 'Please select a payment proof image' });
        return;
      }
      const token = localStorage.getItem('token');
      const { data } = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/registrations/payment-proof/${registration._id}`,
        { paymentProof },
        { headers: { Authorization: token } }
      );
      setMessage({ type: 'success', text: data.message });
      setShowPaymentUpload(false);
      checkRegistrationStatus();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to upload payment proof' });
    }
  };

  const handlePaymentProofChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 5MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProof(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = () => {
    if (event.eventType === 'merchandise') {
      setSelectedItems({});
      setShowMerchandiseForm(true);
    } else if (event.customRegistrationForm?.enabled) {
      setShowRegistrationForm(true);
    } else {
      submitRegistration({});
    }
  };

  const submitMerchandiseOrder = async () => {
    const items = Object.entries(selectedItems)
      .filter(([, qty]) => qty > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity }));

    if (items.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one item' });
      return;
    }

    try {
      setMessage({ type: '', text: '' });
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/registrations/merchandise/${eventId}`,
        { items },
        { headers: { Authorization: token } }
      );
      setMessage({ type: 'success', text: data.message });
      setIsRegistered(true);
      setRegistration(data.registration);
      setShowMerchandiseForm(false);
      fetchEventDetails();
    } catch (err) {
      console.error('Merchandise order error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Order failed'
      });
    }
  };

  const handleFormChange = (fieldName, value) => {
    setFormData({ ...formData, [fieldName]: value });
  };

  const submitRegistration = async (customFormData) => {
    try {
      setMessage({ type: '', text: '' });
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/registrations/event/${eventId}`,
        { customFormData },
        { headers: { Authorization: token } }
      );

      setMessage({ type: 'success', text: data.message });
      setIsRegistered(true);
      setTicket(data.ticket);
      setShowRegistrationForm(false);
      setShowTicket(true);


      fetchEventDetails();
    } catch (err) {
      console.error('Registration error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Registration failed'
      });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    submitRegistration(formData);
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <ParticipantNavbar />
        <div className="page-content">
          <div className="event-detail-page">
            <p>Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page-wrapper">
        <ParticipantNavbar />
        <div className="page-content">
          <div className="event-detail-page">
            <p>Event not found</p>
          </div>
        </div>
      </div>
    );
  }

  const availableSlots = event.registrationLimit - event.currentRegistrations;
  const registrationOpen = new Date() < new Date(event.registrationDeadline) && 
                           event.status === 'published' && 
                           availableSlots > 0;

  return (
    <div className="page-wrapper">
      <ParticipantNavbar />
      <div className="page-content">
        {event.bannerImage && (
          <div className="event-banner">
            <img src={event.bannerImage} alt={event.name} />
          </div>
        )}

        <div className="event-header">
          <button onClick={() => navigate(-1)} className="btn-back">← Back</button>
          <h1>{event.name}</h1>
          <div className="event-tags">
            {event.tags?.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="event-content">
          <div className="event-main-info">
            <section className="event-section">
              <h2>About</h2>
              <p>{event.description}</p>
            </section>

            <section className="event-section">
              <h2>Event Details</h2>
              <div className="event-info-grid">
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
                    <p>{event.location || event.venue || 'TBA'}</p>
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
                  <span className="icon">💰</span>
                  <div>
                    <strong>Entry Fee</strong>
                    <p>{event.entryFee > 0 ? `₹${event.entryFee}` : 'Free'}</p>
                  </div>
                </div>
                <div className="info-item">
                  <span className="icon">👥</span>
                  <div>
                    <strong>Available Slots</strong>
                    <p className={availableSlots < 10 ? 'text-warning' : ''}>
                      {availableSlots} / {event.registrationLimit}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {event.eligibility && (
              <section className="event-section">
                <h2>Eligibility</h2>
                <p>{event.eligibility}</p>
              </section>
            )}

            {event.rules && (
              <section className="event-section">
                <h2>Rules</h2>
                <p>{event.rules}</p>
              </section>
            )}

            {event.prizes && (
              <section className="event-section">
                <h2>Prizes</h2>
                <p>{event.prizes}</p>
              </section>
            )}
          </div>

          <div className="event-sidebar">
            <div className="registration-card">
              <h3>Registration</h3>
              
              {/* Hackathon Team Registration */}
              {event.eventType === 'hackathon' ? (
                <div>
                  {isRegistered ? (
                    <div className="registered-status">
                      <p className="success-text">✅ You are registered!</p>
                      {team && <p>Team: {team.teamName}</p>}
                      <button onClick={() => setShowTicket(true)} className="btn-primary">
                        View Ticket
                      </button>
                    </div>
                  ) : team ? (
                    <div className="team-status-card">
                      <p><strong>Team:</strong> {team.teamName}</p>
                      <p><strong>Members:</strong> {team.members.length} / {team.maxSize}</p>
                      <p><strong>Status:</strong> <span className="status-badge">{team.status}</span></p>
                      <p><strong>Invite Code:</strong></p>
                      <code className="invite-code">{team.inviteCode}</code>
                      <div className="team-members-list">
                        {team.members.map((m, i) => (
                          <div key={i} className="team-member-item">
                            {m.name} {m._id === team.leader?._id || (team.isLeader && i === 0) ? '(Leader)' : ''}
                          </div>
                        ))}
                      </div>
                      {team.isLeader && team.status === 'forming' && team.members.length >= team.minSize && (
                        <button onClick={handleCompleteTeam} className="btn-primary btn-block" style={{ marginTop: '1rem' }}>
                          Complete Team & Get Tickets
                        </button>
                      )}
                      {team.status === 'complete' && (
                        <button onClick={() => navigate(`/team-chat/${team._id}`)} className="btn-primary btn-block" style={{ marginTop: '1rem' }}>
                          Team Chat
                        </button>
                      )}
                      {team.status === 'forming' && (
                        <p className="info-text" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                          Share the invite code with teammates to join
                        </p>
                      )}
                    </div>
                  ) : registrationOpen ? (
                    <div>
                      <p style={{ marginBottom: '1rem' }}>
                        Team size: {event.teamSettings?.minSize || 2} - {event.teamSettings?.maxSize || 4} members
                      </p>
                      <button onClick={() => setShowCreateTeam(true)} className="btn-primary btn-block">
                        Create Team
                      </button>
                      <button onClick={() => setShowJoinTeam(true)} className="btn-secondary btn-block" style={{ marginTop: '0.5rem' }}>
                        Join with Code
                      </button>
                    </div>
                  ) : (
                    <div className="closed-status">
                      <p className="error-text">Registration closed</p>
                    </div>
                  )}
                </div>
              ) : isRegistered ? (
                <div className="registered-status">
                  <p className="success-text">✅ You are registered!</p>

                  {/* Merchandise payment status */}
                  {registration?.isMerchandise && registration?.paymentStatus !== 'completed' && (
                    <div style={{ margin: '1rem 0' }}>
                      <p><strong>Payment:</strong> <span className="status-badge">{registration.paymentStatus}</span></p>
                      {registration.paymentStatus === 'pending' && !registration.paymentProof && (
                        <button onClick={() => setShowPaymentUpload(true)} className="btn-primary btn-block" style={{ marginTop: '0.5rem' }}>
                          Upload Payment Proof
                        </button>
                      )}
                      {registration.paymentStatus === 'pending' && registration.paymentProof && (
                        <p className="info-text" style={{ fontSize: '0.85rem' }}>Payment proof submitted. Waiting for approval.</p>
                      )}
                      {registration.paymentStatus === 'failed' && (
                        <div>
                          <p className="error-text" style={{ fontSize: '0.85rem' }}>Payment rejected. Please re-upload.</p>
                          <button onClick={() => setShowPaymentUpload(true)} className="btn-primary btn-block" style={{ marginTop: '0.5rem' }}>
                            Re-upload Payment Proof
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {(!registration?.isMerchandise || registration?.paymentStatus === 'completed') && (
                    <button onClick={() => setShowTicket(true)} className="btn-primary">
                      View Ticket
                    </button>
                  )}
                </div>
              ) : registrationOpen ? (
                <div>
                  <p className="available-text">
                    {availableSlots < 10 && `⚠️ Only ${availableSlots} slots left!`}
                  </p>
                  <button
                    onClick={handleRegister}
                    className="btn-primary btn-block"
                  >
                    {event.eventType === 'merchandise' ? 'Order Now' : 'Register Now'}
                  </button>
                </div>
              ) : (
                <div className="closed-status">
                  <p className="error-text">
                    {event.status !== 'published' && '⏳ Registration not open yet'}
                    {new Date() >= new Date(event.registrationDeadline) && '⏰ Registration closed'}
                    {availableSlots <= 0 && '🚫 Event is full'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Registration Form Modal */}
        {showRegistrationForm && (
          <div className="modal-overlay" onClick={() => setShowRegistrationForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Complete Registration</h2>
              <form onSubmit={handleFormSubmit}>
                {event.customRegistrationForm.fields.map(field => (
                  <div key={field.fieldName} className="form-group">
                    <label>
                      {field.label}
                      {field.required && <span className="required">*</span>}
                    </label>
                    {field.fieldType === 'textarea' ? (
                      <textarea
                        name={field.fieldName}
                        placeholder={field.placeholder}
                        required={field.required}
                        onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
                        className="form-input textarea"
                      />
                    ) : field.fieldType === 'select' ? (
                      <select
                        name={field.fieldName}
                        required={field.required}
                        onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.fieldType}
                        name={field.fieldName}
                        placeholder={field.placeholder}
                        required={field.required}
                        onChange={(e) => handleFormChange(field.fieldName, e.target.value)}
                        className="form-input"
                      />
                    )}
                  </div>
                ))}
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Submit Registration</button>
                  <button type="button" onClick={() => setShowRegistrationForm(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Ticket Modal */}
        {showTicket && ticket && (
          <div className="modal-overlay" onClick={() => setShowTicket(false)}>
            <div className="modal-content ticket-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Your Ticket</h2>
              <div className="ticket-content">
                <div className="ticket-info">
                  <p><strong>Event:</strong> {event.name}</p>
                  <p><strong>Participant:</strong> {ticket.participantName}</p>
                  <p><strong>Ticket ID:</strong> <code>{ticket.ticketId}</code></p>
                  <p><strong>Registration Date:</strong> {new Date(ticket.registrationDate).toLocaleString()}</p>
                </div>
                <div className="ticket-qr">
                  <img src={ticket.qrCode} alt="Ticket QR Code" />
                  <p className="text-muted">Present this QR code at the event</p>
                </div>
              </div>
              <p className="info-text">
                📧 A copy has been sent to your email
              </p>
              <button onClick={() => setShowTicket(false)} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        )}

        {/* Create Team Modal */}
        {showCreateTeam && (
          <div className="modal-overlay" onClick={() => setShowCreateTeam(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Create Team</h2>
              <div className="form-group">
                <label>Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                  className="form-input"
                />
              </div>
              <div className="form-actions">
                <button onClick={handleCreateTeam} className="btn-primary" disabled={!teamName.trim()}>
                  Create Team
                </button>
                <button onClick={() => setShowCreateTeam(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Team Modal */}
        {showJoinTeam && (
          <div className="modal-overlay" onClick={() => setShowJoinTeam(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Join Team</h2>
              <div className="form-group">
                <label>Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                  className="form-input"
                />
              </div>
              <div className="form-actions">
                <button onClick={handleJoinTeam} className="btn-primary" disabled={!inviteCode.trim()}>
                  Join Team
                </button>
                <button onClick={() => setShowJoinTeam(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Merchandise Order Modal */}
        {showMerchandiseForm && (
          <div className="modal-overlay" onClick={() => setShowMerchandiseForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Select Items</h2>
              {event.merchandiseDetails?.variants?.length > 0 ? (
                event.merchandiseDetails.variants.map(variant => (
                  <div key={variant._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <strong>{variant.variant || [variant.size, variant.color].filter(Boolean).join(' / ')}</strong>
                      {variant.size && !variant.variant && <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>Size: {variant.size}</span>}
                      {variant.color && !variant.variant && <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>Color: {variant.color}</span>}
                      <span style={{ marginLeft: '0.5rem' }}>₹{variant.price}</span>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>({variant.stock} in stock)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.6rem', minWidth: '2rem' }}
                        onClick={() => setSelectedItems(prev => ({ ...prev, [variant._id]: Math.max(0, (prev[variant._id] || 0) - 1) }))}
                      >−</button>
                      <span style={{ minWidth: '1.5rem', textAlign: 'center' }}>{selectedItems[variant._id] || 0}</span>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.6rem', minWidth: '2rem' }}
                        onClick={() => setSelectedItems(prev => ({ ...prev, [variant._id]: Math.min(variant.stock, (prev[variant._id] || 0) + 1) }))}
                        disabled={variant.stock === 0}
                      >+</button>
                    </div>
                  </div>
                ))
              ) : (
                <p>No items available.</p>
              )}
              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button onClick={submitMerchandiseOrder} className="btn-primary">Place Order</button>
                <button onClick={() => setShowMerchandiseForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Proof Upload Modal */}
        {showPaymentUpload && (
          <div className="modal-overlay" onClick={() => setShowPaymentUpload(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Upload Payment Proof</h2>
              <p className="info-text" style={{ marginBottom: '1rem' }}>
                Upload a screenshot of your payment (max 5MB).
              </p>
              <div className="form-group">
                <label>Payment Screenshot</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePaymentProofChange}
                  className="form-input"
                />
              </div>
              {paymentProof && (
                <div style={{ margin: '1rem 0', textAlign: 'center' }}>
                  <img src={paymentProof} alt="Payment proof preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '6px', border: '2px solid var(--border-color)' }} />
                </div>
              )}
              <div className="form-actions">
                <button onClick={handlePaymentProofUpload} className="btn-primary" disabled={!paymentProof}>
                  Submit
                </button>
                <button onClick={() => setShowPaymentUpload(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;
