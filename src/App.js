import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './component/Hook/useAuth.jsx';
import Login from './component/login/Login';
import SignUp from './component/signup/SignUp';
import ForgotPassword from './component/forgotpassword/ForgotPassword';
import CV from './component/profile/CV';
import JobList from './component/profile/Joblist';
import JobDetail from './component/profile/Jobdetail';
import UpdateUserPage from './component/Students/userProfile/UpdateUserPage.jsx';
import './component/login/Login.scss';
import HomePage from './component/homepage/HomePage';
import Student from './component/Students/dashboard/Dashboard.jsx';
import OJT from './component/pages/pdf/OJT';
import Header from './component/homepage/Header';
import AdminDashboard from './component/Admin/AdminDashboard';
import CompanyRepLayout from './component/companyRep/CompanyRepLayout';
import AIChat from './component/Students/dashboard/ChatQA/ChatPage.jsx';
import OJTdocsAdmin from './component/AIchatbot/OJTdocsAdmin.jsx';
import StaffsLayout from './component/Staffs/StaffsLayout.jsx';
import Footer from './component/homepage/Footer.jsx';
import Staffchat from './component/AIchatbot/chat/StaffChatPage.jsx';
import ChatStaffRoom from './component/AIchatbot/chat/StaffChatRoom.jsx';

function RequireAuth({ children, allowedRoles }) {
  const { role } = useAuth();
  const normalizedRole = (role || 'guest').toLowerCase();

  if (normalizedRole === 'guest') return <Navigate to="/login" replace />;

  const normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.map((r) => String(r).toLowerCase())
    : null;

  if (
    normalizedAllowedRoles &&
    normalizedAllowedRoles.length > 0 &&
    !normalizedAllowedRoles.includes(normalizedRole)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/homepage" element={<HomePage />} />
        <Route path="/profile/cv" element={<CV />} />
        <Route path="/profile/update" element={<UpdateUserPage />} />
        <Route path="/jobs" element={<JobList />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/ojt" element={<OJT />} />
        <Route
          path="/ragdocs"
          element={
            <RequireAuth allowedRoles={["admin", "cro_staff"]}>
              <OJTdocsAdmin />
            </RequireAuth>
          }
        />
        <Route path="/student" element={<Student />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/company/*" element={<CompanyRepLayout />} />
        <Route path="/qa" element={<RequireAuth><AIChat /></RequireAuth>} />
        <Route path="/staff" element={<StaffsLayout />} />
        <Route path="/chat/staff" element={<Staffchat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/chat/staff/:staffId" element={<ChatStaffRoom />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
