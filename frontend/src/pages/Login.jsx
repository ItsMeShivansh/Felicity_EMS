import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [email, setEmail]= useState('');
  const [password, setPassword]= useState('');
  const [role, setRole] = useState('participant');
  const navigate = useNavigate();

  const handleLogin = async(e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`\${import.meta.env.VITE_API_URL}/api/auth/login`, { email, password, role });
      
      alert('Login Successful!');

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));


      if (res.data.user.role === 'admin') {
        navigate('/admin');
      } else if (res.data.user.role === 'organizer') {
        navigate('/organizer-dashboard');
      } else if (res.data.user.role === 'participant' && !res.data.user.preferencesSet) {
        navigate('/onboarding/preferences');
      } else {
        navigate('/dashboard');
      }
    } catch(err) {
      console.error(err);
      alert(err.response?.data?.message || 'Login Failed');
    }
  }

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit = {handleLogin}>
        <div className="form-group">
          <label>Role:</label>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            className="form-input"
          >
            <option value="participant">Participant</option>
            <option value="organizer">Organizer</option>
          </select>
        </div>
        <div className="form-group">
          <label>Email:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            className="form-input"
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Login
        </button>
      </form>
      <p className="auth-footer">
        New Here? <Link to="/register">Register</Link>
      </p>
    </div>
  );
};

export default Login;
