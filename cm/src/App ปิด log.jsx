import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Spin } from 'antd';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import ConfirmPassword from './components/ConfirmPassword';
import Dashboard from './components/Dashboard';
import History from './components/History'; // เพิ่ม History component
import Projects from './components/projects/Projects';
import ProjectDetail from './components/projects/ProjectDetail';
import Planning from './components/projects/Planning'; // เพิ่มบรรทัดนี้
import Actual from './components/projects/Actual'; // เพิ่มบรรทัดนี้
import Design from './components/projects/Design';
import ViewerIFC from './components/projects/ViewerIFC';
import Preconstruction from './components/projects/Preconstruction';
import Construction from './components/projects/Construction';
import ConstructionManagement from './components/projects/ConstructionManagement';
import ProgressDetail from './components/projects/Progress_detail';
import Profile from './components/Profile';
import Settings from './components/Settings';
import ProjectSetting from './components/projects/ProjectSetting';
import PermissionFolder from './components/projects/PermissionFolder';
import UserSetting from './components/users/usersetting';
import Progress from './components/Progress';
import SCurve from './components/projects/SCurve';
import Precast from './components/projects/Precast';
import Unauthorized from './components/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { useState, useEffect } from 'react';
import axios from 'axios';
import 'antd/dist/reset.css';

// ========================================
// Disable Console Logs Globally
// ========================================
(function() {
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.info = noop;
  // ถ้าต้องการปิด error ด้วย ให้ uncomment บรรทัดนี้
  // console.error = noop;
})();

// ========================================
// ViewerIFC Wrapper (Public / Shared / Private)
// ========================================
function ViewerIFCWrapper({ user, setUser, theme, setTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = () => {
      const urlParams = new URLSearchParams(location.search);
      const pathSegments = location.pathname.split('/').filter(Boolean);

      const hasTokenParam = !!params.token;
      const isSharedMode = 
        hasTokenParam ||
        pathSegments.includes('shared') ||
        location.pathname.includes('/viewer/shared/') ||
        location.pathname.includes('/cm/viewer/shared/');

      const isPublicViewer = 
        pathSegments.includes('viewer') && 
        !isSharedMode &&
        pathSegments.length >= 3;

      const isPublicMode = 
        urlParams.get('public') === 'true' || 
        isPublicViewer ||
        isSharedMode;

      if (isSharedMode || isPublicMode) {
        setIsChecking(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!user && !token) {
        navigate('/login', { state: { from: location }, replace: true });
        return;
      }

      setIsChecking(false);
    };

    checkAccess();
  }, [location, user, navigate, params]);

  if (isChecking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Spin size="large">
          <div className="content" style={{ minHeight: '100px', minWidth: '100px' }} />
        </Spin>
      </div>
    );
  }

  return <ViewerIFC user={user} setUser={setUser} theme={theme} setTheme={setTheme} />;
}

