import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const OrganizerNavbar = () => {
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
        <li><Link to="/organizer-dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link></li>
        <li><Link to="/organizer/create-event" onClick={() => setMenuOpen(false)}>Create Event</Link></li>
        <li><Link to="/organizer/ongoing-events" onClick={() => setMenuOpen(false)}>Ongoing Events</Link></li>
        <li><Link to="/organizer/profile" onClick={() => setMenuOpen(false)}>Profile</Link></li>
        <li>
          <button onClick={handleLogout} className="btn btn-logout">
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default OrganizerNavbar;
