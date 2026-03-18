import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Space, Card, Typography, Input, Select, Modal, Form, Empty, DatePicker, Upload, Image, App, Badge, InputNumber, Checkbox, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, ArrowLeftOutlined, ProjectOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Navbar from '../Navbar';
import axios from 'axios';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import clsx from 'clsx';
import './ProjectSetting.css';
import { ConfigProvider } from 'antd';
const { Option } = Select;

const ProjectSetting = ({ user, setUser, theme, setTheme }) => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [yearStats, setYearStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form] = Form.useForm();
  const [fileLists, setFileLists] = useState({
    progress_summary: [],
    payment: [],
    design: [],
    pre_construction: [],
    construction: [],
    cm: [],
    general: [], // รักษาฟิลด์รูปภาพทั่วไปเดิม
    precast: [], // เพิ่ม precast
    bidding: [], // เพิ่ม bidding
  });
  const navigate = useNavigate();
  const { message } = App.useApp();

  const handleBack = () => {
    navigate('/settings');
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('ไม่พบ refresh token');
      }
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/refresh-token`, {
        refreshToken,
      });
      const newToken = response.data.token;
      localStorage.setItem('token', newToken);
      return newToken;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      throw error;
    }
  };

  const fetchProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('กรุณาเข้าสู่ระบบ');
        setLoading(false);
        navigate('/login');
        return;
      }

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const projectData = response.data.projects;
      if (!Array.isArray(projectData)) {
        setProjects([]);
        setFilteredProjects([]);
        setYearStats({});
        setLoading(false);
        return;
      }

      setProjects(projectData);
      setFilteredProjects(projectData);
      setYearStats(calculateYearStats(projectData));
      setLoading(false);
    } catch (error) {
      console.error('ข้อผิดพลาดใน fetchProjects:', error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        try {
          const newToken = await refreshAccessToken();
          const retryResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/projects`, {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          const projectData = retryResponse.data.projects;
          if (!Array.isArray(projectData)) {
            setProjects([]);
            setFilteredProjects([]);
            setYearStats({});
            setLoading(false);
            return;
          }
          setProjects(projectData);
          setFilteredProjects(projectData);
          setYearStats(calculateYearStats(projectData));
          setLoading(false);
        } catch {
          message.error('ไม่สามารถรีเฟรช token ได้ กรุณาเข้าสู่ระบบใหม่');
          setProjects([]);
          setFilteredProjects([]);
          setYearStats({});
          setLoading(false);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setUser(null);
          navigate('/login');
        }
      } else {
        const errorMessage = error.response?.data?.message || 'ไม่สามารถโหลดข้อมูลโครงการได้';
        message.error(errorMessage);
        setProjects([]);
        setFilteredProjects([]);
        setYearStats({});
        setLoading(false);
      }
    }
  }, [setUser, navigate, message]);

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

  const showModal = (project = null) => {
    setEditingProject(project);
    if (project) {
      form.setFieldsValue({
        project_name: project.project_name,
        job_number: project.job_number,
        description: project.description,
        start_date: project.start_date ? dayjs(project.start_date) : null,
        end_date: project.end_date ? dayjs(project.end_date) : null,
        status: project.status,
        progress: project.progress,
        owner: project.owner,
        consusltant: project.consusltant,
        contractor: project.contractor,
        address: project.address,
        show_design: project.show_design !== undefined ? project.show_design : true,
        show_pre_construction: project.show_pre_construction !== undefined ? project.show_pre_construction : true,
        show_construction: project.show_construction !== undefined ? project.show_construction : true,
        show_precast: project.show_precast !== undefined ? project.show_precast : true,
        show_cm: project.show_cm !== undefined ? project.show_cm : true,
        show_bidding: project.show_bidding !== undefined ? project.show_bidding : true,
        bidding_progress: project.bidding_progress || 0,
        design_progress: project.design_progress || 0,
        pre_construction_progress: project.pre_construction_progress || 0,
        construction_progress: project.construction_progress || 0,
        precast_progress: project.precast_progress || 0,
        cm_progress: project.cm_progress || 0,
      });
      setFileLists({
        progress_summary: project.progress_summary_image ? [{ uid: '-1', name: 'progress_summary.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${project.progress_summary_image}` }] : [],
        payment: project.payment_image ? [{ uid: '-2', name: 'payment.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${project.payment_image}` }] : [],
        design: project.design_image ? [{ uid: '-3', name: 'design.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${project.design_image}` }] : [],
        pre_construction: project.pre_construction_image ? [{ uid: '-4', name: 'pre_construction.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${project.pre_construction_image}` }] : [],
        construction: project.construction_image ? [{ uid: '-5', name: 'construction.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${project.construction_image}` }] : [],
        cm: project.cm_image ? [{ uid: '-6', name: 'cm.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${project.cm_image}` }] : [],
        general: project.image ? [{ uid: '-7', name: 'image.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${project.image}` }] : [],
        precast: project.precast_image ? [{ uid: '-8', name: 'precast.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${project.precast_image}` }] : [], // เพิ่ม precast
        bidding: project.bidding_image ? [{ uid: '-9', name: 'bidding.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${project.bidding_image}` }] : [], // เพิ่ม bidding
      });
    } else {
      form.resetFields();
      setFileLists({
        progress_summary: [],
        payment: [],
        design: [],
        pre_construction: [],
        construction: [],
        cm: [],
        general: [],
        precast: [],
        bidding: [],
      });
      form.setFieldsValue({
        show_design: true,
        show_pre_construction: true,
        show_construction: true,
        show_precast: true,
        show_cm: true,
        show_bidding: true,
        bidding_progress: 0,
        design_progress: 0,
        pre_construction_progress: 0,
        construction_progress: 0,
        precast_progress: 0,
        cm_progress: 0,
      });
    }
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const token = localStorage.getItem('token');
      const formData = new FormData();
      if (values.project_name) formData.append('project_name', values.project_name);
      if (values.job_number) formData.append('job_number', values.job_number);
      if (values.description !== undefined) formData.append('description', values.description || '');
      if (values.start_date) formData.append('start_date', values.start_date.format('YYYY-MM-DD'));
      if (values.end_date) formData.append('end_date', values.end_date.format('YYYY-MM-DD'));
      if (values.status) formData.append('status', values.status);
      if (values.progress !== undefined) formData.append('progress', values.progress);
      if (values.owner) formData.append('owner', values.owner);
      if (values.consusltant) formData.append('consusltant', values.consusltant);
      if (values.contractor) formData.append('contractor', values.contractor);
      if (values.address) formData.append('address', values.address);

      // Visibility settings
      formData.append('show_design', values.show_design ? 1 : 0);
      formData.append('show_pre_construction', values.show_pre_construction ? 1 : 0);
      formData.append('show_construction', values.show_construction ? 1 : 0);
      formData.append('show_precast', values.show_precast ? 1 : 0);
      formData.append('show_cm', values.show_cm ? 1 : 0);
      formData.append('show_bidding', values.show_bidding ? 1 : 0);
      if (fileLists.general[0]?.originFileObj) {
        formData.append('image', fileLists.general[0].originFileObj);
      }
      if (fileLists.progress_summary[0]?.originFileObj) {
        formData.append('progress_summary_image', fileLists.progress_summary[0].originFileObj);
      }
      if (fileLists.payment[0]?.originFileObj) {
        formData.append('payment_image', fileLists.payment[0].originFileObj);
      }
      if (fileLists.design[0]?.originFileObj) {
        formData.append('design_image', fileLists.design[0].originFileObj);
      }
      if (fileLists.pre_construction[0]?.originFileObj) {
        formData.append('pre_construction_image', fileLists.pre_construction[0].originFileObj);
      }
      if (fileLists.construction[0]?.originFileObj) {
        formData.append('construction_image', fileLists.construction[0].originFileObj);
      }
      if (fileLists.cm[0]?.originFileObj) {
        formData.append('cm_image', fileLists.cm[0].originFileObj);
      }
      if (fileLists.precast[0]?.originFileObj) { // เพิ่ม precast
        formData.append('precast_image', fileLists.precast[0].originFileObj);
      }
      if (fileLists.bidding[0]?.originFileObj) {
        formData.append('bidding_image', fileLists.bidding[0].originFileObj);
      }

      // Phase Progress
      formData.append('bidding_progress', values.bidding_progress || 0);
      formData.append('design_progress', values.design_progress || 0);
      formData.append('pre_construction_progress', values.pre_construction_progress || 0);
      formData.append('construction_progress', values.construction_progress || 0);
      formData.append('precast_progress', values.precast_progress || 0);
      formData.append('cm_progress', values.cm_progress || 0);

      let response;
      if (editingProject) {
        response = await axios.put(
          `${import.meta.env.VITE_API_URL}/api/project/${editingProject.project_id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: response.data.message || 'แก้ไขโครงการสำเร็จ',
          confirmButtonColor: '#4f46e5',
          confirmButtonText: 'ตกลง',
        });
      } else {
        response = await axios.post(`${import.meta.env.VITE_API_URL}/api/project`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: response.data.message || 'สร้างโครงการสำเร็จ',
          confirmButtonColor: '#4f46e5',
          confirmButtonText: 'ตกลง',
        });
      }
      setIsModalVisible(false);
      form.resetFields();
      setFileLists({
        progress_summary: [],
        payment: [],
        design: [],
        pre_construction: [],
        construction: [],
        cm: [],
        general: [],
        precast: [],
        bidding: [],
      });
      await fetchProjects();
    } catch (error) {
      console.error('ข้อผิดพลาดใน handleOk:', error);
      const errorMessage = error.response?.data?.message || 'ไม่สามารถบันทึกโครงการได้';
      Swal.fire({
        icon: 'error',
        title: 'ข้อผิดพลาด',
        text: errorMessage,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'ตกลง',
      });
      if (error.response?.status === 403) {
        Swal.fire({
          icon: 'error',
          title: 'ไม่มีสิทธิ์',
          text: 'คุณไม่มีสิทธิ์แก้ไขโครงการนี้ กรุณาติดต่อผู้ดูแลระบบ',
          confirmButtonColor: '#4f46e5',
          confirmButtonText: 'ตกลง',
        });
      }
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingProject(null);
    setFileLists({
      progress_summary: [],
      payment: [],
      design: [],
      pre_construction: [],
      construction: [],
      cm: [],
      general: [],
      precast: [], // เพิ่ม precast
      bidding: [], // เพิ่ม bidding
    });
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
        const token = localStorage.getItem('token');
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/project/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'ลบโครงการสำเร็จ',
          confirmButtonColor: '#4f46e5',
          confirmButtonText: 'ตกลง',
        });
        await fetchProjects();
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'ไม่สามารถลบโครงการได้';
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: errorMessage,
          confirmButtonColor: '#ef4444',
          confirmButtonText: 'ตกลง',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileChange = (category) => ({ fileList }) => {
    setFileLists((prev) => ({
      ...prev,
      [category]: fileList.slice(-1), // จำกัดให้อัพโหลดได้เพียงไฟล์เดียวต่อหมวดหมู่
    }));
  };

  const clearFilters = () => {
    setSearchText('');
    setStatusFilter('');
    setSelectedYear('');
    setFilteredProjects(projects);
  };

  useEffect(() => {
    if (!user) {
      Swal.fire({
        icon: 'error',
        title: 'ไม่พบผู้ใช้',
        text: 'กรุณาเข้าสู่ระบบเพื่อใช้งาน',
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'ตกลง',
      }).then(() => {
        navigate('/login');
      });
      return;
    }

    if (!user.roles?.includes(1)) {
      Swal.fire({
        icon: 'error',
        title: 'ไม่มีสิทธิ์',
        text: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการโครงการได้',
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'ตกลง',
      }).then(() => {
        navigate('/projects');
      });
      return;
    }

    fetchProjects();
  }, [user, navigate, fetchProjects]);

  const columns = [
    {
      title: 'เลขที่',
      dataIndex: 'job_number',
      key: 'job_number',
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
      sorter: (a, b) => (a.owner || '').localeCompare(b.owner || ''),
      render: (text) => text || '-',
    },
    {
      title: 'ที่ปรึกษา',
      dataIndex: 'consusltant',
      key: 'consusltant',
      sorter: (a, b) => (a.consusltant || '').localeCompare(b.consusltant || ''),
      render: (text) => text || '-',
    },
    {
      title: 'ผู้รับเหมา',
      dataIndex: 'contractor',
      key: 'contractor',
      sorter: (a, b) => (a.contractor || '').localeCompare(b.contractor || ''),
      render: (text) => text || '-',
    },
    {
      title: 'ที่อยู่',
      dataIndex: 'address',
      key: 'address',
      sorter: (a, b) => (a.address || '').localeCompare(b.address || ''),
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
      title: 'วันที่สิ้นสุด',
      dataIndex: 'end_date',
      key: 'end_date',
      render: (text) => (text ? dayjs(text).format('DD/MM/YYYY') : '-'),
      sorter: (a, b) => (a.end_date ? new Date(a.end_date) - new Date(b.end_date) : 0),
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = status === 'Completed' ? 'green' : status === 'In Progress' ? 'blue' : 'orange';
        const statusText = status === 'Planning' ? 'วางแผน' : status === 'In Progress' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น';
        return <span style={{ color }}>{statusText}</span>;
      },
      sorter: (a, b) => a.status.localeCompare(b.status),
    },
    {
      title: '(%)',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress) => (progress !== null && progress !== undefined ? `${progress}%` : '-'),
      sorter: (a, b) => (a.progress || 0) - (b.progress || 0),
    },
    {
      title: 'รูปภาพทั่วไป',
      dataIndex: 'image',
      key: 'image',
      render: (image) =>
        image ? (
          <Image src={`${import.meta.env.VITE_API_URL}/${image}`} alt="โครงการ" width={50} height={50} preview />
        ) : (
          '-'
        ),
    },
    {
      title: 'ดำเนินการ',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => showModal(record)} />
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.project_id)} />
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: 'Kanit, sans-serif',
          borderRadius: 8,
          colorPrimary: '#4f46e5',
        },
        components: {
          Button: {
            defaultHoverBg: theme === 'dark' ? '#4b5563' : '#e5e7eb',
            defaultHoverColor: theme === 'dark' ? '#e5e7eb' : '#1f2937',
            controlTmpOutline: 'transparent',
            controlOutline: 'none',
          },
          Modal: {
            contentBg: theme === 'dark' ? '#1f2937' : '#ffffff',
            headerBg: theme === 'dark' ? '#1f2937' : '#ffffff',
            footerBg: theme === 'dark' ? '#1f2937' : '#ffffff',
          },
          Card: {
            borderRadiusLG: 8,
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          },
          Table: {
            headerBg: theme === 'dark' ? '#374151' : '#f8fafc',
            headerColor: theme === 'dark' ? '#e5e7eb' : '#1f2937',
          },
          Input: {
            colorBgContainer: theme === 'dark' ? '#374151' : '#ffffff',
            colorText: theme === 'dark' ? '#e5e7eb' : '#1f2937',
            colorTextPlaceholder: theme === 'dark' ? '#9ca3af' : '#6b7280',
          },
          Select: {
            selectorBg: theme === 'dark' ? '#374151' : '#ffffff',
            colorText: theme === 'dark' ? '#e5e7eb' : '#1f2937',
          },
        },
      }}
    >
      <App>
        <div className={clsx('min-h-screen', theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100')}>
          <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
          <div className="p-6">
            <Card className="project-setting-card">
              <div className="flex justify-between items-center mb-4">
                <Typography.Title level={2} className="font-kanit">
                  การจัดการโครงการ
                </Typography.Title>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBack}
                  className="rounded-lg"
                >
                  กลับ
                </Button>
              </div>
              <div className="flex flex-row gap-4">
                <div className="w-1/5">
                  <div className="flex justify-between items-center mb-2">
                    <Typography.Title level={4} className="font-kanit mb-0">
                      สถิติตามปี
                    </Typography.Title>
                    {selectedYear && (
                      <Button
                        size="small"
                        onClick={clearFilters}
                        className="text-blue-500"
                      >
                        แสดงทั้งหมด
                      </Button>
                    )}
                  </div>
                  {Object.keys(yearStats).length === 0 ? (
                    <Empty description="ไม่มีข้อมูลสถิติ" />
                  ) : (
                    <div className="space-y-2">
                      {Object.keys(yearStats)
                        .sort((a, b) => {
                          if (a === 'ไม่ระบุ') return 1;
                          if (b === 'ไม่ระบุ') return -1;
                          return b - a;
                        })
                        .map((year) => (
                          <Card
                            key={year}
                            title={
                              <div className="flex justify-between items-center">
                                <span className="font-kanit text-sm">
                                  ปี {year === 'ไม่ระบุ' ? 'ไม่ระบุ' : year}
                                </span>
                                <Badge
                                  count={yearStats[year].total}
                                  style={{ backgroundColor: '#4f46e5', fontSize: '10px' }}
                                  className="scale-75"
                                />
                              </div>
                            }
                            className={clsx(
                              "year-stat-card cursor-pointer transition-all duration-200 hover:shadow-md",
                              selectedYear === year.toString() ? 'border-blue-500 shadow-md' : ''
                            )}
                            hoverable
                            onClick={() => handleYearFilter(year.toString())}
                            size="small"
                          >
                            <div className="flex flex-col text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500 font-kanit">จำนวน:</span>
                                <span className="font-semibold text-blue-600">{yearStats[year].total}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-orange-600 font-kanit">วางแผน:</span>
                                <span className="font-semibold">{yearStats[year].planning}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-600 font-kanit">กำลังดำเนินการ:</span>
                                <span className="font-semibold">{yearStats[year].inProgress}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-green-600 font-kanit">เสร็จสิ้น:</span>
                                <span className="font-semibold">{yearStats[year].completed}</span>
                              </div>
                            </div>
                            {selectedYear === year.toString() && (
                              <div className="mt-1 pt-1 border-t border-gray-200">
                                <div className="flex items-center justify-center text-blue-600 text-xs font-kanit">
                                  <ProjectOutlined className="mr-1" />
                                  ปี {year === 'ไม่ระบุ' ? 'ไม่ระบุ' : year}
                                </div>
                              </div>
                            )}
                          </Card>
                        ))}
                    </div>
                  )}
                </div>
                <div className="w-4/5">
                  <Space style={{ marginBottom: 16 }} size="middle" wrap>
                    <Input.Search
                      placeholder="ค้นหาชื่อโครงการ, เลขที่งาน, เจ้าของ, ที่ปรึกษา, ผู้รับเหมา หรือที่อยู่"
                      value={searchText}
                      onChange={(e) => handleSearch(e.target.value)}
                      onSearch={handleSearch}
                      style={{ width: 300 }}
                      className="font-kanit"
                      allowClear
                    />
                    <Select
                      placeholder="เลือกสถานะ"
                      style={{ width: 200 }}
                      value={statusFilter}
                      onChange={handleStatusFilter}
                      allowClear
                      className="font-kanit"
                    >
                      <Option value="Planning">วางแผน</Option>
                      <Option value="In Progress">กำลังดำเนินการ</Option>
                      <Option value="Completed">เสร็จสิ้น</Option>
                    </Select>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => showModal()}
                      className="rounded-lg"
                    >
                      เพิ่มโครงการใหม่
                    </Button>
                    {(searchText || statusFilter || selectedYear) && (
                      <Button onClick={clearFilters} className="rounded-lg">
                        ล้างตัวกรอง
                      </Button>
                    )}
                  </Space>
                  {(searchText || statusFilter || selectedYear) && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Typography.Text className="font-kanit text-blue-700 dark:text-blue-300">
                        กำลังแสดง: {filteredProjects.length} โครงการ
                        {selectedYear && ` | ปี ${selectedYear === 'ไม่ระบุ' ? 'ไม่ระบุ' : selectedYear}`}
                        {statusFilter && ` | สถานะ: ${statusFilter === 'Planning' ? 'วางแผน' : statusFilter === 'In Progress' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}`}
                        {searchText && ` | ค้นหา: "${searchText}"`}
                      </Typography.Text>
                    </div>
                  )}
                  {loading ? (
                    <Typography.Text className="font-kanit">
                      กำลังโหลด...
                    </Typography.Text>
                  ) : filteredProjects.length === 0 ? (
                    <Empty
                      description={
                        <span className="font-kanit">
                          {(searchText || statusFilter || selectedYear)
                            ? "ไม่พบโครงการที่ตรงกับเงื่อนไขการค้นหา"
                            : "ไม่พบโครงการ"
                          }
                        </span>
                      }
                    />
                  ) : (
                    <Table
                      columns={columns}
                      dataSource={filteredProjects}
                      rowKey="project_id"
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                          `${range[0]}-${range[1]} จาก ${total} รายการ`
                      }}
                      scroll={{ x: true }}
                      className="project-table"
                    />
                  )}
                </div>
              </div>
            </Card>
          </div>
          <Modal
            title={editingProject ? 'แก้ไขโครงการ' : 'เพิ่มโครงการใหม่'}
            open={isModalVisible}
            onOk={handleOk}
            onCancel={handleCancel}
            okText="บันทึก"
            cancelText="ยกเลิก"
            className="font-kanit"
            width={800} // เพิ่มความกว้าง Modal เพื่อรองรับฟิลด์ใหม่
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="project_name"
                label="ชื่อโครงการ"
                rules={[{ required: true, message: 'กรุณากรอกชื่อโครงการ' }]}
              >
                <Input className="font-kanit" />
              </Form.Item>
              <Form.Item
                name="job_number"
                label="เลขที่งาน"
                rules={[{ required: true, message: 'กรุณากรอกเลขที่งาน' }]}
              >
                <Input className="font-kanit" />
              </Form.Item>
              <Form.Item name="description" label="คำอธิบาย">
                <Input.TextArea className="font-kanit" />
              </Form.Item>
              <Form.Item
                name="owner"
                label="เจ้าของโครงการ"
                rules={[{ required: true, message: 'กรุณากรอกเจ้าของโครงการ' }]}
              >
                <Input className="font-kanit" />
              </Form.Item>
              <Form.Item
                name="consusltant"
                label="ที่ปรึกษา"
                rules={[{ required: true, message: 'กรุณากรอกที่ปรึกษา' }]}
              >
                <Input className="font-kanit" />
              </Form.Item>
              <Form.Item
                name="contractor"
                label="ผู้รับเหมา"
                rules={[{ required: true, message: 'กรุณากรอกผู้รับเหมา' }]}
              >
                <Input className="font-kanit" />
              </Form.Item>
              <Form.Item
                name="address"
                label="ที่อยู่"
                rules={[{ required: true, message: 'กรุณากรอกที่อยู่' }]}
              >
                <Input className="font-kanit" />
              </Form.Item>
              <Form.Item
                name="start_date"
                label="วันที่เริ่ม"
                rules={[{ required: true, message: 'กรุณาเลือกวันที่เริ่ม' }]}
              >
                <DatePicker format="DD/MM/YYYY" className="font-kanit" />
              </Form.Item>
              <Form.Item
                name="end_date"
                label="วันที่สิ้นสุด"
                rules={[{ required: true, message: 'กรุณาเลือกวันที่สิ้นสุด' }]}
              >
                <DatePicker format="DD/MM/YYYY" className="font-kanit" />
              </Form.Item>
              <Form.Item
                name="status"
                label="สถานะ"
                rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]}
              >
                <Select className="font-kanit">
                  <Option value="Planning">วางแผน</Option>
                  <Option value="In Progress">กำลังดำเนินการ</Option>
                  <Option value="Completed">เสร็จสิ้น</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="progress"
                label="ความคืบหน้า (%)"
                rules={[
                  { required: true, message: 'กรุณากรอกความคืบหน้า' },
                  {
                    validator: (_, value) =>
                      value !== undefined && value !== null && (value < 0 || value > 100)
                        ? Promise.reject('ความคืบหน้าต้องอยู่ระหว่าง 0-100')
                        : Promise.resolve(),
                  },
                ]}
              >
                <InputNumber min={0} max={100} className="font-kanit w-full" />
              </Form.Item>
              <Divider orientation="left">การแสดงผลการเข้าถึง Card (หน้าบ้าน)</Divider>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-6">
                <Form.Item name="show_design" valuePropName="checked" noStyle>
                  <Checkbox className="font-kanit">Design</Checkbox>
                </Form.Item>
                <Form.Item name="show_pre_construction" valuePropName="checked" noStyle>
                  <Checkbox className="font-kanit">Pre-Construction</Checkbox>
                </Form.Item>
                <Form.Item name="show_construction" valuePropName="checked" noStyle>
                  <Checkbox className="font-kanit">Construction</Checkbox>
                </Form.Item>
                <Form.Item name="show_precast" valuePropName="checked" noStyle>
                  <Checkbox className="font-kanit">Precast</Checkbox>
                </Form.Item>
                <Form.Item name="show_cm" valuePropName="checked" noStyle>
                  <Checkbox className="font-kanit">CM</Checkbox>
                </Form.Item>
                <Form.Item name="show_bidding" valuePropName="checked" noStyle>
                  <Checkbox className="font-kanit">Bidding</Checkbox>
                </Form.Item>
              </div>

              <Divider orientation="left">ความคืบหน้าของแต่ละเฟส (%)</Divider>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-6">
                <Form.Item name="bidding_progress" label="Bidding">
                  <InputNumber min={0} max={100} className="w-full" />
                </Form.Item>
                <Form.Item name="design_progress" label="Design">
                  <InputNumber min={0} max={100} className="w-full" />
                </Form.Item>
                <Form.Item name="pre_construction_progress" label="Pre-Construction">
                  <InputNumber min={0} max={100} className="w-full" />
                </Form.Item>
                <Form.Item name="construction_progress" label="Construction">
                  <InputNumber min={0} max={100} className="w-full" />
                </Form.Item>
                <Form.Item name="precast_progress" label="Precast">
                  <InputNumber min={0} max={100} className="w-full" />
                </Form.Item>
                <Form.Item name="cm_progress" label="CM">
                  <InputNumber min={0} max={100} className="w-full" />
                </Form.Item>
              </div>

              <Divider orientation="left">รูปภาพโครงการ</Divider>
              <Form.Item name="image" label="รูปภาพโครงการ (ทั่วไป)">
                <div>
                  <Upload
                    fileList={fileLists.general}
                    onChange={handleFileChange('general')}
                    beforeUpload={() => false}
                    accept="image/*"
                    listType="picture"
                  >
                    <Button icon={<UploadOutlined />} className="font-kanit">
                      เลือกไฟล์
                    </Button>
                  </Upload>
                </div>
              </Form.Item>
              <Form.Item name="progress_summary_image" label="รูปภาพสรุปความคืบหน้า">
                <div>
                  <Upload
                    fileList={fileLists.progress_summary}
                    onChange={handleFileChange('progress_summary')}
                    beforeUpload={() => false}
                    accept="image/*"
                    listType="picture"
                  >
                    <Button icon={<UploadOutlined />} className="font-kanit">
                      เลือกไฟล์
                    </Button>
                  </Upload>
                </div>
              </Form.Item>
              <Form.Item name="payment_image" label="รูปภาพการชำระเงิน">
                <div>
                  <Upload
                    fileList={fileLists.payment}
                    onChange={handleFileChange('payment')}
                    beforeUpload={() => false}
                    accept="image/*"
                    listType="picture"
                  >
                    <Button icon={<UploadOutlined />} className="font-kanit">
                      เลือกไฟล์
                    </Button>
                  </Upload>
                </div>
              </Form.Item>
              <Form.Item name="design_image" label="รูปภาพการออกแบบ">
                <div>
                  <Upload
                    fileList={fileLists.design}
                    onChange={handleFileChange('design')}
                    beforeUpload={() => false}
                    accept="image/*"
                    listType="picture"
                  >
                    <Button icon={<UploadOutlined />} className="font-kanit">
                      เลือกไฟล์
                    </Button>
                  </Upload>
                </div>
              </Form.Item>
              <Form.Item name="pre_construction_image" label="รูปภาพก่อนการก่อสร้าง">
                <div>
                  <Upload
                    fileList={fileLists.pre_construction}
                    onChange={handleFileChange('pre_construction')}
                    beforeUpload={() => false}
                    accept="image/*"
                    listType="picture"
                  >
                    <Button icon={<UploadOutlined />} className="font-kanit">
                      เลือกไฟล์
                    </Button>
                  </Upload>
                </div>
              </Form.Item>
              <Form.Item name="construction_image" label="รูปภาพการก่อสร้าง">
                <div>
                  <Upload
                    fileList={fileLists.construction}
                    onChange={handleFileChange('construction')}
                    beforeUpload={() => false}
                    accept="image/*"
                    listType="picture"
                  >
                    <Button icon={<UploadOutlined />} className="font-kanit">
                      เลือกไฟล์
                    </Button>
                  </Upload>
                </div>
              </Form.Item>
              <Form.Item name="cm_image" label="รูปภาพการบริหารงานก่อสร้าง (CM)">
                <div>
                  <Upload
                    fileList={fileLists.cm}
                    onChange={handleFileChange('cm')}
                    beforeUpload={() => false}
                    accept="image/*"
                    listType="picture"
                  >
                    <Button icon={<UploadOutlined />} className="font-kanit">
                      เลือกไฟล์
                    </Button>
                  </Upload>
                </div>
              </Form.Item>
              <Form.Item name="precast_image" label="รูปภาพ Precast">
                <div>
                  <Upload
                    fileList={fileLists.precast}
                    onChange={handleFileChange('precast')}
                    beforeUpload={() => false}
                    accept="image/*"
                    listType="picture"
                  >
                    <Button icon={<UploadOutlined />} className="font-kanit">
                      เลือกไฟล์
                    </Button>
                  </Upload>
                </div>
              </Form.Item>
              <Form.Item name="bidding_image" label="รูปภาพ Bidding">
                <div>
                  <Upload
                    fileList={fileLists.bidding}
                    onChange={handleFileChange('bidding')}
                    beforeUpload={() => false}
                    accept="image/*"
                    listType="picture"
                  >
                    <Button icon={<UploadOutlined />} className="font-kanit">
                      เลือกไฟล์
                    </Button>
                  </Upload>
                </div>
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </App>
    </ConfigProvider>
  );
};

ProjectSetting.propTypes = {
  user: PropTypes.shape({
    user_id: PropTypes.number,
    username: PropTypes.string,
    email: PropTypes.string,
    first_name: PropTypes.string,
    last_name: PropTypes.string,
    roles: PropTypes.arrayOf(PropTypes.number),
    isAdmin: PropTypes.bool,
  }),
  setUser: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
  setTheme: PropTypes.func.isRequired,
};

export default ProjectSetting;