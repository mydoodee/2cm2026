import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, Space, Row, Col, Typography, Card, Divider, message, ConfigProvider, theme as antdTheme } from 'antd';
import { 
    LeftOutlined, PlusOutlined, SearchOutlined, UserOutlined, SettingOutlined
} from '@ant-design/icons';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import api from '../../axiosConfig';
import Navbar from '../Navbar';

// Import sub-components
import UserListTable from './UserListTable';
import ProjectRoleAssignment from './ProjectRoleAssignment';
import UserFormModal from './UserFormModal';
import RoleManagementModal from './RoleManagementModal';
import CopyPermissionsModal from './CopyPermissionsModal';

const { Search } = Input;
const { Title } = Typography;

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

    // Fetch users
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/users', {
                params: { includeInactive: true }
            });
            const userData = response.data.users.map(user => ({
                ...user,
                user_id: Number(user.user_id),
            }));
            if (!Array.isArray(userData)) {
                setUsers([]);
                setFilteredUsers([]);
                return;
            }
            setUsers(userData);
            setFilteredUsers(userData);
        } catch (error) {
            console.error('fetchUsers error:', error);
            const errorMessage = error.message || 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้';
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
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch roles and projects
    const fetchRolesAndProjects = useCallback(async () => {
        try {
            const [rolesResponse, projectsResponse] = await Promise.all([
                api.get('/api/roles'),
                api.get('/api/projects'),
            ]);
            
            setRoles(rolesResponse.data.roles || []);
            setProjects(projectsResponse.data.projects || []);
            
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'ไม่สามารถโหลดข้อมูลบทบาทหรือโครงการได้';
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาด',
                text: errorMessage,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
            });
        }
    }, []);

    // Initial load and permission check
    useEffect(() => {
        if (!user || !user.roles.includes(1)) {
            Swal.fire({
                icon: 'error',
                title: 'ไม่มีสิทธิ์',
                text: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถจัดการผู้ใช้ได้',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง',
            }).then(() => {
                navigate('/settings');
            });
            return;
        }
        fetchUsers();
        fetchRolesAndProjects();
    }, [user, navigate, fetchUsers, fetchRolesAndProjects]);

    // Search filter
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

    // Role Management Handlers
    const handleSaveRole = async (values) => {
        setRoleLoading(true);
        try {
            if (editingRole) {
                await api.put(`/api/role/${editingRole.role_id}`, values);
                message.success('อัปเดตบทบาทเรียบร้อยแล้ว');
            } else {
                await api.post('/api/role', values);
                message.success('สร้างบทบาทใหม่เรียบร้อยแล้ว');
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
            confirmButtonText: 'ลบ',
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/api/role/${roleId}`);
                message.success('ลบบทบาทเรียบร้อยแล้ว');
                fetchRolesAndProjects();
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: error.response?.data?.message || 'ไม่สามารถลบบทบาทได้' });
            }
        }
    };

    // User Form Handlers
    const handleSubmit = async (values) => {
        try {
            const formData = new FormData();
            Object.keys(values).forEach(key => {
                if (values[key] !== undefined) formData.append(key, values[key]);
            });
            
            if (fileList.length > 0 && fileList[0].originFileObj) {
                formData.append('profile_image', fileList[0].originFileObj);
            }

            setLoading(true);
            if (editMode && selectedUser) {
                await api.put(`/api/user/${selectedUser.user_id}`, formData);
                message.success('อัปเดตผู้ใช้สำเร็จ');
            } else {
                await api.post('/api/user', formData);
                message.success('สร้างผู้ใช้ใหม่สำเร็จ');
            }
            setModalVisible(false);
            fetchUsers();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: error.response?.data?.message || 'ไม่สามารถบันทึกผู้ใช้ได้' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'ย้ายไปถังขยะ?',
            text: 'คุณต้องการปิดใช้งานผู้ใช้นี้หรือไม่?',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'ย้ายลงถังขยะ',
        });
        if (result.isConfirmed) {
            try {
                setLoading(true);
                await api.delete(`/api/user/${userId}`);
                message.success('ย้ายผู้ใช้ลงถังขยะแล้ว');
                fetchUsers();
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: 'ไม่สามารถลบผู้ใช้ได้' });
            } finally {
                setLoading(false);
            }
        }
    };

    const handleRestore = async (userId) => {
        try {
            setLoading(true);
            await api.put(`/api/user/restore/${userId}`, {});
            message.success('กู้คืนผู้ใช้สำเร็จ');
            fetchUsers();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: 'ไม่สามารถกู้คืนได้' });
        } finally {
            setLoading(false);
        }
    };

    const handlePermanentDelete = async (userId) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'ลบถาวร?',
            text: 'ข้อมูลนี้จะไม่สามารถกู้คืนได้อีก คุณแน่ใจหรือไม่?',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'ลบทิ้งถาวร',
        });
        if (result.isConfirmed) {
            try {
                setLoading(true);
                await api.delete(`/api/user/permanent/${userId}`);
                message.success('ลบผู้ใช้ถาวรสำเร็จ');
                fetchUsers();
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: 'ลบถาวรไม่สำเร็จ' });
            } finally {
                setLoading(false);
            }
        }
    };

    const handleTogglePM = async (userId, checked) => {
        try {
            const formData = new FormData();
            formData.append('is_pm', checked);
            await api.put(`/api/user/${userId}`, formData);
            message.success('อัปเดตสิทธิ์ PM เรียบร้อย');
            fetchUsers();
        } catch (error) {
            message.error('ไม่สามารถอัปเดตสิทธิ์ได้');
        }
    };

    const handleAssignRole = async (projectId, roleId) => {
        if (!selectedUserForRoles || !roleId) return;
        try {
            await api.post('/api/project-user-roles', { 
                project_id: projectId, 
                user_id: selectedUserForRoles.user_id, 
                role_id: roleId 
            });
            message.success('กำหนดสิทธิ์สำเร็จ');
            fetchUsers();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'ไม่สามารถกำหนดสิทธิ์ได้' });
        }
    };

    const handleRemoveRole = async (projectId) => {
        if (!selectedUserForRoles) return;
        try {
            await api.delete('/api/project-user-roles', {
                params: { project_id: projectId, user_id: selectedUserForRoles.user_id }
            });
            message.success('ลบสิทธิ์สำเร็จ');
            fetchUsers();
        } catch (error) {
            message.error('ไม่สามารถลบสิทธิ์ได้');
        }
    };

    const handleCopyPermissions = async () => {
        if (!selectedUserForRoles || !sourceUserId) return;
        try {
            setIsCopying(true);
            await api.post('/api/users/copy-permissions', {
                sourceUserId,
                targetUserId: selectedUserForRoles.user_id
            });
            message.success('คัดลอกสิทธิ์สำเร็จ');
            setCopyModalVisible(false);
            fetchUsers();
        } catch (error) {
            message.error('คัดลอกสิทธิ์ไม่สำเร็จ');
        } finally {
            setIsCopying(false);
        }
    };

    // Helper to sync selection after data reload
    useEffect(() => {
        if (selectedUserForRoles) {
            const updated = users.find(u => u.user_id === selectedUserForRoles.user_id);
            if (updated) setSelectedUserForRoles(updated);
        }
    }, [users]);

    const uploadProps = {
        onRemove: () => setFileList([]),
        beforeUpload: (file) => {
            setFileList([{ uid: file.uid, name: file.name, status: 'done', originFileObj: file }]);
            return false;
        },
        fileList,
        maxCount: 1,
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                token: { fontFamily: 'Kanit, sans-serif' }
            }}
        >
            <div className={`min-h-screen font-kanit ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#f8fafc]'} transition-all duration-500 pb-10`}>
            <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
            
            <div className="max-w-[1600px] mx-auto px-6 pt-8">
                {/* Header Section */}
                <div className={`flex flex-col md:flex-row items-center justify-between p-6 rounded-[2rem] mb-8 border transition-all duration-500 ${
                    theme === 'dark' 
                        ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-xl shadow-2xl' 
                        : 'bg-white border-slate-100 shadow-sm'
                }`}>
                    <div className="flex items-center space-x-5">
                        <div className={`p-4 rounded-2xl shadow-inner ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <UserOutlined className="text-3xl" />
                        </div>
                        <div>
                            <Title level={2} className={`m-0 font-black tracking-tight ${theme === 'dark' ? '!text-white' : '!text-slate-800'}`}>จัดการผู้ใช้งาน</Title>
                            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>ตั้งค่าสิทธิ์และการเข้าถึงสำหรับทีมงานทุกคน</span>
                        </div>
                    </div>
                    
                    <Space size="middle" className="mt-4 md:mt-0">
                        <Button
                            icon={<SettingOutlined />}
                            onClick={() => setRoleModalVisible(true)}
                            className={`rounded-xl font-bold h-12 px-6 border-0 transition-all duration-300 ${
                                theme === 'dark' 
                                    ? 'bg-slate-700/50 text-slate-200 hover:bg-slate-700 hover:text-white' 
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-indigo-600'
                            }`}
                        >
                            จัดการบทบาท
                        </Button>
                        <Button
                            type="primary"
                            className="bg-indigo-600 hover:bg-indigo-700 border-0 rounded-xl font-bold h-12 px-6 shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all"
                            icon={<PlusOutlined />}
                            onClick={() => { setEditMode(false); setFileList([]); form.resetFields(); setModalVisible(true); }}
                        >
                            เพิ่มผู้ใช้ใหม่
                        </Button>
                        <Button
                            icon={<LeftOutlined />}
                            onClick={() => navigate('/settings')}
                            className={`rounded-xl font-bold h-12 px-6 border-0 shadow-sm transition-all duration-300 ${
                                theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            กลับ
                        </Button>
                    </Space>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: User Table */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <Card className={`rounded-[2.2rem] border-0 transition-all duration-500 overflow-hidden ${
                            theme === 'dark' 
                                ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-xl shadow-2xl' 
                                : 'bg-white border-slate-100 shadow-sm shadow-slate-200/50'
                        }`}>
                            <div className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div className="flex-1 max-w-md">
                                        <Search
                                            placeholder="ค้นหาตามชื่อ, อีเมล..."
                                            allowClear
                                            value={searchText}
                                            onChange={(e) => setSearchText(e.target.value)}
                                            onSearch={setSearchText}
                                            size="large"
                                            className={`modern-search transition-all ${theme === 'dark' ? 'dark-search' : ''}`}
                                        />
                                    </div>
                                    <div className={`p-1 rounded-xl flex ${theme === 'dark' ? 'bg-slate-900/40' : 'bg-slate-100'}`}>
                                        <Button 
                                            type={activeTab === '1' ? 'primary' : 'text'} 
                                            className={`rounded-lg h-9 font-medium border-0 px-4 transition-all ${activeTab === '1' ? 'bg-indigo-600 shadow-lg' : ''}`}
                                            onClick={() => setActiveTab('1')}
                                        >
                                            สมาชิก
                                        </Button>
                                        <Button 
                                            type={activeTab === '2' ? 'primary' : 'text'} 
                                            className={`rounded-lg h-9 font-medium border-0 px-4 transition-all ${activeTab === '2' ? 'bg-red-500 shadow-lg' : ''}`}
                                            onClick={() => setActiveTab('2')}
                                        >
                                            ถังขยะ
                                        </Button>
                                    </div>
                                </div>

                                <UserListTable 
                                    theme={theme}
                                    loading={loading}
                                    filteredUsers={filteredUsers}
                                    activeTab={activeTab}
                                    selectedUserForRoles={selectedUserForRoles}
                                    handleSelectUser={setSelectedUserForRoles}
                                    handleEdit={(u) => { setEditMode(true); setSelectedUser(u); form.setFieldsValue(u); setModalVisible(true); }}
                                    handleDelete={handleDelete}
                                    handleRestore={handleRestore}
                                    handlePermanentDelete={handlePermanentDelete}
                                    handleTogglePM={handleTogglePM}
                                />
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Detail / Role Assignment */}
                    <div className="lg:col-span-4 sticky top-8">
                        <Card className={`rounded-[2.2rem] border-0 transition-all duration-500 min-h-[600px] overflow-hidden ${
                            theme === 'dark' 
                                ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-xl shadow-2xl' 
                                : 'bg-white border-slate-100 shadow-sm shadow-slate-200/50'
                        }`}>
                            <div className="p-6 h-full">
                                <ProjectRoleAssignment 
                                    theme={theme}
                                    selectedUserForRoles={selectedUserForRoles}
                                    projects={projects}
                                    roles={roles}
                                    handleRemoveRole={handleRemoveRole}
                                    handleAssignRole={handleAssignRole}
                                    setCopyModalVisible={setCopyModalVisible}
                                />
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <UserFormModal 
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                form={form}
                handleSubmit={handleSubmit}
                editMode={editMode}
                roles={roles}
                projects={projects}
                uploadProps={uploadProps}
                loading={loading}
                theme={theme}
            />

            <RoleManagementModal 
                theme={theme}
                visible={roleModalVisible}
                onCancel={() => setRoleModalVisible(false)}
                roleForm={roleForm}
                handleSaveRole={handleSaveRole}
                editingRole={editingRole}
                setEditingRole={setEditingRole}
                roleLoading={roleLoading}
                roles={roles}
                handleDeleteRole={handleDeleteRole}
            />

            <CopyPermissionsModal 
                theme={theme}
                visible={copyModalVisible}
                onCancel={() => setCopyModalVisible(false)}
                handleCopyPermissions={handleCopyPermissions}
                isCopying={isCopying}
                selectedUserForRoles={selectedUserForRoles}
                users={users}
                sourceUserId={sourceUserId}
                setSourceUserId={setSourceUserId}
            />

            {/* Global Styled JSX for Premium UI */}
            <style jsx="true">{`
                @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@200;300;400;500;600;700;800;900&display=swap');
                
                .modern-search .ant-input-affix-wrapper {
                    background: transparent !important;
                    border: 1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'} !important;
                    border-radius: 12px !important;
                    padding: 4px 12px !important;
                }
                
                .dark-search .ant-input-affix-wrapper {
                    background: #0f172a !important;
                }
                
                .modern-search input {
                    color: ${theme === 'dark' ? 'white' : '#1e293b'} !important;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${theme === 'dark' ? '#334155' : '#e2e8f0'};
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #6366f1;
                }

                /* Glassmorphism Modals */
                .dark-modal .ant-modal-content {
                    background: rgba(15, 23, 42, 0.8) !important;
                    backdrop-filter: blur(20px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.05) !important;
                    border-radius: 24px !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
                }

                .ant-table-dark .ant-table {
                    background: transparent !important;
                    color: #94a3b8 !important;
                }
                
                .ant-table-dark .ant-table-thead > tr > th {
                    background: rgba(255, 255, 255, 0.02) !important;
                    color: #64748b !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                }
            `}</style>
        </div>
        </ConfigProvider>
    );
}

UserSetting.propTypes = {
    user: PropTypes.object.isRequired,
    setUser: PropTypes.func.isRequired,
    theme: PropTypes.string.isRequired,
    setTheme: PropTypes.func.isRequired,
};

export default UserSetting;