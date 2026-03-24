import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Form, Input, Select, Space, Spin, Modal, Row, Col, Typography, Card, Badge, Upload, Empty, List, Avatar, Tabs, Divider, message } from 'antd';
import { 
    LeftOutlined, EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, UserOutlined, UploadOutlined, SettingOutlined, CopyOutlined, UndoOutlined
} from '@ant-design/icons';
import { Switch } from 'antd';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import axios from 'axios';
import Navbar from '../Navbar';

const { Option } = Select;
const { Search } = Input;
const { Title, Text } = Typography;

function UserSetting({ user, setUser, theme, setTheme }) {
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [fileList, setFileList] = useState([]);
    const [selectedUserForRoles, setSelectedUserForRoles] = useState(null);
    const [isCopying, setIsCopying] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const [copyModalVisible, setCopyModalVisible] = useState(false);
    const [sourceUserId, setSourceUserId] = useState(null);
    
    // Role Management States
    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [roleForm] = Form.useForm();
    const [roleLoading, setRoleLoading] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    // Refresh access token
  const refreshAccessToken = async () => {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('ไม่มี refresh token ใน localStorage');
        }
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/refresh-token`, {
            refreshToken,
        });
        const newToken = response.data.token;
        localStorage.setItem('token', newToken);
        return newToken;
    } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setLoading(false);
        Swal.fire({
            icon: 'error',
            title: 'เซสชันหมดอายุ',
            text: 'กรุณาล็อกอินใหม่',
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'ตกลง',
            timer: 3000,
            timerProgressBar: true,
        }).then(() => navigate('/login'));
        throw new Error('Failed to refresh token');
    }
};

    // Fetch users
    const fetchUsers = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อผิดพลาด',
                    text: 'กรุณาเข้าสู่ระบบ',
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'ตกลง',
                    timer: 3000,
                    timerProgressBar: true,
                }).then(() => navigate('/login'));
                setLoading(false);
                return;
            }
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { includeInactive: true } // ดึงมาทั้งคู่เลยเพื่อแยก Tab
            });
            const userData = response.data.users.map(user => ({
                ...user,
                user_id: Number(user.user_id),
            }));
            if (!Array.isArray(userData)) {
                setUsers([]);
                setFilteredUsers([]);
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อผิดพลาด',
                    text: 'ข้อมูลผู้ใช้ไม่ถูกต้อง',
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'ตกลง',
                    timer: 3000,
                    timerProgressBar: true,
                });
                setLoading(false);
                return;
            }
            setUsers(userData);
            setFilteredUsers(userData);
            setLoading(false);
        } catch (error) {
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                try {
                    const newToken = await refreshAccessToken();
                    const retryResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`, {
                        headers: { Authorization: `Bearer ${newToken}` },
                        params: { includeInactive: true }
                    });
                    const userData = retryResponse.data.users.map(user => ({
                        ...user,
                        user_id: Number(user.user_id),
                    }));
                    if (!Array.isArray(userData)) {
                        setUsers([]);
                        setFilteredUsers([]);
                        Swal.fire({
                            icon: 'error',
                            title: 'ข้อผิดพลาด',
                            text: 'ข้อมูลผู้ใช้ไม่ถูกต้อง',
                            confirmButtonColor: '#ef4444',
                            confirmButtonText: 'ตกลง',
                            timer: 3000,
                            timerProgressBar: true,
                        });
                        setLoading(false);
                        return;
                    }
                    setUsers(userData);
                    setFilteredUsers(userData);
                    setLoading(false);
                } catch {
                    Swal.fire({
                        icon: 'error',
                        title: 'ข้อผิดพลาด',
                        text: 'ไม่สามารถรีเฟรช token ได้ กรุณาล็อกอินใหม่',
                        confirmButtonColor: '#ef4444',
                        confirmButtonText: 'ตกลง',
                        timer: 3000,
                        timerProgressBar: true,
                    }).then(() => navigate('/login'));
                    setUsers([]);
                    setFilteredUsers([]);
                    setLoading(false);
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    setUser(null);
                }
            } else {
                const errorMessage = error.response?.data?.message || 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้';
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อผิดพลาด',
                    text: errorMessage,
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'ตกลง',
                    timer: 3000,
                    timerProgressBar: true,
                });
                setUsers([]);
                setFilteredUsers([]);
                setLoading(false);
            }
        }
    }, [setUser, navigate]);

    // Fetch roles and projects
    const fetchRolesAndProjects = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return;
            }
            
            const [rolesResponse, projectsResponse] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/roles`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${import.meta.env.VITE_API_URL}/api/projects`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
            
            const rolesData = rolesResponse.data.roles || [];
            const projectsData = projectsResponse.data.projects || [];
            
            setRoles(rolesData);
            setProjects(projectsData);
            
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'ไม่สามารถโหลดข้อมูลบทบาทหรือโครงการได้';
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: errorMessage,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
                timer: 3000,
                timerProgressBar: true,
            });
        }
    }, []);

    // Check user permission and fetch data
    useEffect(() => {
        if (!user || !user.roles.includes(1)) {
            Swal.fire({
                icon: 'error',
                title: 'ไม่มีสิทธิ์',
                text: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการผู้ใช้ได้',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
                timer: 3000,
                timerProgressBar: true,
            }).then(() => {
                navigate('/settings');
            });
            return;
        }
        fetchUsers();
        fetchRolesAndProjects();
    }, [user, navigate, fetchUsers, fetchRolesAndProjects]);

    // Filter users based on search text
    useEffect(() => {
        let filtered = users;
        if (searchText) {
            filtered = filtered.filter(u =>
                (u.username?.toLowerCase() || '').includes(searchText.toLowerCase()) ||
                (u.email?.toLowerCase() || '').includes(searchText.toLowerCase()) ||
                (u.first_name?.toLowerCase() || '').includes(searchText.toLowerCase()) ||
                (u.last_name?.toLowerCase() || '').includes(searchText.toLowerCase())
            );
        }
        setFilteredUsers(filtered);
    }, [users, searchText]);

    // Keep selectedUserForRoles synced with users array updates (like after copy permissions)
    useEffect(() => {
        if (selectedUserForRoles && users.length > 0) {
            const updated = users.find(u => u.user_id === selectedUserForRoles.user_id);
            if (updated && JSON.stringify(updated.project_roles) !== JSON.stringify(selectedUserForRoles.project_roles)) {
                setSelectedUserForRoles(updated);
            }
        }
    }, [users, selectedUserForRoles?.user_id, selectedUserForRoles?.project_roles]);

    // Handle Role Management
    const handleSaveRole = async (values) => {
        setRoleLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (editingRole) {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/role/${editingRole.role_id}`, values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'อัปเดตบทบาทเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
            } else {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/role`, values, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'สร้างบทบาทใหม่เรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
            }
            roleForm.resetFields();
            setEditingRole(null);
            fetchRolesAndProjects();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: error.response?.data?.message || 'ไม่สามารถดำเนินการได้' });
        } finally {
            setRoleLoading(false);
        }
    };

    const handleDeleteRole = async (roleId) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "คุณต้องการลบบทบาทนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ลบ',
            cancelText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${import.meta.env.VITE_API_URL}/api/role/${roleId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'ลบบทบาทเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
                fetchRolesAndProjects();
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: error.response?.data?.message || 'ไม่สามารถลบบทบาทได้' });
            }
        }
    };

    // Reset form when modal is opened
    useEffect(() => {
        if (modalVisible && !editMode) {
            form.resetFields();
            setFileList([]);
        }
    }, [modalVisible, editMode, form]);

    // Handle form submission for creating/updating user
    const handleSubmit = async (values) => {
        try {
            if (values.role_id && isNaN(values.role_id)) {
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อผิดพลาด',
                    text: 'บทบาทที่เลือกไม่ถูกต้อง',
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'ตกลง',
                    timer: 3000,
                    timerProgressBar: true,
                });
                return;
            }
            // No validation for project_id as it can be a UUID string

            const isUsernameTaken = users.some(
                (u) => u.username === values.username && (!editMode || u.user_id !== selectedUser?.user_id)
            );
            if (isUsernameTaken) {
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อผิดพลาด',
                    text: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น',
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'ตกลง',
                    customClass: {
                        popup: theme === 'dark' ? 'swal2-dark' : '',
                    },
                    timer: 3000,
                    timerProgressBar: true,
                });
                return;
            }

            const isEmailTaken = users.some(
                (u) => u.email === values.email && (!editMode || u.user_id !== selectedUser?.user_id)
            );
            if (isEmailTaken) {
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อผิดพลาด',
                    text: 'อีเมลนี้ถูกใช้แล้ว กรุณาเลือกอีเมลอื่น',
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'ตกลง',
                    customClass: {
                        popup: theme === 'dark' ? 'swal2-dark' : '',
                    },
                    timer: 3000,
                    timerProgressBar: true,
                });
                return;
            }

            const result = await Swal.fire({
                icon: 'question',
                title: editMode ? 'ยืนยันการแก้ไข' : 'ยืนยันการสร้าง',
                text: editMode ? 'คุณต้องการบันทึกการเปลี่ยนแปลงผู้ใช้นี้หรือไม่?' : 'คุณต้องการสร้างผู้ใช้ใหม่หรือไม่?',
                showCancelButton: true,
                confirmButtonColor: '#4f46e5',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'ตกลง',
                cancelButtonText: 'ยกเลิก',
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
            });
            if (!result.isConfirmed) return;

            const formData = new FormData();
            formData.append('username', values.username || '');
            formData.append('email', values.email || '');
            formData.append('first_name', values.first_name || '');
            formData.append('last_name', values.last_name || '');
            if (values.password) formData.append('password', values.password);
            if (values.role_id) formData.append('role_id', values.role_id);
            if (values.project_id) formData.append('project_id', values.project_id);
            if (fileList.length > 0 && fileList[0].originFileObj) {
                formData.append('profile_image', fileList[0].originFileObj);
            }

            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No token found in localStorage');
            }
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            };

            let response;
            if (editMode && selectedUser) {
                response = await axios.put(
                    `${import.meta.env.VITE_API_URL}/api/user/${selectedUser.user_id}`,
                    formData,
                    config
                );
                Swal.fire({
                    icon: 'success',
                    title: 'สำเร็จ',
                    text: 'อัปเดตผู้ใช้สำเร็จ',
                    confirmButtonColor: '#4f46e5',
                    confirmButtonText: 'ตกลง',
                    timer: 3000,
                    timerProgressBar: true,
                    customClass: {
                        popup: theme === 'dark' ? 'swal2-dark' : '',
                    },
                });
            } else {
                response = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/user`,
                    formData,
                    config
                );
                Swal.fire({
                    icon: 'success',
                    title: 'สำเร็จ',
                    text: `สร้างผู้ใช้ใหม่สำเร็จ หมายเลขผู้ใช้: ${response.data.user_id}`,
                    confirmButtonColor: '#4f46e5',
                    confirmButtonText: 'ตกลง',
                    timer: 3000,
                    timerProgressBar: true,
                    customClass: {
                        popup: theme === 'dark' ? 'swal2-dark' : '',
                    },
                });
            }
            form.resetFields();
            setFileList([]);
            setEditMode(false);
            setSelectedUser(null);
            setModalVisible(false);
            await fetchUsers();
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'ไม่สามารถบันทึกผู้ใช้ได้';
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: errorMessage,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
                timer: 3000,
                timerProgressBar: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'ยืนยันการลบ',
            text: 'คุณต้องการลบผู้ใช้นี้หรือไม่?',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                popup: theme === 'dark' ? 'swal2-dark' : '',
            },
        });

        if (result.isConfirmed) {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                await axios.delete(`${import.meta.env.VITE_API_URL}/api/user/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire({
                    icon: 'success',
                    title: 'สำเร็จ',
                    text: 'ลบผู้ใช้สำเร็จ',
                    confirmButtonColor: '#4f46e5',
                    confirmButtonText: 'ตกลง',
                    timer: 3000,
                    timerProgressBar: true,
                    customClass: {
                        popup: theme === 'dark' ? 'swal2-dark' : '',
                    },
                });
                setSelectedUserForRoles(null);
                await fetchUsers();
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'ไม่สามารถลบผู้ใช้ได้';
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อผิดพลาด',
                    text: errorMessage,
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'ตกลง',
                    customClass: {
                        popup: theme === 'dark' ? 'swal2-dark' : '',
                    },
                    timer: 3000,
                    timerProgressBar: true,
                });
            } finally {
                setLoading(false);
            }
        }
    };

    // Handle user restoration
    const handleRestore = async (userId) => {
        const result = await Swal.fire({
            icon: 'question',
            title: 'ยืนยันการกู้คืน',
            text: 'คุณต้องการกู้คืนผู้ใช้นี้กลับมาใช้งานหรือไม่?',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'กู้คืน',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                popup: theme === 'dark' ? 'swal2-dark' : '',
            },
        });

        if (result.isConfirmed) {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                await axios.put(`${import.meta.env.VITE_API_URL}/api/user/restore/${userId}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire({
                    icon: 'success',
                    title: 'สำเร็จ',
                    text: 'กู้คืนผู้ใช้สำเร็จ',
                    confirmButtonColor: '#4f46e5',
                    confirmButtonText: 'ตกลง',
                    timer: 3000,
                    timerProgressBar: true,
                    customClass: {
                        popup: theme === 'dark' ? 'swal2-dark' : '',
                    },
                });
                await fetchUsers();
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'ไม่สามารถกู้คืนผู้ใช้ได้';
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อผิดพลาด',
                    text: errorMessage,
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'ตกลง',
                    customClass: {
                        popup: theme === 'dark' ? 'swal2-dark' : '',
                    },
                    timer: 3000,
                    timerProgressBar: true,
                });
            } finally {
                setLoading(false);
            }
        }
    };

    // Handle permanent deletion
    const handlePermanentDelete = async (userId) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'ยืนยันการลบถาวร',
            text: 'ข้อมูลผู้ใช้นี้จะถูกลบออกจากระบบอย่างถาวรและไม่สามารถกู้คืนได้อีก คุณแน่ใจหรือไม่?',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ลบทิ้งถาวร',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                popup: theme === 'dark' ? 'swal2-dark' : '',
            },
        });

        if (result.isConfirmed) {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                await axios.delete(`${import.meta.env.VITE_API_URL}/api/user/permanent/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire({
                    icon: 'success',
                    title: 'สำเร็จ',
                    text: 'ลบผู้ใช้ถาวรสำเร็จแล้ว',
                    confirmButtonColor: '#4f46e5',
                    confirmButtonText: 'ตกลง',
                    timer: 3000,
                    timerProgressBar: true,
                    customClass: {
                        popup: theme === 'dark' ? 'swal2-dark' : '',
                    },
                });
                setSelectedUserForRoles(null);
                await fetchUsers();
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'ไม่สามารถลบผู้ใช้ถาวรได้';
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อผิดพลาด',
                    text: errorMessage,
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'ตกลง',
                    customClass: {
                        popup: theme === 'dark' ? 'swal2-dark' : '',
                    },
                    timer: 3000,
                    timerProgressBar: true,
                });
            } finally {
                setLoading(false);
            }
        }
    };

    // Handle edit user
    const handleEdit = (user) => {
        setEditMode(true);
        setSelectedUser(user);
        const newFileList = user.profile_image ? [{
            uid: '-1',
            name: user.profile_image.split('/').pop(),
            status: 'done',
            url: `${import.meta.env.VITE_API_URL}/${user.profile_image}`,
        }] : [];
        setFileList(newFileList);
        form.setFieldsValue({
            username: user.username,
            email: user.email,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            role_id: user.roles?.[0] || '',
            project_id: user.project_roles?.[0]?.project_id || undefined,
            is_pm: !!user.is_pm,
        });
        setModalVisible(true);
        document.activeElement.blur();
    };

    // Handle add new user
    const handleAdd = () => {
        setEditMode(false);
        setSelectedUser(null);
        setFileList([]);
        setModalVisible(true);
        document.activeElement.blur();
    };

    // Handle toggle project management permission
    const handleTogglePM = async (userId, checked) => {
        try {
            const userToUpdate = users.find(u => u.user_id === userId);
            const formData = new FormData();
            formData.append('username', userToUpdate.username || '');
            formData.append('email', userToUpdate.email || '');
            formData.append('first_name', userToUpdate.first_name || '');
            formData.append('last_name', userToUpdate.last_name || '');
            formData.append('is_pm', checked);

            const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/user/${userId}`, formData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.data) {
                message.success('อัปเดตสิทธิ์การจัดการโครงการเรียบร้อย');
                // อัปเดต state ท้องถิ่น
                setUsers(prevUsers => prevUsers.map(u => 
                    u.user_id === userId ? { ...u, is_pm: checked } : u
                ));
            }
        } catch (error) {
            console.error('Error toggling PM permission:', error);
            message.error('ไม่สามารถอัปเดตสิทธิ์ได้');
        }
    };

    // Handle user selection for role assignment
    const handleSelectUser = (user) => {
        setSelectedUserForRoles(user);
    };

    // Handle role assignment
    const handleAssignRole = async (projectId, roleId) => {
        if (!selectedUserForRoles) {
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: 'กรุณาเลือกผู้ใช้ก่อน',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
                timer: 3000,
                timerProgressBar: true,
            });
            return;
        }
        
        if (!roleId || roleId === undefined || roleId === null) {
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: 'กรุณาเลือกบทบาท',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
                timer: 3000,
                timerProgressBar: true,
            });
            return;
        }
        
        const roleIdNum = parseInt(roleId, 10);
        if (isNaN(roleIdNum)) {
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: 'บทบาทที่เลือกไม่ถูกต้อง',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
                timer: 3000,
                timerProgressBar: true,
            });
            return;
        }
        
        const validRole = roles.find(r => r.role_id === roleIdNum);
        if (!validRole) {
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: 'บทบาทที่เลือกไม่ถูกต้อง',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
                timer: 3000,
                timerProgressBar: true,
            });
            return;
        }

        try {
            const result = await Swal.fire({
                icon: 'question',
                title: 'ยืนยันการกำหนดบทบาท',
                text: `คุณต้องการกำหนดบทบาท "${validRole.role_name}" ให้ผู้ใช้หรือไม่?`,
                showCancelButton: true,
                confirmButtonColor: '#4f46e5',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'ตกลง',
                cancelButtonText: 'ยกเลิก',
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
            });
            
            if (!result.isConfirmed) {
                return;
            }

            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/project-user-roles`,
                { 
                    project_id: projectId, 
                    user_id: selectedUserForRoles.user_id, 
                    role_id: roleIdNum 
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: response.data.message,
                confirmButtonColor: '#4f46e5',
                confirmButtonText: 'ตกลง',
                timer: 3000,
                timerProgressBar: true,
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
            });
            
            setUsers(prevUsers =>
                prevUsers.map(u =>
                    u.user_id === selectedUserForRoles.user_id
                        ? {
                              ...u,
                              project_roles: [
                                  ...(u.project_roles || []).filter(pr => pr.project_id !== projectId),
                                  {
                                      project_id: projectId,
                                      job_number: response.data.job_number,
                                      role_id: roleIdNum,
                                      role_name: validRole.role_name
                                  }
                              ]
                          }
                        : u
                )
            );
            
            setSelectedUserForRoles(prev => ({
                ...prev,
                project_roles: [
                    ...(prev.project_roles || []).filter(pr => pr.project_id !== projectId),
                    {
                        project_id: projectId,
                        job_number: response.data.job_number,
                        role_id: roleIdNum,
                        role_name: validRole.role_name
                    }
                ]
            }));
            
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'ไม่สามารถกำหนดบทบาทได้';
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: errorMessage,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
                timer: 3000,
                timerProgressBar: true,
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle remove role
    const handleRemoveRole = async (projectId) => {
        if (!selectedUserForRoles) {
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: 'กรุณาเลือกผู้ใช้ก่อน',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
                timer: 3000,
                timerProgressBar: true,
            });
            return;
        }
        
        try {
            const result = await Swal.fire({
                icon: 'warning',
                title: 'ยืนยันการลบสิทธิ์',
                text: 'คุณต้องการลบสิทธิ์ในโครงการนี้หรือไม่?',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'ลบ',
                cancelButtonText: 'ยกเลิก',
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
            });
            if (!result.isConfirmed) return;

            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await axios.delete(
                `${import.meta.env.VITE_API_URL}/api/project-user-roles`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        project_id: projectId,
                        user_id: selectedUserForRoles.user_id
                    }
                }
            );
            
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: response.data.message,
                confirmButtonColor: '#4f46e5',
                confirmButtonText: 'ตกลง',
                timer: 3000,
                timerProgressBar: true,
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
            });
            
            setUsers(prevUsers =>
                prevUsers.map(u =>
                    u.user_id === selectedUserForRoles.user_id
                        ? {
                            ...u,
                            project_roles: (u.project_roles || []).filter(pr => pr.project_id !== projectId)
                        }
                        : u
                )
            );
            
            setSelectedUserForRoles(prev => ({
                ...prev,
                project_roles: (prev.project_roles || []).filter(pr => pr.project_id !== projectId)
            }));
            
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'ไม่สามารถลบสิทธิ์ได้';
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: errorMessage,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: theme === 'dark' ? 'swal2-dark' : '',
                },
                timer: 3000,
                timerProgressBar: true,
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle copy permissions from another user
    const handleCopyPermissions = async () => {
        if (!selectedUserForRoles) {
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: 'กรุณาเลือกผู้ใช้ปลายทางก่อน',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
            });
            return;
        }

        if (!sourceUserId) {
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: 'กรุณาเลือกผู้ใช้ต้นทาง',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
            });
            return;
        }

        const result = await Swal.fire({
            icon: 'question',
            title: 'ยืนยันการคัดลอกสิทธิ์',
            text: `คุณต้องการคัดลอกสิทธิ์จากผู้ใช้นี้ไปยัง ${selectedUserForRoles.username} ใช่หรือไม่? สิทธิ์เดิมที่ซ้ำกันจะถูกอัปเดต`,
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ตกลง',
            cancelButtonText: 'ยกเลิก',
        });

        if (!result.isConfirmed) return;

        try {
            setIsCopying(true);
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/users/copy-permissions`,
                {
                    sourceUserId: sourceUserId,
                    targetUserId: selectedUserForRoles.user_id
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: response.data.message,
                confirmButtonColor: '#4f46e5',
                confirmButtonText: 'ตกลง',
            });

            setCopyModalVisible(false);
            setSourceUserId(null);
            await fetchUsers(); // โหลดข้อมูลผู้ใช้ใหม่เพื่ออัปเดตรายการสิทธิ์
            
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'ไม่สามารถคัดลอกสิทธิ์ได้';
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: errorMessage,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
            });
        } finally {
            setIsCopying(false);
        }
    };

    // Upload properties for profile image
    const uploadProps = {
        onRemove: () => {
            setFileList([]);
        },
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อผิดพลาด',
                    text: 'กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น',
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'ตกลง',
                    customClass: {
                        popup: theme === 'dark' ? 'swal2-dark' : '',
                    },
                    timer: 3000,
                    timerProgressBar: true,
                });
                return Upload.LIST_IGNORE;
            }
            const isLt20M = file.size / 1024 / 1024 < 20;
            if (!isLt20M) {
                Swal.fire({
                    icon: 'error',
                    title: 'ข้อผิดพลาด',
                    text: 'ขนาดไฟล์ต้องไม่เกิน 20MB',
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'ตกลง',
                    customClass: {
                        popup: theme === 'dark' ? 'swal2-dark' : '',
                    },
                    timer: 3000,
                    timerProgressBar: true,
                });
                return Upload.LIST_IGNORE;
            }
            setFileList([{ uid: file.uid, name: file.name, status: 'done', originFileObj: file }]);
            return false;
        },
        fileList,
        listType: 'picture',
        maxCount: 1,
        name: 'profile_image',
    };

    // Table columns
    const userColumns = [
        {
            title: 'ชื่อผู้ใช้',
            dataIndex: 'username',
            key: 'username',
            width: '25%',
            render: (text, record) => (
                <div className="flex items-center space-x-2">
                    <UserOutlined className={record.active === 0 ? "text-gray-400" : "text-blue-500"} />
                    <Text className={`text-sm ${record.active === 0 ? "text-gray-400 line-through" : ""}`}>{text || 'ไม่ระบุ'}</Text>
                    {record.active === 0 && <Badge status="default" text={<Text type="secondary" style={{ fontSize: '10px' }}>ลบแล้ว</Text>} />}
                </div>
            ),
        },
        {
            title: 'อีเมล',
            dataIndex: 'email',
            key: 'email',
            width: '25%',
            render: (text) => <Text className="text-sm">{text || 'ไม่ระบุ'}</Text>,
        },
        {
            title: 'ชื่อ-นามสกุล',
            key: 'name',
            width: '25%',
            render: (_, record) => (
                <Text className="text-sm">{`${record.first_name || ''} ${record.last_name || ''}`.trim() || 'ไม่ระบุ'}</Text>
            ),
        },
        {
            title: 'จัดการโครงการ',
            key: 'is_pm',
            width: '15%',
            align: 'center',
            render: (_, record) => (
                <div className="flex flex-col items-center">
                    <Switch 
                        size="small"
                        checked={!!record.is_pm} 
                        onChange={(checked) => handleTogglePM(record.user_id, checked)}
                        disabled={record.username === 'admin' || record.username === 'adminspk'}
                        className={!!record.is_pm ? 'bg-indigo-600' : ''}
                    />
                    <Text type="secondary" style={{ fontSize: '10px', marginTop: '4px' }}>
                        {!!record.is_pm ? 'เปิดสิทธิ์' : 'ปิดสิทธิ์'}
                    </Text>
                </div>
            ),
        },
        {
            title: 'การดำเนินการ',
            key: 'action',
            width: '25%',
            render: (_, record) => (
                <Space size="small">
                    {record.active !== 0 ? (
                        <>
                            <Button
                                type="primary"
                                className="bg-indigo-500 hover:bg-indigo-600 border-0 text-xs"
                                icon={<EditOutlined />}
                                size="small"
                                onClick={() => handleEdit(record)}
                            >
                                แก้ไข
                            </Button>
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                size="small"
                                className="text-xs"
                                onClick={() => handleDelete(record.user_id)}
                            >
                                ลบ
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                type="primary"
                                className="bg-emerald-500 hover:bg-emerald-600 border-0 text-xs"
                                icon={<UndoOutlined />}
                                size="small"
                                onClick={() => handleRestore(record.user_id)}
                            >
                                กู้คืน
                            </Button>
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                size="small"
                                className="text-xs"
                                onClick={() => handlePermanentDelete(record.user_id)}
                            >
                                ลบถาวร
                            </Button>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    // Handle ARIA issue by removing aria-hidden when modal is open
    useEffect(() => {
        const rootDiv = document.getElementById('root');
        if (modalVisible && rootDiv && rootDiv.hasAttribute('aria-hidden')) {
            rootDiv.removeAttribute('aria-hidden');
        }
    }, [modalVisible]);

    return (
        <div className={`min-h-screen font-kanit ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'} transition-all duration-500 pb-10`}>
            <Modal
                title={
                    <div className="flex items-center space-x-2">
                        <SettingOutlined />
                        <span>จัดการบทบาทผู้ใช้งาน</span>
                    </div>
                }
                open={roleModalVisible}
                onCancel={() => {
                    setRoleModalVisible(false);
                    setEditingRole(null);
                    roleForm.resetFields();
                }}
                footer={null}
                width={600}
                forceRender
            >
                <div className="space-y-6">
                    <Card size="small" title={editingRole ? "แก้ไขบทบาท" : "เพิ่มบทบาทใหม่"} className="bg-gray-50 border-gray-200">
                        <Form
                            form={roleForm}
                            layout="vertical"
                            onFinish={handleSaveRole}
                            initialValues={{ role_name: '', description: '' }}
                        >
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item
                                        name="role_name"
                                        label="ชื่อบทบาท"
                                        rules={[{ required: true, message: 'กรุณากรอกชื่อบทบาท' }]}
                                    >
                                        <Input placeholder="เช่น Purchasing, Support" />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item
                                        name="description"
                                        label="คำอธิบาย"
                                    >
                                        <Input.TextArea rows={2} placeholder="รายละเอียดหน้าที่ของบทบาทนี้" />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <div className="flex justify-end space-x-2">
                                {editingRole && (
                                    <Button onClick={() => { setEditingRole(null); roleForm.resetFields(); }}>
                                        ยกเลิกการแก้ไข
                                    </Button>
                                )}
                                <Button type="primary" htmlType="submit" loading={roleLoading} className="bg-indigo-500 border-0">
                                    {editingRole ? 'บันทึกการแก้ไข' : 'เพิ่มบทบาท'}
                                </Button>
                            </div>
                        </Form>
                    </Card>

                    <div className="max-h-[400px] overflow-y-auto">
                        <List
                            itemLayout="horizontal"
                            dataSource={roles}
                            renderItem={(item) => (
                                <List.Item
                                    actions={[
                                        <Button 
                                            key="edit" 
                                            type="text" 
                                            icon={<EditOutlined className="text-blue-500" />} 
                                            onClick={() => {
                                                setEditingRole(item);
                                                roleForm.setFieldsValue(item);
                                            }}
                                        />,
                                        <Button 
                                            key="delete" 
                                            type="text" 
                                            icon={<DeleteOutlined className="text-red-500" />} 
                                            onClick={() => handleDeleteRole(item.role_id)}
                                            disabled={item.role_id <= 4} // ป้องการการลบบทบาทหลัก (Admin, PM, etc.)
                                        />
                                    ]}
                                >
                                    <List.Item.Meta
                                        avatar={<Avatar icon={<UserOutlined />} className="bg-indigo-100 text-indigo-500" />}
                                        title={<Text strong>{item.role_name} {item.role_id <= 4 && <Badge status="default" text="System" />}</Text>}
                                        description={item.description || 'ไม่มีคำอธิบาย'}
                                    />
                                </List.Item>
                            )}
                        />
                    </div>
                </div>
            </Modal>

            <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
            <div className="p-4">
                <Card
                    title={
                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                    <UserOutlined className="text-xl" />
                                </div>
                                <Title level={4} className={`m-0 font-black tracking-tight ${theme === 'dark' ? '!text-white' : '!text-slate-800'}`}>จัดการผู้ใช้</Title>
                            </div>
                            <Space size="middle">
                                <Button
                                    type="default"
                                    icon={<SettingOutlined />}
                                    onClick={() => setRoleModalVisible(true)}
                                    className={`rounded-xl font-bold h-11 px-5 transition-all duration-300 ${
                                        theme === 'dark' 
                                            ? 'bg-slate-700/50 border-slate-600 text-slate-200 hover:!bg-slate-700 hover:!text-white hover:!border-slate-500' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm'
                                    }`}
                                >
                                    จัดการบทบาท
                                </Button>
                                <Button
                                    type="primary"
                                    className="bg-indigo-600 hover:bg-indigo-700 border-0 rounded-xl font-bold h-11 px-5 shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
                                    icon={<PlusOutlined />}
                                    onClick={() => handleAdd()}
                                    size="middle"
                                >
                                    เพิ่มผู้ใช้
                                </Button>
                                <Button
                                    icon={<LeftOutlined />}
                                    onClick={() => navigate('/settings')}
                                    className={`rounded-xl font-bold h-11 px-5 border-0 shadow-sm transition-all duration-300 ${
                                        theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    กลับ
                                </Button>
                            </Space>
                        </div>
                    }
                    className={`rounded-[2.5rem] border-0 mt-6 mx-6 transition-all duration-500 overflow-hidden ${
                        theme === 'dark' 
                            ? 'bg-slate-800/40 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white' 
                            : 'bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] text-slate-800'
                    }`}
                >
                    <Row gutter={[32, 16]} className="mb-8">
                        <Col span={24}>
                            <Search
                                placeholder="ค้นหาชื่อผู้ใช้, อีเมล หรือชื่อ..."
                                allowClear
                                enterButton={<Button className="bg-indigo-600 hover:bg-indigo-700 border-0 text-white font-bold h-11 px-6 rounded-r-xl" icon={<SearchOutlined />}>ค้นหา</Button>}
                                size="large"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onSearch={setSearchText}
                                variant="borderless"
                                className={`modern-search-input transition-all duration-300 ${theme === 'dark' ? 'dark-search' : 'light-search'}`}
                                style={{ width: '100%' }}
                            />
                        </Col>
                    </Row>

                    <Divider className={theme === 'dark' ? 'border-slate-700' : 'border-slate-100'} />

                    <Row gutter={[32, 32]} className="mt-8">
                        <Col span={14} className="pr-2">

                            <Tabs 
                                defaultActiveKey="1" 
                                onChange={setActiveTab}
                                items={[
                                    {
                                        key: '1',
                                        label: (
                                            <span className="flex items-center">
                                                <UserOutlined className="mr-2" />
                                                ผู้ใช้งานปกติ
                                            </span>
                                        ),
                                    },
                                    {
                                        key: '2',
                                        label: (
                                            <span className="flex items-center">
                                                <DeleteOutlined className="mr-2" />
                                                ถังขยะ
                                            </span>
                                        ),
                                    },
                                ]}
                            />

                            <Spin spinning={loading}>
                                {filteredUsers.filter(u => activeTab === '1' ? u.active !== 0 : u.active === 0).length === 0 && !loading ? (
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description={activeTab === '1' ? "ไม่พบผู้ใช้ที่ใช้งานอยู่" : "ไม่มีผู้ใช้ในถังขยะ"}
                                    />
                                ) : (
                                    <Table
                                        columns={userColumns}
                                        dataSource={filteredUsers.filter(u => activeTab === '1' ? u.active !== 0 : u.active === 0)}
                                        rowKey="user_id"
                                        rowClassName={(record) => (record.user_id === selectedUserForRoles?.user_id ? 'bg-blue-50' : '')}
                                        onRow={(record) => ({
                                            onClick: () => handleSelectUser(record),
                                        })}
                                        pagination={{
                                            pageSize: 8,
                                            showSizeChanger: false,
                                            showQuickJumper: true,
                                            showTotal: (total, range) => `${range[0]}-${range[1]} จาก ${total} ผู้ใช้`,
                                        }}
                                        className={theme === 'dark' ? 'ant-table-dark' : ''}
                                        scroll={{ y: 'calc(100vh - 450px)' }}
                                    />
                                )}
                            </Spin>
                        </Col>
                        <Col span={10} className="pl-2 border-l border-slate-100/50">
                             <div className="flex items-center justify-between mb-3">
                                    <Title level={5} className="mb-0">
                                        <SettingOutlined className="mr-2" />
                                        กำหนดสิทธิ์โครงการ
                                    </Title>
                                    {selectedUserForRoles && (
                                        <Button 
                                            type="link" 
                                            icon={<CopyOutlined />} 
                                            size="small"
                                            onClick={() => setCopyModalVisible(true)}
                                            className="text-indigo-600 p-0 h-auto"
                                        >
                                            คัดลอกสิทธิ์
                                        </Button>
                                    )}
                                </div>
                            {selectedUserForRoles ? (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <Avatar
                                                size="small"
                                                icon={<UserOutlined />}
                                                className="bg-indigo-500"
                                            />
                                            <div>
                                                <Text strong className="text-sm">{selectedUserForRoles.username}</Text>
                                                <br />
                                                <Text type="secondary" className="text-xs">{selectedUserForRoles.email}</Text>
                                            </div>
                                        </div>
                                        <Badge
                                            count={selectedUserForRoles.project_roles?.length || 0}
                                            style={{ backgroundColor: '#4f46e5' }}
                                        />
                                    </div>
                                    {projects.length === 0 || roles.length === 0 ? (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description="ไม่พบข้อมูลโครงการ"
                                            className="py-4"
                                        />
                                    ) : (
                                        <List
                                            size="small"
                                            dataSource={projects}
                                            renderItem={project => (
                                                <List.Item className={`py-2 px-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} rounded mb-2`}>
                                                    <div className="w-full flex justify-between items-center">
                                                        <div className="flex flex-col">
                                                    <Text strong className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{project.project_name || 'ไม่ระบุ'}</Text>
                                                    <Text type="secondary" className={`text-[11px] font-medium ${theme === 'dark' ? 'text-indigo-400/60' : 'text-indigo-500/60'}`}>{project.job_number || 'ไม่ระบุ'}</Text>
                                                </div>
                                                <Select
                                                    size="small"
                                                    style={{ width: 110 }}
                                                    className="modern-select"
                                                    placeholder="บทบาท"
                                                    popupClassName={theme === 'dark' ? 'ant-select-dropdown-dark' : ''}
                                                    value={
                                                        selectedUserForRoles.project_roles?.find(
                                                            pr => pr.project_id === project.project_id
                                                        )?.role_id || undefined
                                                    }
                                                    onChange={(roleId) => {
                                                        if (roleId === undefined || roleId === null) {
                                                            handleRemoveRole(project.project_id);
                                                        } else {
                                                            handleAssignRole(project.project_id, roleId);
                                                        }
                                                    }}
                                                    allowClear
                                                >
                                                    {roles.map(role => (
                                                        <Option key={role.role_id} value={role.role_id}>
                                                            {role.role_name}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            </div>
                                        </List.Item>
                                    )}
                                    className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 scrollbar-hide"
                                />
                                    )}
                                </div>
                            ) : (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="เลือกผู้ใช้เพื่อกำหนดสิทธิ์"
                                    className="py-8"
                                />
                            )}
                        </Col>
                    </Row>
                </Card>
            </div>

            <Modal
                title={
                    <div className="flex items-center space-x-2">
                        <UserOutlined />
                        <span>{editMode ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'}</span>
                    </div>
                }
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    form.resetFields();
                    setFileList([]);
                    setEditMode(false);
                    setSelectedUser(null);
                    const rootDiv = document.getElementById('root');
                    if (rootDiv && rootDiv.hasAttribute('aria-hidden')) {
                        rootDiv.removeAttribute('aria-hidden');
                    }
                }}
                footer={null}
                width={500}
                centered
                destroyOnHidden
                forceRender
            >
                <Spin spinning={loading}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                    >
                        <Form.Item
                            name="username"
                            label="ชื่อผู้ใช้"
                            rules={[{ required: true, message: 'กรุณากรอกชื่อผู้ใช้' }]}
                        >
                            <Input placeholder="ชื่อผู้ใช้" />
                        </Form.Item>
                        
                        <Form.Item
                            name="email"
                            label="อีเมล"
                            rules={[
                                { required: true, message: 'กรุณากรอกอีเมล' },
                                { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' },
                            ]}
                        >
                            <Input placeholder="อีเมล" />
                        </Form.Item>
                        
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="first_name"
                                    label="ชื่อ"
                                    rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}
                                >
                                    <Input placeholder="ชื่อ" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="last_name"
                                    label="นามสกุล"
                                    rules={[{ required: true, message: 'กรุณากรอกนามสกุล' }]}
                                >
                                    <Input placeholder="นามสกุล" />
                                </Form.Item>
                            </Col>
                        </Row>
                        
                        <Form.Item
                            name="password"
                            label="รหัสผ่าน"
                            rules={editMode ? [] : [
                                { required: true, message: 'กรุณากรอกรหัสผ่าน' },
                                { min: 4, message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' },
                            ]}
                        >
                            <Input.Password placeholder="รหัสผ่าน" autoComplete="new-password" />
                        </Form.Item>
                        
                        <Form.Item
                            name="role_id"
                            label="บทบาท"
                            rules={[{ required: true, message: 'กรุณาเลือกบทบาท' }]}
                        >
                            <Select placeholder="เลือกบทบาท">
                                {roles.map(role => (
                                    <Option key={role.role_id} value={role.role_id}>
                                        {role.role_name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        
                        <Form.Item
                            name="project_id"
                            label="โครงการ (ไม่บังคับ)"
                        >
                            <Select placeholder="เลือกโครงการ (ถ้ามี)" allowClear>
                                {projects.map(project => (
                                    <Option key={project.project_id} value={project.project_id}>
                                        {project.project_name} ({project.job_number})
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        
                        <Form.Item
                            name="is_pm"
                            label="สิทธิ์จัดการโครงการ (Planning, Actual, Status)"
                            valuePropName="checked"
                        >
                            <Switch className="bg-indigo-600" />
                        </Form.Item>

                        <Form.Item
                            name="profile_image"
                            label="รูปโปรไฟล์"
                        >
                            <Upload {...uploadProps} name="profile_image">
                                <Button icon={<UploadOutlined />}>เลือกไฟล์</Button>
                            </Upload>
                        </Form.Item>
                        
                        <div className="flex justify-end space-x-2">
                            <Button
                                onClick={() => {
                                    setModalVisible(false);
                                    form.resetFields();
                                    setFileList([]);
                                    setEditMode(false);
                                    setSelectedUser(null);
                                    const rootDiv = document.getElementById('root');
                                    if (rootDiv && rootDiv.hasAttribute('aria-hidden')) {
                                        rootDiv.removeAttribute('aria-hidden');
                                    }
                                }}
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                className="bg-indigo-500 hover:bg-indigo-600 border-0"
                            >
                                {editMode ? 'บันทึก' : 'สร้าง'}
                            </Button>
                        </div>
                    </Form>
                </Spin>
            </Modal>

            <Modal
                title={
                    <div className="flex items-center space-x-2">
                        <CopyOutlined />
                        <span>คัดลอกสิทธิ์จากผู้ใช้อื่น</span>
                    </div>
                }
                open={copyModalVisible}
                onCancel={() => {
                    setCopyModalVisible(false);
                    setSourceUserId(null);
                }}
                onOk={handleCopyPermissions}
                confirmLoading={isCopying}
                okText="คัดลอกสิทธิ์"
                cancelText="ยกเลิก"
                okButtonProps={{ className: 'bg-indigo-500 border-0' }}
            >
                <div className="py-4">
                    <Text className="block mb-4">
                        เลือกผู้ใช้ต้นทางที่ต้องการคัดลอกสิทธิ์ (โครงการและโฟลเดอร์) มายัง <Text strong>{selectedUserForRoles?.username}</Text>
                    </Text>
                    <Select
                        placeholder="เลือกผู้ใช้ต้นทาง"
                        style={{ width: '100%' }}
                        onChange={setSourceUserId}
                        value={sourceUserId}
                        showSearch
                        optionFilterProp="children"
                    >
                        {users
                            .filter(u => u.user_id !== selectedUserForRoles?.user_id)
                            .map(u => (
                                <Option key={u.user_id} value={u.user_id}>
                                    {u.username} ({u.first_name} {u.last_name})
                                </Option>
                            ))}
                    </Select>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded">
                        <Text type="secondary" className="text-xs">
                            * ระบบจะเพิ่มโครงการและสิทธิ์โฟลเดอร์ที่ผู้ใช้ต้นทางมีอยู่ หากผู้ใช้ปลายทางมีโครงการเดียวกันอยู่แล้ว บทบาทจะถูกอัปเดตตามต้นทาง
                        </Text>
                    </div>
                </div>
            </Modal>
            <style jsx="true">{`
                @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@200;300;400;500;600;700;800;900&display=swap');
                
                body {
                    font-family: 'Kanit', sans-serif !important;
                }

                .ant-card-head {
                    border-bottom: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'} !important;
                    padding: 0 1.5rem !important;
                }

                .ant-table {
                    background: transparent !important;
                }

                .ant-table-thead > tr > th {
                    background: ${theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} !important;
                    color: ${theme === 'dark' ? '#94a3b8' : '#64748b'} !important;
                    font-weight: 700 !important;
                    border-bottom: none !important;
                }

                .ant-table-tbody > tr > td {
                    border-bottom: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'} !important;
                }

                .ant-table-tbody > tr:hover > td {
                    background: ${theme === 'dark' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.02)'} !important;
                }

                .ant-table-row-selected > td {
                    background: ${theme === 'dark' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)'} !important;
                }

                .modern-search-input {
                    background: ${theme === 'dark' ? '#1e293b' : 'white'} !important;
                    border: 1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'} !important;
                    border-radius: 0.75rem !important;
                    padding: 2px !important;
                    transition: all 0.3s ease !important;
                }

                .modern-search-input:hover, .modern-search-input-focused {
                    border-color: #6366f1 !important;
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1) !important;
                }

                .modern-search-input input {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    height: 2.75rem !important;
                    color: ${theme === 'dark' ? 'white' : '#1e293b'} !important;
                    padding-left: 1rem !important;
                }

                .modern-search-input .ant-input-group-addon {
                    background: transparent !important;
                    border: none !important;
                }

                .ant-tabs-nav::before {
                    border-bottom: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'} !important;
                }

                .ant-tabs-tab {
                    font-weight: 600 !important;
                }

                .ant-tabs-tab-active .ant-tabs-tab-btn {
                    color: #6366f1 !important;
                }

                .ant-tabs-ink-bar {
                    background: #6366f1 !important;
                }

                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}

UserSetting.propTypes = {
    user: PropTypes.shape({
        user_id: PropTypes.number,
        username: PropTypes.string,
        email: PropTypes.string,
        first_name: PropTypes.string,
        last_name: PropTypes.string,
        roles: PropTypes.arrayOf(PropTypes.number),
    }).isRequired,
    setUser: PropTypes.func.isRequired,
    theme: PropTypes.string.isRequired,
    setTheme: PropTypes.func.isRequired,
};

export default UserSetting;