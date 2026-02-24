import { useState} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    contactNumber: '',
    collegeName: '',
    type:'IIIT'
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOTP = async () => {
    if (!formData.email) {
      alert("Please enter your email first.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/send-otp`, { email: formData.email });
      setOtpSent(true);
      alert('OTP sent to your email!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      alert("Please enter the OTP.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/verify-otp`, { email: formData.email, otp });
      setOtpVerified(true);
      alert('Email verified successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisteration = async (e) => {
    e.preventDefault();
    if (!otpVerified) {
      alert("Please verify your email with OTP before registering.");
      return;
    }
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, formData);
      

      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        

        alert('Registration Successful!');
        navigate('/onboarding/preferences');
      } else {

        alert('Registration Successful! Please Login!');
        navigate('/login');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Registration Failed');
    }
  };

  return (
    <div className="auth-container">
      <h2>Registration</h2>
      <form onSubmit={handleRegisteration}>
        <div className="form-group"><input name='firstName' placeholder="First Name" onChange={handleChange} required className="form-input" disabled={otpVerified} /></div>
        <div className="form-group"><input name='lastName' placeholder="Last Name" onChange={handleChange} required className="form-input" disabled={otpVerified} /></div>
        <div className="form-group"><input name='email' placeholder="Email" onChange={handleChange} required className="form-input" disabled={otpVerified} /></div>
        
        {!otpVerified && (
          <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
            {!otpSent ? (
              <button type="button" onClick={handleSendOTP} className="btn btn-secondary" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Sending...' : 'Verify Email'}
              </button>
            ) : (
              <>
                <input placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required className="form-input" style={{ flex: 1 }} />
                <button type="button" onClick={handleVerifyOTP} className="btn btn-primary" disabled={loading}>
                  {loading ? 'Verifying...' : 'Submit OTP'}
                </button>
              </>
            )}
          </div>
        )}

        {otpVerified && <p style={{ color: 'var(--color-success)', margin: '0 0 15px 0', fontSize: '14px', fontWeight: 'bold' }}>✓ Email Verified</p>}
        <div className="form-group"><input name='contactNumber' placeholder="Phone Number" onChange={handleChange} required className="form-input" /></div>
        <div className="form-group"><input name='collegeName' placeholder="College/Organization Name (Optional)" onChange={handleChange} className="form-input" /></div>
        <div className="form-group"><input name='password' placeholder="Password" onChange={handleChange} required className="form-input" /></div>

        <div className="form-group">
          <label>Participant Type: </label>
          <select name="type" onChange={handleChange} value={formData.type} className="form-input">
            <option value="IIIT">IIIT Student</option>
            <option value="Non-IIIT">Non-IIIT</option>
          </select>
        </div>

        <button type="submit" className="btn btn-success" disabled={!otpVerified}>
          Register
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
};
export default Register;