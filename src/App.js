import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
        <Route path="/ragdocs" element={<OJTdocsAdmin />} />
        <Route path="/student" element={<Student />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/company/*" element={<CompanyRepLayout />} />
        <Route path="/qa" element={<AIChat />} />
        <Route path="/staff" element={<StaffsLayout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
