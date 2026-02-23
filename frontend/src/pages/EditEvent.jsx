import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import OrganizerNavbar from '../components/OrganizerNavbar';

// Format a date to local datetime string for datetime-local inputs (avoids UTC shift)
const toLocalDatetimeString = (dateStr) => {
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EditEvent = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [event, setEvent] = useState(null);
  const [editableFields, setEditableFields] = useState('all');
  const [canEditForm, setCanEditForm] = useState(true);


  const [formData, setFormData] = useState({
    name: '',
    eventType: 'normal',
    description: '',
    eligibility: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    registrationLimit: '',
    location: '',
    entryFee: 0,
    tags: []
  });


  const [formFields, setFormFields] = useState([]);
  const [newField, setNewField] = useState({
    fieldName: '',
    fieldType: 'text',
    isRequired: false,
    options: []
  });
  const [optionInput, setOptionInput] = useState('');


  const [merchandiseItems, setMerchandiseItems] = useState([]);
  const [newItem, setNewItem] = useState({ variant: '', size: '', color: '', price: '', stock: '' });
  const [merchandiseSettings, setMerchandiseSettings] = useState({
    purchaseLimitPerParticipant: 1,
    returnPolicy: '',
    shippingInfo: ''
  });


  const [teamSettings, setTeamSettings] = useState({ minSize: 2, maxSize: 4 });

  const eventTypes = ['normal', 'merchandise', 'hackathon'];
  const availableTags = [
    'Technical', 'Sports', 'Cultural', 'Arts', 
    'Music', 'Dance', 'Drama', 'Photography',
    'Gaming', 'Coding', 'AI/ML', 'Cybersecurity',
    'Web Development', 'Mobile Development',
    'Business', 'Entrepreneurship', 'Social',
    'Environment', 'Health', 'Fitness', 
    'Literature', 'Debate', 'Quizzing'
  ];
  const fieldTypes = [
    { value: 'text', label: 'Text (Short Answer)' },
    { value: 'textarea', label: 'Text Area (Long Answer)' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown (Single Select)' },
    { value: 'checkbox', label: 'Checkboxes (Multiple)' },
    { value: 'radio', label: 'Radio Buttons (Single)' }
  ];

  useEffect(() => {
    fetchEventDetails();
  }, []);

  const fetchEventDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/${eventId}`, {
        headers: { Authorization: token, 'Cache-Control': 'no-cache' }
      });

      const eventData = response.data;
      setEvent(eventData);


      setFormData({
        name: eventData.name,
        eventType: eventData.eventType,
        description: eventData.description,
        eligibility: eventData.eligibility || '',
        startDate: eventData.startDate ? toLocalDatetimeString(eventData.startDate) : '',
        endDate: eventData.endDate ? toLocalDatetimeString(eventData.endDate) : '',
        registrationDeadline: eventData.registrationDeadline ? toLocalDatetimeString(eventData.registrationDeadline) : '',
        registrationLimit: eventData.registrationLimit || '',
        location: eventData.location,
        entryFee: eventData.entryFee,
        tags: eventData.tags || []
      });


      setFormFields(eventData.customRegistrationForm?.fields || []);


      if (eventData.merchandiseDetails) {
        setMerchandiseItems(eventData.merchandiseDetails.variants || []);
        setMerchandiseSettings({
          purchaseLimitPerParticipant: eventData.merchandiseDetails.purchaseLimitPerParticipant || 1,
          returnPolicy: eventData.merchandiseDetails.returnPolicy || '',
          shippingInfo: eventData.merchandiseDetails.shippingInfo || ''
        });
      }


      if (eventData.teamSettings) {
        setTeamSettings({
          minSize: eventData.teamSettings.minSize || 2,
          maxSize: eventData.teamSettings.maxSize || 4
        });
      }


      const regCount = eventData.registrations?.length ?? eventData.currentRegistrations ?? 0;
      if (eventData.status === 'draft') {
        setEditableFields('all');
      } else if (eventData.status === 'published') {
        setEditableFields(['description', 'registrationDeadline', 'registrationLimit']);
      } else {
        setEditableFields([]);
      }

      const canEdit = eventData.status === 'draft' || regCount === 0;
      setCanEditForm(canEdit);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch event details');
    }
  };

  const isFieldEditable = (fieldName) => {
    if (editableFields === 'all') return true;
    if (Array.isArray(editableFields)) {
      return editableFields.includes(fieldName);
    }
    return false;
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      

      const updatePayload = {};
      Object.keys(formData).forEach(key => {
        if (isFieldEditable(key)) {
          updatePayload[key] = formData[key];
        }
      });

      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/events/${eventId}`,
        updatePayload,
        {
          headers: { Authorization: token }
        }
      );

      navigate(`/organizer/event/${eventId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  };


  const handleAddField = () => {
    if (!newField.fieldName.trim()) {
      setError('Field name is required');
      return;
    }

    if (['select', 'radio', 'checkbox'].includes(newField.fieldType) && newField.options.length === 0) {
      setError('Please add at least one option for this field type');
      return;
    }

    setFormFields([...formFields, { ...newField }]);
    setNewField({
      fieldName: '',
      fieldType: 'text',
      isRequired: false,
      options: []
    });
    setOptionInput('');
    setError('');
  };

  const handleAddOption = () => {
    if (!optionInput.trim()) return;
    setNewField({
      ...newField,
      options: [...newField.options, optionInput.trim()]
    });
    setOptionInput('');
  };

  const handleRemoveOption = (index) => {
    setNewField({
      ...newField,
      options: newField.options.filter((_, i) => i !== index)
    });
  };

  const handleRemoveField = (index) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const handleMoveField = (index, direction) => {
    const newFields = [...formFields];
    if (direction === 'up' && index > 0) {
      [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    } else if (direction === 'down' && index < formFields.length - 1) {
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    }
    setFormFields(newFields);
  };


  const handleAddItem = () => {
    if (!newItem.variant.trim() || !newItem.price || !newItem.stock) {
      setError('Variant name, price, and stock are required');
      return;
    }
    setMerchandiseItems([...merchandiseItems, { ...newItem }]);
    setNewItem({ variant: '', size: '', color: '', price: '', stock: '' });
    setError('');
  };

  const handleRemoveItem = (index) => {
    setMerchandiseItems(merchandiseItems.filter((_, i) => i !== index));
  };

  const handleUpdateMerchandise = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/events/${eventId}`,
        {
          merchandiseDetails: {
            variants: merchandiseItems,
            purchaseLimitPerParticipant: merchandiseSettings.purchaseLimitPerParticipant,
            returnPolicy: merchandiseSettings.returnPolicy,
            shippingInfo: merchandiseSettings.shippingInfo
          }
        },
        { headers: { Authorization: token } }
      );
      navigate(`/organizer/event/${eventId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update merchandise');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeamSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/events/${eventId}`,
        { teamSettings },
        { headers: { Authorization: token } }
      );
      navigate(`/organizer/event/${eventId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update team settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateForm = async () => {
    if (!canEditForm) {
      setError('Cannot edit form after participants have registered');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/events/${eventId}/form`,
        { customRegistrationForm: { enabled: formFields.length > 0, fields: formFields } },
        {
          headers: { Authorization: token }
        }
      );

      navigate(`/organizer/event/${eventId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update registration form');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRegistration = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/events/${eventId}`,
        { registrationDeadline: new Date().toISOString() },
        { headers: { Authorization: token } }
      );
      fetchEventDetails();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to close registration');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');


      const updatePayload = {};
      Object.keys(formData).forEach(key => {
        const val = formData[key];
        if (val !== '' && val !== null && val !== undefined) {
          updatePayload[key] = val;
        }
      });
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/events/${eventId}`,
        updatePayload,
        { headers: { Authorization: token } }
      );

      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/events/${eventId}/status`,
        { status: 'published' },
        {
          headers: { Authorization: token }
        }
      );

      navigate(`/organizer/event/${eventId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish event');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsOngoing = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/events/${eventId}/status`,
        { status: 'ongoing' },
        {
          headers: { Authorization: token }
        }
      );

      navigate(`/organizer/event/${eventId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark event as ongoing');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsCompleted = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/events/${eventId}/status`,
        { status: 'completed' },
        {
          headers: { Authorization: token }
        }
      );

      navigate(`/organizer/event/${eventId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark event as completed');
    } finally {
      setLoading(false);
    }
  };

  if (!event) {
    return (
      <div className="page-wrapper">
        <OrganizerNavbar />
        <div className="page-content">
          <div className="loading">Loading event details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <OrganizerNavbar />
      <div className="page-content">
        <div className="create-event-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate(`/organizer/event/${eventId}`)} className="btn-back">← Back</button>
            <h1>Edit Event: {event.name}</h1>
          </div>
          <div className="status-info">
            <span className={`status-badge ${event.status}`}>{event.status}</span>
            {event.status === 'published' && (
              <span className="warning-badge">
                Published – Limited editing allowed
              </span>
            )}
            {event.status === 'ongoing' && (
              <span className="info-badge">
                Event in progress - Only status editable
              </span>
            )}
            {event.status === 'completed' && (
              <span className="info-badge">
                Event completed - No edits allowed
              </span>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Event Details Form */}
        <form onSubmit={handleUpdateEvent} className="event-form">
          <h2>Event Details</h2>
          
          {event.status === 'draft' && (
            <div className="info-text" style={{ background: '#4a9eff22', borderColor: '#4a9eff' }}>
              <strong>Draft Mode:</strong> All fields are editable. Fill in required fields to publish this event.
            </div>
          )}
          {event.status === 'published' && (
            <div className="info-text" style={{ background: '#f59e0b22', borderColor: '#f59e0b' }}>
              <strong>Published – Limited Edit Mode:</strong> Only description, registration deadline (extend only), and registration limit (increase only) can be edited. Use "Close Registration" to end registrations early.
            </div>
          )}
          {event.status === 'ongoing' && (
            <div className="info-text" style={{ background: '#a855f722', borderColor: '#a855f7' }}>
              <strong>Event Ongoing:</strong> Event details are locked. You can only mark it as completed once it ends.
            </div>
          )}
          {event.status === 'completed' && (
            <div className="info-text" style={{ background: '#88888822', borderColor: '#888888' }}>
              <strong>Event Completed:</strong> No edits allowed. Event is archived.
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Event Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isFieldEditable('name')}
              />
            </div>

            <div className="form-group">
              <label>Event Type</label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                disabled={!isFieldEditable('eventType')}
              >
                <option value="">Select event type</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Event Categories/Tags (Select multiple for preference matching)</label>
            <div className="tags-selector">
              {availableTags.map(tag => (
                <label key={tag} className="tag-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.tags.includes(tag)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, tags: [...formData.tags, tag] });
                      } else {
                        setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
                      }
                    }}
                    disabled={!isFieldEditable('tags')}
                  />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="4"
              disabled={!isFieldEditable('description')}
            />
          </div>

          <div className="form-group">
            <label>Eligibility Criteria</label>
            <input
              type="text"
              value={formData.eligibility}
              onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
              disabled={!isFieldEditable('eligibility')}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date & Time</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                disabled={!isFieldEditable('startDate')}
              />
            </div>

            <div className="form-group">
              <label>End Date & Time</label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={!isFieldEditable('endDate')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Registration Deadline</label>
              <input
                type="datetime-local"
                value={formData.registrationDeadline}
                onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                disabled={!isFieldEditable('registrationDeadline')}
              />
            </div>

            <div className="form-group">
              <label>Registration Limit (Optional)</label>
              <input
                type="number"
                value={formData.registrationLimit}
                onChange={(e) => setFormData({ ...formData, registrationLimit: e.target.value })}
                min="1"
                disabled={!isFieldEditable('registrationLimit')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={!isFieldEditable('location')}
              />
            </div>

            <div className="form-group">
              <label>Entry Fee (₹)</label>
              <input
                type="number"
                value={formData.entryFee}
                onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                min="0"
                disabled={!isFieldEditable('entryFee')}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(`/organizer/event/${eventId}`)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Event Details'}
            </button>
          </div>
        </form>

        {/* Custom Registration Form - only for normal events */}
        {event.eventType === 'normal' && (
          <div className="form-builder" style={{ marginTop: '2rem' }}>
            <h2>Custom Registration Form</h2>

            {!canEditForm ? (
              <div className="error-message">
                <strong>Form Locked:</strong> Cannot edit registration form because participants have already registered. The form is locked once the first participant registers.
              </div>
            ) : (
              <>
                <p className="info-text">
                  {event.status === 'draft'
                    ? '✓ Form is editable (draft mode). Fill in custom fields and click "Update Registration Form" to save.'
                    : '✓ Add custom fields to collect additional information from participants. The form will be locked once the first participant registers.'}
                </p>

                {/* Current Form Fields */}
                <div className="current-fields">
                  <h3>Form Fields Preview</h3>
                  {formFields.length === 0 ? (
                    <p className="no-fields">No custom fields added yet.</p>
                  ) : (
                    <div className="fields-list">
                      {formFields.map((field, index) => (
                        <div key={index} className="field-item">
                          <div className="field-info">
                            <strong>{field.fieldName}</strong>
                            <span className="field-type">{fieldTypes.find(t => t.value === field.fieldType)?.label}</span>
                            {field.isRequired && <span className="required-badge">Required</span>}
                            {field.options?.length > 0 && (
                              <span className="options-preview">Options: {field.options.join(', ')}</span>
                            )}
                          </div>
                          <div className="field-actions">
                            <button type="button" onClick={() => handleMoveField(index, 'up')} disabled={index === 0}>↑</button>
                            <button type="button" onClick={() => handleMoveField(index, 'down')} disabled={index === formFields.length - 1}>↓</button>
                            <button type="button" onClick={() => handleRemoveField(index)} className="btn-danger-small">×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Field */}
                <div className="add-field-section">
                  <h3>Add New Field</h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Field Label *</label>
                      <input
                        type="text"
                        value={newField.fieldName}
                        onChange={(e) => setNewField({ ...newField, fieldName: e.target.value })}
                        placeholder="e.g., T-Shirt Size"
                      />
                    </div>
                    <div className="form-group">
                      <label>Field Type *</label>
                      <select
                        value={newField.fieldType}
                        onChange={(e) => setNewField({ ...newField, fieldType: e.target.value, options: [] })}
                      >
                        {fieldTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {['select', 'radio', 'checkbox'].includes(newField.fieldType) && (
                    <div className="options-builder">
                      <label>Options *</label>
                      <div className="options-input">
                        <input
                          type="text"
                          value={optionInput}
                          onChange={(e) => setOptionInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                          placeholder="Type an option and press Enter"
                        />
                        <button type="button" onClick={handleAddOption} className="btn-secondary-small">Add Option</button>
                      </div>
                      <div className="options-list">
                        {newField.options.map((option, idx) => (
                          <span key={idx} className="option-tag">
                            {option}
                            <button type="button" onClick={() => handleRemoveOption(idx)}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={newField.isRequired}
                        onChange={(e) => setNewField({ ...newField, isRequired: e.target.checked })}
                      />
                      Make this field required
                    </label>
                  </div>

                  <button type="button" onClick={handleAddField} className="btn-primary">
                    Add Field to Form
                  </button>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={handleUpdateForm} className="btn-primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Registration Form'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Merchandise Editor - for merchandise events when editable */}
        {event.eventType === 'merchandise' && (
          <div className="form-builder" style={{ marginTop: '2rem' }}>
            <h2>Merchandise Items</h2>

            {!canEditForm ? (
              <div className="error-message">
                <strong>Merchandise Locked:</strong> Cannot edit merchandise items because orders have already been placed.
              </div>
            ) : (
              <>
                <p className="info-text">
                  {event.status === 'draft'
                    ? '✓ Merchandise items are editable (draft mode).'
                    : '✓ Merchandise items are editable (no orders yet).'}
                </p>

                {/* Current Items */}
                <div className="current-fields">
                  <h3>Current Items</h3>
                  {merchandiseItems.length === 0 ? (
                    <p className="no-fields">No items added yet.</p>
                  ) : (
                    <div className="fields-list">
                      {merchandiseItems.map((item, index) => (
                        <div key={index} className="field-item merchandise-item">
                          <div className="field-info">
                            <strong>{item.variant}</strong>
                            {item.size && <span className="item-detail">Size: {item.size}</span>}
                            {item.color && <span className="item-detail">Color: {item.color}</span>}
                            <span className="item-detail">Price: ₹{item.price}</span>
                            <span className="item-detail">Stock: {item.stock}</span>
                          </div>
                          <div className="field-actions">
                            <button type="button" onClick={() => handleRemoveItem(index)} className="btn-danger-small">×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Item */}
                <div className="add-field-section">
                  <h3>Add Merchandise Item</h3>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Item Name/Variant *</label>
                      <input
                        type="text"
                        value={newItem.variant}
                        onChange={(e) => setNewItem({ ...newItem, variant: e.target.value })}
                        placeholder="e.g., T-Shirt, Hoodie, Notebook"
                      />
                    </div>
                    <div className="form-group">
                      <label>Size</label>
                      <input
                        type="text"
                        value={newItem.size}
                        onChange={(e) => setNewItem({ ...newItem, size: e.target.value })}
                        placeholder="e.g., S, M, L, XL"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Color</label>
                    <input
                      type="text"
                      value={newItem.color}
                      onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                      placeholder="e.g., Red, Blue, Black"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Price (₹) *</label>
                      <input
                        type="number"
                        value={newItem.price}
                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                        min="0"
                        placeholder="299"
                      />
                    </div>
                    <div className="form-group">
                      <label>Stock Quantity *</label>
                      <input
                        type="number"
                        value={newItem.stock}
                        onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })}
                        min="0"
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <button type="button" onClick={handleAddItem} className="btn-primary">Add Item</button>
                </div>

                {/* Purchase Settings */}
                <div className="add-field-section">
                  <h3>Purchase Settings</h3>
                  <div className="form-group">
                    <label>Purchase Limit Per Participant</label>
                    <input
                      type="number"
                      value={merchandiseSettings.purchaseLimitPerParticipant}
                      onChange={(e) => setMerchandiseSettings({ ...merchandiseSettings, purchaseLimitPerParticipant: e.target.value })}
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Return Policy</label>
                    <textarea
                      value={merchandiseSettings.returnPolicy}
                      onChange={(e) => setMerchandiseSettings({ ...merchandiseSettings, returnPolicy: e.target.value })}
                      placeholder="e.g., Returns accepted within 7 days with receipt"
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>Shipping Information</label>
                    <textarea
                      value={merchandiseSettings.shippingInfo}
                      onChange={(e) => setMerchandiseSettings({ ...merchandiseSettings, shippingInfo: e.target.value })}
                      placeholder="e.g., Free shipping on orders above ₹500."
                      rows="3"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={handleUpdateMerchandise} className="btn-primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Merchandise'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Team Settings Editor - for hackathon events in draft mode */}
        {event.eventType === 'hackathon' && event.status === 'draft' && (
          <div className="form-builder" style={{ marginTop: '2rem' }}>
            <h2>Team Settings</h2>
            <p className="info-text">Configure team size requirements for this hackathon.</p>

            <div className="form-row">
              <div className="form-group">
                <label>Minimum Team Size</label>
                <input
                  type="number"
                  value={teamSettings.minSize}
                  onChange={(e) => setTeamSettings({ ...teamSettings, minSize: parseInt(e.target.value) || 2 })}
                  min="2"
                  max={teamSettings.maxSize}
                />
              </div>
              <div className="form-group">
                <label>Maximum Team Size</label>
                <input
                  type="number"
                  value={teamSettings.maxSize}
                  onChange={(e) => setTeamSettings({ ...teamSettings, maxSize: parseInt(e.target.value) || 4 })}
                  min={teamSettings.minSize}
                  max="10"
                />
              </div>
            </div>

            <div className="review-card" style={{ marginTop: '1rem' }}>
              <h3>How it works</h3>
              <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                <li>A participant creates a team and gets an invite code</li>
                <li>Team members join using the invite code</li>
                <li>Min size: {teamSettings.minSize} — Max size: {teamSettings.maxSize}</li>
              </ul>
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleUpdateTeamSettings} className="btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Team Settings'}
              </button>
            </div>
          </div>
        )}

        {/* Status Transition Buttons */}
        {event.status === 'draft' && (
          <div className="publish-section" style={{ marginTop: '2rem' }}>
            <div className="publish-notice">
              <h4>⚠️ Ready to Publish?</h4>
              <ul>
                <li><strong>All fields must be completed:</strong> Event name, type, at least one tag, description, dates, location, and registration limit are required to publish</li>
                <li>Once published, the event will be visible to participants and registrations can begin</li>
                <li>You can fully edit the event until the first participant registers</li>
                <li>Registration form will be locked after the first participant registers</li>
              </ul>
            </div>
            <button onClick={handlePublish} className="btn-primary" disabled={loading}>
              {loading ? 'Publishing...' : 'Publish Event'}
            </button>
          </div>
        )}

        {event.status === 'published' && (
          <div className="publish-section" style={{ marginTop: '2rem' }}>
            <div className="publish-notice" style={{ background: '#4ade8022', borderColor: '#4ade80' }}>
              <h4>📢 Event Published</h4>
              <ul>
                <li>Event is now visible to participants</li>
                <li>Registrations are open until the deadline</li>
                <li>{event.registrations?.length === 0 
                    ? 'You can fully edit all fields until the first registration' 
                    : `You can edit description and deadline only (${event.registrations.length} registrations received)`}
                </li>
                <li>Event will automatically transition to "Ongoing" when it starts</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={handleMarkAsOngoing} className="btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Mark as Ongoing (Manual)'}
              </button>
              {event.registrations?.length > 0 && (
                <button
                  onClick={handleCloseRegistration}
                  className="btn-secondary"
                  disabled={loading}
                  style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                >
                  {loading ? 'Closing...' : 'Close Registration Now'}
                </button>
              )}
            </div>
          </div>
        )}

        {event.status === 'ongoing' && (
          <div className="publish-section" style={{ marginTop: '2rem' }}>
            <div className="publish-notice" style={{ background: '#f59e0b22', borderColor: '#f59e0b' }}>
              <h4>⏳ Event Ongoing</h4>
              <ul>
                <li>Event is currently in progress</li>
                <li>Registrations are closed</li>
                <li>Event details are locked</li>
                <li>Mark as completed once the event ends</li>
              </ul>
            </div>
            <button onClick={handleMarkAsCompleted} className="btn-primary" disabled={loading}>
              {loading ? 'Completing...' : 'Mark as Completed'}
            </button>
          </div>
        )}

        {event.status === 'completed' && (
          <div className="publish-section" style={{ marginTop: '2rem' }}>
            <div className="publish-notice" style={{ background: '#a855f722', borderColor: '#a855f7' }}>
              <h4>✅ Event Completed</h4>
              <ul>
                <li>Event has been completed and archived</li>
                <li>Event details and analytics are read-only</li>
                <li>Participant data and registration information are preserved</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditEvent;
