import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminNavbar from '../components/AdminNavbar';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalOrganizers: 0, activeOrganizers: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/organizers`, {
        headers: { Authorization: token }
      });
      setStats({
        totalOrganizers: res.data.length,
        activeOrganizers: res.data.filter(org => org.isActive).length
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  return (
    <div className="page-wrapper">
      <AdminNavbar />
      <div className="page-content">
        <h1>Admin Dashboard</h1>
        <p style={{ color: '#888', marginBottom: '2rem' }}>Welcome to the Felicity Admin Portal</p>

        <div className="analytics-grid">
          <div className="analytics-card registrations">
            <h3>{stats.totalOrganizers}</h3>
            <p>Total Clubs/Organizers</p>
          </div>
          <div className="analytics-card attendance">
            <h3>{stats.activeOrganizers}</h3>
            <p>Active Clubs</p>
          </div>
          <div className="analytics-card revenue">
            <h3>{stats.totalOrganizers - stats.activeOrganizers}</h3>
            <p>Disabled Clubs</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
