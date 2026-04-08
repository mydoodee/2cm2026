import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Table, Button, Modal, Form, Input, Card, Space, Tag, Popconfirm, 
    Upload, message, Typography, ColorPicker, Drawer, Select, Spin,
    Empty, Avatar, List, Badge
} from 'antd';
import { 
    PlusOutlined, EditOutlined, DeleteOutlined, 
    UploadOutlined, TeamOutlined, BankOutlined, ArrowLeftOutlined, ProjectOutlined,
    UserOutlined, SearchOutlined
} from '@ant-design/icons';
import api from '../axiosConfig';
import Navbar from './Navbar';
import clsx from 'clsx';
import PropTypes from 'prop-types';

const { Title, Text } = Typography;
const { Option } = Select;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3050';

function CompanySettings({ user, setUser, theme, setTheme, activeCompany, setActiveCompany }) {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // UI State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    
    // Form and Data State
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);
    const [companyMembers, setCompanyMembers] = useState([]);
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [memberForm] = Form.useForm();
    const [memberSearchText, setMemberSearchText] = useState('');

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/companies');
            setCompanies(res.data.companies || []);
        } catch (error) {
            message.error('ไม่สามารถโหลดข้อมูลบริษัทได้');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || (!user.roles.includes(1) && user.username !== 'adminspk')) {
            navigate('/projects');
            return;
        }
        fetchCompanies();
    }, [user, navigate]);

    // Handle Company CRUD
    const handleAddCompany = () => {
        setEditingCompany(null);
        setFileList([]);
        form.resetFields();
        form.setFieldsValue({ company_color: '#dc2626' });
        setIsModalVisible(true);
    };

    const handleEditCompany = (record) => {
        setEditingCompany(record);
        setFileList(record.company_logo ? [{
            uid: '-1',
            name: 'current_logo.png',
            status: 'done',
            url: `${API_BASE}/${record.company_logo}`,
        }] : []);
        form.setFieldsValue({
            company_name: record.company_name,
            company_subtitle: record.company_subtitle,
            company_color: record.company_color
        });
        setIsModalVisible(true);
    };

    const handleSubmit = async (values) => {
        try {
            const formData = new FormData();
            formData.append('company_name', values.company_name);
            if (values.company_subtitle) formData.append('company_subtitle', values.company_subtitle);
            if (values.company_color) {
                // Handle Antd ColorPicker value
                const colorStr = typeof values.company_color === 'string' 
                    ? values.company_color 
                    : values.company_color.toHexString();
                formData.append('company_color', colorStr);
            }
            
            if (fileList.length > 0 && fileList[0].originFileObj) {
                formData.append('company_logo', fileList[0].originFileObj);
            }

            if (editingCompany) {
                await api.put(`/api/companies/${editingCompany.company_id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                message.success('แก้ไขบริษัทสำเร็จ');
            } else {
                await api.post('/api/companies', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                message.success('สร้างบริษัทสำเร็จ');
            }
            
            setIsModalVisible(false);
            fetchCompanies();
        } catch (error) {
            message.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };

    const handleDeleteCompany = async (companyId) => {
        try {
            await api.delete(`/api/companies/${companyId}`);
            message.success('ลบบริษัทเรียบร้อยแล้ว');
            fetchCompanies();
        } catch (error) {
            message.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบบริษัท');
        }
    };

    // Handle Members
    const handleManageMembers = async (companyId) => {
        setSelectedCompanyId(companyId);
        setIsDrawerVisible(true);
        fetchMembers(companyId);
    };

    const fetchMembers = async (companyId) => {
        try {
            console.log('Fetching members for company:', companyId);
            setMembersLoading(true);
            const [memRes, availRes] = await Promise.all([
                api.get(`/api/companies/${companyId}`),
                api.get(`/api/companies/${companyId}/available-users`)
            ]);
            
            const members = memRes.data.members || [];
            console.log('Members received:', members.length);
            
            setCompanyMembers(members);
            setFilteredMembers(members);
            setAvailableUsers(availRes.data.users || []);
        } catch (error) {
            console.error('Error fetching members:', error);
            message.error('ไม่สามารถโหลดข้อมูลสมาชิกได้');
        } finally {
            setMembersLoading(false);
        }
    };

    const handleAddMember = async (values) => {
        try {
            await api.post(`/api/companies/${selectedCompanyId}/users`, {
                user_id: values.user_id,
                role: values.role
            });
            message.success('เพิ่มสมาชิกสำเร็จ');
            memberForm.resetFields();
            fetchMembers(selectedCompanyId);
            fetchCompanies(); // update member count
        } catch (error) {
            message.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการเพิ่มสมาชิก');
        }
    };

    const handleRemoveMember = async (userId) => {
        try {
            await api.delete(`/api/companies/${selectedCompanyId}/users/${userId}`);
            message.success('ลบสมาชิกออกจากบริษัทแล้ว');
            fetchMembers(selectedCompanyId);
            fetchCompanies(); // update member count
        } catch (error) {
            message.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบสมาชิก');
        }
    };

    // Columns
    const columns = [
        {
            title: 'โลโก้',
            dataIndex: 'company_logo',
            key: 'logo',
            width: 80,
            render: (logo, record) => (
                <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center border"
                    style={{ borderColor: record.company_color + '40', backgroundColor: record.company_color + '10' }}
                >
                    {logo ? (
                        <img src={`${API_BASE}/${logo}`} alt="logo" className="max-w-full max-h-full p-1" 
                             onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}/>
                    ) : null}
                    <div className={clsx("font-bold", logo ? "hidden" : "flex")} style={{ color: record.company_color }}>
                        {record.company_name?.charAt(0) || 'C'}
                    </div>
                </div>
            )
        },
        {
            title: 'ชื่อบริษัท',
            dataIndex: 'company_name',
            key: 'company_name',
            render: (text, record) => (
                <div>
                    <div className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{text}</div>
                    <div className="text-xs text-gray-500">{record.company_subtitle}</div>
                </div>
            )
        },
        {
            title: 'สี',
            dataIndex: 'company_color',
            key: 'company_color',
            width: 80,
            render: (color) => (
                <div className="w-6 h-6 rounded-full shadow-sm" style={{ backgroundColor: color || '#dc2626' }} />
            )
        },
        {
            title: 'สมาชิก',
            dataIndex: 'member_count',
            key: 'member_count',
            align: 'center',
            width: 100,
            render: (count) => <Tag color="blue"><TeamOutlined /> {count || 0}</Tag>
        },
        {
            title: 'โครงการ',
            dataIndex: 'project_count',
            key: 'project_count',
            align: 'center',
            width: 100,
            render: (count) => <Tag color="green"><ProjectOutlined /> {count || 0}</Tag>
        },
        {
            title: 'จัดการ',
            key: 'action',
            width: 200,
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Button 
                        type="primary"
                        ghost
                        icon={<TeamOutlined />} 
                        onClick={() => handleManageMembers(record.company_id)}
                        className="hover:!bg-indigo-600 hover:!text-white border-indigo-600 text-indigo-600 rounded-lg flex items-center gap-1"
                    >
                        จัดการสมาชิก
                    </Button>
                    <Button 
                        type="primary" 
                        icon={<EditOutlined />} 
                        onClick={() => handleEditCompany(record)}
                        className="bg-indigo-600 hover:!bg-indigo-500 border-0 !text-white"
                    />
                    <Popconfirm
                        title="ยืนยันการลบบริษัท?"
                        description={<div className="max-w-[250px]">คุณต้องการลบบริษัท <b>{record.company_name}</b> ใช่หรือไม่? ข้อมูลโครงการทั้งหมดในบริษัทจะถูกซ่อน</div>}
                        onConfirm={() => handleDeleteCompany(record.company_id)}
                        okText="ลบเลย"
                        cancelText="ยกเลิก"
                        okButtonProps={{ danger: true, size: 'small' }}
                        cancelButtonProps={{ size: 'small' }}
                    >
                        <Button type="primary" danger icon={<DeleteOutlined />} className="hover:!bg-red-500" />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const memberColumns = [
        {
            title: 'ชื่อผู้ใช้',
            dataIndex: 'username',
            key: 'username',
            render: (text, record) => (
                <div>
                    <div>{record.first_name} {record.last_name}</div>
                    <div className="text-xs text-gray-500">{text}</div>
                </div>
            )
        },
        {
            title: 'บทบาท',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag color={role === 'owner' ? 'gold' : role === 'admin' ? 'blue' : 'default'}>
                    {role === 'owner' ? 'เจ้าของ' : role === 'admin' ? 'ผู้ดูแล' : 'สมาชิก'}
                </Tag>
            )
        },
        {
            title: 'จัดการ',
            key: 'action',
            align: 'right',
            width: 120,
            render: (_, record) => (
                <Popconfirm
                    title="ลบออกจากบริษัท?"
                    description={`ต้องการลบ ${record.first_name || record.username} ${record.last_name || ''} ออกจากบริษัทนี้ใช่หรือไม่? ผู้ใช้จะไม่สามารถเข้าถึงโครงการในบริษัทนี้ได้`}
                    onConfirm={() => handleRemoveMember(record.user_id)}
                    okText="ลบออก"
                    cancelText="ยกเลิก"
                    okButtonProps={{ danger: true, size: 'small' }}
                    cancelButtonProps={{ size: 'small' }}
                >
                    <Button 
                        type="primary" 
                        danger 
                        ghost
                        size="small"
                        icon={<DeleteOutlined />} 
                        disabled={record.role === 'owner'} 
                        className="rounded-lg hover:!bg-red-500 hover:!text-white transition-all flex items-center gap-1"
                    >
                        ลบออก
                    </Button>
                </Popconfirm>
            )
        }
    ];

    return (
        <div className={clsx(
            'min-h-screen w-full font-kanit transition-all duration-300 flex flex-col',
            theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
        )}>
            <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />
            
            <div className="flex-1 p-6">
                <Card 
                    className={clsx(
                        'rounded-2xl shadow-sm border-0',
                        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                    )}
                >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div>
                            <Button 
                                type="text" 
                                icon={<ArrowLeftOutlined />} 
                                onClick={() => navigate('/settings')}
                                className={clsx("mb-2 -ml-4", theme === 'dark' ? "text-gray-400" : "text-gray-500")}
                            >
                                กลับไปหน้าตั้งค่าส่วนกลาง
                            </Button>
                            <h1 className="text-2xl font-bold m-0 flex items-center gap-2">
                                <BankOutlined className="text-indigo-500" />
                                การจัดการบริษัท (Multi-Company)
                            </h1>
                            <p className={clsx("mt-1", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                                จัดการรายชื่อบริษัท โลโก้ และสมาชิกภายในบริษัท
                            </p>
                        </div>
                        <Button 
                            type="primary" 
                            size="large"
                            icon={<PlusOutlined />} 
                            onClick={handleAddCompany}
                            className="bg-indigo-600 hover:!bg-indigo-500 hover:!text-white border-transparent rounded-xl !text-white"
                        >
                            เพิ่มบริษัทใหม่
                        </Button>
                    </div>

                    <Table 
                        dataSource={companies} 
                        columns={columns} 
                        rowKey="company_id" 
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                        className={theme === 'dark' ? 'ant-table-dark' : ''}
                    />
                </Card>
            </div>

            {/* Modal Company Form */}
            <Modal
                title={<div className="font-bold text-lg">{editingCompany ? 'แก้ไขบริษัท' : 'เพิ่มบริษัทใหม่'}</div>}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                className={theme === 'dark' ? 'dark-modal' : ''}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
                    <Form.Item 
                        name="company_name" 
                        label="ชื่อบริษัท" 
                        rules={[{ required: true, message: 'กรุณากรอกชื่อบริษัท' }]}
                    >
                        <Input size="large" className="rounded-lg" placeholder="เช่น SPK Construction" />
                    </Form.Item>
                    
                    <Form.Item name="company_subtitle" label="คำโปรย / สโลแกน (แสดงใต้ชื่อ)">
                        <Input size="large" className="rounded-lg" placeholder="เช่น บริหารโครงการก่อสร้าง" />
                    </Form.Item>

                    <Form.Item name="company_color" label="สีประจำบริษัท">
                        <ColorPicker format="hex" showText />
                    </Form.Item>

                    <Form.Item label="โลโก้บริษัท">
                        <Upload
                            listType="picture-card"
                            fileList={fileList}
                            onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                            beforeUpload={() => false} // Prevent auto upload
                            maxCount={1}
                        >
                            {fileList.length < 1 && (
                                <div>
                                    <UploadOutlined />
                                    <div style={{ marginTop: 8 }}>อัปโหลด</div>
                                </div>
                            )}
                        </Upload>
                    </Form.Item>

                    {/* Feature: Clone Template (Visual only for now, can implement later if needed) */}
                    {!editingCompany && (
                        <Form.Item name="template_company_id" label="คัดลอกโครงสร้างจาก (ตัวเลือกเสริม)">
                            <Select placeholder="เลือกบริษัทเพื่อคัดลอกโครงสร้างโฟลเดอร์" size="large" allowClear>
                                {companies.map(c => (
                                    <Option key={c.company_id} value={c.company_id}>{c.company_name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    <div className="flex justify-end gap-3 mt-8">
                        <Button onClick={() => setIsModalVisible(false)} size="large" className="rounded-lg">
                            ยกเลิก
                        </Button>
                        <Button type="primary" htmlType="submit" size="large" className="bg-indigo-600 hover:!bg-indigo-500 hover:!text-white border-transparent rounded-lg">
                            {editingCompany ? 'บันทึกการแก้ไข' : 'สร้างบริษัท'}
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* Drawer Manage Members */}
            <Drawer
                title={<div className="font-bold flex items-center gap-2"><TeamOutlined /> จัดการสมาชิกบริษัท</div>}
                placement="right"
                width={500}
                onClose={() => setIsDrawerVisible(false)}
                open={isDrawerVisible}
                className={theme === 'dark' ? 'dark-drawer' : ''}
            >
                {membersLoading ? (
                    <div className="flex justify-center py-10"><Spin /></div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Add Member Form */}
                        <Card size="small" className="mb-6 bg-slate-50 border-slate-200">
                            <h3 className="font-bold mb-3 text-slate-800">เพิ่มสมาชิกใหม่</h3>
                            <Form form={memberForm} layout="vertical" onFinish={handleAddMember}>
                                <Form.Item 
                                    name="user_id" 
                                    rules={[{ required: true, message: 'กรุณาเลือกผู้ใช้' }]}
                                    className="mb-3"
                                >
                                    <Select 
                                        showSearch 
                                        placeholder="พิมพ์ชื่อหรืออีเมลเพื่อค้นหา"
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                        options={availableUsers.map(u => ({
                                            value: u.user_id,
                                            label: `${u.first_name} ${u.last_name} (${u.username})`
                                        }))}
                                    />
                                </Form.Item>
                                <div className="flex gap-2">
                                    <Form.Item name="role" initialValue="member" className="mb-0 flex-1">
                                        <Select>
                                            <Option value="member">สมาชิก (Member)</Option>
                                            <Option value="admin">ผู้ดูแล (Admin)</Option>
                                        </Select>
                                    </Form.Item>
                                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />} className="bg-indigo-600 hover:!bg-indigo-500 hover:!text-white border-transparent h-8">
                                        เพิ่ม
                                    </Button>
                                </div>
                            </Form>
                        </Card>

                        {/* Members List Section */}
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg m-0">
                                    <TeamOutlined className="mr-2 text-indigo-500" />
                                    รายชื่อสมาชิก ({companyMembers.length})
                                </h3>
                                <Tag color="blue" className="m-0 rounded-full border-0 px-2">Active</Tag>
                            </div>

                            <Input 
                                prefix={<SearchOutlined className="text-slate-400" />}
                                placeholder="ค้นหาสมาชิก..."
                                className="mb-4 rounded-xl h-10 border-slate-200"
                                onChange={(e) => {
                                    const val = e.target.value.toLowerCase();
                                    setMemberSearchText(val);
                                    setFilteredMembers(companyMembers.filter(m => 
                                        m.username?.toLowerCase().includes(val) || 
                                        m.first_name?.toLowerCase().includes(val) || 
                                        m.last_name?.toLowerCase().includes(val)
                                    ));
                                }}
                            />

                            <Table 
                                dataSource={filteredMembers}
                                loading={membersLoading}
                                rowKey="user_id"
                                pagination={false}
                                size="middle"
                                className="member-table-custom"
                                columns={[
                                    {
                                        title: 'พนักงาน',
                                        key: 'user',
                                        render: (_, record) => (
                                            <div className="flex items-center gap-3 py-1">
                                                <Avatar 
                                                    src={record.profile_image ? `${API_BASE}/${record.profile_image}` : null}
                                                    icon={<UserOutlined />}
                                                    className="bg-slate-100 text-slate-400"
                                                />
                                                <div className="flex flex-col">
                                                    <Text strong className="text-slate-800 leading-tight">
                                                        {record.first_name} {record.last_name}
                                                    </Text>
                                                    <Text type="secondary" className="text-[10px]">@{record.username}</Text>
                                                </div>
                                            </div>
                                        )
                                    },
                                    {
                                        title: 'บทบาท',
                                        dataIndex: 'role',
                                        key: 'role',
                                        width: 100,
                                        render: (role) => (
                                            <Tag color={role === 'owner' ? 'gold' : role === 'admin' ? 'blue' : 'default'} className="m-0 text-[10px] rounded px-1.5 border-0 font-bold">
                                                {role === 'owner' ? 'OWNER' : role === 'admin' ? 'ADMIN' : 'STAFF'}
                                            </Tag>
                                        )
                                    },
                                    {
                                        title: '',
                                        key: 'action',
                                        align: 'right',
                                        width: 100,
                                        render: (_, record) => (
                                            <Popconfirm
                                                title="ลบสมาชิกจากบริษัท?"
                                                description="คุณต้องการให้นำสมาชิกคนนี้ออกจากบริษัทใช่หรือไม่?"
                                                onConfirm={() => handleRemoveMember(record.user_id)}
                                                okText="ลบออก"
                                                cancelText="ยกเลิก"
                                                okButtonProps={{ danger: true, size: 'small' }}
                                                cancelButtonProps={{ size: 'small' }}
                                            >
                                                <Button 
                                                    type="primary" 
                                                    danger 
                                                    size="small"
                                                    disabled={record.role === 'owner'}
                                                    className={`rounded-lg h-8 px-2 font-bold ${record.role === 'owner' ? 'opacity-30' : 'hover:scale-105 active:scale-95'}`}
                                                    icon={<DeleteOutlined />}
                                                >
                                                    ลบออก
                                                </Button>
                                            </Popconfirm>
                                        )
                                    }
                                ]}
                            />
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}

CompanySettings.propTypes = {
    user: PropTypes.object,
    setUser: PropTypes.func,
    theme: PropTypes.string,
    setTheme: PropTypes.func,
    activeCompany: PropTypes.object,
    setActiveCompany: PropTypes.func
};

export default CompanySettings;
