import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Alert, Divider, Typography } from 'antd';
import { TrophyOutlined, BankOutlined, ArrowRightOutlined, FolderOpenOutlined } from '@ant-design/icons';
import api from '../../axiosConfig';
import clsx from 'clsx';

const { Text, Title } = Typography;

const MoveProjectModal = ({ visible, onCancel, project, onSuccess, theme }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchCompanies();
            form.setFieldsValue({
                current_job: project?.job_number,
                current_name: project?.project_name
            });
        }
    }, [visible, project]);

    const fetchCompanies = async () => {
        setFetching(true);
        try {
            const res = await api.get('/api/companies');
            // กรองเอาบริษัทปัจจุบันออก
            const currentCompanyId = localStorage.getItem('activeCompanyId');
            const otherCompanies = res.data?.companies?.filter(c => c.company_id !== currentCompanyId) || [];
            setCompanies(otherCompanies);
        } catch (error) {
            console.error('Failed to fetch companies:', error);
            message.error('ไม่สามารถโหลดรายการบริษัทได้');
        } finally {
            setFetching(false);
        }
    };

    const handleMove = async (values) => {
        setLoading(true);
        try {
            const res = await api.post(`/api/project/${project.project_id}/move`, {
                new_company_id: values.new_company_id,
                new_job_number: values.new_job_number
            });

            if (res.data) {
                message.success('ยินดีด้วย! ย้ายโครงการและจัดโครงสร้างใหม่เรียบร้อยแล้ว');
                onSuccess();
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
            visible={visible}
            onCancel={onCancel}
            onOk={() => form.submit()}
            confirmLoading={loading}
            title={
                <div className="flex items-center space-x-2 text-amber-600">
                    <TrophyOutlined className="text-xl" />
                    <span className="font-bold">Win Tender - ย้ายเข้าสู่การทำงานจริง</span>
                </div>
            }
            width={600}
            className={clsx(theme === 'dark' ? 'dark-modal' : '')}
            okText="ยืนยันการย้ายโครงการ"
            cancelText="ยกเลิก"
            okButtonProps={{ 
                size: 'large', 
                className: '!bg-amber-500 !border-amber-500 hover:!bg-amber-600 hover:!border-amber-600 !text-white'
            }}
        >
            <div className="py-2">
                <Alert
                    message={<span className="font-bold text-amber-800">ยืนยันการชนะการประมูล?</span>}
                    description={
                        <div className="text-xs text-amber-700">
                            การกดย้ายโครงการจะทำการเปลี่ยนบริษัทผู้รับใช้ และเริ่มสร้างโครงสร้างโฟลเดอร์สำหรับงานก่อสร้างจริง (P-100 ถึง P-900) 
                            โดยไฟล์งานประมูลเดิมจะถูกเก็บไว้ที่ <Text code>[00] Bidding Documents</Text>
                        </div>
                    }
                    type="warning"
                    showIcon
                    className="mb-6 bg-amber-50 border-amber-200"
                />

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleMove}
                    requiredMark={false}
                >
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item label="โปรเจ็กต์ปัจจุบัน" name="current_name">
                            <Input disabled variant="filled" prefix={<BankOutlined className="text-gray-400" />} />
                        </Form.Item>
                        <Form.Item label="Job Number เดิม" name="current_job">
                            <Input disabled variant="filled" />
                        </Form.Item>
                    </div>

                    <div className="flex justify-center my-2 opacity-30 text-2xl">
                        <ArrowRightOutlined className="rotate-90" />
                    </div>

                    <Divider plain className="!my-4"><Text type="secondary" className="text-[10px] uppercase tracking-widest font-bold">ข้อมูลงานจริง</Text></Divider>

                    <Form.Item 
                        label="เลือกบริษัทปลายทาง" 
                        name="new_company_id"
                        rules={[{ required: true, message: 'กรุณาเลือกบริษัทปลายทาง' }]}
                    >
                        <Select 
                            placeholder="เลือกบริษัทที่จะย้ายไป" 
                            loading={fetching}
                            size="large"
                            showSearch
                            optionFilterProp="children"
                        >
                            {companies.map(c => (
                                <Select.Option key={c.company_id} value={c.company_id}>
                                    <div className="flex items-center space-x-2">
                                        <BankOutlined />
                                        <span>{c.company_name}</span>
                                    </div>
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item 
                        label="กำหนดรหัส Job Number ใหม่" 
                        name="new_job_number"
                        rules={[{ required: true, message: 'กรุณาระบุ Job Number งานจริง' }]}
                        tooltip="เมื่อได้งานแล้ว รหัสโปรเจ็กต์จะเปลี่ยนเป็นรหัส Job Number มาตรฐานของบริษัท"
                    >
                        <Input 
                            placeholder="เช่น CM-67001" 
                            size="large" 
                            className="font-mono font-bold text-lg"
                        />
                    </Form.Item>

                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 mt-4">
                        <div className="flex items-start space-x-3">
                            <FolderOpenOutlined className="text-blue-500 mt-1" />
                            <div>
                                <Text className="text-[11px] block font-bold text-blue-800 uppercase">ระบบความปลอดภัย:</Text>
                                <Text className="text-[10px] text-blue-600">
                                    ไฟล์ทั้งหมดของคุณจะถูกเก็บรักษาไว้อย่างดี ระบบจะเพียงแค่เปลี่ยน "ที่อยู่" ของข้อมูลเพื่อให้ตรงกับขั้นตอนการทำงานจริงเท่านั้น
                                </Text>
                            </div>
                        </div>
                    </div>
                </Form>
            </div>
        </Modal>
    );
};

export default MoveProjectModal;
