import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Space, Progress, Badge, message, Input } from 'antd';
import { FileTextOutlined, CalendarOutlined, TeamOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar';
import api from '../../axiosConfig';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import 'antd/dist/reset.css';

const { Title, Text } = Typography;

function Projects({ user, setUser, theme, setTheme }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const processProjectData = useCallback((projectsData) => {
    const grouped = projectsData.reduce((acc, project) => {
      const formattedStartDate = project.start_date && dayjs(project.start_date).isValid()
        ? dayjs(project.start_date).format('YYYY-MM-DD')
        : null;
      const formattedEndDate = project.end_date && dayjs(project.end_date).isValid()
        ? dayjs(project.end_date).format('YYYY-MM-DD')
        : null;

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!formattedStartDate || !formattedEndDate ||
        !dateRegex.test(formattedStartDate) || !dateRegex.test(formattedEndDate)) {
        return acc;
      }

      const year = new Date(formattedStartDate).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push({
        ...project,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        team_members: project.team_members || [],
        progress: project.progress || 0,
      });
      return acc;
    }, {});

    // ✅ Sort projects within each year (latest job_number first)
    Object.keys(grouped).forEach(year => {
      grouped[year].sort((a, b) => {
        const jobA = a.job_number || '';
        const jobB = b.job_number || '';
        return jobB.localeCompare(jobA, undefined, { numeric: true, sensitivity: 'base' });
      });
    });

    return grouped;
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/api/projects');

      if (response.data && response.data.projects) {
        const groupedProjects = processProjectData(response.data.projects);
        setProjects(groupedProjects);

        // ✅ กำหนดปีเริ่มต้น: ปีปัจจุบัน หรือ ปีที่ล่าสุดที่มีโครงการ
        const availableYears = Object.keys(groupedProjects).sort((a, b) => Number(b) - Number(a));
        const currentYear = new Date().getFullYear().toString();

        if (groupedProjects[currentYear]) {
          setSelectedYear(currentYear);
        } else if (availableYears.length > 0) {
          setSelectedYear(availableYears[0]);
        }
      } else {
        setProjects({});
      }
    } catch (error) {
      if (error.message !== 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่') {
        const errorMessage = error.message || 'ไม่สามารถโหลดข้อมูลโครงการได้';
        message.error(errorMessage);
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [processProjectData]);

  const formatThaiDate = useCallback((dateString) => {
    if (!dateString || !dayjs(dateString).isValid()) {
      return 'วันที่ไม่ถูกต้อง';
    }

    const date = dayjs(dateString);
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    return `${date.date()} ${thaiMonths[date.month()]} ${date.year() + 543}`;
  }, []);

  const handleProjectClick = useCallback((projectId) => {
    try {
      navigate(`/project/${projectId}`);
    } catch {
      message.error('ไม่สามารถเปิดหน้าโครงการได้');
    }
  }, [navigate]);

  const handleYearChange = useCallback((year) => {
    setSelectedYear(year);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      if (mounted) {
        await fetchProjects();
      }
    };

    loadProjects();

    return () => {
      mounted = false;
    };
  }, [fetchProjects]);

  useEffect(() => {
    return () => {
      if (window.cancelTokenSource) {
        window.cancelTokenSource.cancel('Component unmounted');
      }
    };
  }, []);

  const years = Object.keys(projects).sort((a, b) => Number(b) - Number(a));

  // Filter projects based on search term
  const filteredProjects = projects[selectedYear]?.filter(project =>
    project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (error) {
    return (
      <div className={`min-h-screen w-full font-kanit ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} transition-all duration-300 flex items-center justify-center p-4`}>
        <Card className={`max-w-md w-full ${theme === 'dark' ? 'bg-gray-800/95 border-gray-700/50' : 'bg-white border-gray-200'} shadow-xl rounded-2xl p-8`}>
          <Title level={3} className={`font-kanit ${theme === 'dark' ? 'text-red-400' : 'text-red-600'} text-center`}>
            เกิดข้อผิดพลาด
          </Title>
          <Text className={`font-kanit ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-center block`}>
            {error}
          </Text>
          <div className="text-center mt-6">
            <button
              onClick={() => fetchProjects()}
              className={`font-kanit px-6 py-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'} text-white transition-colors duration-200`}
            >
              ลองใหม่
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full font-kanit ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'} transition-all duration-500 overflow-auto pb-12`}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-3">
              <div className="flex items-center">
                <div className={`p-3 rounded-2xl mr-4 ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                  <FileTextOutlined className={`text-3xl ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
                </div>
                <Title level={1} className={`font-kanit ${theme === 'dark' ? 'text-white' : 'text-slate-800'} !mb-0 text-3xl sm:text-4xl font-extrabold tracking-tight`}>
                  โครงการก่อสร้าง
                </Title>
              </div>

              {/* Compact Search Bar */}
              <div className={`flex-1 max-w-md p-1 rounded-2xl shadow-sm transition-all duration-300 ${
                theme === 'dark' ? 'bg-slate-800/50' : 'bg-white border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
              }`}>
                <Input
                  placeholder="ค้นหาโครงการ..."
                  prefix={<SearchOutlined className={theme === 'dark' ? 'text-slate-500 text-lg' : 'text-slate-400 text-lg'} />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  variant="borderless"
                  className={`font-kanit py-2 px-3 text-base ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}
                />
              </div>
            </div>
            <Text className={`font-kanit ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-lg`}>
              ภาพรวมการบริหารจัดการโครงการแยกตามปีงบประมาณ
            </Text>
          </div>

          <div className="flex flex-wrap gap-3">
            {years.map(year => (
              <button
                key={year}
                onClick={() => handleYearChange(year)}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                  selectedYear === year
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105'
                    : theme === 'dark'
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 border border-slate-100'
                }`}
              >
                <span>{year}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedYear === year 
                    ? 'bg-white/20 text-white' 
                    : theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  {projects[year]?.length || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[50vh]">
            <div className="text-center">
              <div className={`inline-block animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 ${theme === 'dark' ? 'border-indigo-400' : 'border-indigo-600'} mb-6`}></div>
              <Text className={`font-kanit ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-xl block`}>
                กำลังเตรียมข้อมูลโครงการ...
              </Text>
            </div>
          </div>
        ) : (
          <div className="space-y-10">

            {/* Projects Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredProjects.map((project, projectIndex) => (
                <div
                  key={`${selectedYear}-${project.project_id}-${projectIndex}`}
                  className={`group relative rounded-[2.5rem] transition-all duration-500 border-0 ${
                    theme === 'dark' 
                      ? 'bg-slate-800/40 hover:bg-slate-800/60 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' 
                      : 'bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
                  } overflow-hidden cursor-pointer`}
                  onClick={() => handleProjectClick(project.project_id)}
                >
                  {/* Image Container */}
                  <div className="relative h-60 w-full overflow-hidden p-3 pb-0">
                    <div className="h-full w-full rounded-[2rem] overflow-hidden relative">
                      {project.image ? (
                        <img
                          alt={project.project_name}
                          src={`${import.meta.env.VITE_API_URL}/${project.image}`}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`h-full ${project.image ? 'hidden' : 'flex'} items-center justify-center ${
                          theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'
                        }`}>
                        <FileTextOutlined className={`text-4xl ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
                      </div>
                      
                      {/* Overlay Info - Redesigned Progress */}
                      <div className="absolute top-4 right-4 z-10">
                        <div className={`group/progress relative flex items-center justify-center p-1 rounded-full backdrop-blur-2xl transition-all duration-300 ${
                          theme === 'dark' 
                            ? 'bg-black/40 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]' 
                            : 'bg-white/70 border border-white/20 shadow-[0_8px_32px_rgba(31,38,135,0.15)]'
                        } hover:scale-110`}>
                          <Progress
                            type="circle"
                            percent={project.progress || 0}
                            size={52}
                            strokeWidth={10}
                            strokeColor={project.progress >= 100 ? '#22c55e' : '#52c41a'}
                            trailColor={theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
                            format={(percent) => (
                              <div className="flex flex-col items-center justify-center">
                                <span className={`text-[13px] font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                                  {percent}%
                                </span>
                              </div>
                            )}
                          />
                        </div>
                      </div>

                      {/* Job Number Badge */}
                      <div className="absolute bottom-4 left-4 z-10">
                        <div className="px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-bold shadow-lg">
                          {project.job_number || 'No Job #'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Container */}
                  <div className="p-7 space-y-4">
                    <div className="space-y-1">
                      <Title level={4} className={`font-kanit ${theme === 'dark' ? 'text-white' : 'text-slate-800'} !mb-0 text-xl font-bold leading-tight line-clamp-1`}>
                        {project.project_name}
                      </Title>
                      <Text className={`font-kanit ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} block text-sm line-clamp-2 min-h-[40px]`}>
                        {project.description || 'ไม่มีคำอธิบายโครงการ'}
                      </Text>
                    </div>

                    <div className={`h-px w-full ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}`}></div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex flex-col gap-1">
                          <Text className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>วันเริ่มโครงการ</Text>
                          <Text strong className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{formatThaiDate(project.start_date)}</Text>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <Text className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>แผนงานสิ้นสุด</Text>
                          <Text strong className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{formatThaiDate(project.end_date)}</Text>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className={`w-full rounded-full h-3 ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                          <div
                            className={`h-3 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.3)] ${
                              (project.progress || 0) >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-emerald-500/20' : 'bg-gradient-to-r from-indigo-500 to-blue-500 shadow-indigo-500/20'
                            }`}
                            style={{ width: `${Math.min(project.progress || 0, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {project.team_members && project.team_members.length > 0 && (
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex -space-x-3">
                            {project.team_members.slice(0, 4).map((member, i) => (
                              <div 
                                key={i}
                                className={`w-8 h-8 rounded-full border-2 ${theme === 'dark' ? 'border-slate-800 bg-slate-700' : 'border-white bg-slate-200'} flex items-center justify-center overflow-hidden`}
                                title={member.name}
                              >
                                <UserOutlined className={theme === 'dark' ? 'text-slate-400 text-xs' : 'text-slate-500 text-xs'} />
                              </div>
                            ))}
                            {project.team_members.length > 4 && (
                              <div className={`w-8 h-8 rounded-full border-2 ${theme === 'dark' ? 'border-slate-800 bg-indigo-900/50 text-indigo-400' : 'border-white bg-indigo-50 text-indigo-600'} flex items-center justify-center text-[10px] font-bold`}>
                                +{project.team_members.length - 4}
                              </div>
                            )}
                          </div>
                          <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-xs italic`}>
                            ทีมงาน {project.team_members.length} ท่าน
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(!filteredProjects || filteredProjects.length === 0) && (
              <div className={`p-20 rounded-[3rem] text-center border-2 border-dashed ${
                theme === 'dark' ? 'bg-slate-800/20 border-slate-800 text-slate-600' : 'bg-slate-50/50 border-slate-200 text-slate-400'
              }`}>
                <FileTextOutlined className="text-7xl mb-6 opacity-20" />
                <Title level={3} className={`font-kanit !mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {searchTerm ? 'ไม่พบโครงการที่ค้นหา' : `ยังไม่มีโครงการสำหรับปี ${selectedYear}`}
                </Title>
                <Text className="text-lg opacity-50">กรุณาลองเปลี่ยนเงื่อนไขการค้นหา หรือ เลือกปีอื่น</Text>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx="true">{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@200;300;400;500;600;700;800&display=swap');
        
        body {
          font-family: 'Kanit', sans-serif !important;
        }

        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
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
}

export default Projects;