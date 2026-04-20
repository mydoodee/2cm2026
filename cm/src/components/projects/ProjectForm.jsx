import { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Row, 
  Col, 
  Typography, 
  DatePicker, 
  Select, 
  Spin,
  ConfigProvider,
  message,
  Checkbox,
  Upload
} from 'antd';
import { 
  SaveOutlined, 
  PlusOutlined,
  ProjectOutlined,
  LayoutOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import Navbar from '../Navbar';
import api from '../../axiosConfig';
import Swal from 'sweetalert2';

const { Text } = Typography;

const ProjectForm = ({ user, setUser, theme, setTheme, activeCompany, setActiveCompany }) => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditMode = !!id;
  const isTenderMode = activeCompany?.company_name?.toLowerCase().includes('tender');
  
  // ✅ Dynamic Theme Color
  const TENDER_COLOR = '#0ea5e9'; // Sky Blue
  const primaryColor = isTenderMode ? TENDER_COLOR : (activeCompany?.company_color || '#2563eb');
  const primaryLightColor = `${primaryColor}10`; // 10% Opacity for backgrounds

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [fileLists, setFileLists] = useState({
    image: [], progress_summary_image: [], payment_image: [], design_image: [],
    pre_construction_image: [], construction_image: [], cm_image: [],
    precast_image: [], bidding_image: [], job_status_image: []
  });

  useEffect(() => {
    const fetchUsers = async () => {
      setIsFetchingUsers(true);
      try {
        const response = await api.get('/api/users');
        const userData = Array.isArray(response.data) ? response.data : (response.data?.users || []);
        setUsers(userData);
      } catch (error) { console.error('Fetch users error:', error); }
      finally { setIsFetchingUsers(false); }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const initData = async () => {
      if (isEditMode) {
        try {
          const response = await api.get(`/api/project/${id}`);
          const data = response.data;
          form.setFieldsValue({
            ...data,
            start_date: data.start_date ? dayjs(data.start_date) : null,
            end_date: data.end_date ? dayjs(data.end_date) : null,
            tender_doc_date: data.tender_doc_date ? dayjs(data.tender_doc_date) : null,
            notified_users: data.team_members?.map(m => m.user_id) || []
          });
        } catch (error) {
          console.error('Fetch project error:', error);
          message.error('ไม่สามารถโหลดข้อมูลได้');
        } finally { setLoading(false); }
      } else {
        form.setFieldsValue({
          status: 'Planning', progress: 0, tender_status: 'tender_in_progress',
          show_design: 1, show_pre_construction: 1, show_construction: 1, show_precast: 1,
          show_cm: 1, show_bidding: 1, show_progress_summary: 1, show_payment: 1, show_job_status: 1
        });
        setLoading(false);
      }
    };
    initData();
  }, [id, isEditMode, form]);

  const handleFileChange = (category) => ({ fileList }) => setFileLists(prev => ({ ...prev, [category]: fileList.slice(-1) }));

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const formData = new FormData();
      Object.keys(values).forEach(key => {
        if (values[key] === null || values[key] === undefined) return;
        if (dayjs.isDayjs(values[key])) formData.append(key, values[key].format('YYYY-MM-DD'));
        else if (key === 'notified_users') formData.append(key, JSON.stringify(values[key]));
        else formData.append(key, values[key]);
      });
      if (!isEditMode && activeCompany?.company_id) formData.append('company_id', activeCompany.company_id);
      Object.keys(fileLists).forEach(key => { if (fileLists[key][0]?.originFileObj) formData.append(key, fileLists[key][0].originFileObj); });
      if (isEditMode) await api.put(`/api/project/${id}`, formData);
      else await api.post('/api/project', formData);
      Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'บันทึกข้อมูลเรียบร้อย', confirmButtonColor: primaryColor });
      navigate('/project-settings');
    } catch (error) {
      console.error('Submit Error:', error);
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: error.response?.data?.message || 'บันทึกไม่ได้', confirmButtonColor: '#ef4444' });
    } finally { setSubmitting(false); }
  };

  const CompactCard = ({ icon, title, children, className = "" }) => (
    <Card className={`border-slate-200 rounded-2xl shadow-sm overflow-hidden ${className}`} bodyStyle={{ padding: '20px' }}>
      <div className="flex items-center gap-2 mb-4 border-l-4 pl-3" style={{ borderColor: primaryColor }}>
        <div className="text-lg flex items-center" style={{ color: primaryColor }}>{icon}</div>
        <Text className="font-black text-slate-800 text-base uppercase tracking-tight">{title}</Text>
      </div>
      {children}
    </Card>
  );

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

  const galleryItems = [
    { label: 'รูปหลัก (MAIN)', key: 'image' },
    { label: 'สรุปผลงาน', key: 'progress_summary_image' },
    { label: 'การชำระเงิน', key: 'payment_image' },
    { label: 'ออกแบบ', key: 'design_image' },
    { label: 'เตรียมงาน', key: 'pre_construction_image' },
    { label: 'ก่อสร้าง', key: 'construction_image' },
    { label: 'PRECAST', key: 'precast_image' },
    { label: 'บริหารงาน', key: 'cm_image' },
    { label: 'ประมูลงาน', key: 'bidding_image' },
    { label: 'สถานะงาน', key: 'job_status_image' }
  ];

  return (
    <ConfigProvider theme={{ token: { fontFamily: 'Kanit, sans-serif', borderRadius: 10, colorPrimary: primaryColor } }}>
      <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-[#f4f7fa] text-slate-800'} font-kanit pb-10`}>
        <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />
        
        <div className="w-full max-w-[1440px] mx-auto px-4 mt-6">
          <Form form={form} layout="vertical" requiredMark={false}>
            
            {/* STICKY TOOLBAR */}
            <div className="sticky top-4 z-20 flex justify-between items-center bg-white/95 backdrop-blur-md dark:bg-slate-800/90 p-4 px-6 mb-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg shadow-md" style={{ backgroundColor: primaryColor }}><ProjectOutlined className="text-white text-lg" /></div>
                <Text className="text-xl font-black uppercase tracking-tight">{isEditMode ? 'แก้ไขโครงการ' : 'สร้างโครงการใหม่'}</Text>
                <div className="h-6 w-[1px] bg-slate-200 mx-2" />
                <div className="bg-slate-100 px-3 py-1 rounded-full text-[11px] font-black text-slate-500 uppercase tracking-widest">{activeCompany?.company_name}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => navigate('/project-settings')} className="h-11 px-8 rounded-xl font-bold border-slate-300">ยกเลิก</Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit} loading={submitting} className="h-11 px-10 rounded-xl font-bold border-0 shadow-lg" style={{ backgroundColor: primaryColor }}>บันทึกข้อมูล</Button>
              </div>
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <div className="flex flex-col gap-5">
                  <CompactCard icon={<InfoCircleOutlined />} title="ข้อมูลพื้นฐานและระยะเวลา">
                    <Row gutter={[12, 0]}>
                      <Col xs={24} md={6}><Form.Item name="job_number" label="* เลขที่งาน (Job #)"><Input className="font-mono font-black border-slate-400 h-10" /></Form.Item></Col>
                      <Col xs={24} md={18}><Form.Item name="project_name" label="* ชื่อโครงการ"><Input className="font-bold border-slate-400 h-10" /></Form.Item></Col>
                      <Col xs={12} md={6}><Form.Item name="start_date" label="วันเริ่มงาน"><DatePicker className="w-full border-slate-400 h-10" format="DD/MM/YYYY" /></Form.Item></Col>
                      <Col xs={12} md={6}><Form.Item name="end_date" label="วันสิ้นสุดงาน"><DatePicker className="w-full border-slate-400 h-10" format="DD/MM/YYYY" /></Form.Item></Col>
                      <Col xs={12} md={6}><Form.Item name="status" label="สถานะ"><Select className="h-10" options={[{label:'Planning',value:'Planning'},{label:'In Progress',value:'In Progress'},{label:'Completed',value:'Completed'}]} /></Form.Item></Col>
                      <Col xs={12} md={6}><Form.Item name="progress" label="ความคืบหน้า (%)"><Input type="number" className="font-bold border-slate-400 h-10" style={{ color: primaryColor }} /></Form.Item></Col>
                      <Col span={24}><Form.Item name="description" label="รายละเอียดโครงการ (Note)" className="mb-0"><Input.TextArea rows={2} className="border-slate-400" /></Form.Item></Col>
                    </Row>
                  </CompactCard>

                  <CompactCard icon={<EnvironmentOutlined />} title="ผู้เกี่ยวข้องและที่ตั้ง">
                    <Row gutter={[12, 0]}>
                      <Col xs={12} md={6}><Form.Item name="owner" label="เจ้าของโครงการ"><Input className="border-slate-400 h-10" /></Form.Item></Col>
                      <Col xs={12} md={6}><Form.Item name="consusltant" label="ที่ปรึกษา"><Input className="border-slate-400 h-10" /></Form.Item></Col>
                      <Col xs={12} md={6}><Form.Item name="contractor" label="ผู้รับเหมาหลัก"><Input className="border-slate-400 h-10" /></Form.Item></Col>
                      <Col xs={12} md={6}><Form.Item name="address" label="ที่ตั้งโครงการ"><Input className="border-slate-400 h-10" /></Form.Item></Col>
                    </Row>
                  </CompactCard>

                  <CompactCard icon={<CheckCircleOutlined />} title="การจัดการเฟสงานและความคืบหน้า">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {phaseItems.map(item => (
                        <div key={item.showKey} className="flex items-center justify-between p-2.5 px-4 rounded-xl border-2 border-slate-100 bg-white hover:border-slate-200 transition-all" style={{ '--hover-border': primaryColor }}>
                          <Form.Item name={item.showKey} valuePropName="checked" className="mb-0">
                            <Checkbox className="font-bold text-slate-700">{item.label}</Checkbox>
                          </Form.Item>
                          {item.progressKey && (
                            <Form.Item name={item.progressKey} className="mb-0 w-16">
                              <Input size="small" suffix="%" className="text-center font-bold border-slate-400 h-7" style={{ color: primaryColor }} />
                            </Form.Item>
                          )}
                        </div>
                      ))}
                    </div>
                  </CompactCard>
                </div>
              </Col>

              <Col xs={24} lg={8}>
                <div className="flex flex-col gap-5">
                  {isTenderMode && (
                    <CompactCard icon={<TrophyOutlined />} title="รายละเอียด TENDER" className="bg-white border-blue-200">
                      <Row gutter={[10, 0]}>
                        <Col span={24}><Form.Item name="tender_doc_date" label="วันที่รับเอกสาร"><DatePicker className="w-full border-slate-400 h-10" format="DD/MM/YYYY" /></Form.Item></Col>
                        <Col span={24}><Form.Item name="tender_status" label="สถานะประมูล"><Select className="h-10 border-slate-400" options={[{label:'กำลังดำเนินการ',value:'tender_in_progress'},{label:'ชนะ',value:'tender_win'},{label:'ไม่ชนะ',value:'tender_lost'}]} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="tender_project_number" label="เลขที่โครงการ"><Input className="border-slate-400 h-10" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="tender_announcement_number" label="เลขที่ประกาศ"><Input className="border-slate-400 h-10" /></Form.Item></Col>
                        <Col span={24}><Form.Item name="tender_organization" label="หน่วยงานจัดซื้อ"><Input className="border-slate-400 h-10" /></Form.Item></Col>
                        <Col span={24}><Form.Item name="tender_item_description" label="รายการงาน"><Input className="border-slate-400 h-10" /></Form.Item></Col>
                        <Col span={24}><Form.Item name="tender_winner_company" label="บริษัทที่ชนะ (ถ้ามี)" className="mb-0"><Input className="border-slate-400 h-10" /></Form.Item></Col>
                      </Row>
                    </CompactCard>
                  )}

                  <CompactCard icon={<TeamOutlined />} title="แจ้งเตือนผู้ใช้งาน">
                    <Form.Item name="notified_users" className="mb-0">
                      <Select mode="multiple" className="w-full" placeholder="เลือกรายชื่อ..." options={(Array.isArray(users) ? users : []).map(u => ({ value: u.user_id, label: `${u.first_name} ${u.last_name}` }))} />
                    </Form.Item>
                  </CompactCard>

                  <div className="p-6 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="p-4 rounded-full mb-2" style={{ backgroundColor: primaryLightColor }}><PictureOutlined className="text-3xl" style={{ color: primaryColor }} /></div>
                    <Text className="text-slate-400 font-bold text-xs">จัดการคลังรูปภาพโครงการที่ส่วนท้ายของหน้า</Text>
                  </div>
                </div>
              </Col>
            </Row>

            <Card className="border-slate-200 rounded-2xl shadow-sm mt-5" bodyStyle={{ padding: '24px' }}>
              <div className="flex items-center gap-2 mb-6 border-l-4 pl-3" style={{ borderColor: primaryColor }}>
                <PictureOutlined className="text-xl" style={{ color: primaryColor }} />
                <Text className="font-black text-slate-800 text-lg tracking-tight uppercase">คลังรูปภาพโครงการ (Gallery Dashboard)</Text>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {galleryItems.map(item => (
                  <div key={item.key} className="flex flex-col gap-2 p-3 rounded-2xl border-2 border-slate-100 bg-white hover:border-slate-200 transition-all">
                    <Text className="text-[10px] font-black text-slate-500 uppercase text-center truncate">{item.label}</Text>
                    <div className="flex-1 flex items-center justify-center">
                      <Upload
                        listType="picture-card"
                        maxCount={1}
                        fileList={fileLists[item.key]}
                        onChange={handleFileChange(item.key)}
                        beforeUpload={() => false}
                        className="final-compact-upload"
                      >
                        {fileLists[item.key].length === 0 && (
                          <div className="flex flex-col items-center gap-1">
                            <PlusOutlined style={{ color: primaryColor }} />
                            <Text className="text-[9px] font-bold uppercase" style={{ color: primaryColor }}>อัปโหลด</Text>
                          </div>
                        )}
                      </Upload>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Form>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .ant-form-item { margin-bottom: 12px !important; }
          .ant-form-item-label label { font-weight: 800 !important; color: #475569 !important; font-size: 11px !important; text-transform: uppercase; }
          .ant-input, .ant-picker, .ant-select-selector { border: 1.5px solid #94a3b8 !important; border-radius: 8px !important; background-color: #fff !important; }
          .ant-input:focus, .ant-picker-focused, .ant-select-focused .ant-select-selector { border-color: ${primaryColor} !important; box-shadow: 0 0 0 3px ${primaryLightColor} !important; }
          .final-compact-upload .ant-upload.ant-upload-select-picture-card { width: 100% !important; height: 90px !important; margin: 0 !important; border: 2px dashed #cbd5e1 !important; border-radius: 12px !important; background-color: #f8fafc !important; }
          .final-compact-upload .ant-upload-list-picture-card-container { width: 100% !important; height: 90px !important; }
          .ant-checkbox-checked .ant-checkbox-inner { background-color: ${primaryColor} !important; border-color: ${primaryColor} !important; }
        `}} />
      </div>
    </ConfigProvider>
  );
};

export default ProjectForm;
