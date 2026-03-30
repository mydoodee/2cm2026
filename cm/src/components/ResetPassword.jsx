import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import clsx from 'clsx';
import api from '../axiosConfig';

const ResetPassword = ({ theme }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    console.log('ResetPassword.jsx rendered at:', location.pathname);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            Swal.fire({
                icon: 'info',
                title: 'ออกจากระบบ',
                text: 'คุณกำลังอยู่ในเซสชันอยู่ ระบบจะออกจากระบบเพื่อดำเนินการรีเซ็ตรหัสผ่าน',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
            }).then(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                navigate('/reset-password', { replace: true });
            });
        }
    }, [navigate]);

    const handleResetPassword = async () => {
        setMessage('');
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/api/reset-password', { email });

            console.log('API success:', response.data);
            setMessage(response.data.message || 'ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว');
        } catch (err) {
            console.error('Reset password error:', err);
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setEmail(e.target.value);
        setMessage('');
        setError('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isLoading && email) {
            handleResetPassword();
        }
    };

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
                        <div className={clsx(
                            'relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center',
                            'shadow-lg transition-transform active:scale-95 sm:hover:scale-105',
                            theme === 'dark'
                                ? 'bg-gradient-to-br from-red-600 to-red-700'
                                : 'bg-gradient-to-br from-red-500 to-red-600'
                        )}>
                            <span className="text-white font-black text-xl sm:text-2xl tracking-tight">
                                SPK
                            </span>
                        </div>
                    </div>

                    <h2 className={clsx(
                        'text-xl sm:text-2xl font-bold mb-1 sm:mb-2',
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                    )}>
                        รีเซ็ตรหัสผ่าน
                    </h2>
                    
                    <p className={clsx(
                        'text-sm sm:text-base',
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    )}>
                        กรอกอีเมลเพื่อรับลิงก์รีเซ็ตรหัสผ่าน
                    </p>
                </div>

                {/* Form */}
                <div className="px-6 sm:px-10 pb-8 sm:pb-10">
                    {message && (
                        <div className={clsx(
                            'mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl',
                            'flex items-start text-sm',
                            theme === 'dark'
                                ? 'bg-green-950/50 border border-green-900 text-green-400'
                                : 'bg-green-50 border border-green-200 text-green-700'
                        )}>
                            <FiMail className="mr-2 mt-0.5 flex-shrink-0" />
                            <span>{message}</span>
                        </div>
                    )}

                    {error && (
                        <div className={clsx(
                            'mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl',
                            'flex items-start text-sm',
                            theme === 'dark'
                                ? 'bg-red-950/50 border border-red-900 text-red-400'
                                : 'bg-red-50 border border-red-200 text-red-700'
                        )}>
                            <FiMail className="mr-2 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="mb-5 sm:mb-6">
                        <label 
                            htmlFor="email" 
                            className={clsx(
                                'block text-sm font-medium mb-2',
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            )}
                        >
                            อีเมล
                        </label>
                        <div className="relative">
                            <FiMail className={clsx(
                                'absolute left-3 top-1/2 transform -translate-y-1/2',
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            )} />
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={handleInputChange}
                                onKeyPress={handleKeyPress}
                                placeholder="example@email.com"
                                disabled={isLoading}
                                className={clsx(
                                    'w-full h-11 sm:h-12 pl-10 pr-4',
                                    'rounded-lg sm:rounded-xl text-base',
                                    'transition-all duration-200',
                                    'focus:outline-none focus:ring-2',
                                    theme === 'dark'
                                        ? 'bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-red-500 focus:border-red-500'
                                        : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-red-400 focus:border-red-400',
                                    isLoading && 'opacity-50 cursor-not-allowed'
                                )}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleResetPassword}
                        disabled={isLoading || !email}
                        className={clsx(
                            'w-full h-11 sm:h-12 rounded-lg sm:rounded-xl',
                            'font-semibold text-base',
                            'flex items-center justify-center',
                            'shadow-lg active:shadow-md sm:hover:shadow-xl',
                            'transition-all duration-200 active:scale-[0.98]',
                            isLoading || !email
                                ? 'bg-gray-400 cursor-not-allowed'
                                : theme === 'dark'
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-red-500 hover:bg-red-600 text-white'
                        )}
                    >
                        {isLoading && (
                            <svg 
                                className="animate-spin h-5 w-5 mr-2" 
                                xmlns="http://www.w3.org/2000/svg" 
                                fill="none" 
                                viewBox="0 0 24 24"
                            >
                                <circle 
                                    className="opacity-25" 
                                    cx="12" 
                                    cy="12" 
                                    r="10" 
                                    stroke="currentColor" 
                                    strokeWidth="4"
                                />
                                <path 
                                    className="opacity-75" 
                                    fill="currentColor" 
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                        )}
                        {isLoading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ต'}
                    </button>

                    <div className="mt-5 sm:mt-6 text-center">
                        <button
                            onClick={() => navigate('/login')}
                            className={clsx(
                                'inline-flex items-center text-sm',
                                'transition-colors active:opacity-70',
                                theme === 'dark'
                                    ? 'text-gray-400 hover:text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                            )}
                        >
                            <FiArrowLeft className="mr-1" />
                            กลับไปหน้าเข้าสู่ระบบ
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className={clsx(
                    'px-6 sm:px-10 py-3 sm:py-4 text-center border-t',
                    theme === 'dark' 
                        ? 'bg-gray-950/50 border-gray-800' 
                        : 'bg-gray-50 border-gray-100'
                )}>
                    <p className={clsx(
                        'text-xs',
                        theme === 'dark' ? 'text-gray-600' : 'text-gray-500'
                    )}>
                        © 2025 SPK Construction
                    </p>
                </div>
            </div>
        </div>
    );
};

ResetPassword.propTypes = {
    theme: PropTypes.string,
};

export default ResetPassword;
