import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Spin, Card, Typography, message } from 'antd';
import { Progress as AntProgress } from 'antd';
import axios from 'axios';
// Try one of these import paths based on your file structure:
import Navbar from './Navbar.jsx'; // If Navbar is in the same components folder
// import Navbar from '../Navbar.jsx'; // If Navbar is in src root
// import Navbar from '@/components/Navbar.jsx'; // If you have the @ alias working
import clsx from 'clsx';

const { Title, Text } = Typography;

const Progress = ({ user, setUser, theme }) => {
  const { id } = useParams();
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const source = axios.CancelToken.source();
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found');
        }
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/project/${id}/progress`, {
          headers: { Authorization: `Bearer ${token}` },
          cancelToken: source.token,
        });
        setProgressData(response.data.data);
        setLoading(false);
      } catch (error) {
        setLoading(false);
        if (axios.isCancel(error)) {
          return;
        }
        if (error.code === 'ERR_NETWORK') {
          message.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อเครือข่าย');
        } else if (error.response?.status === 404) {
          message.error('ไม่พบข้อมูลความคืบหน้าสำหรับโครงการนี้');
        } else if (error.response?.status === 401 || error.response?.status === 403) {
          message.error('กรุณาเข้าสู่ระบบใหม่');
        } else {
          message.error('เกิดข้อผิดพลาดในการดึงข้อมูลความคืบหน้า กรุณาลองใหม่');
        }
      }
    };

    fetchProgress();
    return () => {
      source.cancel('Component unmounted');
    };
  }, [id]);

  if (loading) {
    return (
      <div className={clsx("h-screen w-full", theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100', "flex items-center justify-center")}>
        <Spin size="large" />
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className={clsx("h-screen w-full", theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100', "font-kanit")}>
        <Navbar user={user} setUser={setUser} theme={theme} />
        <div className="w-full px-4 py-6">
          <Text className="text-gray-600 font-kanit">ไม่มีข้อมูลความคืบหน้า</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("h-screen w-full", theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100', "transition-all duration-300 font-kanit overflow-auto")}>
      <Navbar user={user} setUser={setUser} theme={theme} />
      <div className="w-full px-4 py-6">
        <Title level={3} className="mb-6 text-gray-900 font-kanit">
          ความคืบหน้าของโครงการ {id}
        </Title>
        <Card className="bg-white shadow-md rounded-lg">
          <div className="p-4">
            <Title level={4} className="mb-4 text-gray-900 font-kanit">
              สรุปความคืบหน้า
            </Title>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Text className="block font-semibold text-gray-800 font-kanit mb-2">
                  ความคืบหน้าปัจจุบัน
                </Text>
                <AntProgress
                  percent={progressData.current_progress || 0}
                  strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                  format={() => `${progressData.current_progress || 0}%`}
                />
              </div>
              <div>
                <Text className="block font-semibold text-gray-800 font-kanit mb-2">
                  ความคืบหน้าตามแผน
                </Text>
                <AntProgress
                  percent={progressData.planned_progress || 0}
                  strokeColor="#1890ff"
                  format={() => `${progressData.planned_progress || 0}%`}
                />
              </div>
              <div>
                <Text className="block font-semibold text-gray-800 font-kanit mb-2">
                  วันที่อัปเดตล่าสุด
                </Text>
                <Text className="text-gray-600 font-kanit">
                  {progressData.last_updated ? new Date(progressData.last_updated).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                </Text>
              </div>
              <div>
                <Text className="block font-semibold text-gray-800 font-kanit mb-2">
                  สถานะ
                </Text>
                <Text className="text-gray-600 font-kanit">
                  {progressData.status || 'ไม่ระบุ'}
                </Text>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Progress;