import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ParticipantNavbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="participant-navbar">
      <div className="logo">Felicity</div>
      <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
        <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
        <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
        <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
      </button>
      <ul className={menuOpen ? 'nav-open' : ''}>
        <li><Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link></li>
        <li><Link to="/events" onClick={() => setMenuOpen(false)}>Browse Events</Link></li>
        <li><Link to="/organizers" onClick={() => setMenuOpen(false)}>Clubs/Organizers</Link></li>
        <li><Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link></li>
        <li>
          <button onClick={handleLogout} className="btn btn-logout">
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default ParticipantNavbar;
