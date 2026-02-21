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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegisteration = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`\${import.meta.env.VITE_API_URL}/api/auth/register`, formData);
      

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
        <div className="form-group"><input name='firstName' placeholder="First Name" onChange={handleChange} required className="form-input" /></div>
        <div className="form-group"><input name='lastName' placeholder="Last Name" onChange={handleChange} required className="form-input" /></div>
        <div className="form-group"><input name='email' placeholder="Email" onChange={handleChange} required className="form-input" /></div>
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

        <button type="submit" className="btn btn-success">
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