import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone, LoginOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import logoSpk from '../assets/logospk.png';

const { Title, Text } = Typography;

import Navbar from './Navbar';
import api from '../axiosConfig';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3050';
const API_URL = `${API_BASE_URL}/api`;

function Login({ setUser, theme }) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const usernameInputRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setError('ไม่มีการเชื่อมต่ออินเทอร์เน็ต');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => usernameInputRef.current?.focus(), []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/api/user')
        .then(res => {
          setUser(res.data.user);
          navigate('/dashboard');
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setUser(null);
        });
    }
  }, [setUser, navigate]);

  const handleLogin = useCallback(async (values) => {
    if (!isOnline) return setError('ไม่มีการเชื่อมต่ออินเทอร์เน็ต');
    setIsLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_URL}/login`, {
        username: values.username.trim(),
        password: values.password.trim()
      }, { timeout: 10000 });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      setUser(res.data.user);

      // ✅ Multi-Company Logic
      const { companies, activeCompany, requireCompanySelection } = res.data;

      if (activeCompany) {
        // บริษัทเดียว → เข้าเลย
        localStorage.setItem('activeCompanyId', activeCompany.company_id);
        localStorage.setItem('activeCompany', JSON.stringify(activeCompany));
        navigate('/projects');
      } else if (requireCompanySelection && companies?.length > 1) {
        // หลายบริษัท → ไปเลือก
        localStorage.setItem('pendingCompanies', JSON.stringify(companies));
        navigate('/select-company');
      } else if (companies?.length === 0) {
        // ไม่มีบริษัท (Super Admin ที่ยังไม่สร้าง)
        navigate('/projects');
      } else {
        navigate('/projects');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'ล็อกอินไม่สำเร็จ';
      setError(msg === 'Invalid credentials' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : msg);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, setUser, navigate]);

  return (
    <div className={clsx(
      'min-h-screen flex items-center justify-center p-4 sm:p-6',
      theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50'
    )}>
      <div className={clsx(
        'w-full max-w-md',
        'rounded-2xl sm:rounded-3xl overflow-hidden',
        'shadow-xl sm:shadow-2xl backdrop-blur-sm',
        theme === 'dark'
          ? 'bg-gray-900/95 border border-gray-800'
          : 'bg-white border border-gray-100'
      )}>

        {/* Header */}
        <div className="px-6 sm:px-10 pt-8 sm:pt-12 pb-6 sm:pb-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <img
              src={logoSpk}
              alt="SPK Logo"
              className={clsx(
                'w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-contain p-2',
                'transition-transform active:scale-95 sm:hover:scale-105',
                theme === 'dark'
                  ? 'bg-red-950/30 border border-red-900/50 shadow-[0_0_30px_rgba(220,38,38,0.2)]'
                  : 'bg-red-50 border border-red-100 shadow-[0_10px_25px_rgba(220,38,38,0.15)]'
              )}
            />
          </div>

          <Title level={2} className={clsx(
            '!mb-1 sm:!mb-2 !text-xl sm:!text-2xl font-bold',
            theme === 'dark' ? '!text-white' : '!text-gray-900'
          )}>
            Project Management
          </Title>

          <Text className={clsx(
            'text-sm sm:text-base',
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          )}>
            เข้าสู่ระบบ การบริหารโครงการ
          </Text>
        </div>

        {/* Form */}
        <div className="px-10 pb-10">
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              className={clsx(
                'mb-6 rounded-xl',
                theme === 'dark'
                  ? '!bg-red-950/50 !border-red-900'
                  : '!bg-red-50 !border-red-200'
              )}
            />
          )}

          <Form form={form} onFinish={handleLogin} layout="vertical">
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'กรุณากรอกชื่อผู้ใช้' }]}
              className="mb-5"
            >
              <Input
                ref={usernameInputRef}
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="ชื่อผู้ใช้"
                size="large"
                className={clsx(
                  'rounded-xl h-12',
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-gray-50 border-gray-200'
                )}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }]}
              className="mb-6"
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="รหัสผ่าน"
                size="large"
                iconRender={visible => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                className={clsx(
                  'rounded-xl h-12',
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-gray-50 border-gray-200'
                )}
              />
            </Form.Item>

            <Form.Item className="mb-4">
              <Button
                htmlType="submit"
                loading={isLoading}
                icon={!isLoading && <LoginOutlined />}
                size="large"
                className={clsx(
                  'w-full h-12 rounded-xl font-semibold text-white',
                  'shadow-lg hover:shadow-xl active:scale-[0.98]',
                  'transition-all duration-200 border-none'
                )}
                style={{
                  backgroundColor: isLoading ? (theme === 'dark' ? '#991b1b' : '#f87171') : (theme === 'dark' ? '#dc2626' : '#ef4444'),
                  color: 'white'
                }}
              >
                {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </Button>
            </Form.Item>

            <div className="text-center">
              <Button
                type="link"
                onClick={() => navigate('/reset-password')}
                className={clsx(
                  'text-sm',
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                ลืมรหัสผ่าน?
              </Button>
            </div>
          </Form>
        </div>

        {/* Footer */}
        <div className={clsx(
          'px-10 py-4 text-center border-t',
          theme === 'dark'
            ? 'bg-gray-950/50 border-gray-800'
            : 'bg-gray-50 border-gray-100'
        )}>
          <Text className={clsx(
            'text-xs',
            theme === 'dark' ? 'text-gray-600' : 'text-gray-500'
          )}>
            © 2025 SPK Construction
          </Text>
        </div>
      </div>
    </div>
  );
}

Login.propTypes = {
  setUser: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
};

export default Login;