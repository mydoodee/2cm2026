import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Table, Button, InputNumber, Input, 
  Typography, Space, Breadcrumb, message, 
  Popconfirm, Spin, Divider, Row, Col
} from 'antd';
import { 
  PlusOutlined, DeleteOutlined, SaveOutlined, 
  ArrowLeftOutlined, InfoCircleOutlined, LinkOutlined 
} from '@ant-design/icons';
import { Popover } from 'antd';
import axios from 'axios';
import api from '../../axiosConfig';
import Navbar from '../Navbar';

const { Title, Text } = Typography;

const JobStatusDetail = ({ user, setUser, theme, setTheme }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState([]);
    const [projectName, setProjectName] = useState('');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projRes, detailRes] = await Promise.all([
                api.get(`/api/project/${id}`),
                api.get(`/api/project/${id}/job-status-details`)
            ]);

            setProjectName(projRes.data.project.project_name);
            // Ensure unique IDs for frontend table mapping
            const rows = (detailRes.data.data || []).map((item, idx) => ({
                ...item,
                key: item.id || `temp-${idx}`
            }));
            setData(rows);
        } catch (error) {
            console.error('Error fetching data:', error);
            message.error('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        const newRow = {
            key: `new-${Date.now()}`,
            category_name: '',
            system_1: 0,
            system_2: 0,
            system_3: 0,
            system_4: 0,
            system_1_link: '',
            system_2_link: '',
            system_3_link: '',
            system_4_link: ''
        };
        setData([...data, newRow]);
    };

    const handleDeleteRow = (key) => {
        setData(data.filter(item => item.key !== key));
    };

    const handleInputChange = (value, key, field) => {
        const newData = [...data];
        const index = newData.findIndex(item => item.key === key);
        if (index > -1) {
            newData[index][field] = value;
            setData(newData);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.post(`/api/project/${id}/job-status-details`, {
                details: data
            });
            message.success('บันทึกข้อมูลสำเร็จ');
            fetchData();
        } catch (error) {
            console.error('Error saving data:', error);
            message.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            title: 'หมวดหมู่งาน (Category)',
            dataIndex: 'category_name',
            key: 'category_name',
            render: (text, record) => (
                <Input 
                    placeholder="เช่น Survey, Model, BoQ" 
                    value={text} 
                    onChange={(e) => handleInputChange(e.target.value, record.key, 'category_name')}
                    className="font-kanit"
                />
            )
        },
        {
            title: 'ระบบ 1 (%)',
            dataIndex: 'system_1',
            key: 'system_1',
            width: 150,
            align: 'center',
            render: (text, record) => (
                <div className="flex items-center space-x-1">
                    <InputNumber
                        min={0}
                        max={100}
                        precision={0}
                        value={text}
                        onChange={(val) => handleInputChange(val, record.key, 'system_1')}
                        className="flex-1"
                    />
                    <Popover
                        content={
                            <div className="p-1 min-w-[250px]">
                                <Text strong className="block mb-2 text-xs">Link Folder (System 1)</Text>
                                <Input 
                                    placeholder="วาง URL โฟลเดอร์ที่นี่" 
                                    value={record.system_1_link}
                                    onChange={(e) => handleInputChange(e.target.value, record.key, 'system_1_link')}
                                    prefix={<LinkOutlined className="text-gray-400" />}
                                    size="small"
                                />
                            </div>
                        }
                        title={null}
                        trigger="click"
                        placement="top"
                    >
                        <Button 
                            type={record.system_1_link ? "primary" : "default"}
                            icon={<LinkOutlined />} 
                            size="small"
                            className={record.system_1_link ? "bg-blue-500" : ""}
                        />
                    </Popover>
                </div>
            )
        },
        {
            title: 'ระบบ 2 (%)',
            dataIndex: 'system_2',
            key: 'system_2',
            width: 150,
            align: 'center',
            render: (text, record) => (
                <div className="flex items-center space-x-1">
                    <InputNumber
                        min={0}
                        max={100}
                        precision={0}
                        value={text}
                        onChange={(val) => handleInputChange(val, record.key, 'system_2')}
                        className="flex-1"
                    />
                    <Popover
                        content={
                            <div className="p-1 min-w-[250px]">
                                <Text strong className="block mb-2 text-xs">Link Folder (System 2)</Text>
                                <Input 
                                    placeholder="วาง URL โฟลเดอร์ที่นี่" 
                                    value={record.system_2_link}
                                    onChange={(e) => handleInputChange(e.target.value, record.key, 'system_2_link')}
                                    prefix={<LinkOutlined className="text-gray-400" />}
                                    size="small"
                                />
                            </div>
                        }
                        title={null}
                        trigger="click"
                        placement="top"
                    >
                        <Button 
                            type={record.system_2_link ? "primary" : "default"}
                            icon={<LinkOutlined />} 
                            size="small"
                            className={record.system_2_link ? "bg-green-500 border-green-500" : ""}
                        />
                    </Popover>
                </div>
            )
        },
        {
            title: 'ระบบ 3 (%)',
            dataIndex: 'system_3',
            key: 'system_3',
            width: 150,
            align: 'center',
            render: (text, record) => (
                <div className="flex items-center space-x-1">
                    <InputNumber
                        min={0}
                        max={100}
                        precision={0}
                        value={text}
                        onChange={(val) => handleInputChange(val, record.key, 'system_3')}
                        className="flex-1"
                    />
                    <Popover
                        content={
                            <div className="p-1 min-w-[250px]">
                                <Text strong className="block mb-2 text-xs">Link Folder (System 3)</Text>
                                <Input 
                                    placeholder="วาง URL โฟลเดอร์ที่นี่" 
                                    value={record.system_3_link}
                                    onChange={(e) => handleInputChange(e.target.value, record.key, 'system_3_link')}
                                    prefix={<LinkOutlined className="text-gray-400" />}
                                    size="small"
                                />
                            </div>
                        }
                        title={null}
                        trigger="click"
                        placement="top"
                    >
                        <Button 
                            type={record.system_3_link ? "primary" : "default"}
                            icon={<LinkOutlined />} 
                            size="small"
                            className={record.system_3_link ? "bg-orange-500 border-orange-500" : ""}
                        />
                    </Popover>
                </div>
            )
        },
        {
            title: 'ระบบ 4 (%)',
            dataIndex: 'system_4',
            key: 'system_4',
            width: 150,
            align: 'center',
            render: (text, record) => (
                <div className="flex items-center space-x-1">
                    <InputNumber
                        min={0}
                        max={100}
                        precision={0}
                        value={text}
                        onChange={(val) => handleInputChange(val, record.key, 'system_4')}
                        className="flex-1"
                    />
                    <Popover
                        content={
                            <div className="p-1 min-w-[250px]">
                                <Text strong className="block mb-2 text-xs">Link Folder (System 4)</Text>
                                <Input 
                                    placeholder="วาง URL โฟลเดอร์ที่นี่" 
                                    value={record.system_4_link}
                                    onChange={(e) => handleInputChange(e.target.value, record.key, 'system_4_link')}
                                    prefix={<LinkOutlined className="text-gray-400" />}
                                    size="small"
                                />
                            </div>
                        }
                        title={null}
                        trigger="click"
                        placement="top"
                    >
                        <Button 
                            type={record.system_4_link ? "primary" : "default"}
                            icon={<LinkOutlined />} 
                            size="small"
                            className={record.system_4_link ? "bg-purple-500 border-purple-500" : ""}
                        />
                    </Popover>
                </div>
            )
        },
        {
            title: 'จัดการ',
            key: 'action',
            width: 80,
            align: 'center',
            render: (_, record) => (
                <Popconfirm title="ยืนยันการลบ?" onConfirm={() => handleDeleteRow(record.key)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        }
    ];

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50">
                <Spin size="large" tip="กำลังโหลดข้อมูล..." />
            </div>
        );
    }

    return (
        <div className={`min-h-screen w-full ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50'} transition-colors duration-300 font-kanit`}>
            <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
            
            <div className="max-w-7xl mx-auto px-4 py-8">
                <Breadcrumb className="mb-6">
                    <Breadcrumb.Item>
                        <a onClick={() => navigate('/projects')}>โครงการทั้งหมด</a>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>
                        <a onClick={() => navigate(`/project/${id}`)}>{projectName}</a>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>รายละเอียดสถานะงาน</Breadcrumb.Item>
                </Breadcrumb>

                <Card className="shadow-lg border-0 rounded-xl overflow-hidden">
                    <div className="bg-teal-600 px-6 py-4 flex items-center justify-between">
                        <Space>
                            <Button 
                                ghost 
                                icon={<ArrowLeftOutlined />} 
                                onClick={() => navigate(`/project/${id}`)}
                            />
                            <Title level={4} className="m-0 text-white font-kanit">รายละเอียดสถานะงาน (Job Status Details)</Title>
                        </Space>
                        <Space>
                            <Button 
                                ghost
                                icon={<PlusOutlined />} 
                                onClick={handleAddRow}
                                className="!border-white !text-white hover:!text-white hover:!bg-white/20"
                            >
                                เพิ่มรายการ
                            </Button>
                            <Button 
                                icon={<SaveOutlined />} 
                                loading={saving} 
                                onClick={handleSave}
                                className="!bg-white !text-teal-600 !border-white hover:!bg-teal-50 hover:!text-teal-700"
                            >
                                บันทึกข้อมูล
                            </Button>
                        </Space>
                    </div>

                    <div className="p-6">
                        <div className="mb-4 bg-blue-50 p-4 rounded-lg flex items-start text-blue-700">
                            <InfoCircleOutlined className="mt-1 mr-3 text-lg" />
                            <div>
                                <Text strong className="text-blue-800 block mb-1">คำแนะนำการใช้งาน</Text>
                                <ul className="m-0 pl-4 text-sm list-disc">
                                    <li>ระบุหมวดหมู่ของงานในช่อง "หมวดหมู่งาน"</li>
                                    <li>ใส่เปอร์เซ็นต์ความคืบหน้า (0-100) ลงในแต่ละระบบ (System 1-4)</li>
                                    <li>ระบบจะคำนวณค่าเฉลี่ยทั้งหมดเพื่อนำไปแสดงผลที่หน้าโครงการโดยอัตโนมัติ</li>
                                </ul>
                            </div>
                        </div>

                        <Table 
                            columns={columns} 
                            dataSource={data} 
                            pagination={false} 
                            bordered 
                            className="job-status-table"
                            rowClassName="bg-white"
                        />

                        {data.length === 0 && (
                            <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg mt-4">
                                <Text className="text-gray-400">ยังไม่มีข้อมูลสถานะงาน กรุณากดปุ่ม "เพิ่มรายการ" เพื่อเริ่มบันทึก</Text>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <style>{`
                .job-status-table .ant-table-thead > tr > th {
                    background-color: #f0fdfa !important;
                    font-weight: 600;
                    color: #0d9488 !important;
                    text-align: center;
                }
                .ant-input-number-input {
                    text-align: center;
                }
                .font-kanit {
                    font-family: 'Kanit', sans-serif !important;
                }
            `}</style>
        </div>
    );
};

export default JobStatusDetail;
