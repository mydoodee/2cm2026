import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Space, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../Navbar';
import axios from 'axios';

const { Title, Text } = Typography;

const SCurve = ({ user, setUser, theme, setTheme }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลโครงการ
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token');

        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/project/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProject(response.data.project);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch project:', error);
        setLoading(false);
      }
    };

    if (id) fetchProject();
  }, [id]);

  const handleBack = () => {
    navigate(`/project/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Text type="danger">ไม่พบข้อมูลโครงการ</Text>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full ${theme === 'dark' ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
        } transition-all duration-300 font-kanit flex flex-col`}
    >
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />

      {/* Main Content - Full Screen */}
      <div className="flex-1 flex flex-col px-4 py-6 md:px-8 lg:px-12 max-w-full">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            className="mr-3 text-lg"
          />
          <Title level={3} className="m-0 font-kanit text-xl md:text-2xl">
            Planning: {project.project_name || 'ไม่ระบุชื่อโครงการ'}
          </Title>
        </div>

        {/* 2 Cards Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          {/* Card 1: ข้อมูลโครงการ (ซ้าย) */}
          <div className="lg:col-span-1">
            <Card
              title="ข้อมูลโครงการ"
              className="h-full shadow-md"
              styles={{ body: { height: 'calc(100% - 55px)', overflow: 'auto' } }}
            >
              <Space direction="vertical" size="middle" className="w-full">
                <div>
                  <Text strong>รหัสงาน:</Text>{' '}
                  <Text>{project.job_number || 'ไม่ระบุ'}</Text>
                </div>
                <div>
                  <Text strong>เจ้าของโครงการ:</Text>{' '}
                  <Text>{project.owner || 'ไม่ระบุ'}</Text>
                </div>
                <div>
                  <Text strong>ผู้รับเหมา:</Text>{' '}
                  <Text>{project.contractor || 'ไม่ระบุ'}</Text>
                </div>
                <div>
                  <Text strong>ที่อยู่:</Text>{' '}
                  <Text className="block">{project.address || 'ไม่ระบุ'}</Text>
                </div>
                <div>
                  <Text strong>ระยะเวลา:</Text>{' '}
                  <Text>
                    {project.start_date
                      ? new Date(project.start_date).toLocaleDateString('th-TH')
                      : 'ไม่ระบุ'}{' '}
                    →{' '}
                    {project.end_date
                      ? new Date(project.end_date).toLocaleDateString('th-TH')
                      : 'ไม่ระบุ'}
                  </Text>
                </div>
                <div>
                  <Text strong>สถานะ:</Text>{' '}
                  <Text type="warning">
                    {project.status === 'Planning'
                      ? 'วางแผน'
                      : project.status === 'In Progress'
                        ? 'กำลังดำเนินการ'
                        : project.status === 'Completed'
                          ? 'เสร็จสมบูรณ์'
                          : 'ไม่ระบุ'}
                  </Text>
                </div>
              </Space>
            </Card>
          </div>

          {/* Card 2: ว่าง (ขวา) */}
          <div className="lg:col-span-2">
            <Card
              title="Planning Area"
              className="h-full shadow-md"
              styles={{ body: { height: 'calc(100% - 55px)', overflow: 'hidden' } }}
            >
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Text type="secondary" className="text-center p-6">
                  <div className="text-lg font-medium mb-2">พื้นที่ว่างสำหรับ Planning</div>
                  <div className="text-sm">
                    ใช้สำหรับ:
                    <br />• Gantt Chart
                    <br />• Timeline
                    <br />• Milestone
                    <br />• Resource Plan
                  </div>
                </Text>
              </div>
            </Card>
          </div>
        </div>

        {/* ปุ่มกลับด้านล่าง */}
        <div className="mt-8 flex justify-center">
          <Button type="default" size="large" icon={<ArrowLeftOutlined />} onClick={handleBack}>
            กลับสู่หน้าโครงการ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SCurve;