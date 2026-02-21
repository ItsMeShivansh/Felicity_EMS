import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role;


  if (!token) {
    return <Navigate to="/login" replace />;
  }


  if (allowedRoles && !allowedRoles.includes(userRole)) {

    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    if (userRole === 'organizer') return <Navigate to="/organizer-dashboard" replace />;
    if (userRole === 'participant') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;