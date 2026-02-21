import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ParticipantNavbar from '../components/ParticipantNavbar';

const Organizers = () => {
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [followedIds, setFollowedIds] = useState([]);
  const [userInterests, setUserInterests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const config = { headers: { Authorization: token } };


        const orgRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/organizers`, config);
        setOrganizers(orgRes.data);


        const prefRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/participant/preferences`, config);
        

        const currentFollows = prefRes.data.followedOrganizers.map(org => 
          typeof org === 'object' ? org._id : org
        );
        
        setFollowedIds(currentFollows);
        setUserInterests(prefRes.data.interests || []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleToggleFollow = async (orgId, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      let newFollowedIds;

      if (followedIds.includes(orgId)) {

        newFollowedIds = followedIds.filter(id => id !== orgId);
      } else {

        newFollowedIds = [...followedIds, orgId];
      }


      setFollowedIds(newFollowedIds);


      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/participant/preferences`,
        { 
          interests: userInterests,
          followedOrganizers: newFollowedIds 
        },
        { headers: { Authorization: token } }
      );
    } catch (err) {
      console.error("Error updating follow status:", err);

      alert("Failed to update. Please try again.");
    }
  };

  if (loading) return <div className="loading">Loading Clubs...</div>;

  return (
    <div className="page-wrapper">
      <ParticipantNavbar />

      <div className="page-content">
        <header className="page-header">
          <h1>Clubs & Organizers</h1>
          <p>Discover and follow clubs to stay updated with their latest events.</p>
        </header>

        <div className="organizers-grid">
          {organizers.length === 0 ? (
            <p>No organizers found.</p>
          ) : (
            organizers.map((org) => (
              <div key={org._id} className="org-card" onClick={() => navigate(`/organizers/${org._id}`)}>
                <div className="org-card-header">
                  <h3>{org.name}</h3>
                  <span className="category-badge">{org.category}</span>
                </div>
                <p className="org-desc">{org.description}</p>
                <div className="org-stats">
                  <span>👥 {org.followerCount || 0} Followers</span>
                </div>
                <button 
                  className={`btn-primary ${followedIds.includes(org._id) ? 'following' : ''}`}
                  onClick={(e) => handleToggleFollow(org._id, e)}
                >
                  {followedIds.includes(org._id) ? 'Following' : 'Follow'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Organizers;