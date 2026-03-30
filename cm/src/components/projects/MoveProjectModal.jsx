import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Alert, Divider, Typography } from 'antd';
import { TrophyOutlined, BankOutlined, ArrowRightOutlined, FolderOpenOutlined } from '@ant-design/icons';
import api from '../../axiosConfig';
import clsx from 'clsx';

const { Text } = Typography;

const MoveProjectModal = ({ visible, onCancel, project, onSuccess, theme }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchData();
            form.setFieldsValue({
                current_job: project?.job_number,
                current_name: project?.project_name
            });
        }
    }, [visible, project]);

    const fetchData = async () => {
        setFetching(true);
        try {
            const [compRes, tempRes] = await Promise.all([
                api.get('/api/companies'),
                api.get('/api/folder-templates')
            ]);
            
            // กรองเอาบริษัทปัจจุบันออก
            const currentCompanyId = localStorage.getItem('activeCompanyId');
            const otherCompanies = compRes.data?.companies?.filter(c => c.company_id !== currentCompanyId) || [];
            
            setCompanies(otherCompanies);
            setTemplates(tempRes.data?.templates || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            message.error('ไม่สามารถโหลดข้อมูลเริ่มต้นได้');
        } finally {
            setFetching(false);
        }
    };

    const handleMove = async (values) => {
        setLoading(true);
        try {
            const res = await api.post(`/api/project/${project.project_id}/move`, {
                new_company_id: values.new_company_id,
                new_job_number: values.new_job_number,
                template_id: values.template_id
            });

            if (res.data) {
                message.success('ยินดีด้วย! ย้ายโครงการและจัดโครงสร้างใหม่เรียบร้อยแล้ว');
                onSuccess();
                form.resetFields();
            }
        } catch (error) {
            console.error('Move project error:', error);
            message.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการย้ายโครงการ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={visible}
            onCancel={onCancel}
            onOk={() => form.submit()}
            confirmLoading={loading}
            title={
                <div className="flex items-center space-x-2 text-indigo-600 font-kanit">
                    <TrophyOutlined className="text-xl" />
                    <span className="font-bold">Win Tender - ย้ายเข้าสู่การทำงานจริง</span>
                </div>
            }
            width={600}
            className={clsx('font-kanit', theme === 'dark' ? 'dark-modal' : '')}
            okText="ยืนยันการย้ายโครงการ"
            cancelText="ยกเลิก"
            okButtonProps={{ 
                size: 'large', 
                className: '!bg-indigo-600 !border-indigo-600 hover:!bg-indigo-700 hover:!border-indigo-700 !text-white font-kanit font-bold'
            }}
            cancelButtonProps={{
                className: 'font-kanit'
            }}
        >
            <div className="py-2 font-kanit">
                <Alert
                    message={<span className="font-bold text-indigo-800 font-kanit">ยืนยันการชนะการประมูล?</span>}
                    description={
                        <div className="text-xs text-indigo-700 font-kanit">
                            การกดย้ายโครงการจะทำการเปลี่ยนบริษัทผู้รับใช้ และเริ่มสร้างโครงสร้างโฟลเดอร์สำหรับงานก่อสร้างจริงตาม Template ที่เลือก 
                            โดยไฟล์งานประมูลเดิมจะถูกเก็บไว้ที่ <Text code className="font-kanit">[00] Bidding Documents</Text>
                        </div>
                    }
                    type="info"
                    showIcon
                    className="mb-6 bg-indigo-50 border-indigo-200 font-kanit"
                />

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleMove}
                    requiredMark={false}
                    className="font-kanit"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item label={<span className="font-kanit">โปรเจ็กต์ปัจจุบัน</span>} name="current_name">
                            <Input disabled variant="filled" prefix={<BankOutlined className="text-gray-400" />} className="font-kanit" />
                        </Form.Item>
                        <Form.Item label={<span className="font-kanit">Job Number เดิม</span>} name="current_job">
                            <Input disabled variant="filled" className="font-kanit" />
                        </Form.Item>
                    </div>

                    <div className="flex justify-center my-2 opacity-30 text-2xl">
                        <ArrowRightOutlined className="rotate-90" />
                    </div>

                    <Divider plain className="!my-4">
                        <Text type="secondary" className="text-[10px] uppercase tracking-widest font-bold font-kanit">ข้อมูลงานจริง</Text>
                    </Divider>

                    <Form.Item 
                        label={<span className="font-kanit">บริษัทที่รับผิดชอบงานก่อสร้าง</span>} 
                        name="new_company_id"
                        rules={[{ required: true, message: 'กรุณาเลือกบริษัทปลายทาง' }]}
                    >
                        <Select 
                            placeholder="เลือกบริษัทที่จะย้ายไป" 
                            loading={fetching}
                            size="large"
                            showSearch
                            optionFilterProp="children"
                            className="font-kanit"
                            classNames={{ popup: { root: 'font-kanit' } }}
                        >
                            {companies.map(c => (
                                <Select.Option key={c.company_id} value={c.company_id}>
                                    <div className="flex items-center space-x-2 font-kanit">
                                        <BankOutlined />
                                        <span>{c.company_name}</span>
                                    </div>
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item 
                        label={<span className="font-kanit">Job Number สำหรับงานก่อสร้าง</span>} 
                        name="new_job_number"
                        rules={[{ required: true, message: 'กรุณาระบุ Job Number งานจริง' }]}
                        tooltip={<span className="font-kanit">รหัสโปรเจ็กต์จะถูกอัปเดตเป็นรหัสนี้เมื่อย้ายงานสำเร็จ</span>}
                    >
                        <Input 
                            placeholder="เช่น CM-67001" 
                            size="large" 
                            className="font-mono font-bold text-lg font-kanit"
                        />
                    </Form.Item>

                    <Form.Item 
                        label={<span className="font-kanit">เลือก Master Folder Template (ถ้าระบุ)</span>} 
                        name="template_id"
                        tooltip={<span className="font-kanit">โครงสร้างโฟลเดอร์ทำงานจริงจะถูกสร้างตาม Template ที่เลือก</span>}
                    >
                        <Select 
                            placeholder="เลือก Template (ถ้าไม่เลือกจะไม่มีการสร้างโฟลเดอร์ตั้งต้น)" 
                            loading={fetching}
                            size="large"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            className="font-kanit"
                            classNames={{ popup: { root: 'font-kanit' } }}
                        >
                            {templates.map(t => (
                                <Select.Option key={t.template_id} value={t.template_id}>
                                    <div className="flex items-center space-x-2 font-kanit">
                                        <FolderOpenOutlined className="text-indigo-500" />
                                        <span>{t.template_name}</span>
                                    </div>
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 mt-4">
                        <div className="flex items-start space-x-3">
                            <FolderOpenOutlined className="text-indigo-500 mt-1" />
                            <div>
                                <Text className="text-[11px] block font-bold text-indigo-800 uppercase font-kanit">รายละเอียดการย้าย:</Text>
                                <ul className="text-[10px] text-indigo-600 font-kanit list-disc pl-4 mt-1">
                                    <li>โครงการจะเปลี่ยนสถานะเป็น "งานก่อสร้าง"</li>
                                    <li>สร้างโฟลเดอร์ <Text strong className="text-[10px]">"[00] Bidding Documents"</Text> อัตโนมัติ</li>
                                    <li>สร้างโครงสร้างโฟลเดอร์ใหม่ทั้งหมดตาม Template ที่เลือก</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </Form>
            </div>
        </Modal>
    );
};

export default MoveProjectModal;
