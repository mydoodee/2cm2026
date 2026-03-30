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
  WarningOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import Navbar from './Navbar';
import api from '../axiosConfig';

const Dashboard = ({ user, setUser, theme, setTheme, activeCompany, setActiveCompany }) => {
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [overallStats, setOverallStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);



  // Fetch Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, projectsResponse] = await Promise.all([
        api.get('/api/dashboard/overall-stats'),
        api.get('/api/dashboard/project-stats')
      ]);

      setOverallStats(statsResponse.data.overall || {});
      setProjects(projectsResponse.data.projects || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const errorMessage = error.message || 'ไม่สามารถโหลดข้อมูลได้';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

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
      <div className={`group relative rounded-[2rem] p-6 transition-all duration-300 border-0 ${
        theme === 'dark' 
          ? 'bg-slate-800/40 hover:bg-slate-800/60 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' 
          : 'bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {title}
            </p>
            <p className={`text-3xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              {value}
            </p>
            {subtitle && (
              <p className={`text-xs mt-2 font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-4 rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-lg ${color}`}>
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
    
    const displayProgress = project.progress ? parseFloat(project.progress) : completionRate;
    const paidInstallments = project.scurve_data?.filter(d => d.payment_status === 'paid').length || 0;
    const overdueInstallments = project.scurve_data?.filter(d => d.payment_status === 'overdue').length || 0;
    const pendingInstallments = project.scurve_data?.filter(d => d.payment_status === 'pending').length || 0;

    return (
      <div className={`group relative rounded-[2.5rem] p-7 transition-all duration-500 border-0 ${
        theme === 'dark' 
          ? 'bg-slate-800/40 hover:bg-slate-800/60 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' 
          : 'bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
      } cursor-pointer`}
      onClick={() => (window.location.href = `/cm/projects/${project.project_id}`)}>
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 pr-4">
            <h3 className={`text-xl font-bold mb-2 leading-tight line-clamp-1 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              {project.project_name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider ${
                project.status === 'In Progress' 
                  ? 'bg-blue-500/10 text-blue-500'
                  : project.status === 'Completed'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-amber-500/10 text-amber-500'
              }`}>
                {project.status}
              </span>
              {project.start_date && (
                <span className={`text-xs font-medium flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  <CalendarOutlined className="text-[10px]" /> {new Date(project.start_date).toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-black ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
              {displayProgress.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="mb-6 space-y-2">
          <div className={`w-full rounded-full h-3 ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
            <div 
              className={`h-3 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.2)] ${
                displayProgress >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
              }`}
              style={{ width: `${Math.min(displayProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Payment Summary Grid */}
        <div className={`grid grid-cols-3 gap-3 mb-6 p-4 rounded-3xl ${theme === 'dark' ? 'bg-slate-900/40' : 'bg-slate-50'}`}>
          <div className="text-center">
            <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{paidInstallments}</div>
            <div className="text-[10px] font-bold text-emerald-500 uppercase">ชำระแล้ว</div>
          </div>
          <div className="text-center border-x border-slate-700/20">
            <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{pendingInstallments}</div>
            <div className="text-[10px] font-bold text-amber-500 uppercase">รอชำระ</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{overdueInstallments}</div>
            <div className="text-[10px] font-bold text-rose-500 uppercase">เกินกำหนด</div>
          </div>
        </div>

        {/* Financial Info */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>รายได้ที่ได้รับ (เขียว) / ทั้งหมด</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="text-lg font-black text-emerald-500">
              {formatCurrency(project.received_revenue)}
            </div>
            <div className={`text-sm font-bold opacity-40 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              {formatCurrency(project.total_revenue)}
            </div>
          </div>
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
    return acc;
  }, {
    totalRevenue: 0,
    totalReceived: 0,
    totalProjects: 0,
    totalProgress: 0
  });

  filteredStats.averageProgress = filteredStats.totalProjects > 0 
    ? filteredStats.totalProgress / filteredStats.totalProjects 
    : 0;

  if (error && !loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'}`}>
        <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <div className={`max-w-md w-full rounded-[2.5rem] p-10 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
          }`}>
            <h3 className={`text-2xl font-black mb-4 flex items-center gap-3 ${theme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>
              <WarningOutlined /> เกิดข้อผิดพลาด
            </h3>
            <p className={`mb-8 text-lg font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
              {error}
            </p>
            <button
              onClick={() => {
                setError(null);
                fetchDashboardData();
              }}
              className="w-full py-4 rounded-2xl font-bold text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02]"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isTenderMode = activeCompany?.company_name?.toLowerCase().includes('tender');

  return (
    <div className={`min-h-screen w-full font-kanit ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'} transition-all duration-500 overflow-auto pb-12`}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />
      
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Tender Mode Banner */}
        {isTenderMode && (
          <div className="mb-8 p-6 rounded-[2.5rem] bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-xl shadow-amber-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <ThunderboltOutlined className="text-8xl text-amber-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full bg-amber-500 text-[10px] font-black text-white uppercase tracking-[0.2em]">🚧 Tender Mode Active</span>
              </div>
              <h2 className={`text-2xl font-black mb-2 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                โหมดเตรียมการประมูลงาน
              </h2>
              <p className={`max-w-2xl font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                คุณกำลังอยู่ในการจัดการข้อมูลสำหรับการเสนอราคางาน (Tender) ในโหมดนี้คุณสามารถเตรียมเอกสารและแบบแปลนได้ล่วงหน้า 
                และเมื่อประมูลชนะ สามารถกดย้ายเข้าสู่ระบบบริหารงานจริงได้ทันทีที่เมนูโครงการ
              </p>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-12 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-8">
          <div>
            <div className="flex items-center mb-4">
              <div className={`p-4 rounded-[1.5rem] mr-5 ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                <BarChartOutlined className={`text-4xl ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
              <div>
                <h1 className={`font-kanit ${theme === 'dark' ? 'text-white' : 'text-slate-800'} !mb-0 text-3xl sm:text-4xl font-extrabold tracking-tight`}>
                  Dashboard {isTenderMode ? 'ประมูลงาน' : ''}
                </h1>
                <p className={`font-kanit ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-lg mt-1`}>
                  {isTenderMode ? 'วิเคราะห์ข้อมูลการเสนอราคาและสถิติโฟลเดอร์ประมูล' : 'ติดตามและวิเคราะห์ความคืบหน้าโครงการแบบเรียลไทม์'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className={`flex p-1.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] ${theme === 'dark' ? 'bg-slate-800/80' : 'bg-white'}`}>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedProject('all');
                }}
                className={`bg-transparent px-4 py-2 font-bold focus:outline-none cursor-pointer ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}
              >
                <option value="all">ทุกปี ({projects.length})</option>
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
              onClick={handleRefresh}
              className={`p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:scale-105 border-0 ${
                theme === 'dark' ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-white text-indigo-600'
              }`}
            >
              <ReloadOutlined spin={loading} className="text-xl" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            title="มูลค่ารวมทั้งหมด"
            value={formatCurrency(selectedYear === 'all' && selectedProject === 'all' ? overallStats?.totalRevenue : filteredStats.totalRevenue)}
            subtitle={selectedYear === 'all' ? 'ทุกโครงการในระบบ' : `โครงการประจำปี ${parseInt(selectedYear) + 543}`}
            color={theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}
            IconComponent={DollarOutlined}
          />
          <StatCard
            title="รายได้ที่รับจริง"
            value={formatCurrency(selectedYear === 'all' && selectedProject === 'all' ? overallStats?.totalReceived : filteredStats.totalReceived)}
            subtitle="ชำระเงินเรียบร้อยแล้ว"
            color={theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}
            IconComponent={RiseOutlined}
          />
          <StatCard
            title="จํานวนโครงการ"
            value={selectedYear === 'all' && selectedProject === 'all' ? overallStats?.totalProjects : filteredStats.totalProjects}
            subtitle="โครงการที่กำลังดำเนินการ"
            color={theme === 'dark' ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-50 text-violet-600'}
            IconComponent={FolderOutlined}
          />
          <StatCard
            title="คืบหน้าเฉลี่ย"
            value={`${(selectedYear === 'all' && selectedProject === 'all' ? (overallStats?.averageProgress || 0) : filteredStats.averageProgress).toFixed(1)}%`}
            subtitle="อัตราความสำเร็จโดยรวม"
            color={theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'}
            IconComponent={ThunderboltOutlined}
          />
        </div>

        {/* Content Section: Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
          {/* Main Chart Card */}
          <div className={`rounded-[2.5rem] p-8 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
          }`}>
            <div className="flex items-center justify-between mb-8">
              <h2 className={`text-xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                เปรียบเทียบร่ายได้โครงการ
              </h2>
            </div>
            
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={yearFilteredProjects} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                  <XAxis 
                    dataKey="project_name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 500, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 500, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }}
                    tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    contentStyle={{ 
                      borderRadius: '20px', 
                      border: 'none',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                      color: theme === 'dark' ? '#ffffff' : '#000000',
                      padding: '15px'
                    }}
                    formatter={(value) => [formatCurrency(value), '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="total_revenue" fill="#6366f1" name="มูลค่าสัญญา" radius={[6, 6, 0, 0]} barSize={35} />
                  <Bar dataKey="received_revenue" fill="#10b981" name="รับชำระแล้ว" radius={[6, 6, 0, 0]} barSize={35} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* S-Curve/Secondary Chart */}
          <div className={`rounded-[2.5rem] p-8 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
          }`}>
             {selectedProject !== 'all' && yearFilteredProjects[0]?.scurve_data?.length > 0 ? (
               <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <h2 className={`text-xl font-bold flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                    S-Curve Progress
                  </h2>
                  <div className={`px-4 py-2 rounded-2xl text-xs font-bold ${theme === 'dark' ? 'bg-slate-900/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    ทั้งหมด {yearFilteredProjects[0]?.payment_info?.total_installments || 0} งวด
                  </div>
                </div>
                
                <div className="w-full h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yearFilteredProjects[0].scurve_data}>
                      <defs>
                        <linearGradient id="colorPlan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                      <XAxis 
                        dataKey="installment" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 500, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fontWeight: 500, fill: theme === 'dark' ? '#64748b' : '#94a3b8' }}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '20px', 
                          border: 'none',
                          boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                          backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                          padding: '15px'
                        }}
                      />
                      <Area type="monotone" dataKey="plan" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPlan)" name="แผนงาน" />
                      <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorActual)" name="ผลงานจริง" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
               </>
             ) : (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                  <LineChartOutlined className={`text-6xl mb-4 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-200'}`} />
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>เลือกโครงการเพื่อดูรายละเอียด S-Curve</h3>
                </div>
             )}
          </div>
        </div>

        {/* Projects Grid Section */}
        <div className="mb-12">
          <h2 className={`text-2xl font-black mb-8 flex items-center gap-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
            <FolderOutlined className="text-indigo-500" /> สถานะโครงการรายบุคคล
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
            {yearFilteredProjects.map((project) => (
              <ProjectCard key={project.project_id} project={project} />
            ))}
          </div>
          
          {yearFilteredProjects.length === 0 && (
            <div className={`p-20 rounded-[3rem] text-center border-2 border-dashed ${
              theme === 'dark' ? 'bg-slate-800/20 border-slate-800 text-slate-700' : 'bg-slate-50/50 border-slate-200 text-slate-300'
            }`}>
              <BarChartOutlined className="text-8xl mb-6 opacity-20" />
              <h3 className="text-xl font-bold uppercase tracking-widest opacity-40">ไม่พบโครงการที่ตรงตามเงื่อนไข</h3>
            </div>
          )}
        </div>
      </div>

      <style jsx="true">{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@200;300;400;500;600;700;800;900&display=swap');
        
        body {
          font-family: 'Kanit', sans-serif !important;
        }

        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Customize scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${theme === 'dark' ? '#1e293b' : '#e2e8f0'};
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${theme === 'dark' ? '#334155' : '#cbd5e1'};
        }
      `}</style>
    </div>
  );
};

export default Dashboard;