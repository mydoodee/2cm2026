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
  Upload,
  Tooltip,
  Divider
} from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  PlusOutlined,
  ProjectOutlined,
  TeamOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LayoutOutlined,
  CameraOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import Navbar from '../Navbar';
import api from '../../axiosConfig';
import Swal from 'sweetalert2';

const { Title, Text } = Typography;

const ProjectForm = ({ user, setUser, theme, setTheme, activeCompany, setActiveCompany }) => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();

  const isEditMode = !!id;
  const isTenderMode = activeCompany?.company_name === 'Tender';
  
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [fileLists, setFileLists] = useState({
    image: [],
    progress_summary_image: [],
    payment_image: [],
    design_image: [],
    pre_construction_image: [],
    construction_image: [],
    cm_image: [],
    precast_image: [],
    bidding_image: [],
    job_status_image: []
  });

  useEffect(() => {
    const fetchUsers = async () => {
      setIsFetchingUsers(true);
      try {
        const response = await api.get('/api/users');
        const userData = Array.isArray(response.data) ? response.data : (response.data?.users || []);
        setUsers(userData);
      } catch (error) {
        console.error('Fetch users error:', error);
      } finally {
        setIsFetchingUsers(false);
      }
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
          message.error('ไม่สามารถโหลดข้อมูลโครงการได้');
        } finally {
          setLoading(false);
        }
      } else {
        form.setFieldsValue({
          status: 'Planning',
          progress: 0,
          tender_status: 'tender_in_progress',
          show_design: 1,
          show_pre_construction: 1,
          show_construction: 1,
          show_precast: 1,
          show_cm: 1,
          show_bidding: 1,
          show_progress_summary: 1,
          show_payment: 1,
          show_job_status: 1
        });
        setLoading(false);
      }
    };
    initData();
  }, [id, isEditMode, form]);

  const handleFileChange = (category) => ({ fileList }) => {
    setFileLists(prev => ({ ...prev, [category]: fileList.slice(-1) }));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const formData = new FormData();
      
      Object.keys(values).forEach(key => {
        if (values[key] === null || values[key] === undefined) return;
        if (dayjs.isDayjs(values[key])) {
          formData.append(key, values[key].format('YYYY-MM-DD'));
        } else if (key === 'notified_users') {
          formData.append(key, JSON.stringify(values[key]));
        } else {
          formData.append(key, values[key]);
        }
      });

      if (!isEditMode && activeCompany?.company_id) {
        formData.append('company_id', activeCompany.company_id);
      }

      Object.keys(fileLists).forEach(key => {
        if (fileLists[key][0]?.originFileObj) {
          formData.append(key, fileLists[key][0].originFileObj);
        }
      });

      let response;
      if (isEditMode) {
        response = await api.put(`/api/project/${id}`, formData);
      } else {
        response = await api.post('/api/project', formData);
      }
      
      Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'บันทึกข้อมูลเรียบร้อย', confirmButtonColor: '#4f46e5' });
      navigate('/project-settings');
      
    } catch (error) {
      console.error('Submit Error:', error);
      Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: error.response?.data?.message || 'ไม่สามารถบันทึกได้', confirmButtonColor: '#ef4444' });
    } finally {
      setSubmitting(false);
    }
  };

  const phaseItems = [
    { label: 'Bidding', showKey: 'show_bidding', progressKey: 'bidding_progress', imgKey: 'bidding_image' },
    { label: 'Design', showKey: 'show_design', progressKey: 'design_progress', imgKey: 'design_image' },
    { label: 'Pre-Con', showKey: 'show_pre_construction', progressKey: 'pre_construction_progress', imgKey: 'pre_construction_image' },
    { label: 'Construction', showKey: 'show_construction', progressKey: 'construction_progress', imgKey: 'construction_image' },
    { label: 'Precast', showKey: 'show_precast', progressKey: 'precast_progress', imgKey: 'precast_image' },
    { label: 'CM', showKey: 'show_cm', progressKey: 'cm_progress', imgKey: 'cm_image' },
    { label: 'สถานะงาน', showKey: 'show_job_status', progressKey: 'job_status_progress', imgKey: 'job_status_image' },
    { label: 'สรุปผลงาน', showKey: 'show_progress_summary', progressKey: null, imgKey: 'progress_summary_image' },
    { label: 'การชำระเงิน', showKey: 'show_payment', progressKey: null, imgKey: 'payment_image' }
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
    <ConfigProvider theme={{ token: { fontFamily: 'Kanit, sans-serif', borderRadius: 16, colorPrimary: '#4f46e5' } }}>
      <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-[#f8fafc] text-slate-800'} font-kanit`}>
        <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />
        
        <div className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-8">
          {loading ? (
             <div className="flex flex-col items-center justify-center p-20 min-h-[60vh]"><Spin size="large" /><Text className="mt-4 text-slate-400">ระบบกำลังเตรียมข้อมูล...</Text></div>
          ) : (
            <Form form={form} layout="vertical">
              <div className="flex flex-col gap-8">
                
                {/* Header Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800/80 p-6 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-100">
                      <ProjectOutlined className="text-3xl text-white" />
                    </div>
                    <div>
                      <Typography.Title level={3} className={`!mb-0 font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        {isEditMode ? 'แก้ไขรายละเอียดงาน' : 'สร้างโครงการใหม่'}
                      </Typography.Title>
                      <Text className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Management Suite</Text>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => navigate('/project-settings')} className="h-11 px-6 rounded-xl font-bold border-0 bg-slate-100 dark:bg-slate-700">ยกเลิก</Button>
                    <Button type="primary" onClick={handleSubmit} loading={submitting} className="h-11 px-10 rounded-xl font-bold bg-blue-500 shadow-lg shadow-blue-100 transition-transform hover:scale-105 border-0">บันทึกข้อมูล</Button>
                  </div>
                </div>

                <Row gutter={[24, 24]}>
                  {/* Left Column */}
                  <Col xs={24} lg={16}>
                    <div className="flex flex-col gap-6">
                      <Card className="border-0 rounded-[2.5rem] shadow-sm dark:bg-slate-800/40" 
                            title={<div className="flex items-center gap-2 text-indigo-600 font-bold"><LayoutOutlined/> ข้อมูลโครงการและรายละเอียดผู้เกี่ยวข้อง</div>}>
                        <Row gutter={[16, 8]}>
                          <Col xs={24} md={6}><Form.Item name="job_number" label={<span className="text-red-500 font-bold">* JOB NUMBER</span>} rules={[{required:true}]}><Input className="h-11 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"/></Form.Item></Col>
                          <Col xs={24} md={18}><Form.Item name="project_name" label={<span className="text-red-500 font-bold">* ชื่อโครงการ</span>} rules={[{required:true}]}><Input className="h-11 rounded-xl bg-slate-50 border border-slate-200"/></Form.Item></Col>
                          <Col xs={12} md={6}><Form.Item name="start_date" label={<span className="text-red-500 font-bold">* วันเริ่มงาน</span>} rules={[{required:true}]}><DatePicker className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200" format="DD/MM/YYYY"/></Form.Item></Col>
                          <Col xs={12} md={6}><Form.Item name="end_date" label={<span className="text-red-500 font-bold">* วันสิ้นสุด</span>} rules={[{required:true}]}><DatePicker className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200" format="DD/MM/YYYY"/></Form.Item></Col>
                          <Col xs={24} md={6}><Form.Item name="status" label="สถานะ"><Select className="h-11 rounded-xl bg-slate-50 border border-slate-200" options={[{label:'Planning',value:'Planning'},{label:'In Progress',value:'In Progress'},{label:'Completed',value:'Completed'}]}/></Form.Item></Col>
                          <Col xs={24} md={6}><Form.Item name="progress" label="ความคืบหน้าหลัก (%)"><Input type="number" className="h-11 rounded-xl bg-slate-50 border border-slate-200 font-bold"/></Form.Item></Col>
                          
                          <Col xs={12} md={6}><Form.Item name="owner" label="เจ้าของโครงการ"><Input className="h-11 rounded-xl bg-slate-50 border border-slate-200" placeholder="Owner"/></Form.Item></Col>
                          <Col xs={12} md={6}><Form.Item name="consusltant" label="ที่ปรึกษา"><Input className="h-11 rounded-xl bg-slate-50 border border-slate-200" placeholder="Consultant"/></Form.Item></Col>
                          <Col xs={12} md={6}><Form.Item name="contractor" label="ผู้รับเหมา"><Input className="h-11 rounded-xl bg-slate-50 border border-slate-200" placeholder="Contractor"/></Form.Item></Col>
                          <Col xs={12} md={6}><Form.Item name="address" label="ที่ตั้งโครงการ"><Input className="h-11 rounded-xl bg-slate-50 border border-slate-200" placeholder="Location"/></Form.Item></Col>
                        </Row>
                      </Card>

                      <Card className="border-0 rounded-[2.5rem] shadow-sm dark:bg-slate-800/40"
                            title={<div className="flex items-center gap-2 text-indigo-600 font-bold"><CheckCircleOutlined/> การจัดการเฟสงานและความคืบหน้า (%)</div>}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {phaseItems.map(item => (
                            <div key={item.showKey} className="p-4 rounded-[1.8rem] bg-white dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 flex flex-col gap-2 shadow-sm">
                              <div className="flex justify-between items-center">
                                <Form.Item name={item.showKey} valuePropName="checked" className="mb-0">
                                  <Checkbox className="font-bold text-slate-700 dark:text-slate-200">{item.label}</Checkbox>
                                </Form.Item>
                                {item.progressKey && (
                                  <Form.Item name={item.progressKey} className="mb-0 w-16">
                                    <Input type="number" size="small" suffix="%" className="h-7 rounded-lg border-slate-200 text-center font-bold text-indigo-600" />
                                  </Form.Item>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  </Col>

                  {/* Right Column */}
                  <Col xs={24} lg={8}>
                    <div className="flex flex-col gap-6">
                      {isTenderMode && (
                        <Card className="border-0 rounded-[2.5rem] shadow-sm dark:bg-slate-800/40"
                              title={<div className="flex items-center gap-2 text-indigo-600 font-bold"><TrophyOutlined/> รายละเอียด Tender</div>}>
                          <Row gutter={[12, 12]}>
                            <Col span={24}><Form.Item name="tender_doc_date" label="วันที่รับเอกสาร"><DatePicker className="w-full h-11 rounded-xl bg-slate-50 border border-slate-200" format="DD/MM/YYYY"/></Form.Item></Col>
                            <Col span={24}><Form.Item name="tender_status" label="สถานะประมูล"><Select className="h-11 rounded-xl bg-slate-50 border border-slate-200" options={[{label:'กำลังดำเนินการ',value:'tender_in_progress'},{label:'ชนะ',value:'tender_win'},{label:'ไม่ชนะ',value:'tender_lost'}]}/></Form.Item></Col>
                            <Col span={24}><Form.Item name="tender_project_number" label="เลขโครงการ"><Input className="h-11 rounded-xl bg-slate-50 border border-slate-200"/></Form.Item></Col>
                            <Col span={24}><Form.Item name="tender_organization" label="หน่วยงาน"><Input className="h-11 rounded-xl bg-slate-50 border border-slate-200"/></Form.Item></Col>
                          </Row>
                        </Card>
                      )}

                      <Card className="border-0 rounded-[2.5rem] shadow-sm dark:bg-slate-800/40"
                            title={<div className="flex items-center gap-2 text-indigo-600 font-bold"><ClockCircleOutlined/> การแจ้งเตือนผู้ใช้งาน</div>}>
                        <Form.Item name="notified_users" className="mb-0">
                          <Select mode="multiple" className="w-full" placeholder="เลือกรายชื่อ..." options={(Array.isArray(users) ? users : []).map(u => ({ value: u.user_id, label: `${u.first_name} ${u.last_name}` }))} variant="outlined" style={{ borderRadius: '1rem' }} />
                        </Form.Item>
                      </Card>
                    </div>
                  </Col>
                </Row>

                <Card className="border-0 rounded-[2.5rem] shadow-sm dark:bg-slate-800/40 mt-6"
                      title={<div className="flex items-center gap-2 text-indigo-600 font-bold"><PictureOutlined/> คลังรูปภาพโครงการ (Gallery Dashboard)</div>}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {galleryItems.map(item => (
                      <div key={`gallery-${item.key}`} className="p-5 rounded-[2rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-4 min-h-[200px]">
                        <Text className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{item.label}</Text>
                        <div className="flex-1 flex items-center justify-center">
                          <Upload
                            listType="picture-card"
                            maxCount={1}
                            fileList={fileLists[item.key]}
                            onChange={handleFileChange(item.key)}
                            beforeUpload={() => false}
                            className="custom-upload-gallery"
                          >
                            {fileLists[item.key].length === 0 && (
                              <div className="flex flex-col items-center gap-2">
                                <PlusOutlined className="text-xl text-indigo-300" />
                                <Text className="text-[10px] font-bold text-indigo-300 uppercase">อัปโหลด</Text>
                              </div>
                            )}
                          </Upload>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </Form>
          )}
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .ant-card-head { border-bottom: 0 !important; padding: 24px 32px 8px !important; }
          .ant-card-body { padding: 8px 32px 32px !important; }
          .ant-form-item-label label { font-weight: 700 !important; color: #64748b !important; font-size: 11px !important; text-transform: uppercase !important; }
          .ant-checkbox-checked .ant-checkbox-inner { background-color: #4f46e5 !important; border-color: #4f46e5 !important; }
          .custom-upload-gallery .ant-upload.ant-upload-select-picture-card {
            width: 100% !important;
            height: 110px !important;
            background-color: #f8fafc !important;
            border: 2px dashed #e2e8f0 !important;
            border-radius: 1.5rem !important;
            margin: 0 !important;
          }
          .dark .custom-upload-gallery .ant-upload.ant-upload-select-picture-card { background-color: rgba(51, 65, 85, 0.2) !important; border-color: #334155 !important; }
          
          /* Show borders for inputs clearly */
          .ant-input, .ant-picker, .ant-select-selector { 
            border: 1.5px solid #e2e8f0 !important;
            transition: all 0.3s ease !important;
          }
          .ant-input:hover, .ant-picker:hover, .ant-select-selector:hover { 
            border-color: #6366f1 !important; 
          }
          .ant-input:focus, .ant-picker-focused, .ant-select-focused .ant-select-selector { 
            border-color: #4f46e5 !important;
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1) !important;
          }
        `}} />
      </div>
    </ConfigProvider>
  );
};

export default ProjectForm;
