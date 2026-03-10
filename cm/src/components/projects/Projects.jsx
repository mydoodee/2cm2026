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
    return projectsData.reduce((acc, project) => {
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
    <div className={`min-h-screen w-full font-kanit ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} transition-all duration-300 overflow-auto`}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />

      <div className="p-4 sm:p-6 lg:p-8 w-full">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <FileTextOutlined className={`text-4xl mr-3 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <Title level={1} className={`font-kanit ${theme === 'dark' ? 'text-white' : 'text-gray-900'} !mb-0 text-3xl sm:text-4xl font-bold`}>
              โครงการก่อสร้าง
            </Title>
          </div>
          <Text className={`font-kanit ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-base sm:text-lg`}>
            ภาพรวมโครงการทั้งหมด แยกตามปี
          </Text>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center">
              <div className={`inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${theme === 'dark' ? 'border-indigo-400' : 'border-indigo-600'} mb-4`}></div>
              <Text className={`font-kanit ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-lg block`}>
                กำลังโหลดข้อมูล...
              </Text>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 h-full">
            <div className="lg:w-72">
              <Card
                className={`font-kanit ${theme === 'dark' ? 'bg-gray-800/95 border-gray-700/50' : 'bg-white border-gray-200'
                  } shadow-lg rounded-2xl backdrop-blur-md border sticky top-4 transition-all duration-300 hover:shadow-xl`}
                styles={{ body: { padding: '16px' } }}
              >
                <div className="flex items-center mb-4">
                  <SearchOutlined className={`text-xl mr-2 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`} />
                  <Title level={4} className={`font-kanit ${theme === 'dark' ? 'text-white' : 'text-gray-900'} !mb-0 text-lg font-semibold`}>
                    ค้นหาโครงการ
                  </Title>
                </div>

                <div className="space-y-3 mb-4">
                  <Input
                    placeholder="ค้นหาชื่อหรือคำอธิบาย..."
                    prefix={<SearchOutlined className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`font-kanit ${theme === 'dark'
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-gray-50 border-gray-300'
                      }`}
                    style={{
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: theme === 'dark' ? 'rgba(55, 65, 81, 0.5)' : '#f9fafb',
                      borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
                      color: theme === 'dark' ? '#fff' : '#000'
                    }}
                  />
                  {searchTerm && (
                    <Text className={`font-kanit text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} block`}>
                      พบ {filteredProjects.length} โครงการ
                    </Text>
                  )}
                </div>

                <div className={`w-full h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} mb-4`}></div>

                <Space direction="vertical" className="w-full" size="small">
                  {years.map(year => (
                    <button
                      key={year}
                      className={`font-kanit w-full text-left h-11 px-4 rounded-lg transition-all duration-200 text-base font-medium ${selectedYear === year
                        ? 'bg-indigo-500 text-white shadow-md'
                        : theme === 'dark'
                          ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600 hover:text-indigo-300'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-indigo-600'
                        } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      onClick={() => handleYearChange(year)}
                    >
                      <div className="flex justify-between items-center">
                        <span>{year}</span>
                        <Badge
                          count={projects[year]?.length || 0}
                          className="ml-2"
                          style={{ backgroundColor: theme === 'dark' ? '#4f46e5' : '#2563eb', fontSize: '12px' }}
                        />
                      </div>
                    </button>
                  ))}
                </Space>
              </Card>
            </div>

            <div className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredProjects.map((project, projectIndex) => (
                  <Card
                    key={`${selectedYear}-${project.project_id}-${projectIndex}`}
                    className={`font-kanit ${theme === 'dark' ? 'bg-gray-800/95 border-gray-700/50' : 'bg-white border-gray-200'
                      } shadow-lg rounded-2xl overflow-hidden backdrop-blur-md border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-[460px]`}
                    styles={{ body: { padding: '16px' } }}
                    onClick={() => handleProjectClick(project.project_id)}
                    cover={
                      <div className="relative h-56 overflow-hidden">
                        {project.image ? (
                          <img
                            alt={project.project_name}
                            src={`${import.meta.env.VITE_API_URL}/${project.image}`}
                            className="h-full w-full object-cover rounded-t-2xl transition-transform duration-500 hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`h-full ${project.image ? 'hidden' : 'flex'} items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                            } rounded-t-2xl`}
                        >
                          <Text className={`font-kanit ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
                            ไม่มีรูปภาพ
                          </Text>
                        </div>
                        <div className="absolute top-3 right-3">
                          <Progress
                            type="circle"
                            percent={project.progress || 0}
                            size={40}
                            strokeWidth={6}
                            strokeColor={project.progress >= 100 ? '#22c55e' : '#a78bfa'}
                            trailColor={theme === 'dark' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(167, 139, 250, 0.15)'}
                          />
                        </div>
                      </div>
                    }
                  >
                    <div className="space-y-3">
                      <Title
                        level={4}
                        className={`font-kanit ${theme === 'dark' ? 'text-white' : 'text-gray-900'} !mb-0 line-clamp-2 font-semibold text-base`}
                      >
                        {project.project_name}
                      </Title>
                      <Text
                        className={`font-kanit ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} block text-sm line-clamp-2`}
                      >
                        {project.description || 'ไม่มีคำอธิบาย'}
                      </Text>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <Text className={`font-kanit ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            เริ่ม: {formatThaiDate(project.start_date)}
                          </Text>
                          <Text className={`font-kanit ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            สิ้นสุด: {formatThaiDate(project.end_date)}
                          </Text>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <Text className={`font-kanit ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs`}>
                              ความคืบหน้า
                            </Text>
                            <Text className={`font-kanit ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-xs font-medium`}>
                              {project.progress || 0}%
                            </Text>
                          </div>
                          <div className={`w-full rounded-full h-2 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'}`}>
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${(project.progress || 0) >= 100
                                ? 'bg-green-500'
                                : 'bg-violet-400'
                                }`}
                              style={{ width: `${Math.min(project.progress || 0, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        {project.team_members && project.team_members.length > 0 && (
                          <div>
                            <div className="flex items-center mb-1">
                              <TeamOutlined className={`text-xs mr-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                              <Text className={`font-kanit text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                ทีมงาน ({project.team_members.length} คน)
                              </Text>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {project.team_members.slice(0, 3).map((member, memberIndex) => (
                                <Badge
                                  key={`${selectedYear}-${project.project_id}-${projectIndex}-member-${memberIndex}`}
                                  count={
                                    <div className={`font-kanit text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                      }`}>
                                      <UserOutlined className="mr-1 text-xs" />
                                      {member.name}
                                    </div>
                                  }
                                />
                              ))}
                              {project.team_members.length > 3 && (
                                <Text className={`font-kanit text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                  +{project.team_members.length - 3} คนอื่นๆ
                                </Text>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {(!filteredProjects || filteredProjects.length === 0) && (
                <Card
                  className={`font-kanit ${theme === 'dark' ? 'bg-gray-800/95 border-gray-700/50' : 'bg-white border-gray-200'
                    } shadow-lg rounded-2xl backdrop-blur-md border text-center p-8 h-[460px] flex items-center justify-center col-span-full`}
                  styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' } }}
                >
                  <FileTextOutlined className={`text-5xl mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                  <Title level={3} className={`font-kanit ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} !mb-2 text-lg font-semibold`}>
                    {searchTerm ? 'ไม่พบโครงการที่ค้นหา' : `ไม่มีโครงการในปี ${selectedYear}`}
                  </Title>
                  <Text className={`font-kanit ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-sm`}>
                    {searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'ยังไม่มีโครงการในปีนี้'}
                  </Text>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx="true">{`
        .ant-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .ant-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }
        .ant-progress-bg {
          transition: all 0.3s ease;
        }
        .ant-progress:hover .ant-progress-bg {
          filter: brightness(1.1);
        }
        .progress-bar {
          transition: width 0.3s ease;
        }
        button:hover {
          transform: translateY(-1px);
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export default Projects;