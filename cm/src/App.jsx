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
import Bidding from './components/projects/Bidding';
import ViewerIFC from './components/projects/ViewerIFC';
import ViewerDXF from './components/projects/ViewerDXF';
import Preconstruction from './components/projects/Preconstruction';
import Construction from './components/projects/Construction';
import ConstructionManagement from './components/projects/ConstructionManagement';
import ProgressDetail from './components/projects/Progress_detail';
import Profile from './components/Profile';
import Settings from './components/Settings';
import ProjectSetting from './components/projects/ProjectSetting';
import ProjectForm from './components/projects/ProjectForm';
import PermissionFolder from './components/projects/PermissionFolder';
import UserSetting from './components/users/UserSetting';
import Progress from './components/Progress';
import SCurve from './components/projects/SCurve';
import Precast from './components/projects/Precast';
import JobStatusDetail from './components/projects/JobStatusDetail';
import Unauthorized from './components/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import CompanySelector from './components/CompanySelector';
import CompanySettings from './components/CompanySettings';
import { useState, useEffect } from 'react';
import api from './axiosConfig';
import 'antd/dist/reset.css';

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

// ========================================
// ViewerDXF Wrapper (Public / Shared / Private)
// ========================================
function ViewerDXFWrapper({ user, setUser, theme, setTheme }) {
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

  return <ViewerDXF user={user} setUser={setUser} theme={theme} setTheme={setTheme} />;
}

ViewerDXFWrapper.propTypes = {
  user: PropTypes.object,
  setUser: PropTypes.func,
  theme: PropTypes.string,
  setTheme: PropTypes.func,
};

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);
  const [activeCompany, setActiveCompany] = useState(() => {
    try {
      const stored = localStorage.getItem('activeCompany');
      // กรองค่าขยะออกด้วย
      if (stored && stored !== 'null' && stored !== 'undefined') {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse activeCompany from localStorage', e);
    }
    return null;
  });
  const navigate = useNavigate();

  // โหลด activeCompany จาก localStorage ตอนเริ่ม
  useEffect(() => {
    try {
      const stored = localStorage.getItem('activeCompany');
      const storedId = localStorage.getItem('activeCompanyId');
      
      // ✅ ตรวจสอบว่าเป็นค่าที่ถูกต้อง (ไม่เป็น null/undefined string)
      const isValid = stored && storedId && storedId !== 'null' && storedId !== 'undefined';
      
      if (isValid) {
        setActiveCompany(JSON.parse(stored));
      } else {
        // ล้างค่าที่อาจเป็นขยะออก
        localStorage.removeItem('activeCompany');
        localStorage.removeItem('activeCompanyId');
        setActiveCompany(null);
      }
    } catch (e) { 
      localStorage.removeItem('activeCompany');
      localStorage.removeItem('activeCompanyId');
      setActiveCompany(null);
    }
  }, []);

  // ========================================
  // Theme & Dark Mode Synchronizer
  // ========================================
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

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
        const response = await api.get('/api/user');
        setUser({
          ...response.data.user,
          user_id: Number(response.data.user.user_id),
        });
        setLoading(false);
      } catch (error) {
        // Interceptor handles 401/403 and redirects to login
        if (error.message !== 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่') {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: error.message || 'ไม่สามารถดึงข้อมูลผู้ใช้ได้',
            confirmButtonColor: '#4f46e5',
            confirmButtonText: 'ตกลง',
            timer: 3000,
            timerProgressBar: true,
          });
        }
        setUser(null);
        setLoading(false);
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

          {/* ==================== COMPANY SELECTOR ==================== */}
          <Route
            path="/select-company"
            element={
              user ? (
                <CompanySelector
                  companies={JSON.parse(localStorage.getItem('pendingCompanies') || '[]')}
                  user={user}
                  setUser={setUser}
                  setActiveCompany={(company) => {
                    setActiveCompany(company);
                    if (company) {
                      localStorage.setItem('activeCompanyId', company.company_id);
                      localStorage.setItem('activeCompany', JSON.stringify(company));
                    }
                  }}
                  theme={theme}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* ==================== VIEWER IFC (Public / Shared / Private) ==================== */}
          <Route path="/viewer/shared/:token" element={<ViewerIFCWrapper user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
          <Route path="/viewer/:id/:fileId" element={<ViewerIFCWrapper user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
          <Route path="/project/:id/viewerifc/:fileId" element={<ViewerIFCWrapper user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
          
          {/* ==================== VIEWER DXF (Public / Shared / Private) ==================== */}
          <Route path="/viewer/shared/dxf/:token" element={<ViewerDXFWrapper user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
          <Route path="/project/:id/viewerdxf/:fileId" element={<ViewerDXFWrapper user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />

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
            <Route path="/dashboard" element={<Dashboard user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />} />
            <Route path="/history" element={<History user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />} />
            <Route path="/projects" element={<Projects user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />} />
            <Route path="/project/:id" element={<ProjectDetail user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />} />

            {/* === PHASE ROUTES === */}
            <Route path="/project/:id/bidding" element={<Bidding user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
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
            <Route path="/project/:id/job-status" element={<JobStatusDetail user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />

            {/* === USER PAGES === */}
            <Route path="/progress" element={<Progress user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/profile" element={<Profile user={user} setUser={setUser} theme={theme} setTheme={setTheme} />} />
            <Route path="/settings" element={<Settings user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />} />
            <Route path="/company-settings" element={<CompanySettings user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />} />
            <Route path="/project-settings" element={<ProjectSetting user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />} />
            <Route path="/project-settings/add" element={<ProjectForm user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />} />
            <Route path="/project-settings/edit/:id" element={<ProjectForm user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />} />
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