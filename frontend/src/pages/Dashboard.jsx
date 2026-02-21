import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ParticipantNavbar from '../components/ParticipantNavbar';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    if (parsedUser && parsedUser.role === 'participant' && !parsedUser.preferencesSet) {
      navigate('/onboarding/preferences');
    }
  }, [navigate]);

  if (!user) return <div>Loading...</div>;

  return (
    <div className="page-wrapper">
      <ParticipantNavbar />
      <div className="page-content">
        <h1>Welcome, {user.name}</h1>
        <p>Email: {user.email}</p>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/events')} className="btn btn-primary">
            Browse Events
          </button>
          <button onClick={() => navigate('/my-registrations')} className="btn btn-primary">
            My Registrations
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;