import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ManageOrganizers from './pages/ManageOrganizers.jsx';
import PasswordResetRequests from './pages/PasswordResetRequests.jsx';
import OrganizerDashboard from './pages/OrganizerDashboard.jsx';
import OrganizerEventDetail from './pages/OrganizerEventDetail.jsx';
import OrganizerProfile from './pages/OrganizerProfile.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import EditEvent from './pages/EditEvent.jsx';
import OnboardingPreferences from './pages/OnboardingPreferences.jsx';
import ProtectedRoute from './pages/ProtectRoutes.jsx';
import Organizers from './pages/Organizers.jsx';
import OrganizerDetail from './pages/OrganizerDetail.jsx';
import Profile from './pages/Profile.jsx';
import BrowseEvents from './pages/BrowseEvents.jsx';
import EventDetail from './pages/EventDetail.jsx';
import MyRegistrations from './pages/MyRegistrations.jsx';
import TeamChat from './pages/TeamChat.jsx';
import OngoingEvents from './pages/OngoingEvents.jsx';
import { Navigate } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/register" element={<Register/>} />
          <Route path="/login" element={<Login/>} />

          <Route path="/organizers" element={<ProtectedRoute allowedRoles={['participant']}><Organizers /></ProtectedRoute>} />
          <Route path="/organizers/:id" element={<ProtectedRoute allowedRoles={['participant']}><OrganizerDetail /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute allowedRoles={['participant']}><BrowseEvents /></ProtectedRoute>} />
          <Route path="/ongoing" element={<ProtectedRoute allowedRoles={['participant']}><OngoingEvents /></ProtectedRoute>} />
          <Route path="/events/:eventId" element={<ProtectedRoute allowedRoles={['participant']}><EventDetail /></ProtectedRoute>} />
          <Route path="/my-registrations" element={<ProtectedRoute allowedRoles={['participant']}><MyRegistrations /></ProtectedRoute>} />
          <Route path="/team-chat/:teamId" element={<ProtectedRoute allowedRoles={['participant']}><TeamChat /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['participant']}><Profile /></ProtectedRoute>} />
          <Route path="/onboarding/preferences" element={<ProtectedRoute allowedRoles={['participant']}><OnboardingPreferences /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['participant']}><Dashboard/></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard/></ProtectedRoute>} />
          <Route path="/admin/manage-organizers" element={<ProtectedRoute allowedRoles={['admin']}><ManageOrganizers/></ProtectedRoute>} />
          <Route path="/admin/password-reset-requests" element={<ProtectedRoute allowedRoles={['admin']}><PasswordResetRequests/></ProtectedRoute>} />
          <Route path="/organizer/event/:eventId" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerEventDetail/></ProtectedRoute>} />
          <Route path="/organizer/ongoing-events" element={<ProtectedRoute allowedRoles={['organizer']}><OngoingEvents /></ProtectedRoute>} />
          <Route path="/organizer/create-event" element={<ProtectedRoute allowedRoles={['organizer']}><CreateEvent/></ProtectedRoute>} />
          <Route path="/organizer/edit-event/:eventId" element={<ProtectedRoute allowedRoles={['organizer']}><EditEvent/></ProtectedRoute>} />
          <Route path="/organizer/profile" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerProfile/></ProtectedRoute>} />
          <Route path="/organizer-dashboard" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerDashboard/></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" />} />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;