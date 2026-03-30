import { useState, useEffect, useCallback } from 'react';
import Navbar from './Navbar';
import axios from 'axios';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  DeleteOutlined,
  RiseOutlined,
  ThunderboltOutlined,
  WarningOutlined
} from '@ant-design/icons';

import api from '../axiosConfig';

// ⭐ API URLs
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:3050';

// ⭐ Socket.IO Base URL
const SOCKET_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3050').replace('/cm-api', '');

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
  const [isConnected, setIsConnected] = useState(false);



  const fetchUserProjects = useCallback(async () => {
    try {
      const response = await api.get('/api/projects');
      
      if (response.data && response.data.projects) {
        setUserProjects(response.data.projects);
      } else {
        setUserProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('ไม่สามารถโหลดข้อมูลโครงการได้');
    }
  }, []);

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
        name: dateStr,
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

      const [statsResponse, activitiesResponse, downloadsResponse, uploadersResponse] = await Promise.all([
        api.get(selectedProject !== 'all' ? `/api/file-statistics/project/${selectedProject}` : '/api/file-statistics'),
        api.get(selectedProject === 'all' ? '/api/file-activities/recent?limit=100' : `/api/file-activities/project/${selectedProject}?limit=100`),
        api.get(`/api/top-downloads?limit=5${selectedProject !== 'all' ? `&projectId=${selectedProject}` : ''}`),
        api.get(`/api/top-uploaders?limit=5${selectedProject !== 'all' ? `&projectId=${selectedProject}` : ''}`)
      ]);

      setStatistics(statsResponse.data.statistics || {});
      const activities = activitiesResponse.data.activities || [];
      setRecentActivities(activities.slice(0, 10));
      setChartData(generateChartData(activities));
      setTopDownloads(downloadsResponse.data.topFiles || []);
      setTopUploaders(uploadersResponse.data.topUploaders || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const errorMessage = error.message || 'ไม่สามารถโหลดข้อมูลได้';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedProject, generateChartData]);

  const addActivityIfValid = useCallback((activity) => {
    if (selectedProject !== 'all' && activity.project_id !== selectedProject) {
      return;
    }

    const getActivityKey = (act) => {
      const time = new Date(act.activity_time);
      const minute = time.getMinutes();
      const roundedSeconds = Math.floor(time.getSeconds() / 10) * 10;
      return `${act.user_id}-${act.file_id}-${act.activity_type}-${time.getFullYear()}-${time.getMonth()}-${time.getDate()}-${time.getHours()}-${minute}-${roundedSeconds}`;
    };

    setRecentActivities(prev => {
      const key = getActivityKey(activity);
      const exists = prev.some(a => getActivityKey(a) === key);
      if (exists) return prev;

      const newActivity = {
        ...activity,
        file_size_mb: activity.file_size_mb || (activity.file_size / (1024 * 1024)).toFixed(2)
      };
      return [newActivity, ...prev].slice(0, 10);
    });

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
        } else if (activity.activity_type === 'download') {
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
    if (userProjects.length === 0) return;

    const token = localStorage.getItem('token');
    if (!token) return;
    
    const socketInstance = io(SOCKET_BASE_URL, {
      auth: { token: token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      withCredentials: true,
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      const projectIds = userProjects.map(p => p.project_id);
      if (projectIds.length > 0) {
        socketInstance.emit('join-projects', projectIds);
      }
    });

    socketInstance.on('disconnect', () => setIsConnected(false));
    socketInstance.on('file-activity', (activity) => addActivityIfValid(activity));

    return () => {
      socketInstance.offAny();
      socketInstance.disconnect();
    };
  }, [userProjects.length, addActivityIfValid]);

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
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getFileIcon = (fileType) => {
    const type = fileType ? fileType.toLowerCase() : '';
    if (['pdf'].includes(type)) return <FilePdfOutlined className="text-red-500" />;
    if (['doc', 'docx'].includes(type)) return <FileWordOutlined className="text-blue-500" />;
    if (['xls', 'xlsx'].includes(type)) return <FileExcelOutlined className="text-green-600" />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(type)) return <FileImageOutlined className="text-purple-500" />;
    if (['dwg', 'dxf'].includes(type)) return <ToolOutlined className="text-orange-500" />;
    return <FileTextOutlined className="text-gray-500" />;
  };

  const ActivityIcon = ({ type }) => {
    switch (type) {
      case 'upload': return <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 shadow-sm"><UploadOutlined className="text-xl" /></div>;
      case 'download': return <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-sm"><DownloadOutlined className="text-xl" /></div>;
      case 'delete': return <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 shadow-sm"><DeleteOutlined className="text-xl" /></div>;
      default: return <div className="p-3 rounded-2xl bg-slate-500/10 text-slate-500 shadow-sm"><ClockCircleOutlined className="text-xl" /></div>;
    }
  };

  const LeaderboardItem = ({ item, type, index }) => (
    <div className={`flex items-center justify-between p-5 rounded-3xl transition-all duration-300 mb-3 ${
      theme === 'dark' ? 'bg-slate-900/40 hover:bg-slate-900/60' : 'bg-white shadow-sm hover:shadow-lg'
    }`}>
      <div className="flex items-center gap-5">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-md ${
          index === 0 ? 'bg-amber-400 text-amber-900 ring-4 ring-amber-400/20' : 
          index === 1 ? 'bg-slate-300 text-slate-800 ring-4 ring-slate-300/20' :
          index === 2 ? 'bg-amber-700 text-white ring-4 ring-amber-700/20' :
          theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
        }`}>
          {index + 1}
        </div>
        <div className="flex items-center gap-3">
          {item.profile_image ? (
            <img 
              src={`${IMAGE_BASE_URL}/${item.profile_image}`} 
              className="w-10 h-10 rounded-full object-cover shadow-sm"
              alt={item.first_name}
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div className={`w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold ${item.profile_image ? 'hidden' : 'flex'}`}>
            {item.first_name?.[0] || 'U'}
          </div>
          <div>
            <p className={`font-bold text-base line-clamp-1 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              {item.first_name} {item.last_name}
            </p>
            <p className={`text-[10px] font-bold tracking-wide uppercase ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              {type === 'upload' ? `${item.total_size_gb} GB` : 'TOP DOWNLOADER'}
            </p>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-2xl font-black ${type === 'upload' ? 'text-indigo-500' : 'text-emerald-500'}`}>
          {type === 'upload' ? item.upload_count : item.download_count}
        </div>
        <div className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">
          {type === 'upload' ? 'อัปโหลด' : 'ดาวน์โหลด'}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
        <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className={`inline-block animate-spin rounded-full h-12 w-12 border-4 border-t-indigo-500 mb-6 ${
              theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
            }`}></div>
            <p className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              กำลังโหลดข้อมูล...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
        <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <div className={`max-w-md w-full rounded-[2.5rem] p-10 text-center ${
            theme === 'dark' ? 'bg-slate-800 shadow-2xl' : 'bg-white shadow-xl'
          }`}>
            <WarningOutlined className="text-6xl text-rose-500 mb-6" />
            <h3 className={`text-2xl font-black mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>เกิดข้อผิดพลาด</h3>
            <p className={`mb-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{error}</p>
            <button
              onClick={() => { setError(null); fetchDashboardData(); }}
              className="w-full py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      </div>
    );
  }

  const projectYears = [...new Set(userProjects.map(p => new Date(p.start_date).getFullYear()))].sort((a, b) => b - a);
  const yearFilteredProjects = selectedYear === 'all'
    ? userProjects
    : userProjects.filter(p => new Date(p.start_date).getFullYear() === parseInt(selectedYear));

  return (
    <div className={`min-h-screen w-full font-kanit ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'} transition-all duration-500 overflow-auto pb-12`}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
      
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-12 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-8">
          <div>
            <div className="flex items-center mb-4">
              <div className={`p-4 rounded-[1.5rem] mr-5 ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                <ClockCircleOutlined className={`text-4xl ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
              <div>
                <h1 className={`font-kanit ${theme === 'dark' ? 'text-white' : 'text-slate-800'} !mb-0 text-3xl sm:text-4xl font-extrabold tracking-tight`}>
                  History & Activity
                </h1>
                <p className={`font-kanit ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-lg mt-1`}>
                  บันทึกกิจกรรมย้อนหลังและสรุปสถิติผู้ใช้งาน
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className={`flex p-1.5 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-slate-800/80 border border-slate-700/50' : 'bg-white border border-slate-100'}`}>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedProject('all');
                }}
                className={`bg-transparent px-4 py-2 font-bold focus:outline-none cursor-pointer ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}
              >
                <option value="all">ทุกปี ({userProjects.length})</option>
                {projectYears.map((year) => (
                  <option key={year} value={year} className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>
                    ปี {year + 543}
                  </option>
                ))}
              </select>
              <div className={`w-px h-6 self-center mx-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={`bg-transparent px-4 py-2 font-bold focus:outline-none max-w-[250px] cursor-pointer ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}
              >
                <option value="all">ทุกโครงการ</option>
                {yearFilteredProjects.map((p) => (
                  <option key={p.project_id} value={p.project_id} className={theme === 'dark' ? 'bg-slate-800' : 'bg-white'}>
                    {p.project_name}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={() => fetchDashboardData()}
              className={`p-4 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 ${
                theme === 'dark' ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-white text-indigo-600 border border-slate-100'
              }`}
            >
              <ReloadOutlined spin={loading} className={`text-xl ${isConnected ? 'text-green-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
           <div className={`group relative rounded-[2rem] p-6 transition-all duration-300 border-0 ${
            theme === 'dark' ? 'bg-slate-800/40 hover:bg-slate-800/60 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>ไฟล์ทั้งหมด</p>
                <p className={`text-3xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{statistics?.totalFiles?.toLocaleString() || 0}</p>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-500 shadow-lg"><FileOutlined className="text-2xl" /></div>
            </div>
          </div>

          <div className={`group relative rounded-[2rem] p-6 transition-all duration-300 border-0 ${
            theme === 'dark' ? 'bg-slate-800/40 hover:bg-slate-800/60 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>ดาวน์โหลดรวม</p>
                <p className={`text-3xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{statistics?.totalDownloads?.toLocaleString() || 0}</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-lg"><DownloadOutlined className="text-2xl" /></div>
            </div>
          </div>

          <div className={`group relative rounded-[2rem] p-6 transition-all duration-300 border-0 ${
            theme === 'dark' ? 'bg-slate-800/40 hover:bg-slate-800/60 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>พื้นที่ใช้งาน</p>
                <p className={`text-3xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{statistics?.totalSizeGB || 0} GB</p>
              </div>
              <div className="p-4 rounded-2xl bg-violet-500/10 text-violet-500 shadow-lg"><DatabaseOutlined className="text-2xl" /></div>
            </div>
          </div>

          <div className={`group relative rounded-[2rem] p-6 transition-all duration-300 border-0 ${
            theme === 'dark' ? 'bg-slate-800/40 hover:bg-slate-800/60 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>โครงการที่เข้าถึง</p>
                <p className={`text-3xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{selectedYear === 'all' ? userProjects.length : yearFilteredProjects.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500 shadow-lg"><FolderOutlined className="text-2xl" /></div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
          <div className={`xl:col-span-2 rounded-[3rem] p-10 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
          }`}>
            <h2 className={`text-2xl font-black mb-8 flex items-center gap-4 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              <div className="w-2.5 h-10 bg-indigo-500 rounded-full"></div>
              สถิติช่วง 7 วันที่ผ่านมา
            </h2>
            <div className="w-full h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 13, fontWeight: 600, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    contentStyle={{ 
                      borderRadius: '25px', 
                      border: 'none',
                      boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
                      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                      padding: '20px',
                      color: theme === 'dark' ? 'white' : 'black'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px' }} />
                  <Bar dataKey="uploads" name="อัปโหลด" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={35} />
                  <Bar dataKey="downloads" name="ดาวน์โหลด" fill="#10b981" radius={[10, 10, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`rounded-[3rem] p-10 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
          }`}>
             <h2 className={`text-2xl font-black mb-10 flex items-center gap-4 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              <div className="w-2.5 h-10 bg-amber-500 rounded-full"></div>
              ไฟล์ยอดนิยม
            </h2>
            <div className="space-y-4">
              {topDownloads.map((file, index) => (
                <div key={index} className={`flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 ${
                  theme === 'dark' ? 'bg-slate-900/40 hover:bg-slate-900/60' : 'bg-slate-50 hover:bg-slate-100'
                }`}>
                  <div className="text-3xl">{getFileIcon(file.file_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{file.file_name}</p>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1">{file.download_count} ดาวน์โหลด</p>
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                    index === 0 ? 'bg-amber-400 text-amber-900 shadow-lg shadow-amber-400/20' : 
                    theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-400 shadow-sm'
                  }`}>
                    {index + 1}
                  </div>
                </div>
              ))}
              {topDownloads.length === 0 && (
                <div className="py-20 text-center opacity-20">
                  <DatabaseOutlined className="text-6xl mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">ไม่มีข้อมูลไฟล์ยอดนิยม</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity and Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-10">
          <div className={`2xl:col-span-1 rounded-[3rem] p-10 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
          }`}>
            <h2 className={`text-2xl font-black mb-10 flex items-center justify-between ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              <span className="flex items-center gap-4">
                <div className="w-2.5 h-10 bg-indigo-500 rounded-full"></div>
                กิจกรรมล่าสุด
              </span>
              <span className={`text-[10px] px-4 py-2 rounded-2xl font-bold uppercase tracking-widest ${theme === 'dark' ? 'bg-slate-900/60 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                LIVE
              </span>
            </h2>
            
            <div className="space-y-4 max-h-[700px] overflow-auto pr-4 -mr-4 scrollbar-hide">
              {recentActivities.map((activity, idx) => (
                <div key={idx} className={`group flex gap-5 p-5 rounded-[2.5rem] transition-all duration-300 ${
                  theme === 'dark' ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'
                }`}>
                  <ActivityIcon type={activity.activity_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                         {activity.profile_image ? (
                           <img 
                            src={`${IMAGE_BASE_URL}/${activity.profile_image}`} 
                            className="w-6 h-6 rounded-full object-cover" 
                            alt=""
                            onError={(e) => e.target.style.display = 'none'}
                          />
                         ) : (
                           <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] text-white font-black">
                            {activity.first_name?.[0] || 'U'}
                           </div>
                         )}
                         <p className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                           {activity.first_name} {activity.last_name}
                         </p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {formatDate(activity.activity_time)}
                      </span>
                    </div>
                    <p className={`text-xs line-clamp-1 mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      <span className="font-bold text-indigo-500">{activity.activity_type === 'upload' ? 'อัปโหลด' : activity.activity_type === 'delete' ? 'ลบ' : 'ดาวน์โหลด'}</span>: {activity.file_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                        theme === 'dark' ? 'bg-slate-900/80 text-slate-500' : 'bg-white shadow-sm text-slate-400'
                      }`}>
                        {activity.project_name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 opacity-50">{activity.file_size_mb} MB</span>
                    </div>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <div className="py-20 text-center opacity-20">
                  <ClockCircleOutlined className="text-6xl mb-4" />
                  <p className="font-bold uppercase tracking-widest">ยังไม่มีกิจกรรม</p>
                </div>
              )}
            </div>
          </div>

          <div className="2xl:col-span-2 space-y-10">
            <div className={`rounded-[3rem] p-10 transition-all duration-300 ${
              theme === 'dark' ? 'bg-slate-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
            }`}>
              <h2 className={`text-2xl font-black mb-10 flex items-center gap-4 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                <div className="w-2.5 h-10 bg-emerald-500 rounded-full"></div>
                ผู้อัปโหลดสูงสุด (Top Contributors)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topUploaders.map((uploader, idx) => (
                  <LeaderboardItem key={idx} item={uploader} type="upload" index={idx} />
                ))}
              </div>
              {topUploaders.length === 0 && (
                <div className="py-20 text-center opacity-20">
                  <TeamOutlined className="text-6xl mb-4" />
                  <p className="font-bold uppercase tracking-widest">ยังไม่มีข้อมูล</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx="true">{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@200;300;400;500;600;700;800;900&display=swap');
        
        body {
          font-family: 'Kanit', sans-serif !important;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${theme === 'dark' ? '#1e293b' : '#e2e8f0'};
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

export default History;