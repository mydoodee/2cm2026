import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Space, Card, Typography, Input, Select, Empty, Image, App, ConfigProvider, theme as antdTheme } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined, SettingOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Navbar from '../Navbar';
import api from '../../axiosConfig';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import clsx from 'clsx';
import './ProjectSetting.css';

const { Option } = Select;

const ProjectSetting = ({ user, setUser, theme, setTheme, activeCompany, setActiveCompany }) => {
  const isTenderMode = activeCompany?.company_name?.toLowerCase().includes('tender');
  const TENDER_COLOR = '#0ea5e9'; // Elegant Sky Blue theme for Tender
  const primaryColor = isTenderMode ? TENDER_COLOR : (activeCompany?.company_color || '#4f46e5');

  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [yearStats, setYearStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  const navigate = useNavigate();
  const { message } = App.useApp();

  const handleBack = () => {
    navigate('/settings');
  };

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/projects');
      const projectData = response.data.projects;
      
      if (!Array.isArray(projectData)) {
        setProjects([]);
        setFilteredProjects([]);
        setYearStats({});
        return;
      }

      setProjects(projectData);
      setFilteredProjects(projectData);
      setYearStats(calculateYearStats(projectData));
    } catch (error) {
      console.error('Error fetching projects:', error);
      message.error(error.message || 'ไม่สามารถโหลดข้อมูลโครงการได้');
      setProjects([]);
      setFilteredProjects([]);
      setYearStats({});
    } finally {
      setLoading(false);
    }
  }, [message]);

  const calculateYearStats = (projects) => {
    return projects.reduce((acc, project) => {
      const year = project.start_date ? new Date(project.start_date).getFullYear() : 'ไม่ระบุ';
      if (!acc[year]) {
        acc[year] = { total: 0, planning: 0, inProgress: 0, completed: 0, projects: [] };
      }
      acc[year].total += 1;
      acc[year].projects.push(project);
      if (project.status === 'Planning') acc[year].planning += 1;
      else if (project.status === 'In Progress') acc[year].inProgress += 1;
      else if (project.status === 'Completed') acc[year].completed += 1;
      return acc;
    }, {});
  };

  const handleSearch = (value) => {
    setSearchText(value);
    filterProjects(value, statusFilter, selectedYear);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    filterProjects(searchText, value, selectedYear);
  };

  const handleYearFilter = (year) => {
    setSelectedYear(year);
    filterProjects(searchText, statusFilter, year);
  };

  const filterProjects = (search, status, year) => {
    let filtered = projects;
    if (year && year !== '') {
      if (year === 'ไม่ระบุ') {
        filtered = filtered.filter(project => !project.start_date);
      } else {
        filtered = filtered.filter(project =>
          project.start_date && new Date(project.start_date).getFullYear().toString() === year.toString()
        );
      }
    }
    if (search) {
      filtered = filtered.filter(
        (project) =>
          project.project_name.toLowerCase().includes(search.toLowerCase()) ||
          (project.job_number && project.job_number.toLowerCase().includes(search.toLowerCase())) ||
          (project.owner && project.owner.toLowerCase().includes(search.toLowerCase())) ||
          (project.consusltant && project.consusltant.toLowerCase().includes(search.toLowerCase())) ||
          (project.contractor && project.contractor.toLowerCase().includes(search.toLowerCase())) ||
          (project.address && project.address.toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (status) {
      filtered = filtered.filter((project) => project.status === status);
    }
    setFilteredProjects(filtered);
  };

  const handleAddOrEdit = (project = null) => {
    if (project) {
      navigate(`/project-settings/edit/${project.project_id}`, { state: { project } });
    } else {
      navigate('/project-settings/add');
    }
  };

  const handleDelete = async (projectId) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ยืนยันการลบ',
      text: 'คุณต้องการลบโครงการนี้หรือไม่? การกระทำนี้จะไม่ลบข้อมูลออกจากฐานข้อมูลถาวร',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        await api.delete(`/api/project/${projectId}`);
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'ลบโครงการสำเร็จ',
          confirmButtonColor: primaryColor,
        });
        await fetchProjects();
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: error.response?.data?.message || 'ไม่สามารถลบโครงการได้',
          confirmButtonColor: '#ef4444',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const clearFilters = () => {
    setSearchText('');
    setStatusFilter('');
    setSelectedYear('');
    setFilteredProjects(projects);
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const isGlobalAdmin = user.roles?.includes(1);
    const isCompanyAdmin = activeCompany?.user_role === 'admin' || activeCompany?.user_role === 'owner';
    if (!isGlobalAdmin && !isCompanyAdmin) {
      navigate('/projects');
      return;
    }
    if (activeCompany) {
      fetchProjects();
    }
  }, [user, activeCompany, navigate, fetchProjects]);

  const columns = [
    {
      title: 'เลขที่',
      dataIndex: 'job_number',
      key: 'job_number',
      width: 120,
      render: (text) => <span className="whitespace-nowrap font-medium">{text}</span>,
      sorter: (a, b) => a.job_number?.localeCompare(b.job_number || '') || 0,
    },
    {
      title: 'โครงการ',
      dataIndex: 'project_name',
      key: 'project_name',
      sorter: (a, b) => a.project_name.localeCompare(b.project_name),
    },
    {
      title: 'เจ้าของ',
      dataIndex: 'owner',
      key: 'owner',
      render: (text) => text || '-',
    },
    {
      title: 'ที่ปรึกษา',
      dataIndex: 'consusltant',
      key: 'consusltant',
      render: (text) => text || '-',
    },
    {
      title: 'ผู้รับเหมา',
      dataIndex: 'contractor',
      key: 'contractor',
      render: (text) => text || '-',
    },
    {
      title: 'วันที่เริ่ม',
      dataIndex: 'start_date',
      key: 'start_date',
      render: (text) => (text ? dayjs(text).format('DD/MM/YYYY') : '-'),
      sorter: (a, b) => (a.start_date ? new Date(a.start_date) - new Date(b.start_date) : 0),
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => {
        let bgColor = status === 'Completed' ? 'bg-emerald-500/10' : status === 'In Progress' ? 'bg-indigo-500/10' : 'bg-amber-500/10';
        let textColor = status === 'Completed' ? 'text-emerald-500' : status === 'In Progress' ? 'text-indigo-500' : 'text-amber-500';
        const statusText = status === 'Planning' ? 'วางแผน' : status === 'In Progress' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น';
        return (
          <div className={`${bgColor} ${textColor} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block`}>
            {statusText}
          </div>
        );
      },
    },
    {
      title: '(%)',
      dataIndex: 'progress',
      key: 'progress',
      width: 60,
      render: (progress) => (
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {progress !== null && progress !== undefined ? `${progress}%` : '0%'}
        </span>
      ),
    },
    {
      title: 'รูปภาพ',
      dataIndex: 'image',
      key: 'image',
      width: 80,
      render: (image) =>
        image ? (
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
            <Image 
              src={`${import.meta.env.VITE_API_URL}/${image}`} 
              alt="โครงการ" 
              width={40} 
              height={30} 
              className="rounded-lg object-cover" 
              preview 
            />
          </div>
        ) : (
          <span className="text-slate-300">-</span>
        ),
    },
    {
      title: 'ACTION',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button 
            icon={<EditOutlined className="text-lg" style={{ color: primaryColor }} />} 
            onClick={(e) => { e.currentTarget.blur(); handleAddOrEdit(record); }} 
            className="rounded-xl border-slate-100 dark:border-slate-700 bg-transparent flex items-center justify-center p-0 w-10 h-10 transition-all"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${primaryColor}15`}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          />
          <Button 
            icon={<DeleteOutlined className="text-rose-500 text-lg" />} 
            danger 
            onClick={() => handleDelete(record.project_id)} 
            className="rounded-xl border-rose-100 dark:border-rose-900/50 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center p-0 w-10 h-10 transition-all"
          />
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          fontFamily: 'Kanit, sans-serif',
          borderRadius: 8,
          colorPrimary: primaryColor,
        },
        components: {
          Card: {
            borderRadiusLG: 24,
          },
          Table: {
            headerBg: theme === 'dark' ? '#0f172a' : '#1e293b',
            headerColor: '#ffffff',
            headerBorderRadius: 16,
          },
        },
      }}
    >
      <App>
        <div className={clsx('min-h-screen', theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100')}>
          <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
            <Card className={`border-0 rounded-[2.5rem] overflow-hidden transition-all duration-300 ${
              theme === 'dark' ? 'bg-slate-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white shadow-[0_10px_40px_rgba(0,0,0,0.03)]'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-6">
                  <div className="flex items-center">
                    <div className="p-4 rounded-[1.25rem] mr-4" style={{ backgroundColor: `${primaryColor}15` }}>
                      <SettingOutlined className="text-3xl" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <Typography.Title level={2} className={`!mb-1 font-kanit font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        จัดการโครงการ
                      </Typography.Title>
                      <Typography.Text className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                        แก้ไขข้อมูลโครงการและตั้งค่าการแสดงผล
                      </Typography.Text>
                    </div>
                  </div>
                  <div className="hidden sm:block w-px h-10 mx-2 bg-slate-200 dark:bg-slate-700"></div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={(e) => { e.currentTarget.blur(); handleAddOrEdit(); }}
                    className={`rounded-[1.25rem] h-12 px-8 font-extrabold shadow-lg flex items-center !text-white border-0 transition-colors ${
                      theme === 'dark' 
                        ? '!bg-slate-700 hover:!bg-slate-600 shadow-slate-900/40' 
                        : '!bg-slate-500 hover:!bg-slate-600 shadow-slate-500/40'
                    }`}
                  >
                    เพิ่มโครงการใหม่
                  </Button>
                </div>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBack}
                  size="large"
                  className={`rounded-2xl border-0 font-bold px-6 h-12 flex items-center shadow-sm ${
                    theme === 'dark' ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  กลับหน้าเดิม
                </Button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="w-full mb-4">
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800/50">
                    
                    <div className="flex-1 w-full xl:w-auto">
                      <Typography.Title level={4} className={`mb-4 font-kanit font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                        สถิติตามปี
                      </Typography.Title>
                      {Object.keys(yearStats).length === 0 ? (
                        <Empty description="ไม่มีข้อมูลสถิติ" />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(yearStats)
                            .sort((a, b) => (a === 'ไม่ระบุ' ? 1 : b === 'ไม่ระบุ' ? -1 : b - a))
                            .map((year) => (
                              <div
                                key={year}
                                onClick={() => handleYearFilter(year.toString())}
                                className={clsx(
                                  "cursor-pointer px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 border select-none",
                                  selectedYear === year.toString() 
                                    ? "text-white"
                                    : (theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50")
                                )}
                                style={selectedYear === year.toString() ? { 
                                  backgroundColor: primaryColor, 
                                  borderColor: primaryColor,
                                  boxShadow: `0 4px 6px -1px ${primaryColor}40, 0 2px 4px -1px ${primaryColor}20` 
                                } : {}}
                              >
                                <span>ปี {year}</span>
                                <span className={clsx(
                                  "px-2 py-0.5 rounded-full text-xs font-black",
                                  selectedYear === year.toString() ? "bg-white/20 text-white" : (theme === 'dark' ? "bg-slate-900" : "bg-slate-100")
                                )}
                                style={selectedYear !== year.toString() ? { color: primaryColor } : {}}
                                >
                                  {yearStats[year].total}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 w-full xl:w-auto xl:mt-10">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={`flex items-center p-1 rounded-2xl shadow-sm border ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-100'}`}>
                          <Input
                            placeholder="ค้นหาชื่อโครงการ..."
                            prefix={<SearchOutlined className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} />}
                            value={searchText}
                            onChange={(e) => handleSearch(e.target.value)}
                            variant="borderless"
                            className={`font-kanit py-2 px-4 w-full md:w-60 h-10 ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}
                          />
                          <div className={`w-px h-6 self-center mx-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                          <Select
                            placeholder="ทุกสถานะ"
                            value={statusFilter || undefined}
                            onChange={handleStatusFilter}
                            allowClear
                            variant="borderless"
                            className="font-kanit h-10 w-32 md:w-40 flex items-center"
                          >
                            <Option value="Planning">วางแผน</Option>
                            <Option value="In Progress">กำลังดำเนินการ</Option>
                            <Option value="Completed">เสร็จสิ้น</Option>
                          </Select>
                        </div>
                        
                        {(searchText || statusFilter || selectedYear) && (
                          <Button 
                            onClick={clearFilters} 
                            className={`rounded-2xl border-0 font-bold h-12 px-6 shadow-sm ${
                              theme === 'dark' ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                            }`}
                          >
                            แสดงทั้งหมด
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full overflow-hidden">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className={`p-16 rounded-[2rem] text-center border-2 border-dashed ${theme === 'dark' ? 'bg-slate-800/20 border-slate-700/50' : 'bg-slate-50/50 border-slate-200'}`}>
                      <Empty description="ไม่พบโครงการที่ตรงตามเงื่อนไข" />
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] overflow-hidden">
                      <Table
                        columns={columns}
                        dataSource={filteredProjects}
                        rowKey="project_id"
                        pagination={{ pageSize: 8 }}
                        scroll={{ x: true }}
                        className={`font-kanit project-settings-table ${theme === 'dark' ? 'ant-table-dark' : 'ant-table-light'}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </App>
      <style>{`
        .ant-table-wrapper .ant-table-thead > tr > th {
          font-weight: 700 !important;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
        }
      `}</style>
    </ConfigProvider>
  );
};

ProjectSetting.propTypes = {
  user: PropTypes.object,
  setUser: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
  setTheme: PropTypes.func.isRequired,
  activeCompany: PropTypes.object,
  setActiveCompany: PropTypes.func,
};

export default ProjectSetting;