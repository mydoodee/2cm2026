import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';

const ConfirmPassword = ({ theme, setTheme }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const token = new URLSearchParams(location.search).get('token');

    useEffect(() => {
        if (!token) {
            setError('ไม่พบโทเค็น กรุณาคลิกลิงก์จากอีเมลใหม่');
        }
    }, [token]);

    const handleConfirmPassword = async () => {
        if (password !== confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return;
        }
        if (password.length < 8) {
            setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
            return;
        }

        setMessage('');
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/confirm-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('API error:', {
                    status: response.status,
                    message: data.message,
                    error: data.error,
                    code: data.code,
                    errno: data.errno
                });
                throw new Error(data.message || 'เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่');
            }

            console.log('API success:', data);
            setMessage(data.message || 'ตั้งรหัสผ่านใหม่สำเร็จ');
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: 'ตั้งรหัสผ่านใหม่สำเร็จ กรุณาล็อกอิน',
                confirmButtonColor: '#4f46e5',
                confirmButtonText: 'ไปที่ล็อกอิน',
            }).then(() => {
                navigate('/login?reset=success');
            });
        } catch (err) {
            console.error('Confirm password error:', {
                message: err.message,
                stack: err.stack
            });
            setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isLoading) {
            handleConfirmPassword();
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <div className={`bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md transition-all duration-300`}>
                <h2 className={`text-2xl font-bold text-center ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-6 font-kanit`}>ตั้งรหัสผ่านใหม่</h2>
                <div className="mb-4 relative">
                    <label htmlFor="password" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2 font-kanit`}>
                        รหัสผ่านใหม่
                    </label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className={`w-full px-3 py-2 pr-10 border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-kanit`}
                        placeholder="กรุณากรอกรหัสผ่านใหม่"
                        disabled={isLoading || !token}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-10 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
                    >
                        {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    </button>
                </div>
                <div className="mb-4 relative">
                    <label htmlFor="confirmPassword" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2 font-kanit`}>
                        ยืนยันรหัสผ่าน
                    </label>
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className={`w-full px-3 py-2 pr-10 border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-kanit`}
                        placeholder="กรุณายืนยันรหัสผ่าน"
                        disabled={isLoading || !token}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={`absolute right-3 top-10 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
                    >
                        {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    </button>
                </div>
                {message && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md font-kanit">
                        {message}
                    </div>
                )}
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md font-kanit">
                        {error}
                    </div>
                )}
                <button
                    onClick={handleConfirmPassword}
                    disabled={isLoading || !token || !password || !confirmPassword}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium font-kanit transition duration-200 
                        ${isLoading || !token || !password || !confirmPassword ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    {isLoading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
                </button>
                <p className={`mt-4 text-center text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} font-kanit`}>
                    กลับไปที่ <a href="/login" className="text-indigo-600 hover:underline">หน้าเข้าสู่ระบบ</a>
                </p>
                <button
                    onClick={toggleTheme}
                    className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} font-kanit`}
                >
                    {/* เปลี่ยนธีมเป็น {theme === 'light' ? 'มืด' : 'สว่าง'} */}
                </button>
            </div>
        </div>
    );
};

ConfirmPassword.propTypes = {
    theme: PropTypes.string,
    setTheme: PropTypes.func,
};

export default ConfirmPassword;