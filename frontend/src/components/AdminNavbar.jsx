import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="participant-navbar">
      <div className="logo">Felicity Admin</div>
      <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
        <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
        <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
        <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
      </button>
      <ul className={menuOpen ? 'nav-open' : ''}>
        <li><Link to="/admin" onClick={() => setMenuOpen(false)}>Dashboard</Link></li>
        <li><Link to="/admin/manage-organizers" onClick={() => setMenuOpen(false)}>Manage Clubs/Organizers</Link></li>
        <li><Link to="/admin/password-reset-requests" onClick={() => setMenuOpen(false)}>Password Reset Requests</Link></li>
        <li>
          <button onClick={handleLogout} className="btn btn-logout">
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default AdminNavbar;
