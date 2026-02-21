import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import OrganizerNavbar from '../components/OrganizerNavbar';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); 
  const [eventId, setEventId] = useState(null);
  

  const [basicInfo, setBasicInfo] = useState({
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
  const [newItem, setNewItem] = useState({
    variant: '',
    size: '',
    color: '',
    price: '',
    stock: ''
  });
  const [merchandiseSettings, setMerchandiseSettings] = useState({
    purchaseLimitPerParticipant: 1,
    returnPolicy: '',
    shippingInfo: ''
  });


  const [teamSettings, setTeamSettings] = useState({
    minSize: 2,
    maxSize: 4
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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


  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');
    

    if (!basicInfo.name || !basicInfo.eventType) {
      setError('Event name and type are required');
      return;
    }
    
    setStep(2);
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


  const handleCreateDraftAndContinue = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      if (eventId) {

        setStep(3);
        setLoading(false);
        return;
      } else {

        const eventData = {
          name: basicInfo.name,
          eventType: basicInfo.eventType,
          description: basicInfo.description,
          eligibility: basicInfo.eligibility,
          startDate: basicInfo.startDate,
          endDate: basicInfo.endDate,
          registrationDeadline: basicInfo.registrationDeadline,
          registrationLimit: basicInfo.registrationLimit || undefined,
          location: basicInfo.location,
          entryFee: basicInfo.entryFee,
          tags: basicInfo.tags
        };

        if (basicInfo.eventType === 'normal') {
          eventData.customRegistrationForm = {
            enabled: formFields.length > 0,
            fields: formFields.map(f => ({ fieldName: f.fieldName, label: f.fieldName, fieldType: f.fieldType, required: f.isRequired, options: f.options }))
          };
        } else if (basicInfo.eventType === 'merchandise') {
          eventData.merchandiseDetails = {
            variants: merchandiseItems,
            purchaseLimitPerParticipant: merchandiseSettings.purchaseLimitPerParticipant,
            returnPolicy: merchandiseSettings.returnPolicy,
            shippingInfo: merchandiseSettings.shippingInfo
          };
        } else if (basicInfo.eventType === 'hackathon') {
          eventData.teamSettings = teamSettings;
        }


        const response = await axios.post(
          `\${import.meta.env.VITE_API_URL}/api/events/create-draft`,
          eventData,
          { headers: { Authorization: token } }
        );
        setEventId(response.data.event._id);
      }

      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };


  const handlePublish = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/events/${eventId}/status`,
        { status: 'published' },
        {
          headers: { Authorization: token }
        }
      );

      navigate('/organizer-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish event');
    } finally {
      setLoading(false);
    }
  };


  const handleSaveDraft = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      

      if (eventId) {
        navigate('/organizer-dashboard');
        return;
      }


      const eventData = {
        name: basicInfo.name,
        eventType: basicInfo.eventType,
        description: basicInfo.description,
        eligibility: basicInfo.eligibility,
        startDate: basicInfo.startDate,
        endDate: basicInfo.endDate,
        registrationDeadline: basicInfo.registrationDeadline,
        registrationLimit: basicInfo.registrationLimit || undefined,
        location: basicInfo.location,
        entryFee: basicInfo.entryFee,
        tags: basicInfo.tags
      };


      if (step === 2) {
        if (basicInfo.eventType === 'normal') {
          eventData.customRegistrationForm = {
            enabled: formFields.length > 0,
            fields: formFields.map(f => ({ fieldName: f.fieldName, label: f.fieldName, fieldType: f.fieldType, required: f.isRequired, options: f.options }))
          };
        } else if (basicInfo.eventType === 'merchandise') {
          eventData.merchandiseDetails = {
            variants: merchandiseItems,
            purchaseLimitPerParticipant: merchandiseSettings.purchaseLimitPerParticipant,
            returnPolicy: merchandiseSettings.returnPolicy,
            shippingInfo: merchandiseSettings.shippingInfo
          };
        } else if (basicInfo.eventType === 'hackathon') {
          eventData.teamSettings = teamSettings;
        }
      }

      await axios.post(
        `\${import.meta.env.VITE_API_URL}/api/events/create-draft`,
        eventData,
        {
          headers: { Authorization: token }
        }
      );

      navigate('/organizer-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save draft');
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <OrganizerNavbar />
      <div className="page-content">
        <div className="create-event-header">
          <h1>Create New Event</h1>
          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Basic Info</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              2. {basicInfo.eventType === 'merchandise' ? 'Merchandise Items' : basicInfo.eventType === 'hackathon' ? 'Team Settings' : 'Form Builder'}
            </div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Review & Publish</div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="event-form">
            <h2>Event Details</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label>Event Name</label>
                <input
                  type="text"
                  value={basicInfo.name}
                  onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                  placeholder="Enter event name"
                />
              </div>

              <div className="form-group">
                <label>Event Type</label>
                <select
                  value={basicInfo.eventType}
                  onChange={(e) => setBasicInfo({ ...basicInfo, eventType: e.target.value })}
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
                      checked={basicInfo.tags.includes(tag)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBasicInfo({ ...basicInfo, tags: [...basicInfo.tags, tag] });
                        } else {
                          setBasicInfo({ ...basicInfo, tags: basicInfo.tags.filter(t => t !== tag) });
                        }
                      }}
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={basicInfo.description}
                onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                rows="4"
                placeholder="Describe your event"
              />
            </div>

            <div className="form-group">
              <label>Eligibility Criteria</label>
              <input
                type="text"
                value={basicInfo.eligibility}
                onChange={(e) => setBasicInfo({ ...basicInfo, eligibility: e.target.value })}
                placeholder="e.g., Open to all, Undergraduates only, etc."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={basicInfo.startDate}
                  onChange={(e) => setBasicInfo({ ...basicInfo, startDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>End Date & Time</label>
                <input
                  type="datetime-local"
                  value={basicInfo.endDate}
                  onChange={(e) => setBasicInfo({ ...basicInfo, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Registration Deadline</label>
                <input
                  type="datetime-local"
                  value={basicInfo.registrationDeadline}
                  onChange={(e) => setBasicInfo({ ...basicInfo, registrationDeadline: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Registration Limit (Optional)</label>
                <input
                  type="number"
                  value={basicInfo.registrationLimit}
                  onChange={(e) => setBasicInfo({ ...basicInfo, registrationLimit: e.target.value })}
                  min="1"
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={basicInfo.location}
                  onChange={(e) => setBasicInfo({ ...basicInfo, location: e.target.value })}
                  placeholder="e.g., Main Auditorium, Online"
                />
              </div>

              <div className="form-group">
                <label>Entry Fee (₹)</label>
                <input
                  type="number"
                  value={basicInfo.entryFee}
                  onChange={(e) => setBasicInfo({ ...basicInfo, entryFee: e.target.value })}
                  min="0"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => navigate('/organizer-dashboard')} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleSaveDraft} className="btn-secondary" disabled={loading}>
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button type="submit" className="btn-primary">
                {basicInfo.eventType === 'merchandise' ? 'Next: Add Merchandise Items' : basicInfo.eventType === 'hackathon' ? 'Next: Team Settings' : 'Next: Build Registration Form'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Form Builder or Merchandise Manager */}
        {step === 2 && basicInfo.eventType === 'normal' && (
          <div className="form-builder">
            <h2>Custom Registration Form Builder</h2>
            <p className="info-text">
              Add custom fields to collect additional information from participants. 
              Default fields (Name, Email, Phone) are automatically included.
            </p>

            {/* Current Form Fields */}
            <div className="current-fields">
              <h3>Form Fields Preview</h3>
              {formFields.length === 0 ? (
                <p className="no-fields">No custom fields added yet. Add fields below.</p>
              ) : (
                <div className="fields-list">
                  {formFields.map((field, index) => (
                    <div key={index} className="field-item">
                      <div className="field-info">
                        <strong>{field.fieldName}</strong>
                        <span className="field-type">{fieldTypes.find(t => t.value === field.fieldType)?.label}</span>
                        {field.isRequired && <span className="required-badge">Required</span>}
                        {field.options?.length > 0 && (
                          <span className="options-preview">
                            Options: {field.options.join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="field-actions">
                        <button onClick={() => handleMoveField(index, 'up')} disabled={index === 0}>↑</button>
                        <button onClick={() => handleMoveField(index, 'down')} disabled={index === formFields.length - 1}>↓</button>
                        <button onClick={() => handleRemoveField(index)} className="btn-danger-small">×</button>
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
                    placeholder="e.g., T-Shirt Size, Dietary Restrictions"
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

              {/* Options for select/radio/checkbox */}
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
                    <button type="button" onClick={handleAddOption} className="btn-secondary-small">
                      Add Option
                    </button>
                  </div>
                  <div className="options-list">
                    {newField.options.map((option, idx) => (
                      <span key={idx} className="option-tag">
                        {option}
                        <button onClick={() => handleRemoveOption(idx)}>×</button>
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
              <button onClick={() => setStep(1)} className="btn-secondary">
                Back
              </button>
              <button onClick={handleCreateDraftAndContinue} className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Next: Review & Publish'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Merchandise Items Manager */}
        {step === 2 && basicInfo.eventType === 'merchandise' && (
          <div className="form-builder merchandise-manager">
            <h2>Merchandise Items</h2>
            <p className="info-text">
              Add merchandise variants with details like size, color, price, and stock quantity.
            </p>

            {/* Current Merchandise Items */}
            <div className="current-fields">
              <h3>Items List</h3>
              {merchandiseItems.length === 0 ? (
                <p className="no-fields">No merchandise items added yet. Add items below.</p>
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
                        <button onClick={() => handleRemoveItem(index)} className="btn-danger-small">×</button>
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

              <button type="button" onClick={handleAddItem} className="btn-primary">
                Add Item
              </button>
            </div>

            {/* Merchandise Settings */}
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
                  placeholder="e.g., Free shipping on orders above ₹500. Delivery in 5-7 business days."
                  rows="3"
                />
              </div>
            </div>

            <div className="form-actions">
              <button onClick={() => setStep(1)} className="btn-secondary">
                Back
              </button>
              <button onClick={handleCreateDraftAndContinue} className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Next: Review & Publish'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Hackathon Team Settings */}
        {step === 2 && basicInfo.eventType === 'hackathon' && (
          <div className="form-builder">
            <h2>Team Settings</h2>
            <p className="info-text">
              Configure team size requirements for this hackathon. Participants will create teams and share invite codes.
            </p>

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
                <li>The leader can mark the team as complete once minimum size ({teamSettings.minSize}) is reached</li>
                <li>The team auto-completes when it reaches maximum size ({teamSettings.maxSize})</li>
                <li>Tickets are generated for all members when the team is complete</li>
              </ul>
            </div>

            <div className="form-actions">
              <button onClick={() => setStep(1)} className="btn-secondary">
                Back
              </button>
              <button onClick={handleCreateDraftAndContinue} className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Next: Review & Publish'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Publish */}
        {step === 3 && (
          <div className="review-section">
            <h2>Review Event Details</h2>

            <div className="review-card">
              <h3>Basic Information</h3>
              <div className="review-grid">
                <div><strong>Name:</strong> {basicInfo.name}</div>
                <div><strong>Type:</strong> {basicInfo.eventType ? basicInfo.eventType.charAt(0).toUpperCase() + basicInfo.eventType.slice(1) : 'Not specified'}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Tags:</strong> {basicInfo.tags.length > 0 ? basicInfo.tags.join(', ') : 'None selected'}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Description:</strong> {basicInfo.description}</div>
                <div><strong>Eligibility:</strong> {basicInfo.eligibility || 'Not specified'}</div>
                <div><strong>Start:</strong> {basicInfo.startDate ? new Date(basicInfo.startDate).toLocaleString() : 'Not set'}</div>
                <div><strong>End:</strong> {basicInfo.endDate ? new Date(basicInfo.endDate).toLocaleString() : 'Not set'}</div>
                <div><strong>Registration Deadline:</strong> {basicInfo.registrationDeadline ? new Date(basicInfo.registrationDeadline).toLocaleString() : 'Not set'}</div>
                <div><strong>Limit:</strong> {basicInfo.registrationLimit || 'Unlimited'}</div>
                <div><strong>Location:</strong> {basicInfo.location}</div>
                <div><strong>Entry Fee:</strong> ₹{basicInfo.entryFee}</div>
              </div>
            </div>

            {/* For Normal Events: Show Form Fields */}
            {basicInfo.eventType === 'normal' && (
              <div className="review-card">
                <h3>Registration Form Fields</h3>
                <div className="default-fields">
                  <p><strong>Default Fields (always included):</strong></p>
                  <ul>
                    <li>Name (Required)</li>
                    <li>Email (Required)</li>
                    <li>Phone Number (Required)</li>
                  </ul>
                </div>
                {formFields.length > 0 && (
                  <div className="custom-fields-review">
                    <p><strong>Custom Fields:</strong></p>
                    <ol>
                      {formFields.map((field, idx) => (
                        <li key={idx}>
                          {field.fieldName} ({fieldTypes.find(t => t.value === field.fieldType)?.label})
                          {field.isRequired && ' - Required'}
                          {field.options?.length > 0 && ` [${field.options.join(', ')}]`}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* For Merchandise Events: Show Items */}
            {basicInfo.eventType === 'merchandise' && (
              <div className="review-card">
                <h3>Merchandise Items</h3>
                {merchandiseItems.length === 0 ? (
                  <p className="no-fields">No merchandise items added</p>
                ) : (
                  <div className="review-grid">
                    <table className="organizers-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Size</th>
                          <th>Color</th>
                          <th>Price</th>
                          <th>Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {merchandiseItems.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.variant}</td>
                            <td>{item.size || '-'}</td>
                            <td>{item.color || '-'}</td>
                            <td>₹{item.price}</td>
                            <td>{item.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="review-grid">
                      <p><strong>Purchase Limit:</strong> {merchandiseSettings.purchaseLimitPerParticipant} items per participant</p>
                      {merchandiseSettings.returnPolicy && (
                        <p><strong>Return Policy:</strong> {merchandiseSettings.returnPolicy}</p>
                      )}
                      {merchandiseSettings.shippingInfo && (
                        <p><strong>Shipping:</strong> {merchandiseSettings.shippingInfo}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="publish-notice">
              <h4>⚠️ Before Publishing:</h4>
              <ul>
                <li><strong>All fields must be completed:</strong> Event name, type, at least one tag, description, dates, location, and registration limit are required to publish</li>
                <li>Once published, the registration form cannot be modified if participants have registered</li>
                <li>You can still edit event description, deadline, and registration limit after publishing</li>
                <li>The event will become visible to participants immediately after publishing</li>
              </ul>
            </div>

            <div className="form-actions">
              <button onClick={() => setStep(2)} className="btn-secondary">
                Back
              </button>
              <button onClick={handlePublish} className="btn-primary" disabled={loading}>
                {loading ? 'Publishing...' : 'Publish Event'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateEvent;
