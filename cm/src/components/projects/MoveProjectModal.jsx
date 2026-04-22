import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Alert, Divider, Typography, Row, Col, Card, Checkbox } from 'antd';
import { TrophyOutlined, BankOutlined, ArrowRightOutlined, FolderOpenOutlined, EnvironmentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../../axiosConfig';
import clsx from 'clsx';

const { Text } = Typography;

const MoveProjectModal = ({ visible, onCancel, project, onSuccess, theme }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [companyMembers, setCompanyMembers] = useState([]);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchData();
            form.setFieldsValue({
                current_job: project?.job_number,
                current_name: project?.project_name,
                notified_users: project?.team_members?.map(m => m.user_id) || [],
                owner: project?.owner,
                consusltant: project?.consusltant,
                contractor: project?.contractor,
                address: project?.address,
                show_bidding: project?.show_bidding !== undefined ? project?.show_bidding : 1, 
                bidding_progress: project?.bidding_progress || 0,
                show_design: project?.show_design !== undefined ? project?.show_design : 1, 
                design_progress: project?.design_progress || 0,
                show_pre_construction: project?.show_pre_construction !== undefined ? project?.show_pre_construction : 1, 
                pre_construction_progress: project?.pre_construction_progress || 0,
                show_construction: project?.show_construction !== undefined ? project?.show_construction : 1, 
                construction_progress: project?.construction_progress || 0,
                show_precast: project?.show_precast !== undefined ? project?.show_precast : 1, 
                precast_progress: project?.precast_progress || 0,
                show_cm: project?.show_cm !== undefined ? project?.show_cm : 1, 
                cm_progress: project?.cm_progress || 0,
                show_job_status: project?.show_job_status !== undefined ? project?.show_job_status : 1, 
                job_status_progress: project?.job_status_progress || 0,
                show_progress_summary: project?.show_progress_summary !== undefined ? project?.show_progress_summary : 1,
                show_payment: project?.show_payment !== undefined ? project?.show_payment : 1
            });
        }
    }, [visible, project, form]);

    const fetchData = async () => {
        setFetching(true);
        try {
            const [compRes, tempRes] = await Promise.all([
                api.get('/api/companies'),
                api.get('/api/folder-templates')
            ]);
            
            // กรองเอาบริษัทปัจจุบันออก
            const currentCompanyId = project?.company_id || localStorage.getItem('activeCompanyId');
            const otherCompanies = compRes.data?.companies?.filter(c => String(c.company_id) !== String(currentCompanyId)) || [];
            
            setCompanies(otherCompanies);
            setTemplates(tempRes.data?.templates || []);

            // ดึงสมาชิกในบริษัทปัจจุบันมาเพื่อใช้ในการแจ้งเตือน
            if (currentCompanyId) {
                const memRes = await api.get(`/api/companies/${currentCompanyId}`);
                setCompanyMembers(memRes.data?.members || []);
            }
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
                template_id: values.template_id,
                notified_users: values.notified_users,
                owner: values.owner,
                consusltant: values.consusltant,
                contractor: values.contractor,
                address: values.address,
                show_bidding: values.show_bidding ? 1 : 0,
                bidding_progress: values.bidding_progress,
                show_design: values.show_design ? 1 : 0,
                design_progress: values.design_progress,
                show_pre_construction: values.show_pre_construction ? 1 : 0,
                pre_construction_progress: values.pre_construction_progress,
                show_construction: values.show_construction ? 1 : 0,
                construction_progress: values.construction_progress,
                show_precast: values.show_precast ? 1 : 0,
                precast_progress: values.precast_progress,
                show_cm: values.show_cm ? 1 : 0,
                cm_progress: values.cm_progress,
                show_job_status: values.show_job_status ? 1 : 0,
                job_status_progress: values.job_status_progress,
                show_progress_summary: values.show_progress_summary ? 1 : 0,
                show_payment: values.show_payment ? 1 : 0
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
                    <span className="font-bold">สร้าง Job - ย้ายเข้าสู่การทำงานจริง</span>
                </div>
            }
            width={900}
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
                <style dangerouslySetInnerHTML={{ __html: `
                    .move-project-modal .ant-form-item { margin-bottom: 12px !important; }
                    .move-project-modal .ant-form-item-label label { font-weight: 800 !important; font-size: 11px !important; text-transform: uppercase; }
                    .move-project-modal .ant-checkbox-checked .ant-checkbox-inner { background-color: ${theme === 'dark' ? '#6366f1' : '#4f46e5'} !important; border-color: ${theme === 'dark' ? '#6366f1' : '#4f46e5'} !important; }
                `}} />
                <Alert
                    message={<span className="font-bold text-indigo-800 font-kanit">ยืนยันการสร้าง Job สำหรับงานจริง?</span>}
                    description={
                        <div className="text-xs text-indigo-700 font-kanit">
                            การกดย้ายโครงการจะทำการเปลี่ยนบริษัทที่รับผิดชอบ และเริ่มสร้างโครงสร้างโฟลเดอร์สำหรับงานก่อสร้างจริงตาม Template ที่เลือก 
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
                    className="font-kanit move-project-modal"
                >
                    {/* CompactCard and Phase definitions */}
                    {(() => {
                        const phaseItems = [
                            { label: 'Bidding', showKey: 'show_bidding', progressKey: 'bidding_progress' },
                            { label: 'Design', showKey: 'show_design', progressKey: 'design_progress' },
                            { label: 'Pre-Con', showKey: 'show_pre_construction', progressKey: 'pre_construction_progress' },
                            { label: 'Construction', showKey: 'show_construction', progressKey: 'construction_progress' },
                            { label: 'Precast', showKey: 'show_precast', progressKey: 'precast_progress' },
                            { label: 'CM', showKey: 'show_cm', progressKey: 'cm_progress' },
                            { label: 'สถานะงาน', showKey: 'show_job_status', progressKey: 'job_status_progress' },
                            { label: 'สรุปผลงาน', showKey: 'show_progress_summary', progressKey: null },
                            { label: 'การชำระเงิน', showKey: 'show_payment', progressKey: null }
                        ];

                        const primaryColor = theme === 'dark' ? '#6366f1' : '#4f46e5';

                        const CompactCard = ({ icon, title, children, className = "" }) => (
                            <Card className={`border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden bg-white dark:bg-slate-800 ${className}`} bodyStyle={{ padding: '20px' }}>
                                <div className="flex items-center gap-2 mb-4 border-l-4 pl-3" style={{ borderColor: primaryColor }}>
                                    <div className="text-lg flex items-center" style={{ color: primaryColor }}>{icon}</div>
                                    <Text className="font-black text-slate-800 dark:text-slate-200 text-base uppercase tracking-tight">{title}</Text>
                                </div>
                                {children}
                            </Card>
                        );

                        return (
                            <>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item 
                            label={<span className="font-kanit">บริษัทที่รับผิดชอบงานก่อสร้าง</span>} 
                            name="new_company_id"
                            rules={[{ required: true, message: 'กรุณาเลือกบริษัทปลายทาง' }]}
                            className="mb-0"
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
                            className="mb-0"
                        >
                            <Input 
                                placeholder="เช่น CM-67001" 
                                size="large" 
                                className="font-mono font-bold text-lg font-kanit"
                            />
                        </Form.Item>
                    </div>

                    <Divider plain className="!my-4">
                        <Text type="secondary" className="text-[10px] uppercase tracking-widest font-bold font-kanit">รายละเอียดเพิ่มเติมและการตั้งค่า</Text>
                    </Divider>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Form.Item 
                            label={<span className="font-kanit">เลือก Master Folder Template (ถ้าระบุ)</span>} 
                            name="template_id"
                            tooltip={<span className="font-kanit">โครงสร้างโฟลเดอร์ทำงานจริงจะถูกสร้างตาม Template ที่เลือก</span>}
                            className="mb-0"
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

                        <Form.Item 
                            label={<span className="font-kanit">สมาชิกโครงการงานจริง (พร้อมแจ้งเตือน)</span>} 
                            name="notified_users"
                            className="mb-0"
                            extra={<span className="text-[10px] text-slate-400 font-kanit">ผู้ที่เลือกจะได้รับสิทธิ์เข้าใช้งานโครงการใหม่ทันที และจะได้รับอีเมลแจ้งเตือน</span>}
                        >
                            <Select 
                                mode="multiple" 
                                size="large"
                                className="w-full font-kanit"
                                placeholder="เลือกสมาชิกที่ต้องการเพิ่ม..."
                                loading={fetching}
                                maxTagCount="responsive"
                                options={companyMembers.map(u => ({ 
                                    value: u.user_id, 
                                    label: `${u.first_name || ''} ${u.last_name || ''} (@${u.username})`.trim()
                                }))}
                                classNames={{ popup: { root: 'font-kanit' } }}
                            />
                        </Form.Item>
                    </div>

                    <div className="flex flex-col gap-4 mb-4">
                        <CompactCard icon={<EnvironmentOutlined />} title="ผู้เกี่ยวข้องและที่ตั้ง">
                            <Row gutter={[12, 0]}>
                                <Col xs={12} md={6}><Form.Item name="owner" label="เจ้าของโครงการ"><Input className="font-kanit border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-white h-10" /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="consusltant" label="ที่ปรึกษา"><Input className="font-kanit border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-white h-10" /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="contractor" label="ผู้รับเหมาหลัก"><Input className="font-kanit border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-white h-10" /></Form.Item></Col>
                                <Col xs={12} md={6}><Form.Item name="address" label="ที่ตั้งโครงการ"><Input className="font-kanit border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-white h-10" /></Form.Item></Col>
                            </Row>
                        </CompactCard>

                        <CompactCard icon={<CheckCircleOutlined />} title="การจัดการเฟสงานและความคืบหน้า">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {phaseItems.map(item => (
                                <div key={item.showKey} className="flex items-center justify-between p-2.5 px-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-200 transition-all">
                                <Form.Item name={item.showKey} valuePropName="checked" className="mb-0">
                                    <Checkbox className="font-bold text-slate-700 dark:text-slate-300 font-kanit">{item.label}</Checkbox>
                                </Form.Item>
                                {item.progressKey && (
                                    <Form.Item name={item.progressKey} className="mb-0 w-16">
                                    <Input size="small" suffix="%" className="text-center font-bold border-slate-400 dark:bg-slate-700 dark:border-slate-600 dark:text-white h-7 font-kanit" style={{ color: primaryColor }} />
                                    </Form.Item>
                                )}
                                </div>
                            ))}
                            </div>
                        </CompactCard>
                    </div>



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
                            </>
                        );
                    })()}
                </Form>
            </div>
        </Modal>
    );
};

export default MoveProjectModal;
