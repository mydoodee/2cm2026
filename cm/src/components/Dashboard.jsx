import { useState, useEffect, useCallback } from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { 
  DollarOutlined, 
  RiseOutlined, 
  FolderOutlined, 
  ThunderboltOutlined,
  BarChartOutlined,
  LineChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import Navbar from './Navbar';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3050';
const API_URL = `${API_BASE_URL}/api`;

const Dashboard = ({ user, setUser, theme, setTheme }) => {
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [overallStats, setOverallStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refresh Access Token
  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('ไม่มี refresh token ใน localStorage');
      }

      const response = await axios.post(
        `${API_BASE_URL}/refresh-token`,
        { refreshToken },
        { timeout: 10000 }
      );

      const newToken = response.data.token;
      localStorage.setItem('token', newToken);
      return newToken;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      throw new Error('Token refresh failed');
    }
  }, [setUser]);

  // Fetch Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('กรุณาเข้าสู่ระบบ');
        setLoading(false);
        return;
      }

      const config = { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      };

      const [statsResponse, projectsResponse] = await Promise.all([
        axios.get(`${API_URL}/dashboard/overall-stats`, config),
        axios.get(`${API_URL}/dashboard/project-stats`, config)
      ]);

      setOverallStats(statsResponse.data.overall || {});
      setProjects(projectsResponse.data.projects || []);

    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        try {
          const newToken = await refreshAccessToken();
          const config = { 
            headers: { Authorization: `Bearer ${newToken}` },
            timeout: 15000
          };

          const [statsResponse, projectsResponse] = await Promise.all([
            axios.get(`${API_URL}/dashboard/overall-stats`, config),
            axios.get(`${API_URL}/dashboard/project-stats`, config)
          ]);

          setOverallStats(statsResponse.data.overall || {});
          setProjects(projectsResponse.data.projects || []);
        } catch (refreshError) {
          console.error('Error after token refresh:', refreshError);
          setError('เซสชันของคุณหมดอายุ กรุณาล็อกอินใหม่');
        }
      } else {
        console.error('Error fetching dashboard data:', error);
        const errorMessage = error.response?.data?.message || 
                           error.message || 
                           'ไม่สามารถโหลดข้อมูลได้';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshAccessToken]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (mounted) {
        await fetchDashboardData();
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const StatCard = ({ title, value, subtitle, color, IconComponent }) => {
    return (
      <div className={`rounded-lg p-4 border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {title}
            </p>
            <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {value}
            </p>
            {subtitle && (
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            {IconComponent && <IconComponent className="text-2xl" />}
          </div>
        </div>
      </div>
    );
  };

  const ProjectCard = ({ project }) => {
    const completionRate = project.total_revenue > 0 
      ? (project.received_revenue / project.total_revenue) * 100 
      : 0;
    
    const displayProgress = completionRate;
    
    // Calculate installment info from scurve_data
    const totalInstallments = project.payment_info?.total_installments || 0;
    const paidInstallments = project.scurve_data?.filter(d => d.payment_status === 'paid').length || 0;
    const overdueInstallments = project.scurve_data?.filter(d => d.payment_status === 'overdue').length || 0;
    const pendingInstallments = project.scurve_data?.filter(d => d.payment_status === 'pending').length || 0;
    const cancelledInstallments = project.scurve_data?.filter(d => d.payment_status === 'cancelled').length || 0;
    
    // Get current payment status
    const currentPayment = project.scurve_data?.find(d => d.installment === project.payment_info?.current_installment);
    
    return (
      <div className={`rounded-lg p-4 border ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {project.project_name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                project.status === 'In Progress' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : project.status === 'Completed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
              }`}>
                {project.status}
              </span>
              {project.start_date && (
                <span className={`text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <CalendarOutlined className="text-xs" /> {new Date(project.start_date).toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{displayProgress.toFixed(1)}%</div>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>ความคืบหน้า</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>ความคืบหน้า</span>
            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {displayProgress.toFixed(1)}%
            </span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>

        {/* Installment Info */}
        {totalInstallments > 0 && (
          <div className={`mb-3 p-2 rounded-md ${
            theme === 'dark' ? 'bg-gray-700/30' : 'bg-gray-50'
          }`}>
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>งวดทั้งหมด</span>
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {totalInstallments}
                </span>
              </div>
              {paidInstallments > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-green-500">
                    <CheckCircleOutlined className="text-sm" /> ชำระแล้ว
                  </span>
                  <span className={`font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    {paidInstallments}
                  </span>
                </div>
              )}
              {overdueInstallments > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-red-500">
                    <ExclamationCircleOutlined className="text-sm" /> เกินกำหนด
                  </span>
                  <span className={`font-medium ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                    {overdueInstallments}
                  </span>
                </div>
              )}
              {pendingInstallments > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-orange-500">
                    <ClockCircleOutlined className="text-sm" /> รอชำระ
                  </span>
                  <span className={`font-medium ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                    {pendingInstallments}
                  </span>
                </div>
              )}
              {cancelledInstallments > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-gray-500">
                    <CloseCircleOutlined className="text-sm" /> ยกเลิก
                  </span>
                  <span className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {cancelledInstallments}
                  </span>
                </div>
              )}
              {currentPayment && currentPayment.date && (
                <div className="flex items-center justify-between pt-1 border-t border-gray-600/30">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>งวดล่าสุด</span>
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(currentPayment.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial Info */}
        <div className={`grid grid-cols-2 gap-2 text-xs`}>
          <div>
            <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>รายได้ทั้งหมด</div>
            <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(project.total_revenue)}
            </div>
          </div>
          <div>
            <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>รายได้ที่ได้รับ</div>
            <div className="font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(project.received_revenue)}
            </div>
          </div>
          {!project.hasReceivedData && (
            <div className="col-span-2 pt-1">
              <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                theme === 'dark' ? 'text-amber-400 bg-amber-900/30' : 'text-amber-600 bg-amber-50'
              }`}>
                <WarningOutlined /> ยังไม่มีข้อมูลการชำระเงิน
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredProjects = selectedProject === 'all' 
    ? projects 
    : projects.filter(p => p.project_id === selectedProject);

  const projectYears = [...new Set(projects.map(p => {
    if (!p.start_date) return null;
    return new Date(p.start_date).getFullYear();
  }).filter(Boolean))].sort((a, b) => b - a);

  const yearFilteredProjects = selectedYear === 'all'
    ? filteredProjects
    : filteredProjects.filter(p => {
        if (!p.start_date) return false;
        return new Date(p.start_date).getFullYear() === parseInt(selectedYear);
      });

  const filteredStats = yearFilteredProjects.reduce((acc, project) => {
    acc.totalRevenue += project.total_revenue || 0;
    acc.totalReceived += project.received_revenue || 0;
    acc.totalProjects += 1;
    acc.totalProgress += parseFloat(project.progress || 0);
    if (project.hasReceivedData) acc.hasReceivedData = true;
    return acc;
  }, {
    totalRevenue: 0,
    totalReceived: 0,
    totalProjects: 0,
    totalProgress: 0,
    hasReceivedData: false
  });

  filteredStats.averageProgress = filteredStats.totalProjects > 0 
    ? filteredStats.totalProgress / filteredStats.totalProjects 
    : 0;

  if (error && !loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <div className={`max-w-sm w-full rounded-lg p-6 border ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className={`text-xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-red-400' : 'text-red-600'
            }`}>
              เกิดข้อผิดพลาด
            </h3>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {error}
            </p>
            <button
              onClick={() => {
                setError(null);
                fetchDashboardData();
              }}
              className={`w-full py-2 rounded-md font-medium transition-colors ${
                theme === 'dark' 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              }`}
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className={`inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-indigo-500 mb-4 ${
              theme === 'dark' ? 'border-indigo-400' : 'border-indigo-600'
            }`}></div>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              กำลังโหลดข้อมูล...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!overallStats || projects.length === 0) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
        <div className="flex items-center justify-center py-20">
          <div className={`max-w-sm w-full rounded-lg p-6 border text-center ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="text-4xl mb-3">
              <BarChartOutlined />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              ไม่พบข้อมูลโครงการ
            </h3>
            <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              ยังไม่มีโครงการที่ active ในระบบ
            </p>
            <button
              onClick={handleRefresh}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                theme === 'dark' 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white'
              }`}
            >
              รีเฟรช
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
      
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <BarChartOutlined className="text-3xl" /> ความคืบหน้าโครงการ
              </h1>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                ภาพรวมและการติดตามความคืบหน้าโครงการ
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedProject('all');
                }}
                className={`px-3 py-2 rounded-md border focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">ทุกปี ({projects.length})</option>
                {projectYears.map((year) => {
                  const yearProjects = projects.filter(p => {
                    if (!p.start_date) return false;
                    return new Date(p.start_date).getFullYear() === year;
                  });
                  return (
                    <option key={year} value={year}>
                      {year + 543} ({yearProjects.length})
                    </option>
                  );
                })}
              </select>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={`px-3 py-2 rounded-md border focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">
                  {selectedYear === 'all' ? `ทุกโครงการ (${projects.length})` : `ปี ${parseInt(selectedYear) + 543} (${yearFilteredProjects.length})`}
                </option>
                {yearFilteredProjects.map((project) => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className={`p-2 rounded-md border transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700'
                    : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? '⏳' : '🔄'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="รายได้รวมทั้งหมด"
            value={formatCurrency(selectedYear === 'all' && selectedProject === 'all' ? overallStats.totalRevenue : filteredStats.totalRevenue)}
            subtitle={
              selectedYear === 'all' && selectedProject === 'all'
                ? (overallStats.hasReceivedData ? '' : 'ยังไม่มีข้อมูล')
                : (filteredStats.hasReceivedData ? '' : 'ยังไม่มีข้อมูล')
            }
            color={theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50'}
            IconComponent={DollarOutlined}
          />
          <StatCard
            title="รายได้ที่ได้รับ"
            value={formatCurrency(selectedYear === 'all' && selectedProject === 'all' ? overallStats.totalReceived : filteredStats.totalReceived)}
            subtitle={
              selectedYear === 'all' && selectedProject === 'all'
                ? (overallStats.hasReceivedData ? '' : 'ยังไม่มีข้อมูล')
                : (filteredStats.hasReceivedData ? '' : 'ยังไม่มีข้อมูล')
            }
            color={theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-50'}
            IconComponent={RiseOutlined}
          />
          <StatCard
            title="จำนวนโครงการ"
            value={selectedYear === 'all' && selectedProject === 'all' ? overallStats.totalProjects : filteredStats.totalProjects}
            subtitle={
              selectedYear === 'all' 
                ? 'โครงการที่ active' 
                : `ปี ${parseInt(selectedYear) + 543}`
            }
            color={theme === 'dark' ? 'bg-violet-900/30' : 'bg-violet-50'}
            IconComponent={FolderOutlined}
          />
          <StatCard
            title="ความคืบหน้าเฉลี่ย"
            value={`${(selectedYear === 'all' && selectedProject === 'all' ? overallStats.averageProgress : filteredStats.averageProgress).toFixed(1)}%`}
            subtitle={
              selectedYear === 'all' 
                ? 'ทุกโครงการ'
                : `โครงการในปี ${parseInt(selectedYear) + 543}`
            }
            color={theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-50'}
            IconComponent={ThunderboltOutlined}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Revenue Chart */}
          <div className={`rounded-lg border p-4 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <BarChartOutlined className="text-xl" /> รายได้แยกตามโครงการ
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={yearFilteredProjects}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey="project_name" 
                  tick={{ fontSize: 11, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                    color: theme === 'dark' ? '#ffffff' : '#000000'
                  }}
                />
                <Legend />
                <Bar dataKey="total_revenue" fill="#6366f1" name="รายได้ทั้งหมด" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received_revenue" fill="#10b981" name="รายได้ที่ได้รับ" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>

          {/* S-Curve Chart */}
          {selectedProject !== 'all' && yearFilteredProjects[0]?.scurve_data?.length > 0 ? (
            <div className={`rounded-lg border p-4 ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex flex-col mb-4">
                <h2 className={`text-lg font-semibold flex items-center gap-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  <LineChartOutlined className="text-xl" /> S-Curve: {yearFilteredProjects[0].project_name}
                </h2>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  ทั้งหมด {yearFilteredProjects[0].payment_info.total_installments} งวด |{' '}
                  <span className="text-green-500 inline-flex items-center gap-1">
                    <CheckCircleOutlined /> {yearFilteredProjects[0].scurve_data.filter(d => d.payment_status === 'paid').length}
                  </span> |{' '}
                  <span className="text-red-500 inline-flex items-center gap-1">
                    <ExclamationCircleOutlined /> {yearFilteredProjects[0].scurve_data.filter(d => d.payment_status === 'overdue').length}
                  </span> |{' '}
                  <span className="text-orange-500 inline-flex items-center gap-1">
                    <ClockCircleOutlined /> {yearFilteredProjects[0].scurve_data.filter(d => d.payment_status === 'pending').length}
                  </span>
                  {yearFilteredProjects[0].scurve_data.filter(d => d.payment_status === 'cancelled').length > 0 && (
                    <> | <span className="text-gray-500 inline-flex items-center gap-1">
                      <CloseCircleOutlined /> {yearFilteredProjects[0].scurve_data.filter(d => d.payment_status === 'cancelled').length}
                    </span></>
                  )}
                </p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearFilteredProjects[0].scurve_data}>
                  <defs>
                    <linearGradient id="colorPlan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                  <XAxis 
                    dataKey="installment" 
                    tick={{ fontSize: 12, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                    label={{ value: 'งวดที่', position: 'insideBottom', offset: -5, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                    label={{ value: 'เปอร์เซ็นต์ (%)', angle: -90, position: 'insideLeft', fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        
                        // สร้าง status label และ color
                        let statusLabel = '';
                        let statusColor = '';
                        
                        switch(data.payment_status) {
                          case 'paid':
                            statusLabel = 'ชำระแล้ว ✓';
                            statusColor = 'text-green-500';
                            break;
                          case 'overdue':
                            statusLabel = 'เกินกำหนด ⚠️';
                            statusColor = 'text-red-500';
                            break;
                          case 'pending':
                            statusLabel = 'รอชำระ ⏳';
                            statusColor = 'text-orange-500';
                            break;
                          case 'cancelled':
                            statusLabel = 'ยกเลิก ✕';
                            statusColor = 'text-gray-500';
                            break;
                          default:
                            statusLabel = 'ไม่มีข้อมูล';
                            statusColor = 'text-gray-400';
                        }
                        
                        return (
                          <div className={`p-2 rounded-md ${
                            theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                          }`}>
                            <p className={`font-medium mb-1 text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              งวดที่ {data.installment}
                            </p>
                            <div className="space-y-1 text-xs">
                              <p className="text-indigo-500">แผน: {data.plan}%</p>
                              <p className={statusColor}>
                                สถานะ: {statusLabel}
                              </p>
                              <p className={data.payment_status === 'paid' ? 'text-green-500' : 'text-gray-500'}>
                                ผลจริง: {data.actual}%
                              </p>
                              {data.amount > 0 && (
                                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                  ยอดเงิน: {formatCurrency(data.amount)}
                                </p>
                              )}
                              {data.date && (
                                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                  วันที่: {new Date(data.date).toLocaleDateString('th-TH')}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="plan" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPlan)"
                    name="แผนงาน (%)"
                    dot={{ fill: '#6366f1', strokeWidth: 2, r: 3, stroke: '#ffffff' }}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorActual)"
                    name="ความคืบหน้าจริง (%)"
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      
                      // กำหนดสีตาม payment_status
                      let fillColor = '#9ca3af'; // default gray
                      let icon = '';
                      
                      switch(payload.payment_status) {
                        case 'paid':
                          fillColor = '#10b981'; // green
                          icon = '✓';
                          break;
                        case 'overdue':
                          fillColor = '#ef4444'; // red
                          icon = '!';
                          break;
                        case 'pending':
                          fillColor = '#f59e0b'; // orange
                          icon = '⏳';
                          break;
                        case 'cancelled':
                          fillColor = '#6b7280'; // gray
                          icon = '✕';
                          break;
                      }
                      
                      if (payload.payment_status) {
                        return (
                          <g>
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={5} 
                              fill={fillColor} 
                              stroke="#ffffff" 
                              strokeWidth={2}
                            />
                            {icon && (
                              <text
                                x={cx}
                                y={cy}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#ffffff"
                                fontSize="8"
                                fontWeight="bold"
                              >
                                {icon}
                              </text>
                            )}
                          </g>
                        );
                      } else {
                        return (
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={4} 
                            fill="#9ca3af" 
                            stroke="#ffffff" 
                            strokeWidth={2}
                            opacity={0.3}
                          />
                        );
                      }
                    }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`rounded-lg border p-4 flex items-center justify-center ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="text-center">
                <span className={`text-3xl mb-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>📈</span>
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  {selectedProject === 'all' 
                    ? 'เลือกโครงการเพื่อดู S-Curve' 
                    : 'ไม่มีข้อมูล S-Curve สำหรับโครงการนี้'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Projects Grid */}
        <div className={`rounded-lg border p-4 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <FolderOutlined className="text-xl" /> รายละเอียดโครงการ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {yearFilteredProjects.map((project) => (
              <ProjectCard key={project.project_id} project={project} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;