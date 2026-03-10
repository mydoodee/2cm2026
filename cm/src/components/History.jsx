import { useState, useEffect, useCallback } from 'react';
import Navbar from './Navbar';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  BarChartOutlined,
  FileOutlined,
  DownloadOutlined,
  DatabaseOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  FireOutlined,
  LineChartOutlined,
  TeamOutlined,
  UploadOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileTextOutlined,
  ToolOutlined,
  DeleteOutlined // ✅ เพิ่ม DeleteOutlined
} from '@ant-design/icons';

// ⭐ API URLs
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3050';
const API_URL = `${API_BASE_URL}/api`;
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:3050';

// ⭐ Socket.IO Base URL (ไม่รวม /cm-api)
const SOCKET_BASE_URL = API_BASE_URL.replace('/cm-api', '');

function History({ user, setUser, theme, setTheme }) {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [topDownloads, setTopDownloads] = useState([]);
  const [topUploaders, setTopUploaders] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [userProjects, setUserProjects] = useState([]);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

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
  }, [API_BASE_URL, setUser]);

  const fetchUserProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('กรุณาเข้าสู่ระบบ');
        return;
      }

      const response = await axios.get(`${API_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      });
      
      if (response.data && response.data.projects) {
        setUserProjects(response.data.projects);
      } else {
        setUserProjects([]);
      }
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        try {
          const newToken = await refreshAccessToken();
          const retryResponse = await axios.get(`${API_URL}/projects`, {
            headers: { Authorization: `Bearer ${newToken}` },
            timeout: 15000
          });
          
          if (retryResponse.data && retryResponse.data.projects) {
            setUserProjects(retryResponse.data.projects);
          } else {
            setUserProjects([]);
          }
        } catch (refreshError) {
          console.error('Error refreshing token for projects:', refreshError);
          setError('เซสชันของคุณหมดอายุ กรุณาล็อกอินใหม่');
        }
      } else {
        console.error('Error fetching projects:', error);
        setError('ไม่สามารถโหลดข้อมูลโครงการได้');
      }
    }
  }, [API_URL, refreshAccessToken]);

  const generateChartData = useCallback((activities) => {
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const uploads = activities.filter(act => {
        const actDate = new Date(act.activity_time);
        return act.activity_type === 'upload' && actDate >= dayStart && actDate <= dayEnd;
      }).length;
      
      const downloads = activities.filter(act => {
        const actDate = new Date(act.activity_time);
        return act.activity_type === 'download' && actDate >= dayStart && actDate <= dayEnd;
      }).length;
      
      data.push({
        date: dateStr,
        uploads,
        downloads,
        total: uploads + downloads
      });
    }
    
    return data;
  }, []);

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

      const [statsResponse, activitiesResponse, downloadsResponse, uploadersResponse] = await Promise.all([
        axios.get(
          selectedProject !== 'all'
            ? `${API_URL}/file-statistics/project/${selectedProject}`
            : `${API_URL}/file-statistics`,
          config
        ),
        axios.get(
          selectedProject === 'all'
            ? `${API_URL}/file-activities/recent?limit=100`
            : `${API_URL}/file-activities/project/${selectedProject}?limit=100`,
          config
        ),
        axios.get(
          `${API_URL}/top-downloads?limit=5${selectedProject !== 'all' ? `&projectId=${selectedProject}` : ''}`,
          config
        ),
        axios.get(
          `${API_URL}/top-uploaders?limit=5${selectedProject !== 'all' ? `&projectId=${selectedProject}` : ''}`,
          config
        )
      ]);

      setStatistics(statsResponse.data.statistics || {});
      const activities = activitiesResponse.data.activities || [];
      setRecentActivities(activities.slice(0, 10));
      setChartData(generateChartData(activities));
      setTopDownloads(downloadsResponse.data.topFiles || []);
      setTopUploaders(uploadersResponse.data.topUploaders || []);

    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        try {
          const newToken = await refreshAccessToken();
          const config = { 
            headers: { Authorization: `Bearer ${newToken}` },
            timeout: 15000
          };

          const [statsResponse, activitiesResponse, downloadsResponse, uploadersResponse] = await Promise.all([
            axios.get(
              selectedProject !== 'all'
                ? `${API_URL}/file-statistics/project/${selectedProject}`
                : `${API_URL}/file-statistics`,
              config
            ),
            axios.get(
              selectedProject === 'all'
                ? `${API_URL}/file-activities/recent?limit=100`
                : `${API_URL}/file-activities/project/${selectedProject}?limit=100`,
              config
            ),
            axios.get(
              `${API_URL}/top-downloads?limit=5${selectedProject !== 'all' ? `&projectId=${selectedProject}` : ''}`,
              config
            ),
            axios.get(
              `${API_URL}/top-uploaders?limit=5${selectedProject !== 'all' ? `&projectId=${selectedProject}` : ''}`,
              config
            )
          ]);

          setStatistics(statsResponse.data.statistics || {});
          const activities = activitiesResponse.data.activities || [];
          setRecentActivities(activities.slice(0, 10));
          setChartData(generateChartData(activities));
          setTopDownloads(downloadsResponse.data.topFiles || []);
          setTopUploaders(uploadersResponse.data.topUploaders || []);
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
  }, [selectedProject, API_URL, refreshAccessToken, generateChartData]);

  const addActivityIfValid = useCallback((activity) => {
    if (selectedProject !== 'all' && activity.project_id !== parseInt(selectedProject)) {
      return;
    }

   // แก้ไขตรงนี้: เพิ่ม user_id และทำให้ key แม่นยำขึ้น
  const getActivityKey = (act) => {
    const time = new Date(act.activity_time);
    const minute = time.getMinutes();
    const roundedSeconds = Math.floor(time.getSeconds() / 10) * 10; // ปัดเป็น 10 วินาที
    return `${act.user_id}-${act.file_id}-${act.activity_type}-${time.getFullYear()}-${time.getMonth()}-${time.getDate()}-${time.getHours()}-${minute}-${roundedSeconds}`;
  };

    setRecentActivities(prev => {
      const key = getActivityKey(activity);
      const exists = prev.some(a => getActivityKey(a) === key);
      if (exists) {
        console.log('⏭️ Skipping duplicate activity:', key);
        return prev;
      }

      const newActivity = {
        ...activity,
        file_size_mb: activity.file_size_mb || (activity.file_size / (1024 * 1024)).toFixed(2)
      };
      console.log('➕ Adding new activity:', newActivity.file_name, newActivity.activity_type);
      return [newActivity, ...prev].slice(0, 10);
    });

    // Update statistics
    if (activity.activity_type === 'upload') {
      setStatistics(prev => ({
        ...prev,
        totalFiles: (prev?.totalFiles || 0) + 1,
        recentUploads: (prev?.recentUploads || 0) + 1
      }));
    } else if (activity.activity_type === 'download') {
      setStatistics(prev => ({
        ...prev,
        totalDownloads: (prev?.totalDownloads || 0) + 1
      }));
    }

    setChartData(prevChart => {
      const today = new Date();
      const activityDate = new Date(activity.activity_time);
      const isToday = activityDate.toDateString() === today.toDateString();
      
      if (isToday && prevChart.length > 0) {
        const updatedChart = [...prevChart];
        const lastDay = updatedChart[updatedChart.length - 1];
        
        if (activity.activity_type === 'upload') {
          lastDay.uploads += 1;
        } else {
          lastDay.downloads += 1;
        }
        lastDay.total = lastDay.uploads + lastDay.downloads;
        
        return updatedChart;
      }
      return prevChart;
    });
  }, [selectedProject]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (mounted) {
        await fetchUserProjects();
        await fetchDashboardData();
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [fetchUserProjects, fetchDashboardData]);

  useEffect(() => {
    if (userProjects.length === 0) {
      console.log('⏳ Waiting for userProjects...');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No token found, skipping WebSocket connection');
      return;
    }

    console.log('🔧 Setting up WebSocket with token...');
    
    const socketInstance = io(SOCKET_BASE_URL, {
      auth: { token: token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      withCredentials: true,
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      setIsConnected(true);
      
      const projectIds = userProjects.map(p => p.project_id);
      if (projectIds.length > 0) {
        socketInstance.emit('join-projects', projectIds);
        console.log(`📁 Emitted join-projects with IDs:`, projectIds);
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('🔴 WebSocket connection error:', error.message);
      
      if (error.message.includes('Authentication') || 
          error.message.includes('Invalid token') ||
          error.message.includes('No token')) {
        console.log('🔄 Token issue detected, trying to refresh...');
        
        refreshAccessToken()
          .then(newToken => {
            console.log('✅ Token refreshed successfully');
            socketInstance.auth.token = newToken;
            socketInstance.connect();
          })
          .catch(err => {
            console.error('❌ Failed to refresh token:', err);
            setIsConnected(false);
          });
      }
    });

    socketInstance.on('file-activity', (activity) => {
      console.log('📨 Received file activity:', activity);
      addActivityIfValid(activity);
    });

    socketInstance.on('file-activity-global', (activity) => {
      console.log('🌍 Received global activity:', activity);
      addActivityIfValid(activity);
    });

    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      socketInstance.offAny();
      socketInstance.disconnect();
    };
  }, [userProjects.length, addActivityIfValid, refreshAccessToken]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedProject, fetchDashboardData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'เมื่อสักครู่';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
    
    return date.toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType) => {
    if (['pdf'].includes(fileType)) return <FilePdfOutlined className="text-red-500" />;
    if (['doc', 'docx'].includes(fileType)) return <FileWordOutlined className="text-blue-500" />;
    if (['xls', 'xlsx'].includes(fileType)) return <FileExcelOutlined className="text-green-600" />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) return <FileImageOutlined className="text-purple-500" />;
    if (['dwg', 'dxf'].includes(fileType)) return <ToolOutlined className="text-orange-500" />;
    return <FileTextOutlined className="text-gray-500" />;
  };

  const CustomBarChart = ({ data }) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
            ยังไม่มีข้อมูล
          </p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => Math.max(d.uploads, d.downloads)));
    const chartHeight = 200;
    const barWidth = 32;

    return (
      <div className="overflow-x-auto pb-4">
        <div className="relative min-w-[600px] h-[280px]">
          <div className="absolute left-0 top-0 flex flex-col justify-between h-[200px] text-xs text-gray-500">
            <span>{maxValue}</span>
            <span>{Math.floor(maxValue * 0.75)}</span>
            <span>{Math.floor(maxValue * 0.5)}</span>
            <span>{Math.floor(maxValue * 0.25)}</span>
            <span>0</span>
          </div>

          <div className="ml-8 flex items-end justify-start h-[200px] border-l border-b border-gray-300 dark:border-gray-600">
            {data.map((item, index) => {
              const uploadHeight = maxValue > 0 ? (item.uploads / maxValue) * chartHeight : 0;
              const downloadHeight = maxValue > 0 ? (item.downloads / maxValue) * chartHeight : 0;

              return (
                <div key={index} className="flex flex-col items-center mr-4" style={{ width: `${barWidth * 2 + 16}px` }}>
                  <div className="flex items-end gap-1 mb-2" style={{ height: `${chartHeight}px` }}>
                    <div
                      className="relative cursor-pointer transition-all hover:opacity-80"
                      style={{
                        width: `${barWidth}px`,
                        height: `${uploadHeight}px`,
                        backgroundColor: '#6366f1',
                        borderRadius: '4px 4px 0 0',
                        minHeight: item.uploads > 0 ? '2px' : '0'
                      }}
                      onMouseEnter={() => setHoveredBar({ index, type: 'upload', value: item.uploads, date: item.date })}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {hoveredBar?.index === index && hoveredBar?.type === 'upload' && (
                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md text-xs shadow-md whitespace-nowrap z-10 ${
                          theme === 'dark' ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-white border border-gray-200 text-gray-900'
                        }`}>
                          <p className="font-medium">{item.date}</p>
                          <p className="text-indigo-500">อัพโหลด: {item.uploads}</p>
                        </div>
                      )}
                    </div>

                    <div
                      className="relative cursor-pointer transition-all hover:opacity-80"
                      style={{
                        width: `${barWidth}px`,
                        height: `${downloadHeight}px`,
                        backgroundColor: '#10b981',
                        borderRadius: '4px 4px 0 0',
                        minHeight: item.downloads > 0 ? '2px' : '0'
                      }}
                      onMouseEnter={() => setHoveredBar({ index, type: 'download', value: item.downloads, date: item.date })}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {hoveredBar?.index === index && hoveredBar?.type === 'download' && (
                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-md text-xs shadow-md whitespace-nowrap z-10 ${
                          theme === 'dark' ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-white border border-gray-200 text-gray-900'
                        }`}>
                          <p className="font-medium">{item.date}</p>
                          <p className="text-green-500">ดาวน์โหลด: {item.downloads}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.date}</p>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-4 mt-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-indigo-500 rounded"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">อัพโหลด</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">ดาวน์โหลด</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const projectYears = [...new Set(userProjects.map(p => new Date(p.start_date).getFullYear()))].sort((a, b) => b - a);
  const yearFilteredProjects = selectedYear === 'all'
    ? userProjects
    : userProjects.filter(p => new Date(p.start_date).getFullYear() === parseInt(selectedYear));

  if (error && !loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <div className={`max-w-sm w-full rounded-lg p-6 shadow-lg ${
            theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
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
                fetchUserProjects();
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

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
      
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <BarChartOutlined /> การจัดการไฟล์
              </h1>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                ภาพรวมการเคลื่อนไหวของไฟล์ในระบบ
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
                <option value="all">ทุกปี ({userProjects.length})</option>
                {projectYears.map((year) => {
                  const yearProjects = userProjects.filter(p => new Date(p.start_date).getFullYear() === year);
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
                  {selectedYear === 'all' ? `ทุกโครงการ (${userProjects.length})` : `ปี ${parseInt(selectedYear) + 543} (${yearFilteredProjects.length})`}
                </option>
                {yearFilteredProjects.map((project) => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => fetchDashboardData()}
                disabled={loading}
                className={`p-2 rounded-md border transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700'
                    : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isConnected ? 'Connected via WebSocket' : 'Disconnected'}
              >
                <ReloadOutlined spin={loading} className={isConnected ? 'text-green-500' : 'text-gray-500'} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-lg p-4 border ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  ไฟล์ทั้งหมด
                </p>
                <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {statistics?.totalFiles?.toLocaleString() || 0}
                </p>
              </div>
              <div className={`p-2 rounded-full ${
                theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-50'
              }`}>
                <FileOutlined className="text-xl text-indigo-500" />
              </div>
            </div>
            {statistics?.recentUploads > 0 && (
              <p className="text-xs text-green-500 mt-2">+{statistics.recentUploads} ใน 24 ชม.</p>
            )}
          </div>

          <div className={`rounded-lg p-4 border ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  ดาวน์โหลดทั้งหมด
                </p>
                <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {statistics?.totalDownloads?.toLocaleString() || 0}
                </p>
              </div>
              <div className={`p-2 rounded-full ${
                theme === 'dark' ? 'bg-green-900/30' : 'bg-green-50'
              }`}>
                <DownloadOutlined className="text-xl text-green-500" />
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-4 border ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  พื้นที่ใช้งาน
                </p>
                <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {statistics?.totalSizeGB || '0'} GB
                </p>
              </div>
              <div className={`p-2 rounded-full ${
                theme === 'dark' ? 'bg-violet-900/30' : 'bg-violet-50'
              }`}>
                <DatabaseOutlined className="text-xl text-violet-500" />
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-4 border ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  โครงการที่เข้าถึงได้
                </p>
                <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {selectedYear === 'all' ? userProjects.length : yearFilteredProjects.length}
                </p>
              </div>
              <div className={`p-2 rounded-full ${
                theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-50'
              }`}>
                <FolderOutlined className="text-xl text-yellow-500" />
              </div>
            </div>
            {selectedYear !== 'all' && (
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                ปี {parseInt(selectedYear) + 543}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className={`rounded-lg border p-4 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <ClockCircleOutlined /> กิจกรรมล่าสุด
            </h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <ClockCircleOutlined className={`text-4xl ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>ยังไม่มีกิจกรรม</p>
                </div>
              ) : (
                recentActivities.map((activity, index) => (
                  <div key={index} className={`flex items-start gap-3 p-2 rounded-md ${
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}>
                    {/* ✅ แก้ไขตรงนี้ - เพิ่ม delete icon */}
                    <span className="text-lg mt-0.5">
                      {activity.activity_type === 'upload' ? (
                        <UploadOutlined className="text-blue-500" />
                      ) : activity.activity_type === 'delete' ? (
                        <DeleteOutlined className="text-red-500" />
                      ) : (
                        <DownloadOutlined className="text-green-500" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          {activity.profile_image ? (
                            <img
                              src={`${IMAGE_BASE_URL}/${activity.profile_image}`}
                              alt={activity.first_name}
                              className="w-6 h-6 rounded-full object-cover"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white font-bold">
                              {activity.first_name?.[0] || 'U'}
                            </div>
                          )}
                          <p className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {activity.first_name} {activity.last_name}
                          </p>
                        </div>
                        {/* ✅ แก้ไขตรงนี้ - เพิ่มข้อความ "ลบ" */}
                        <span className={`text-xs truncate max-w-md ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {activity.activity_type === 'upload' 
                            ? 'อัพโหลด' 
                            : activity.activity_type === 'delete' 
                            ? 'ลบ' 
                            : 'ดาวน์โหลด'
                          } <span className="font-medium">{activity.file_name}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          {activity.project_name && <span className="flex items-center gap-1"><ToolOutlined /> {activity.project_name}</span>}
                          <span>• {formatDate(activity.activity_time)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1"><FolderOutlined /> {activity.folder_name}</span>
                          <span>{activity.file_size_mb} MB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <FireOutlined /> ไฟล์ยอดนิยม
            </h2>
            <div className="space-y-2">
              {topDownloads.length === 0 ? (
                <div className="text-center py-8">
                  <FileOutlined className={`text-4xl ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>ยังไม่มีข้อมูล</p>
                </div>
              ) : (
                topDownloads.map((file, index) => (
                  <div key={index} className={`flex items-center gap-3 p-2 rounded-md ${
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}>
                    <span className="text-2xl">{getFileIcon(file.file_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {file.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1"><DownloadOutlined /> {file.download_count} ครั้ง</span>
                        <span>{file.file_size_mb} MB</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                    }`}>
                      #{index + 1}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={`rounded-lg border p-4 mb-6 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <LineChartOutlined /> สถิติการใช้งานย้อนหลัง 7 วัน
          </h2>
          <CustomBarChart data={chartData} />
        </div>

        <div className={`rounded-lg border p-4 ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <TeamOutlined /> ผู้อัพโหลดอันดับต้น
          </h2>
          {topUploaders.length === 0 ? (
            <div className="text-center py-8">
              <TeamOutlined className={`text-4xl ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>ยังไม่มีข้อมูล</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {topUploaders.map((uploader, index) => (
                <div key={index} className={`text-center p-3 rounded-md ${
                  theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <div className="relative mx-auto mb-2 w-12 h-12">
                    {uploader.profile_image ? (
                      <img
                        src={`${IMAGE_BASE_URL}/${uploader.profile_image}`}
                        alt={uploader.first_name}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center absolute top-0 left-0 ${
                      uploader.profile_image ? 'hidden' : 'flex'
                    }`}>
                      <span className="text-white text-sm font-bold">{uploader.first_name?.[0] || 'U'}</span>
                    </div>
                    {index < 3 && (
                      <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-800' :
                        'bg-orange-400 text-orange-900'
                      }`}>
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <p className={`font-medium text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {uploader.first_name} {uploader.last_name}
                  </p>
                  <div className="mt-1 space-y-1 text-xs text-gray-500">
                    <p className="flex items-center justify-center gap-1"><UploadOutlined /> {uploader.upload_count} ไฟล์</p>
                    <p className="flex items-center justify-center gap-1"><DatabaseOutlined /> {uploader.total_size_gb} GB</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default History;