ViewerIFCWrapper.propTypes = {
  user: PropTypes.object,
  setUser: PropTypes.func,
  theme: PropTypes.string,
  setTheme: PropTypes.func,
};

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ========================================
  // Refresh Token
  // ========================================
  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('ไม่มี refresh token');

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/refresh-token`, { refreshToken });
      const newToken = response.data.token;
      localStorage.setItem('token', newToken);
      return newToken;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setLoading(false);
      Swal.fire({
        icon: 'error',
        title: 'เซสชันหมดอายุ',
        text: 'กรุณาล็อกอินใหม่',
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'ตกลง',
        timer: 3000,
        timerProgressBar: true,
      });
      navigate('/login', { replace: true });
      return Promise.reject();
    }
  };

  // ========================================
  // Fetch User on Mount
  // ========================================
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser({
          ...response.data.user,
          user_id: Number(response.data.user.user_id),
        });
        setLoading(false);
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          try {
            const newToken = await refreshAccessToken();
            const retryResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/user`, {
              headers: { Authorization: `Bearer ${newToken}` },
            });
            setUser({
              ...retryResponse.data.user,
              user_id: Number(retryResponse.data.user.user_id),
            });
            setLoading(false);
          } catch {
            setUser(null);
            setLoading(false);
            navigate('/login', { replace: true });
          }
        } else {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: error.response?.data?.message || 'ไม่สามารถดึงข้อมูลผู้ใช้ได้',
            confirmButtonColor: '#4f46e5',
            confirmButtonText: 'ตกลง',
            timer: 3000,
            timerProgressBar: true,
          });
          setUser(null);
          setLoading(false);
        }
      }
    };

    fetchUser();
  }, [navigate]);

  // ========================================
  // Loading Screen
  // ========================================
  if (loading) {
    return (
      <div className={`min-h-screen w-full font-kanit ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} flex items-center justify-center`}>
        <Spin size="large">
          <div className="content" style={{ minHeight: '200px', minWidth: '200px' }} />
        </Spin>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full font-kanit ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} transition-all duration-300`}>
      <ErrorBoundary>
        <Routes>

          {/* ==================== PUBLIC ROUTES ==================== */}
          <Route
            path="/login"
            element={user ? <Navigate to="/projects" /> : <Login setUser={setUser} theme={theme} setTheme={setTheme} />}
          />
          <Route path="/reset-password" element={<ResetPassword theme={theme} setTheme={setTheme} />} />
          <Route path="/confirm-password" element={<ConfirmPassword theme={theme} setTheme={setTheme} />} />

          {/* ==================== VIEWER IFC (Public / Shared / Private) ==================== */}
          <Route path="/viewer/shared/:token" element={<ViewerIFCWrapper user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
          <Route path="/viewer/:id/:fileId" element={<ViewerIFCWrapper user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
          <Route path="/project/:id/viewerifc/:fileId" element={<ViewerIFCWrapper user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />

          {/* ==================== PROTECTED ROUTES ==================== */}
          <Route element={<ProtectedRoute user={user} />}>
            
            {/* Admin Only */}
            <Route
              path="/user-settings"
              element={
                user && user.roles?.includes(1) ? (
                  <UserSetting user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
                ) : (
                  <Navigate to="/unauthorized" replace />
                )
              }
            />

            {/* General Routes */}
            <Route path="/dashboard" element={<Dashboard user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/history" element={<History user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} /> {/* เพิ่ม History */}
            <Route path="/projects" element={<Projects user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/project/:id" element={<ProjectDetail user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />

            {/* === PHASE ROUTES === */}
            <Route path="/project/:id/design" element={<Design user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/project/:id/pre-construction" element={<Preconstruction user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/project/:id/construction" element={<Construction user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/project/:id/precast" element={<Precast user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/project/:id/construction-management" element={<ConstructionManagement user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />

            {/* === PROJECT PAGES === */}
            <Route path="/project/:id/progress" element={<ProgressDetail user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/project/:id/scurve" element={<SCurve user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/project/:id/planning" element={<Planning user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/project/:id/actual" element={<Actual user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />

            {/* === USER PAGES === */}
            <Route path="/progress" element={<Progress user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/profile" element={<Profile user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/settings" element={<Settings user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/project-settings" element={<ProjectSetting user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/permission-folder" element={<PermissionFolder user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
          </Route>

          {/* ==================== FALLBACK ROUTES ==================== */}
          <Route path="/unauthorized" element={<Unauthorized theme={theme} />} />
          <Route path="/" element={<Navigate to={user ? '/projects' : '/login'} replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>

      {/* Global Styles for Ant Design + Theme */}
      <style>{`
        .ant-spin-dot-item {
          background-color: ${theme === 'dark' ? '#6366f1' : '#2563eb'};
        }
        .ant-spin-text {
          color: ${theme === 'dark' ? '#fff' : '#000'};
          font-family: 'Kanit', sans-serif;
        }
        .ant-table-dark .ant-table-thead > tr > th {
          background-color: #1f2a44 !important;
          color: #d1d5db !important;
        }
        .ant-table-dark .ant-table-tbody > tr {
          background-color: #2d3748 !important;
          color: #d1d5db !important;
        }
        .ant-btn-primary {
          background-color: ${theme === 'dark' ? '#4f46e5' : '#1890ff'} !important;
          border-color: ${theme === 'dark' ? '#4f46e5' : '#1890ff'} !important;
        }
      `}</style>
    </div>
  );
}

App.propTypes = {
  user: PropTypes.shape({
    user_id: PropTypes.number,
    username: PropTypes.string,
    email: PropTypes.string,
    first_name: PropTypes.string,
    last_name: PropTypes.string,
    roles: PropTypes.arrayOf(PropTypes.number),
  }),
  setUser: PropTypes.func,
  theme: PropTypes.string,
  setTheme: PropTypes.func,
};

export default App;