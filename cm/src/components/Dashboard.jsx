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
      <div className={`group relative rounded-2xl p-6 transition-all duration-500 border ${
        theme === 'dark' 
          ? 'bg-[#121620] border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-white/10' 
          : 'bg-white border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-indigo-200 hover:shadow-[0_8px_30px_rgb(99,102,241,0.12)]'
      } hover:-translate-y-1`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {title}
            </p>
            <p className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              {value}
            </p>
            {subtitle && (
              <p className={`text-[10px] mt-1.5 font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-3.5 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg ${color}`}>
            {IconComponent && <IconComponent className="text-xl" />}
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
      <div className={`group relative rounded-2xl p-6 transition-all duration-500 border ${
        theme === 'dark' 
          ? 'bg-[#121620] border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-white/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]' 
          : 'bg-white border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-indigo-200 hover:shadow-[0_8px_30px_rgb(99,102,241,0.12)]'
      } hover:-translate-y-1 cursor-pointer`}
      onClick={() => (window.location.href = `/cm/projects/${project.project_id}`)}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 pr-4">
            <h3 className={`text-sm font-bold mb-2 leading-tight line-clamp-1 tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
              {project.project_name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                project.status === 'In Progress' 
                  ? 'bg-blue-500/10 text-blue-500'
                  : project.status === 'Completed'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-amber-500/10 text-amber-500'
              }`}>
                {project.status}
              </span>
              {project.start_date && (
                <span className={`text-[10px] font-medium flex items-center gap-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  <CalendarOutlined className="text-[9px]" /> {new Date(project.start_date).toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
              {displayProgress.toFixed(1)}<span className="text-sm opacity-60">%</span>
            </div>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="mb-5">
          <div className={`w-full rounded-full h-1.5 overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                displayProgress >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]'
              }`}
              style={{ width: `${Math.min(displayProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Payment Summary Grid */}
        <div className={`flex justify-between items-center mb-5 p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-[#0f121a] border-white/5' : 'bg-slate-50/50 border-slate-100/50'}`}>
          <div className="text-center flex-1">
            <div className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{paidInstallments}</div>
            <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">ชำระแล้ว</div>
          </div>
          <div className={`w-px h-6 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
          <div className="text-center flex-1">
            <div className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{pendingInstallments}</div>
            <div className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mt-0.5">รอชำระ</div>
          </div>
          <div className={`w-px h-6 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
          <div className="text-center flex-1">
            <div className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{overdueInstallments}</div>
            <div className="text-[9px] font-bold text-rose-500 uppercase tracking-wider mt-0.5">เกินกำหนด</div>
          </div>
        </div>

        {/* Financial Info */}
        <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <span className={`text-[10px] font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>รายรับจริง / มูลค่าสัญญา</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="text-sm font-bold tracking-tight text-emerald-500">
              {formatCurrency(project.received_revenue)}
            </div>
            <div className={`text-[11px] font-medium tracking-tight ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>
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
          <div className={`max-w-md w-full rounded-lg p-10 transition-all duration-300 border ${
            theme === 'dark' ? 'bg-[#141414] border-slate-800 shadow-sm' : 'bg-white border-slate-200 shadow-sm'
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
    <div className={`page-wrapper w-full font-kanit transition-all duration-300 overflow-auto pb-12`}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />
      
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Tender Mode Banner */}
        {isTenderMode && (
          <div className="mb-8 p-6 rounded-[2.5rem] bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent border border-sky-500/20 shadow-xl shadow-sky-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <ThunderboltOutlined className="text-8xl text-sky-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span 
                  className="px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-md"
                  style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', boxShadow: '0 4px 12px #0284c750' }}
                >
                  🚀 Tender Mode Active
                </span>
              </div>
              <h2 className={`text-2xl font-black mb-2 ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>
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
              <div className={`p-4 rounded-[1.5rem] mr-5 ${theme === 'dark' 
                ? (isTenderMode ? 'bg-sky-500/10' : 'bg-indigo-500/10') 
                : (isTenderMode ? 'bg-sky-50' : 'bg-indigo-50')}`}>
                <BarChartOutlined className={`text-4xl ${theme === 'dark' 
                  ? (isTenderMode ? 'text-sky-400' : 'text-indigo-400') 
                  : (isTenderMode ? 'text-sky-600' : 'text-indigo-600')}`} />
              </div>
              <div>
                <h1 className={`font-kanit ${theme === 'dark' ? 'text-white' : 'text-slate-800'} !mb-0 text-2xl sm:text-3xl font-bold tracking-tight`}>
                  Dashboard {isTenderMode ? 'ประมูลงาน' : ''}
                </h1>
                <p className={`font-kanit ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-sm font-medium mt-1.5 tracking-wide`}>
                  {isTenderMode ? 'วิเคราะห์ข้อมูลการเสนอราคาและสถิติโฟลเดอร์ประมูล' : 'ติดตามและวิเคราะห์ความคืบหน้าโครงการแบบเรียลไทม์'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className={`flex items-center p-1.5 rounded-[1rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border ${theme === 'dark' ? 'bg-[#121620] border-white/5' : 'bg-white border-slate-200/60'}`}>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedProject('all');
                }}
                className={`bg-transparent px-4 py-1.5 text-sm font-semibold focus:outline-none cursor-pointer ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}
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
                className={`bg-transparent px-4 py-1.5 text-sm font-semibold focus:outline-none max-w-[250px] cursor-pointer ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}
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
              className={`p-3.5 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300 hover:scale-105 border-0 ${
                theme === 'dark' 
                  ? (isTenderMode ? 'bg-sky-600 text-white hover:bg-sky-500' : 'bg-indigo-600 text-white hover:bg-indigo-500') 
                  : (isTenderMode ? 'bg-white text-sky-600 hover:text-sky-500 border border-sky-100' : 'bg-white text-indigo-600 hover:text-indigo-500 border border-indigo-100')
              }`}
            >
              <ReloadOutlined spin={loading} className="text-lg" />
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
          <div className={`rounded-2xl p-7 transition-all duration-500 border ${
            theme === 'dark' ? 'bg-[#121620] border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]' : 'bg-white border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
          }`}>
            <div className="flex items-center justify-between mb-8">
              <h2 className={`text-lg font-bold flex items-center gap-3 tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                <div className={`w-1.5 h-6 rounded-full ${isTenderMode ? 'bg-sky-500' : 'bg-indigo-500'}`}></div>
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
                  <Bar dataKey="total_revenue" fill={isTenderMode ? '#0ea5e9' : '#6366f1'} name="มูลค่าสัญญา" radius={[6, 6, 0, 0]} barSize={35} />
                  <Bar dataKey="received_revenue" fill="#10b981" name="รับชำระแล้ว" radius={[6, 6, 0, 0]} barSize={35} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* S-Curve/Secondary Chart */}
          <div className={`rounded-2xl p-7 transition-all duration-500 border ${
            theme === 'dark' ? 'bg-[#121620] border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]' : 'bg-white border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
          }`}>
             {selectedProject !== 'all' && yearFilteredProjects[0]?.scurve_data?.length > 0 ? (
               <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <h2 className={`text-lg font-bold flex items-center gap-3 tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                    S-Curve Progress
                  </h2>
                  <div className={`px-4 py-2 rounded-2xl text-xs font-bold ${theme === 'dark' 
                    ? (isTenderMode ? 'bg-slate-900/50 text-sky-400' : 'bg-slate-900/50 text-indigo-400') 
                    : (isTenderMode ? 'bg-sky-50 text-sky-600' : 'bg-indigo-50 text-indigo-600')}`}>
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
                      <Area type="monotone" dataKey="plan" stroke={isTenderMode ? '#0ea5e9' : '#6366f1'} strokeWidth={3} fillOpacity={1} fill="url(#colorPlan)" name="แผนงาน" />
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
          <h2 className={`text-xl font-bold mb-8 flex items-center gap-3 tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
            <FolderOutlined className={isTenderMode ? 'text-sky-500' : 'text-indigo-500'} /> สถานะโครงการรายบุคคล
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
            {yearFilteredProjects.map((project) => (
              <ProjectCard key={project.project_id} project={project} />
            ))}
          </div>
          
          {yearFilteredProjects.length === 0 && (
            <div className={`p-20 rounded-lg text-center border-2 border-dashed ${
              theme === 'dark' ? 'bg-[#141414] border-slate-800 text-slate-700' : 'bg-slate-50/50 border-slate-100 text-slate-400'
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