import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Space, Progress, Badge, message, Input, Table, Avatar, Tooltip, Tag, Segmented } from 'antd';
import { FileTextOutlined, CalendarOutlined, TeamOutlined, UserOutlined, SearchOutlined, TrophyOutlined, AppstoreOutlined, TableOutlined, EyeOutlined, RightOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar';
import api from '../../axiosConfig';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import 'antd/dist/reset.css';

const { Title, Text } = Typography;

function Projects({ user, setUser, theme, setTheme, activeCompany, setActiveCompany }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isTenderMode = activeCompany?.company_name?.toLowerCase().includes('tender');
  const TENDER_COLOR = '#0ea5e9'; // Elegant Sky Blue theme for Tender
  const primaryColor = isTenderMode ? TENDER_COLOR : (activeCompany?.company_color || '#4f46e5');
  const primaryLightColor = `${primaryColor}15`;
  const [viewMode, setViewMode] = useState(isTenderMode ? 'table' : 'card');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // ✅ Set default viewMode based on company type
  useEffect(() => {
    if (activeCompany) {
      setViewMode(isTenderMode ? 'table' : 'card');
    }
  }, [activeCompany, isTenderMode]);

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
      if (mounted && activeCompany) {
        await fetchProjects();
      }
    };

    loadProjects();

    return () => {
      mounted = false;
    };
  }, [fetchProjects, activeCompany]);

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

  const getTenderStatusConfig = (status) => {
    switch (status) {
      case 'tender_in_progress':
        return {
          label: 'กำลังดำเนินงาน',
          color: 'bg-blue-500 border-blue-400',
          badge: theme === 'dark'
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            : 'bg-blue-50 text-blue-700 border-blue-100'
        };
      case 'tender_win':
        return {
          label: 'ได้งาน',
          color: 'bg-emerald-500 border-emerald-400',
          badge: theme === 'dark'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
        };
      case 'tender_loss':
      case 'tender_lost': // legacy value in DB
        return {
          label: 'ไม่ได้งาน',
          color: 'bg-red-500 border-red-400',
          badge: theme === 'dark'
            ? 'bg-red-500/10 text-red-400 border-red-500/30'
            : 'bg-red-50 text-red-700 border-red-100'
        };
      case 'tender_cancelled':
        return {
          label: 'ยกเลิกประมูล',
          color: 'bg-orange-500 border-orange-400',
          badge: theme === 'dark'
            ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
            : 'bg-orange-50 text-orange-700 border-orange-100'
        };
      case 'tender_announcement_cancelled':
        return {
          label: 'ยกเลิกประกาศ',
          color: 'bg-slate-500 border-slate-400',
          badge: theme === 'dark'
            ? 'bg-slate-500/10 text-slate-400 border-slate-500/30'
            : 'bg-slate-50 text-slate-700 border-slate-100'
        };
      default:
        return {
          label: 'กำลังดำเนินงาน',
          color: 'bg-blue-500 border-blue-400',
          badge: theme === 'dark'
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            : 'bg-blue-50 text-blue-700 border-blue-100'
        };
    }
  };

  return (
    <div className={`page-wrapper font-kanit transition-all duration-500 overflow-auto pb-12`}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full">

          {/* Header Section - Settings Style */}
          <div className="mb-8 flex flex-col gap-5">
            <div className="flex-shrink-0">
              <h1 className={`text-2xl sm:text-3xl font-bold !mb-0 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {isTenderMode ? 'รายการประมูลโครงการ' : 'โครงการก่อสร้าง'}
              </h1>
            </div>

            <div className="flex flex-row items-center justify-between gap-3 flex-wrap">
              <div className="flex flex-row items-center gap-3 flex-wrap">
                {/* Year Selection */}
                <div className="flex items-center gap-2">
                  {years.map(year => (
                    <button
                      key={year}
                      onClick={() => handleYearChange(year)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 transform hover:scale-105 ${selectedYear === year
                        ? 'text-white'
                        : theme === 'dark'
                          ? 'bg-slate-800/60 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-white'
                          : 'bg-white text-slate-600 border border-slate-200 shadow-sm hover:border-slate-300 hover:text-slate-900'
                        }`}
                      style={{
                        background: selectedYear === year
                          ? (isTenderMode ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : primaryColor)
                          : undefined,
                        boxShadow: selectedYear === year
                          ? `0 6px 16px ${isTenderMode ? '#0284c750' : primaryColor + '40'}`
                          : undefined,
                        border: selectedYear === year ? 'none' : undefined
                      }}
                    >
                      {year}
                      <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full ${selectedYear === year
                        ? 'bg-white/25 text-white shadow-inner font-extrabold'
                        : theme === 'dark' ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-400'
                        }`}>
                        {projects[year]?.length || 0}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className={`w-full sm:w-64 p-1 rounded-2xl transition-all duration-300 border ${theme === 'dark'
                  ? 'bg-slate-800/40 border-slate-700'
                  : 'bg-white border-slate-200 shadow-sm'
                  }`}
                  style={{
                    borderColor: searchTerm ? primaryColor + '50' : undefined
                  }}>
                  <Input
                    placeholder="ค้นหาโครงการ..."
                    prefix={<SearchOutlined className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    variant="borderless"
                    className={`font-kanit py-1 px-3 text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}
                  />
                </div>
              </div>

              {/* View Switcher & Actions - Moved to far right */}
              <div className="flex items-center gap-2 sm:ml-auto">
                <div className={`p-1 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <Segmented
                    value={viewMode}
                    onChange={setViewMode}
                    options={[
                      { value: 'card', icon: <AppstoreOutlined /> },
                      { value: 'table', icon: <TableOutlined /> }
                    ]}
                    className={`font-kanit custom-segmented ${theme === 'dark' ? 'dark-segmented' : ''}`}
                  />
                </div>
                {(user?.roles?.includes(1) || activeCompany?.user_role === 'admin' || activeCompany?.user_role === 'owner') && (
                  <button
                    onClick={() => navigate('/project-settings')}
                    className={`h-[38px] px-4 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 ${theme === 'dark'
                      ? 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600'
                      }`}
                  >
                    <SettingOutlined /> ตั้งค่าโครงการ
                  </button>
                )}
              </div>
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

              {/* Projects Grid - Settings Style Cards */}
              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {filteredProjects.map((project, index) => {
                    const accentColor = primaryColor;

                    return (
                      <div
                        key={`${selectedYear}-${project.project_id}-${index}`}
                        onClick={() => handleProjectClick(project.project_id)}
                        className={`
                        group relative flex flex-col cursor-pointer rounded-lg transition-all duration-300 border overflow-hidden
                        ${theme === 'dark'
                            ? 'bg-[#141414] border-slate-800 hover:border-indigo-500/30 shadow-md hover:shadow-lg'
                            : 'bg-white border-slate-100 hover:border-gray-300 shadow-sm hover:shadow-md'
                          }
                      `}
                        style={{
                          animation: `fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.05}s both`
                        }}
                      >
                        {/* Top Image Section - Compact */}
                        <div className="relative aspect-video w-full overflow-hidden">
                          {project.image ? (
                            <img
                              alt={project.project_name}
                              src={`${import.meta.env.VITE_API_URL}/${project.image}`}
                              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 opacity-100"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=800&q=80';
                              }}
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                              <FileTextOutlined className="text-3xl opacity-20" />
                            </div>
                          )}

                          {/* Compact Overlays on Image */}
                          <div className="absolute top-2 left-2">
                            <div
                              className={`flex items-center justify-center rounded-lg w-8 h-8 shadow-md backdrop-blur-md ${theme === 'dark' ? 'bg-slate-900/80 text-white' : 'bg-white/90 text-slate-800'}`}
                              style={{ color: accentColor }}
                            >
                              {isTenderMode ? <TrophyOutlined className="text-lg" /> : <FileTextOutlined className="text-lg" />}
                            </div>
                          </div>

                          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                            {isTenderMode && project.tender_status && (
                              <div className={`px-2 py-0.5 rounded-md text-white text-[9px] font-bold shadow-sm backdrop-blur-md ${getTenderStatusConfig(project.tender_status).color}`}>
                                {getTenderStatusConfig(project.tender_status).label}
                              </div>
                            )}
                            <div className="px-2 py-0.5 rounded-md text-white text-[9px] font-bold shadow-sm backdrop-blur-md"
                              style={{ backgroundColor: primaryColor + 'e0' }}>
                              {project.job_number || project.project_id || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Bottom Content Section - Tighter */}
                        <div className="flex flex-col p-4 space-y-3 flex-1">
                          <div className="space-y-0.5">
                            <h3 className={`text-sm font-bold tracking-tight line-clamp-1 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                              {project.project_name}
                            </h3>
                            <p className={`text-[10px] leading-relaxed line-clamp-2 min-h-[28px] font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              {project.description || 'ไม่มีคำอธิบายโครงการ'}
                            </p>
                          </div>

                          <div className="space-y-2.5 mt-auto pt-1">
                            <div className="flex justify-between items-center text-[9px]">
                              <span className={`font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                {formatThaiDate(project.start_date)}
                              </span>
                              <span className={`font-black`} style={{ color: primaryColor }}>
                                {project.progress || 0}%
                              </span>
                            </div>

                            <Progress
                              percent={project.progress || 0}
                              size="small"
                              strokeColor={primaryColor}
                              trailColor={theme === 'dark' ? '#1e293b' : '#f1f5f9'}
                              showInfo={false}
                              className="!m-0 h-1"
                            />

                            <div className="flex items-center justify-between pt-0.5">
                              <div className="flex -space-x-1">
                                {project.team_members?.slice(0, 3).map((member, i) => (
                                  <Tooltip key={i} title={member.name}>
                                    <Avatar
                                      size="small"
                                      style={{ backgroundColor: `hsl(${i * 60}, 70%, 60%)`, width: 20, height: 20 }}
                                      className="border-[1.5px] border-white dark:border-slate-900 shadow-sm"
                                    >
                                      <span className="text-[8px]">{member.name.charAt(0)}</span>
                                    </Avatar>
                                  </Tooltip>
                                ))}
                              </div>
                              <button className={`text-[10px] font-bold flex items-center gap-1 group/btn transition-colors ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                                รายละเอียด <RightOutlined className="text-[8px] transition-transform group-hover/btn:translate-x-1" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`rounded-lg overflow-hidden border transition-all duration-300 ${theme === 'dark'
                  ? 'bg-[#141414] border-slate-800 shadow-md'
                  : 'bg-white border-slate-100 shadow-sm'
                  }`}>
                  <Table
                    dataSource={filteredProjects}
                    pagination={{
                      pageSize: 10,
                      position: ['bottomCenter'],
                      className: `font-kanit py-6 ${theme === 'dark' ? 'dark-pagination' : ''}`
                    }}
                    className={`font-kanit premium-table ${theme === 'dark' ? 'dark-premium-table' : ''}`}
                    rowKey="project_id"
                    onRow={(record) => ({
                      onClick: () => handleProjectClick(record.project_id),
                      className: "cursor-pointer group/row"
                    })}
                    columns={isTenderMode ? [
                      {
                        title: 'เลขที่งาน',
                        dataIndex: 'job_number',
                        key: 'job_number',
                        width: 150,
                        render: (text) => (
                          <div className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-[10px] tracking-wider border whitespace-nowrap
                          ${theme === 'dark'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}
                          >
                            {text || 'N/A'}
                          </div>
                        )
                      },
                      {
                        title: 'ชื่อโครงการ',
                        dataIndex: 'project_name',
                        key: 'project_name',
                        width: 400,
                        render: (text) => <div className={`font-bold text-[12px] line-clamp-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{text || '-'}</div>
                      },
                      {
                        title: 'วันที่รับเอกสาร',
                        dataIndex: 'tender_doc_date',
                        key: 'tender_doc_date',
                        width: 130,
                        render: (date) => (
                          <span className={`text-[11px] font-medium whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatThaiDate(date)}
                          </span>
                        )
                      },
                      {
                        title: 'เลขที่โครงการ',
                        dataIndex: 'tender_project_number',
                        key: 'tender_project_number',
                        width: 110,
                        render: (text) => <span className="text-[11px] font-medium">{text || '-'}</span>
                      },
                      {
                        title: 'เลขที่ประกาศ',
                        dataIndex: 'tender_announcement_number',
                        key: 'ann_no',
                        width: 250,
                        render: (text) => <div className="text-[11px] font-medium whitespace-nowrap" title={text}>{text || '-'}</div>
                      },
                      {
                        title: 'หน่วยงาน',
                        dataIndex: 'tender_organization',
                        key: 'org',
                        width: 250,
                        render: (text) => <div className="text-[11px] font-medium whitespace-nowrap" title={text}>{text || '-'}</div>
                      },
                      {
                        title: 'รายการ',
                        dataIndex: 'tender_item_description',
                        key: 'item_desc',
                        width: 150,
                        render: (text) => <div className={`text-[11px] font-medium line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{text || '-'}</div>
                      },
                      {
                        title: 'บริษัทที่ได้งาน',
                        dataIndex: 'tender_winner_company',
                        key: 'winner_company',
                        width: 150,
                        render: (text, record) => {
                          // Priority: 1. Input field, 2. If Win -> Contractor Name, 3. Active Company Name, 4. Dash
                          const winner = text || (record.tender_status === 'tender_win' ? (record.contractor || activeCompany?.company_name) : null);
                          return (
                            <div className={`text-[11px] font-bold line-clamp-2 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              {winner || '-'}
                            </div>
                          );
                        }
                      },
                      {
                        title: 'ความคืบหน้า',
                        dataIndex: 'progress',
                        key: 'progress',
                        width: 120,
                        render: (progress) => (
                          <div className="flex flex-col gap-1.5 pr-4">
                            <div className="flex justify-between text-[10px] items-center">
                              <span className={`font-black ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{progress || 0}%</span>
                            </div>
                            <Progress
                              percent={progress || 0}
                              size="small"
                              strokeColor={primaryColor}
                              trailColor={theme === 'dark' ? '#1e293b' : '#f1f5f9'}
                              showInfo={false}
                              className="m-0 h-1"
                            />
                          </div>
                        )
                      },
                      {
                        title: 'สถานะ',
                        key: 'status',
                        width: 120,
                        render: (_, record) => {
                          const config = getTenderStatusConfig(record.tender_status);
                          return (
                            <div className="flex items-center">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap ${config.badge}`}>
                                {config.label}
                              </span>
                            </div>
                          );
                        }
                      },
                      {
                        title: '',
                        key: 'action',
                        width: 50,
                        render: () => (
                          <div className="flex justify-end pr-2">
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full transition-all border border-slate-200/50 shadow-sm ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-400 group-hover/row:text-white'
                              }`}
                              style={{
                                backgroundColor: theme === 'dark' ? undefined : 'white',
                              }}>
                              <RightOutlined className="text-[10px] transition-transform group-hover/row:translate-x-0.5" />
                            </div>
                          </div>
                        )
                      }
                    ] : [
                      {
                        title: 'วันที่เริ่ม',
                        dataIndex: 'start_date',
                        key: 'date',
                        width: 130,
                        render: (date) => (
                          <span className={`text-[11px] font-medium whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatThaiDate(date)}
                          </span>
                        )
                      },
                      {
                        title: 'รหัสงาน',
                        dataIndex: 'job_number',
                        key: 'job_number',
                        width: 120,
                        render: (text) => (
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                            <span className={`text-[11px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                              }`}>
                              {text || 'N/A'}
                            </span>
                          </div>
                        )
                      },
                      {
                        title: 'โครงการ / ผู้ว่าจ้าง',
                        key: 'project_info',
                        render: (_, record) => (
                          <div className="flex items-center gap-4 py-1">
                            <div className="relative w-12 h-12 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200/10">
                              {record.image ? (
                                <img
                                  src={`${import.meta.env.VITE_API_URL}/${record.image}`}
                                  className="w-full h-full object-cover"
                                  alt=""
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                  <FileTextOutlined className="text-xl opacity-30" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className={`font-bold text-sm line-clamp-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{record.project_name}</div>
                              <div className={`text-[10px] font-medium truncate ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{record.owner || 'ไม่ระบุเจ้าของโครงการ'}</div>
                            </div>
                          </div>
                        )
                      },
                      {
                        title: 'ความคืบหน้า',
                        dataIndex: 'progress',
                        key: 'progress',
                        width: 150,
                        render: (progress) => (
                          <div className="flex flex-col gap-1.5 pr-4">
                            <div className="flex justify-between text-[10px] items-center">
                              <span className={`font-black ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{progress || 0}%</span>
                            </div>
                            <Progress
                              percent={progress || 0}
                              size="small"
                              strokeColor={primaryColor}
                              trailColor={theme === 'dark' ? '#1e293b' : '#f1f5f9'}
                              showInfo={false}
                              className="m-0 h-1"
                            />
                          </div>
                        )
                      },
                      {
                        title: 'สถานะ',
                        key: 'status',
                        width: 130,
                        render: (_, record) => (
                          <div className="flex items-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shadow-sm ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'
                              }`}>
                              {record.status || 'ACTIVE'}
                            </span>
                          </div>
                        )
                      },
                      {
                        title: '',
                        key: 'action',
                        width: 50,
                        render: () => (
                          <div className="flex justify-end pr-2">
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full transition-all border border-slate-200/50 shadow-sm ${theme === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-400 group-hover/row:text-white'
                              }`}
                              style={{
                                backgroundColor: theme === 'dark' ? undefined : 'white',
                              }}>
                              <RightOutlined className="text-[10px] transition-transform group-hover/row:translate-x-0.5" />
                            </div>
                          </div>
                        )
                      }
                    ]}
                  />
                </div>
              )}

              {(!filteredProjects || filteredProjects.length === 0) && (
                <div className={`p-20 rounded-lg text-center border-2 border-dashed ${theme === 'dark' ? 'bg-[#141414] border-slate-800 text-slate-600' : 'bg-gray-50 border-slate-100 text-slate-400'
                  }`}>
                  <FileTextOutlined className="text-7xl mb-6 opacity-20" />
                  <Title level={3} className={`font-kanit !mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : `ยังไม่มี${isTenderMode ? 'รายการประมูล' : 'โครงการ'}สำหรับปี ${selectedYear}`}
                  </Title>
                  <Text className="text-lg opacity-50">กรุณาลองเปลี่ยนเงื่อนไขการค้นหา หรือ เลือกปีอื่น</Text>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx="true">{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@200;300;400;500;600;700;800&display=swap');
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        body {
          font-family: 'Kanit', sans-serif !important;
        }

        .font-kanit {
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

        /* Fix invisible text in tender status dropdown caused by global CSS bleed */
        .tender-status-select .ant-select-item-option-selected {
          color: #334155 !important;
          background-color: #f1f5f9 !important;
          font-weight: 600 !important;
        }
        .dark .tender-status-select .ant-select-item-option-selected,
        [data-theme='dark'] .tender-status-select .ant-select-item-option-selected {
          color: #f8fafc !important;
          background-color: #334155 !important;
        }

        /* Customize scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        /* Premium Table Styles */
        .premium-table .ant-table {
          background: transparent !important;
        }
        .premium-table .ant-table-thead > tr > th {
          background: ${theme === 'dark' ? '#1e293b' : '#e2e8f0'} !important;
          color: ${theme === 'dark' ? '#e2e8f0' : '#1e293b'} !important;
          border-bottom: none !important;
          font-weight: 700 !important;
          text-transform: uppercase;
          font-size: 11.5px;
          letter-spacing: 0.05em;
          padding: 14px 20px !important;
          white-space: nowrap;
        }
        .premium-table .ant-table-thead > tr > th::before {
          display: none !important; /* Hide the vertical separator lines */
        }
        .premium-table .ant-table-thead > tr > th:first-child {
          border-top-left-radius: 12px !important;
          border-bottom-left-radius: 12px !important;
        }
        .premium-table .ant-table-thead > tr > th:last-child {
          border-top-right-radius: 12px !important;
          border-bottom-right-radius: 12px !important;
        }
        .premium-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid ${theme === 'dark' ? '#1e293b' : '#f1f5f9'} !important;
          padding: 10px 20px !important;
          transition: all 0.3s ease;
        }
        .premium-table .ant-table-tbody > tr {
          background: transparent !important;
        }
        .premium-table .ant-table-tbody > tr:hover > td {
          background: ${primaryLightColor} !important;
        }

        /* Page Layout & Background */
        .page-wrapper {
          background-color: ${theme === 'dark' ? '#0f172a' : '#f0f2f5'};
          min-height: 100vh;
        }

        .dark-pagination .ant-pagination-item a {
          color: #94a3b8 !important;
        }
        .dark-pagination .ant-pagination-item-active {
          background: #6366f1 !important;
          border-color: #6366f1 !important;
        }
        .dark-pagination .ant-pagination-item-active a {
          color: #fff !important;
        }
        .dark-pagination .ant-pagination-prev .ant-pagination-item-link,
        .dark-pagination .ant-pagination-next .ant-pagination-item-link {
          background: transparent !important;
          color: #94a3b8 !important;
          border-color: #334155 !important;
        }

        /* Segmented Dark Style */
        .dark-segmented {
          background: #1e293b !important;
        }
        .dark-segmented .ant-segmented-item {
          color: #94a3b8 !important;
        }
        .dark-segmented .ant-segmented-item-selected {
          background: #334155 !important;
          color: #fff !important;
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