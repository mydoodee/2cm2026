import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Space, Card, Typography, Input, Select, Modal, Form, Empty, DatePicker, Upload, Image, App, Badge, InputNumber, Checkbox, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, ArrowLeftOutlined, ProjectOutlined, SettingOutlined, SearchOutlined } from '@ant-design/icons';
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
    job_status: [],
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
        show_progress_summary: project.show_progress_summary !== undefined ? project.show_progress_summary : true,
        show_payment: project.show_payment !== undefined ? project.show_payment : true,
        show_job_status: project.show_job_status !== undefined ? project.show_job_status : true,
        bidding_progress: project.bidding_progress || 0,
        design_progress: project.design_progress || 0,
        pre_construction_progress: project.pre_construction_progress || 0,
        construction_progress: project.construction_progress || 0,
        precast_progress: project.precast_progress || 0,
        cm_progress: project.cm_progress || 0,
        job_status_progress: project.job_status_progress || 0,
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
        job_status: project.job_status_image ? [{ uid: '-10', name: 'job_status.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${project.job_status_image}` }] : [],
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
        job_status: [],
      });
      form.setFieldsValue({
        show_design: true,
        show_pre_construction: true,
        show_construction: true,
        show_precast: true,
        show_cm: true,
        show_bidding: true,
        show_progress_summary: true,
        show_payment: true,
        show_job_status: true,
        bidding_progress: 0,
        design_progress: 0,
        pre_construction_progress: 0,
        construction_progress: 0,
        precast_progress: 0,
        cm_progress: 0,
        job_status_progress: 0,
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
      formData.append('show_design', values.show_design ? '1' : '0');
      formData.append('show_pre_construction', values.show_pre_construction ? '1' : '0');
      formData.append('show_construction', values.show_construction ? '1' : '0');
      formData.append('show_precast', values.show_precast ? '1' : '0');
      formData.append('show_cm', values.show_cm ? '1' : '0');
      formData.append('show_bidding', values.show_bidding ? '1' : '0');
      formData.append('show_progress_summary', values.show_progress_summary ? '1' : '0');
      formData.append('show_payment', values.show_payment ? '1' : '0');
      formData.append('show_job_status', values.show_job_status ? '1' : '0');

      // Phase Progress
      formData.append('bidding_progress', values.bidding_progress || 0);
      formData.append('design_progress', values.design_progress || 0);
      formData.append('pre_construction_progress', values.pre_construction_progress || 0);
      formData.append('construction_progress', values.construction_progress || 0);
      formData.append('precast_progress', values.precast_progress || 0);
      formData.append('cm_progress', values.cm_progress || 0);
      formData.append('job_status_progress', values.job_status_progress || 0);
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
      if (fileLists.job_status[0]?.originFileObj) {
        formData.append('job_status_image', fileLists.job_status[0].originFileObj);
      }

      let response;
      if (editingProject) {
        response = await axios.put(
          `${import.meta.env.VITE_API_URL}/api/project/${editingProject.project_id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } } // Omit Content-Type: multipart/form-data
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
        job_status: [],
      });
      await fetchProjects();
    } catch (error) {
      console.error('❌ Error in handleOk:', error);
      if (error.response) {
        console.error('📡 Error Response:', error.response.data);
      }
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
      precast: [],
      bidding: [],
      job_status: [],
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
      sorter: (a, b) => a.status.localeCompare(b.status),
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
      sorter: (a, b) => (a.progress || 0) - (b.progress || 0),
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
      title: 'Action',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button 
            icon={<EditOutlined className="text-indigo-500" />} 
            onClick={(e) => { e.currentTarget.blur(); showModal(record); }} 
            className="rounded-xl border-slate-100 dark:border-slate-700 bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-500/10 flex items-center justify-center p-0 w-10 h-10"
          />
          <Button 
            icon={<DeleteOutlined className="text-rose-500" />} 
            danger 
            onClick={() => handleDelete(record.project_id)} 
            className="rounded-xl border-rose-100 dark:border-rose-900/50 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center p-0 w-10 h-10"
          />
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
            borderRadiusLG: 24,
            boxShadow: theme === 'dark' ? '0 10px 40px rgba(0,0,0,0.3)' : '0 10px 40px rgba(0,0,0,0.03)',
            colorBorderSecondary: 'transparent',
          },
          Table: {
            headerBg: theme === 'dark' ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc',
            headerColor: theme === 'dark' ? '#94a3b8' : '#475569',
            headerBorderRadius: 16,
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
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
            <Card className={`border-0 rounded-[2.5rem] overflow-hidden transition-all duration-300 ${
              theme === 'dark' ? 'bg-slate-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white shadow-[0_10px_40px_rgba(0,0,0,0.03)]'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                <div className="flex items-center">
                  <div className={`p-4 rounded-[1.25rem] mr-5 ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                    <SettingOutlined className={`text-3xl ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
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

              <div className="flex flex-col xl:flex-row gap-8">
                <div className="w-full xl:w-72 flex-shrink-0">
                  <div className="flex justify-between items-center mb-6">
                    <Typography.Title level={4} className={`!mb-0 font-kanit font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
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
                <div className="flex-1 overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div className="flex flex-wrap items-center gap-4 flex-1">
                      <div className={`flex items-center p-1 rounded-2xl shadow-sm border ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-100'}`}>
                        <Input
                          placeholder="ค้นหาชื่อโครงการ..."
                          prefix={<SearchOutlined className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} />}
                          value={searchText}
                          onChange={(e) => handleSearch(e.target.value)}
                          variant="borderless"
                          className={`font-kanit py-2 px-4 w-72 h-10 ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}
                        />
                        <div className={`w-px h-6 self-center mx-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                        <Select
                          placeholder="ทุกสถานะ"
                          value={statusFilter}
                          onChange={handleStatusFilter}
                          allowClear
                          variant="borderless"
                          className="font-kanit h-10 w-44 flex items-center"
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
                          ล้างค่า
                        </Button>
                      )}
                    </div>
                    
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={(e) => { e.currentTarget.blur(); showModal(); }}
                      className="rounded-2xl h-12 px-8 font-extrabold shadow-lg shadow-indigo-500/25 flex items-center"
                    >
                      เพิ่มโครงการใหม่
                    </Button>
                  </div>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                      <Typography.Text className="mt-4 font-kanit text-slate-400 italic">กำลังดึงข้อมูล...</Typography.Text>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className={`p-16 rounded-[2rem] text-center border-2 border-dashed ${theme === 'dark' ? 'bg-slate-800/20 border-slate-700/50' : 'bg-slate-50/50 border-slate-200'}`}>
                      <Empty
                        description={
                          <span className={`font-kanit ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {(searchText || statusFilter || selectedYear) ? "ไม่พบโครงการที่ตรงตามเงื่อนไข" : "ยังไม่มีข้อมูลโครงการ"}
                          </span>
                        }
                      />
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] overflow-hidden border-0 shadow-sm bg-transparent">
                      <Table
                        columns={columns}
                        dataSource={filteredProjects}
                        rowKey="project_id"
                        pagination={{
                          pageSize: 8,
                          showTotal: (total, range) => <span className="font-kanit opacity-50 text-xs">{`${range[0]}-${range[1]} / ${total}`}</span>
                        }}
                        scroll={{ x: true }}
                        className={`font-kanit ${theme === 'dark' ? 'ant-table-dark' : 'ant-table-light'}`}
                      />
                    </div>
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
            width={1000} // เพิ่มความกว้างเพื่อให้ Grid 3-4 คอลัมน์ดูไม่เบียด
          >
            <Form form={form} layout="vertical" className="project-setting-form-compact">
              {/* === Section 1: Basic Info === */}
              <Divider orientation="left" className="!mt-0 !mb-4"><span className="text-indigo-600 font-bold">ข้อมูลพื้นฐานโครงการ</span></Divider>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 mb-6">
                <Form.Item name="project_name" label="ชื่อโครงการ" rules={[{ required: true, message: 'กรุณากรอกชื่อโครงการ' }]} className="mb-2">
                  <Input className="font-kanit rounded-xl h-10" placeholder="ระบุชื่อโครงการ" />
                </Form.Item>
                <Form.Item name="job_number" label="เลขที่งาน" rules={[{ required: true, message: 'กรุณากรอกเลขที่งาน' }]} className="mb-2">
                  <Input className="font-kanit rounded-xl h-10" placeholder="เช่น SPK-XXXX" />
                </Form.Item>
                <div className="grid grid-cols-2 gap-4">
                  <Form.Item name="status" label="สถานะ" rules={[{ required: true, message: 'กรุณาเลือกสถานะ' }]} className="mb-2">
                    <Select className="font-kanit h-10">
                      <Option value="Planning">วางแผน</Option>
                      <Option value="In Progress">ดำเนินการ</Option>
                      <Option value="Completed">เสร็จสิ้น</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="progress" label="รวม (%)" rules={[{ required: true, message: 'กรุณา!' }]} className="mb-2">
                    <InputNumber min={0} max={100} className="font-kanit w-full rounded-xl h-10 flex items-center" />
                  </Form.Item>
                </div>
                <Form.Item name="start_date" label="วันที่เริ่ม" rules={[{ required: true, message: 'กรุณาเลือก!' }]} className="mb-2">
                  <DatePicker format="DD/MM/YYYY" className="font-kanit w-full rounded-xl h-10" />
                </Form.Item>
                <Form.Item name="end_date" label="วันที่สิ้นสุด" rules={[{ required: true, message: 'กรุณาเลือก!' }]} className="mb-2">
                  <DatePicker format="DD/MM/YYYY" className="font-kanit w-full rounded-xl h-10" />
                </Form.Item>
                <Form.Item name="description" label="คำอธิบายสั้นๆ" className="mb-2 lg:col-span-1">
                  <Input className="font-kanit rounded-xl h-10" placeholder="รายละเอียดเพิ่มเติม..." />
                </Form.Item>
              </div>

              {/* === Section 2: Stakeholders & Location === */}
              <Divider orientation="left" className="!mb-4"><span className="text-indigo-600 font-bold">รายละเอียดผู้เกี่ยวข้องภายนอก</span></Divider>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 mb-6">
                <Form.Item name="owner" label="เจ้าของโครงการ" rules={[{ required: true }]} className="mb-2">
                  <Input className="font-kanit rounded-xl h-10" />
                </Form.Item>
                <Form.Item name="consusltant" label="ที่ปรึกษา" rules={[{ required: true }]} className="mb-2">
                  <Input className="font-kanit rounded-xl h-10" />
                </Form.Item>
                <Form.Item name="contractor" label="ผู้รับเหมา" rules={[{ required: true }]} className="mb-2">
                  <Input className="font-kanit rounded-xl h-10" />
                </Form.Item>
                <Form.Item name="address" label="ที่ตั้งโครงการ (Address)" rules={[{ required: true }]} className="mb-2">
                  <Input className="font-kanit rounded-xl h-10" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* === Section 3: Phase Visibility === */}
                <div>
                  <Divider orientation="left" className="!mb-4"><span className="text-indigo-600 font-bold text-sm">การเปิด/ปิด Card หน้าบ้าน</span></Divider>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-[1.5rem] border border-slate-100 dark:border-slate-700/50">
                    {[
                      { name: "show_bidding", label: "Bidding" },
                      { name: "show_design", label: "Design" },
                      { name: "show_pre_construction", label: "Pre-Con" },
                      { name: "show_construction", label: "Construction" },
                      { name: "show_precast", label: "Precast" },
                      { name: "show_cm", label: "CM" },
                      { name: "show_progress_summary", label: "สรุปผลงาน" },
                      { name: "show_payment", label: "การชำระเงิน" },
                      { name: "show_job_status", label: "สถานะงาน" }
                    ].map(field => (
                      <Form.Item key={field.name} name={field.name} valuePropName="checked" noStyle>
                        <Checkbox className="font-kanit text-xs">{field.label}</Checkbox>
                      </Form.Item>
                    ))}
                  </div>
                </div>

                {/* === Section 4: Phase Progress === */}
                <div>
                  <Divider orientation="left" className="!mb-4"><span className="text-indigo-600 font-bold text-sm">ความคืบหน้าแต่ละเฟส (%)</span></Divider>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0 p-4 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-[1.5rem] border border-indigo-100/50 dark:border-indigo-800/30">
                    {[
                      { name: "bidding_progress", label: "Bidding" },
                      { name: "design_progress", label: "Design" },
                      { name: "pre_construction_progress", label: "Pre-Con" },
                      { name: "construction_progress", label: "Const." },
                      { name: "precast_progress", label: "Precast" },
                      { name: "cm_progress", label: "CM" },
                      { name: "job_status_progress", label: "สถานะงาน" }
                    ].map(field => (
                      <Form.Item key={field.name} name={field.name} label={<span className="text-[10px] uppercase font-bold text-slate-400">{field.label}</span>} className="mb-1">
                        <InputNumber min={0} max={100} size="small" className="w-full rounded-lg" />
                      </Form.Item>
                    ))}
                  </div>
                </div>
              </div>

              {/* === Section 5: Image Grid (Compact) === */}
              <Divider orientation="left" className="!mb-4 !mt-8"><span className="text-indigo-600 font-bold">คลังรูปภาพโครงการ (9 หมวดหมู่)</span></Divider>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { name: "general", label: "รูปหลัก (Main)", field: "image" },
                  { name: "progress_summary", label: "สรุปผลงาน", field: "progress_summary_image" },
                  { name: "payment", label: "การชำระเงิน", field: "payment_image" },
                  { name: "design", label: "ออกแบบ", field: "design_image" },
                  { name: "pre_construction", label: "เตรียมงาน", field: "pre_construction_image" },
                  { name: "construction", label: "ก่อสร้าง", field: "construction_image" },
                  { name: "precast", label: "Precast", field: "precast_image" },
                  { name: "cm", label: "บริหารงาน", field: "cm_image" },
                  { name: "bidding", label: "ประมูลงาน", field: "bidding_image" },
                  { name: "job_status", label: "สถานะงาน", field: "job_status_image" }
                ].map(img => (
                  <div key={img.name} className={`p-3 rounded-2xl transition-all border ${theme === 'dark' ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="text-[11px] font-bold mb-2 text-slate-500 uppercase tracking-wider truncate">{img.label}</div>
                    <Form.Item name={img.field} noStyle>
                      <Upload
                        fileList={fileLists[img.name] || []}
                        onChange={handleFileChange(img.name)}
                        beforeUpload={() => false}
                        accept="image/*"
                        listType="picture-card"
                        className="compact-uploader"
                      >
                        {(fileLists[img.name] || []).length < 1 && (
                          <div className="flex flex-col items-center justify-center">
                            <PlusOutlined className="text-lg text-indigo-500" />
                            <div className="text-[10px] mt-1 text-slate-400">อัปโหลด</div>
                          </div>
                        )}
                      </Upload>
                    </Form.Item>
                  </div>
                ))}
              </div>
            </Form>
          </Modal>
        </div>
      </App>
      <style>{`
        .project-setting-form-compact .ant-divider-inner-text {
          font-family: 'Kanit', sans-serif;
          font-size: 16px;
        }
        .compact-uploader .ant-upload-select-picture-card {
          width: 80px !important;
          height: 80px !important;
          margin-bottom: 0 !important;
          margin-inline-end: 0 !important;
          border-radius: 12px !important;
          background-color: ${theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} !important;
          border: 1px dashed ${theme === 'dark' ? '#334155' : '#e2e8f0'} !important;
        }
        .compact-uploader .ant-upload-list-item-container {
          width: 80px !important;
          height: 80px !important;
        }
        .ant-modal-content {
          border-radius: 2rem !important;
        }
        .ant-modal-header {
          margin-bottom: 24px !important;
        }
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