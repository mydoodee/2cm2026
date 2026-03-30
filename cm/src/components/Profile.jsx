import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Form, Input, Upload, message, Divider } from 'antd';
import { UserOutlined, UploadOutlined, MailOutlined, LockOutlined, EditOutlined, SaveOutlined, CloseOutlined, CameraOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import Navbar from './Navbar';
import axios from 'axios';
import clsx from 'clsx';
import './Profile.css';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000,
});

const retryRequest = async (config, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await axiosInstance(config);
        } catch (error) {
            if (error.response?.status === 401 && i < retries - 1) {
                try {
                    const refreshToken = localStorage.getItem('refreshToken');
                    if (!refreshToken) {
                        message.error('ไม่มี refresh token กรุณาล็อกอินใหม่');
                        window.location.href = '/login';
                        throw new Error('ไม่มี refresh token');
                    }
                    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/refresh-token`, {
                        refreshToken,
                    });
                    const newToken = response.data.token;
                    localStorage.setItem('token', newToken);
                    config.headers.Authorization = `Bearer ${newToken}`;
                    continue;
                } catch (refreshError) {
                    console.error('Refresh token error:', refreshError);
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    message.error('เซสชันหมดอายุ กรุณาล็อกอินใหม่');
                    window.location.href = '/login';
                    throw refreshError;
                }
            } else if (error.code === 'ERR_NETWORK' && i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
};

function Profile({ user, setUser, theme, setTheme }) {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [editMode, setEditMode] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (!user || !user.user_id || !user.username) {
            message.error('ข้อมูลผู้ใช้ไม่ครบถ้วน กรุณาล็อกอินใหม่');
            navigate('/login');
            return;
        }

        if (editMode) {
            form.setFieldsValue({
                username: user.username || '',
                email: user.email || '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                profileImage: user.profile_image ? [{
                    uid: '-1',
                    name: user.profile_image.split('/').pop(),
                    status: 'done',
                    url: `${import.meta.env.VITE_API_URL}/${user.profile_image}`,
                }] : [],
            });
        }

        setFileList(user.profile_image ? [{
            uid: '-1',
            name: user.profile_image.split('/').pop(),
            status: 'done',
            url: `${import.meta.env.VITE_API_URL}/${user.profile_image}`,
        }] : []);
    }, [user, navigate, form, editMode]);



    const handleUpdateProfile = async (values) => {
        const result = await Swal.fire({
            icon: 'question',
            title: 'ยืนยันการแก้ไข',
            text: 'คุณต้องการบันทึกการเปลี่ยนแปลงโปรไฟล์หรือไม่?',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
        });
        if (!result.isConfirmed) return;

        if (!user?.user_id) {
            message.error('ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่');
            navigate('/login');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            message.error('ไม่พบ token กรุณาล็อกอินใหม่');
            navigate('/login');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('username', values.username || '');
        formData.append('email', values.email || '');
        formData.append('first_name', values.first_name || '');
        formData.append('last_name', values.last_name || '');
        if (values.password) {
            formData.append('password', values.password);
        }
        if (values.profileImage && values.profileImage[0]?.originFileObj) {
            formData.append('profile_image', values.profileImage[0].originFileObj);
        }
        if (user.roles && user.roles.length > 0) {
            formData.append('role_id', user.roles[0]);
        }

        try {
            const response = await retryRequest({
                method: 'put',
                url: `/api/user/${user.user_id}`,
                data: formData,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const updatedUser = response.data.user;
            setUser(updatedUser);
            message.success('อัปเดตโปรไฟล์สำเร็จ');
            setEditMode(false);
            setImagePreview(null);
            form.setFieldsValue({
                username: updatedUser.username || '',
                email: updatedUser.email || '',
                first_name: updatedUser.first_name || '',
                last_name: updatedUser.last_name || '',
                profileImage: updatedUser.profile_image ? [{
                    uid: '-1',
                    name: updatedUser.profile_image.split('/').pop(),
                    status: 'done',
                    url: `${import.meta.env.VITE_API_URL}/${updatedUser.profile_image}`,
                }] : [],
            });
            setFileList(updatedUser.profile_image ? [{
                uid: '-1',
                name: updatedUser.profile_image.split('/').pop(),
                status: 'done',
                url: `${import.meta.env.VITE_API_URL}/${updatedUser.profile_image}`,
            }] : []);
        } catch (error) {
            console.error('Update error:', error.response?.data || error.message);
            let errorMessage = error.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์';
            if (error.response?.status === 500) {
                errorMessage = error.response.data.message || 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์';
                if (error.response.data.sqlError) {
                    errorMessage = `ข้อผิดพลาดฐานข้อมูล: ${error.response.data.sqlError}`;
                }
            } else if (error.response?.status === 403) {
                errorMessage = error.response.data.message || 'คุณไม่มีสิทธิ์แก้ไขโปรไฟล์นี้';
            } else if (error.response?.status === 400) {
                errorMessage = error.response.data.message || 'ข้อมูลที่ส่งไม่ถูกต้อง';
            } else if (error.response?.status === 401) {
                errorMessage = 'เซสชันหมดอายุ กรุณาล็อกอินใหม่';
                navigate('/login');
            }
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: errorMessage,
                confirmButtonColor: '#6366f1',
                confirmButtonText: 'ตกลง',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = ({ fileList }) => {
        const file = fileList[0];
        if (file) {
            const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
            const isLt5M = file.size / 1024 / 1024 < 5;
            if (!isImage) {
                message.error('กรุณาอัปโหลดไฟล์ JPEG หรือ PNG เท่านั้น');
                return;
            }
            if (!isLt5M) {
                message.error('ขนาดไฟล์ต้องไม่เกิน 5MB');
                return;
            }

            // Create preview
            if (file.originFileObj) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setImagePreview(e.target.result);
                };
                reader.readAsDataURL(file.originFileObj);
            }
        }
        setFileList(fileList.slice(-1));
        form.setFieldsValue({ profileImage: fileList.slice(-1) });
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 1: return 'bg-purple-500';
            case 2: return 'bg-blue-500';
            case 3: return 'bg-green-500';
            case 4: return 'bg-orange-500';
            default: return 'bg-gray-500';
        }
    };

    const getRoleName = (role) => {
        switch (role) {
            case 1: return 'Admin';
            case 2: return 'Engineer';
            case 3: return 'Accountant';
            case 4: return 'Project Manager';
            default: return 'Unknown';
        }
    };

    return (
        <div className={clsx('min-h-screen', theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50')} data-theme={theme}>
            <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
            <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
                <Card
                    className={clsx(
                        theme === 'dark' ? 'bg-slate-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)]',
                        'rounded-[2.5rem] backdrop-blur-3xl overflow-hidden'
                    )}
                    styles={{ body: { padding: 0 } }}
                >
                    {/* Header Section with Gradient */}
                    <div className={clsx(
                        'relative h-32 sm:h-40',
                        theme === 'dark' ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600' : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                    )}>
                        <div className="absolute inset-0 bg-black/10"></div>
                        {!editMode && (
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border-0 font-bold px-6 h-10 transition-all hover:scale-105"
                                onClick={() => {
                                    setEditMode(true);
                                    form.setFieldsValue({
                                        username: user.username || '',
                                        email: user.email || '',
                                        first_name: user.first_name || '',
                                        last_name: user.last_name || '',
                                        profileImage: user.profile_image ? [{
                                            uid: '-1',
                                            name: user.profile_image.split('/').pop(),
                                            status: 'done',
                                            url: `${import.meta.env.VITE_API_URL}/${user.profile_image}`,
                                        }] : [],
                                    });
                                }}
                            >
                                แก้ไขโปรไฟล์
                            </Button>
                        )}
                    </div>

                    {/* Profile Content */}
                    <div className="px-6 sm:px-8 pb-8">
                        {/* Profile Image and Name */}
                        <div className="relative -mt-16 sm:-mt-20 mb-6">
                            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                                <div className="relative">
                                    {imagePreview || user?.profile_image ? (
                                        <img
                                            src={imagePreview || `${import.meta.env.VITE_API_URL}/${user.profile_image}`}
                                            alt="Profile"
                                            className={clsx(
                                                'w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover shadow-[0_10px_30px_rgba(0,0,0,0.2)]'
                                            )}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className={clsx(
                                            theme === 'dark' ? 'bg-gradient-to-br from-indigo-600 to-purple-600' : 'bg-gradient-to-br from-indigo-500 to-purple-500',
                                            'w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-[0_10px_30px_rgba(0,0,0,0.2)]',
                                            (imagePreview || user?.profile_image) ? 'hidden' : ''
                                        )}
                                    >
                                        {(user?.username || 'U')[0].toUpperCase()}
                                    </div>
                                    {editMode && (
                                        <Upload
                                            name="profile_image"
                                            fileList={fileList}
                                            onChange={handleFileChange}
                                            beforeUpload={() => false}
                                            accept="image/jpeg,image/png"
                                            showUploadList={false}
                                        >
                                            <button
                                                type="button"
                                                className={clsx(
                                                    'absolute bottom-0 right-0 p-2 rounded-full shadow-lg transition-all hover:scale-110',
                                                    theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
                                                )}
                                            >
                                                <CameraOutlined className="text-white text-lg" />
                                            </button>
                                        </Upload>
                                    )}
                                </div>

                                {/* User Info */}
                                {!editMode && (
                                    <div className={clsx(
                                        'flex-1 sm:mb-2 p-6 rounded-[2rem] transition-all duration-300',
                                        theme === 'dark' ? 'bg-slate-700/30' : 'bg-white shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
                                    )}>
                                        <h2 className={clsx(
                                            'text-2xl sm:text-3xl font-bold mb-1',
                                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                                        )}>
                                            {user?.first_name || user?.username} {user?.last_name}
                                        </h2>
                                        <p className={clsx(
                                            'text-base sm:text-lg mb-2',
                                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                        )}>
                                            @{user?.username}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {[...new Set(user?.roles || [])].map((role) => (
                                                <span
                                                    key={role}
                                                    className={clsx(
                                                        getRoleBadgeColor(role),
                                                        'px-3 py-1 rounded-full text-white text-sm font-medium shadow-md'
                                                    )}
                                                >
                                                    {getRoleName(role)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!editMode ? (
                            <>

                                <div className="h-4" />

                                {/* Info Cards */}
                                <div className="space-y-4">
                                    <div className={clsx(
                                        'p-6 rounded-2xl transition-all duration-300',
                                        theme === 'dark' ? 'bg-slate-700/20 hover:bg-slate-700/40' : 'bg-slate-50 hover:bg-white hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)]'
                                    )}>
                                        <div className="flex items-center">
                                            <MailOutlined className={clsx(
                                                'text-2xl mr-4',
                                                theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                                            )} />
                                            <div>
                                                <p className={clsx(
                                                    'text-sm font-medium mb-1',
                                                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                )}>
                                                    อีเมล
                                                </p>
                                                <p className={clsx(
                                                    'text-base font-medium',
                                                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                                                )}>
                                                    {user?.email || 'ไม่ระบุ'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={clsx(
                                        'p-6 rounded-2xl transition-all duration-300',
                                        theme === 'dark' ? 'bg-slate-700/20 hover:bg-slate-700/40' : 'bg-slate-50 hover:bg-white hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)]'
                                    )}>
                                        <div className="flex items-center">
                                            <UserOutlined className={clsx(
                                                'text-2xl mr-4',
                                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                                            )} />
                                            <div>
                                                <p className={clsx(
                                                    'text-sm font-medium mb-1',
                                                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                )}>
                                                    ชื่อ-นามสกุล
                                                </p>
                                                <p className={clsx(
                                                    'text-base font-medium',
                                                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                                                )}>
                                                    {user?.first_name} {user?.last_name}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <Form
                                form={form}
                                layout="vertical"
                                onFinish={handleUpdateProfile}
                                className="mt-6"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Form.Item
                                        name="username"
                                        label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>ชื่อผู้ใช้</span>}
                                        rules={[{ required: true, message: 'กรุณากรอกชื่อผู้ใช้' }]}
                                    >
                                        <Input
                                            prefix={<UserOutlined className="text-gray-400" />}
                                            className={clsx(
                                                'rounded-lg',
                                                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''
                                            )}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name="email"
                                        label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>อีเมล</span>}
                                        rules={[{ required: true, type: 'email', message: 'กรุณากรอกอีเมลที่ถูกต้อง' }]}
                                    >
                                        <Input
                                            prefix={<MailOutlined className="text-gray-400" />}
                                            className={clsx(
                                                'rounded-lg',
                                                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''
                                            )}
                                        />
                                    </Form.Item>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Form.Item
                                        name="first_name"
                                        label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>ชื่อ</span>}
                                        rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}
                                    >
                                        <Input
                                            className={clsx(
                                                'rounded-lg',
                                                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''
                                            )}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name="last_name"
                                        label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>นามสกุล</span>}
                                        rules={[{ required: true, message: 'กรุณากรอกนามสกุล' }]}
                                    >
                                        <Input
                                            className={clsx(
                                                'rounded-lg',
                                                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''
                                            )}
                                        />
                                    </Form.Item>
                                </div>

                                <Form.Item
                                    name="password"
                                    label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>รหัสผ่านใหม่ (ไม่บังคับ)</span>}
                                    rules={[{ min: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined className="text-gray-400" />}
                                        className={clsx(
                                            'rounded-lg',
                                            theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''
                                        )}
                                    />
                                </Form.Item>

                                <div className="flex gap-3 mt-6">
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        icon={<SaveOutlined />}
                                        className="flex-1 h-11 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border-0 font-medium"
                                        loading={loading}
                                    >
                                        บันทึกการเปลี่ยนแปลง
                                    </Button>
                                    <Button
                                        icon={<CloseOutlined />}
                                        className="h-11 rounded-lg font-medium"
                                        onClick={() => {
                                            setEditMode(false);
                                            setImagePreview(null);
                                            form.resetFields();
                                            setFileList(user?.profile_image ? [{
                                                uid: '-1',
                                                name: user.profile_image.split('/').pop(),
                                                status: 'done',
                                                url: `${import.meta.env.VITE_API_URL}/${user.profile_image}`,
                                            }] : []);
                                        }}
                                    >
                                        ยกเลิก
                                    </Button>
                                </div>
                            </Form>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

Profile.propTypes = {
    user: PropTypes.shape({
        user_id: PropTypes.number,
        username: PropTypes.string,
        email: PropTypes.string,
        first_name: PropTypes.string,
        last_name: PropTypes.string,
        profile_image: PropTypes.string,
        roles: PropTypes.arrayOf(PropTypes.number),
        lastLogin: PropTypes.string,
        isAdmin: PropTypes.bool,
    }),
    setUser: PropTypes.func.isRequired,
    theme: PropTypes.string.isRequired,
    setTheme: PropTypes.func.isRequired,
};

export default Profile;