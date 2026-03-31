import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Typography, Input, Select, Form, DatePicker, Upload, App, InputNumber, Checkbox, Divider, Tag, Spin, ConfigProvider, Row, Col } from 'antd';
import { PlusOutlined, ArrowLeftOutlined, SaveOutlined, InfoCircleOutlined, PictureOutlined, CheckCircleOutlined, PercentageOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import Navbar from '../Navbar';
import api from '../../axiosConfig';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

const { Option } = Select;

const ProjectForm = ({ user, setUser, theme, setTheme, activeCompany, setActiveCompany }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const isEditMode = !!id;
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [isFetchingTemplates, setIsFetchingTemplates] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);

  const [fileLists, setFileLists] = useState({
    progress_summary: [],
    payment: [],
    design: [],
    pre_construction: [],
    construction: [],
    cm: [],
    general: [],
    precast: [],
    bidding: [],
    job_status: [],
  });

  const fetchDependencies = useCallback(async () => {
    setIsFetchingTemplates(true);
    setIsFetchingUsers(true);
    try {
      const [templatesRes, usersRes] = await Promise.all([
        api.get('/api/folder-templates').catch(() => ({ data: { templates: [] } })),
        api.get('/api/users').catch(() => ({ data: { users: [] } }))
      ]);
      setTemplates(templatesRes.data.templates || []);
      setAllUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Error fetching dependencies', error);
    } finally {
      setIsFetchingTemplates(false);
      setIsFetchingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  useEffect(() => {
    const initData = async () => {
      if (isEditMode) {
        try {
          const stateProject = location.state?.project;
          let projectData = stateProject;

          if (!projectData) {
            const response = await api.get(`/api/project/${id}`);
            projectData = response.data.project;
          }

          if (projectData) {
            form.setFieldsValue({
              project_name: projectData.project_name,
              job_number: projectData.job_number,
              description: projectData.description,
              start_date: projectData.start_date ? dayjs(projectData.start_date) : null,
              end_date: projectData.end_date ? dayjs(projectData.end_date) : null,
              status: projectData.status,
              progress: projectData.progress,
              owner: projectData.owner,
              consusltant: projectData.consusltant,
              contractor: projectData.contractor,
              address: projectData.address,
              show_design: projectData.show_design !== undefined ? projectData.show_design : true,
              show_pre_construction: projectData.show_pre_construction !== undefined ? projectData.show_pre_construction : true,
              show_construction: projectData.show_construction !== undefined ? projectData.show_construction : true,
              show_precast: projectData.show_precast !== undefined ? projectData.show_precast : true,
              show_cm: projectData.show_cm !== undefined ? projectData.show_cm : true,
              show_bidding: projectData.show_bidding !== undefined ? projectData.show_bidding : true,
              show_progress_summary: projectData.show_progress_summary !== undefined ? projectData.show_progress_summary : true,
              show_payment: projectData.show_payment !== undefined ? projectData.show_payment : true,
              show_job_status: projectData.show_job_status !== undefined ? projectData.show_job_status : true,
              bidding_progress: projectData.bidding_progress || 0,
              design_progress: projectData.design_progress || 0,
              pre_construction_progress: projectData.pre_construction_progress || 0,
              construction_progress: projectData.construction_progress || 0,
              precast_progress: projectData.precast_progress || 0,
              cm_progress: projectData.cm_progress || 0,
              job_status_progress: projectData.job_status_progress || 0,
              notified_users: projectData.notified_users || [],
            });

            setFileLists({
              progress_summary: projectData.progress_summary_image ? [{ uid: '-1', name: 'progress_summary.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${projectData.progress_summary_image}` }] : [],
              payment: projectData.payment_image ? [{ uid: '-2', name: 'payment.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${projectData.payment_image}` }] : [],
              design: projectData.design_image ? [{ uid: '-3', name: 'design.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${projectData.design_image}` }] : [],
              pre_construction: projectData.pre_construction_image ? [{ uid: '-4', name: 'pre_construction.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${projectData.pre_construction_image}` }] : [],
              construction: projectData.construction_image ? [{ uid: '-5', name: 'construction.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${projectData.construction_image}` }] : [],
              cm: projectData.cm_image ? [{ uid: '-6', name: 'cm.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${projectData.cm_image}` }] : [],
              general: projectData.image ? [{ uid: '-7', name: 'image.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${projectData.image}` }] : [],
              precast: projectData.precast_image ? [{ uid: '-8', name: 'precast.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${projectData.precast_image}` }] : [],
              bidding: projectData.bidding_image ? [{ uid: '-9', name: 'bidding.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${projectData.bidding_image}` }] : [],
              job_status: projectData.job_status_image ? [{ uid: '-10', name: 'job_status.png', status: 'done', url: `${import.meta.env.VITE_API_URL}/${projectData.job_status_image}` }] : [],
            });
          }
        } catch (error) {
          message.error('ไม่สามารถดึงข้อมูลโครงการได้');
          navigate('/project-settings');
        } finally {
          setLoading(false);
        }
      } else {
        form.setFieldsValue({
          show_design: true,
          show_pre_construction: true,
          show_construction: true,
          show_precast: true,
          show_cm: true,
          show_bidding: true,
          show_progress_summary: true,
          show_payment: true,
          show_job_status: true,
          bidding_progress: 0,
          design_progress: 0,
          pre_construction_progress: 0,
          construction_progress: 0,
          precast_progress: 0,
          cm_progress: 0,
          job_status_progress: 0,
        });
        setLoading(false);
      }
    };
    initData();
  }, [id, isEditMode, form, location.state, navigate, message]);

  const handleBack = () => {
    navigate('/project-settings');
  };

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
        if (key.includes('date')) {
          formData.append(key, values[key].format('YYYY-MM-DD'));
        } else if (key.startsWith('show_')) {
          formData.append(key, values[key] ? '1' : '0');
        } else if (key === 'notified_users') {
          formData.append(key, JSON.stringify(values[key]));
        } else {
          formData.append(key, values[key]);
        }
      });

      const fileMappings = {
        'general': 'image',
        'progress_summary': 'progress_summary_image',
        'payment': 'payment_image',
        'design': 'design_image',
        'pre_construction': 'pre_construction_image',
        'construction': 'construction_image',
        'cm': 'cm_image',
        'precast': 'precast_image',
        'bidding': 'bidding_image',
        'job_status': 'job_status_image'
      };

      for (const [key, fieldName] of Object.entries(fileMappings)) {
        if (fileLists[key][0]?.originFileObj) {
          formData.append(fieldName, fileLists[key][0].originFileObj);
        }
      }

      let response;
      if (isEditMode) {
        response = await api.put(`/api/project/${id}`, formData);
      } else {
        response = await api.post('/api/project', formData);
      }
      
      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: response.data.message || 'บันทึกข้อมูลเรียบร้อย',
        confirmButtonColor: '#4f46e5',
      });
      navigate('/project-settings');
      
    } catch (error) {
      console.error('Submit Error:', error);
      Swal.fire({
        icon: 'error',
        title: 'ข้อผิดพลาด',
        text: error.response?.data?.message || 'ไม่สามารถบันทึกโครงการได้',
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: 'Kanit, sans-serif',
          borderRadius: 12,
          colorPrimary: '#6366f1',
        },
      }}
    >
      <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-[#f8fafc] text-slate-800'} font-kanit`}>
        <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} activeCompany={activeCompany} setActiveCompany={setActiveCompany} />
        
        <div className="flex-1 w-full max-w-[1300px] mx-auto px-4 py-6 relative">
          
          {loading ? (
             <div className="flex flex-col items-center justify-center p-20 min-h-[60vh]">
               <Spin size="large" />
               <Typography.Text className="mt-4 font-kanit text-slate-400">กำลังโหลดข้อมูล...</Typography.Text>
             </div>
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* Header Page */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800/80 p-6 rounded-[2rem] shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl">
                    <SaveOutlined className="text-2xl text-indigo-500" />
                  </div>
                  <div>
                    <Typography.Title level={3} className={`!mb-0 font-kanit font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      {isEditMode ? 'แก้ไขรายละเอียดโครงการ' : 'สร้างโครงการใหม่'}
                    </Typography.Title>
                    <Typography.Text className="text-slate-400 text-xs uppercase tracking-widest font-bold">
                      Project Management Center
                    </Typography.Text>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBack}
                    className={`flex-1 md:flex-none h-11 px-6 rounded-xl font-bold border-0 transition-all ${theme === 'dark' ? 'bg-slate-700 text-slate-300 hover:!bg-slate-600 hover:!text-white' : 'bg-slate-100 text-slate-600 hover:!bg-slate-200 hover:!text-slate-800'}`}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSubmit}
                    loading={submitting}
                    className="flex-1 md:flex-none h-11 px-8 rounded-xl font-bold bg-indigo-600 hover:!bg-indigo-500 border-0 shadow-lg shadow-indigo-500/20 !text-white"
                  >
                    บันทึกข้อมูล
                  </Button>
                </div>
              </div>

              <Form form={form} layout="vertical">
                <Row gutter={[24, 24]}>
                  
                  {/* Left Column: Basic Info & Stakeholders */}
                  <Col xs={24} lg={16}>
                    <div className="flex flex-col gap-6">
                      
                      {/* Section: ข้อมูลพื้นฐาน */}
                      <Card className="border-0 rounded-[2rem] shadow-sm overflow-hidden dark:bg-slate-800/40" 
                            title={<div className="flex items-center gap-2 text-indigo-500 font-bold"><InfoCircleOutlined/> ข้อมูลโครงการ</div>}>
                        <Row gutter={[16, 8]}>
                          <Col xs={24} md={12}>
                            <Form.Item name="project_name" label="ชื่อโครงการ" rules={[{ required: true }]} className="mb-4">
                              <Input className="h-10 rounded-lg" placeholder="ชื่อโครงการ..." />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name="job_number" label="เลขที่งาน" rules={[{ required: true }]} className="mb-4">
                              <Input className="h-10 rounded-lg" placeholder="SPK-XXXX" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name="status" label="สถานะ" rules={[{ required: true }]} className="mb-4">
                              <Select className="h-10">
                                <Option value="Planning">วางแผน</Option>
                                <Option value="In Progress">ดำเนินการ</Option>
                                <Option value="Completed">เสร็จสิ้น</Option>
                              </Select>
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={6}>
                            <Form.Item name="start_date" label="วันที่เริ่ม" className="mb-4">
                              <DatePicker className="w-full h-10 rounded-lg" format="DD/MM/YYYY" placeholder="เริ่ม" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name="end_date" label="วันที่สิ้นสุด" className="mb-4">
                              <DatePicker className="w-full h-10 rounded-lg" format="DD/MM/YYYY" placeholder="สิ้นสุด" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name="progress" label="ความคืบหน้ารวม (%)" className="mb-4">
                              <InputNumber min={0} max={100} className="w-full h-10 rounded-lg flex items-center" />
                            </Form.Item>
                          </Col>
                          {!isEditMode && (
                            <Col xs={24} md={6}>
                              <Form.Item name="template_id" label="โครงสร้างโฟลเดอร์" className="mb-4">
                                <Select className="h-10" loading={isFetchingTemplates} placeholder="เลือก Template">
                                  {templates.map(t => <Option key={t.template_id} value={t.template_id}>{t.template_name}</Option>)}
                                </Select>
                              </Form.Item>
                            </Col>
                          )}
                          <Col span={24}>
                            <Form.Item name="description" label="คำอธิบาย" className="mb-0">
                              <Input className="h-10 rounded-lg" placeholder="รายละเอียดโครงการคร่าวๆ..." />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>

                      {/* Section: ผู้เกี่ยวข้อง */}
                      <Card className="border-0 rounded-[2rem] shadow-sm overflow-hidden dark:bg-slate-800/40"
                            title={<div className="flex items-center gap-2 text-indigo-500 font-bold"><CheckCircleOutlined/> ผู้ที่เกี่ยวข้องและที่ตั้ง</div>}>
                        <Row gutter={[16, 8]}>
                          <Col xs={24} md={6}>
                            <Form.Item name="owner" label="เจ้าของโครงการ" className="mb-2">
                              <Input className="h-10 rounded-lg" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name="consusltant" label="ที่ปรึกษา" className="mb-2">
                              <Input className="h-10 rounded-lg" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name="contractor" label="ผู้รับเหมา" className="mb-2">
                              <Input className="h-10 rounded-lg" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name="address" label="ที่ตั้งโครงการ" className="mb-2">
                              <Input className="h-10 rounded-lg" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>

                      {/* Section: แจ้งเตือน */}
                      <Card className="border-0 rounded-[2rem] shadow-sm overflow-hidden dark:bg-slate-800/40"
                            title={<div className="flex items-center gap-2 text-indigo-500 font-bold"><InfoCircleOutlined/> การแจ้งเตือน (Notify Users)</div>}>
                        <Form.Item name="notified_users" className="mb-0">
                          <Select 
                            mode="multiple" 
                            className="w-full min-h-[44px]"
                            placeholder="เลือกรายชื่อผู้ใช้..."
                            loading={isFetchingUsers}
                            maxTagCount="responsive"
                            options={allUsers.map(u => ({ value: u.user_id, label: `${u.first_name} ${u.last_name} (@${u.username})` }))}
                          />
                        </Form.Item>
                      </Card>
                    </div>
                  </Col>

                  {/* Right Column: Visibility & Progress */}
                  <Col xs={24} lg={8}>
                    <Card className="border-0 rounded-[2rem] shadow-sm overflow-hidden dark:bg-slate-800/40 h-full"
                          title={<div className="flex items-center gap-2 text-indigo-500 font-bold"><PercentageOutlined/> เมนูและความคืบหน้าเฟส</div>}>
                      <div className="flex flex-col gap-4">
                        {[
                          { id: "bidding", label: "Bidding", show: "show_bidding", prog: "bidding_progress" },
                          { id: "design", label: "Design", show: "show_design", prog: "design_progress" },
                          { id: "pre_con", label: "Pre-Con", show: "show_pre_construction", prog: "pre_construction_progress" },
                          { id: "const", label: "Construction", show: "show_construction", prog: "construction_progress" },
                          { id: "precast", label: "Precast", show: "show_precast", prog: "precast_progress" },
                          { id: "cm", label: "Management", show: "show_cm", prog: "cm_progress" },
                          { id: "job", label: "Job Status", show: "show_job_status", prog: "job_status_progress" },
                          { id: "summ", label: "Summary", show: "show_progress_summary", prog: null },
                          { id: "pay", label: "Payment", show: "show_payment", prog: null }
                        ].map(phase => (
                          <div key={phase.id} className="flex items-center justify-between gap-4 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                            <Form.Item name={phase.show} valuePropName="checked" className="mb-0">
                              <Checkbox><span className="font-bold text-slate-600 dark:text-slate-300">{phase.label}</span></Checkbox>
                            </Form.Item>
                            {phase.prog && (
                              <Form.Item name={phase.prog} className="mb-0 w-24">
                                <InputNumber min={0} max={100} size="small" suffix="%" className="w-full rounded-lg" />
                              </Form.Item>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>

                  {/* Section: รูปภาพ (Full Width) */}
                  <Col span={24}>
                    <Card className="border-0 rounded-[2rem] shadow-sm overflow-hidden dark:bg-slate-800/40"
                          title={<div className="flex items-center gap-2 text-indigo-500 font-bold text-sm"><PictureOutlined/> คลังรูปภาพโครงการ</div>}>
                      <Row gutter={[12, 12]}>
                        {[
                          { name: "general", label: "หน้าปก", field: "image" },
                          { name: "bidding", label: "ประมูลงาน", field: "bidding_image" },
                          { name: "design", label: "ออกแบบ", field: "design_image" },
                          { name: "pre_construction", label: "เตรียมงาน", field: "pre_construction_image" },
                          { name: "construction", label: "ก่อสร้าง", field: "construction_image" },
                          { name: "precast", label: "Precast", field: "precast_image" },
                          { name: "cm", label: "บริหารงาน", field: "cm_image" },
                          { name: "progress_summary", label: "สรุปผล", field: "progress_summary_image" },
                          { name: "payment", label: "การเงิน", field: "payment_image" },
                          { name: "job_status", label: "สถานะ", field: "job_status_image" }
                        ].map(img => (
                          <Col xs={12} sm={8} md={6} lg={4} xl={2.4} key={img.name}>
                            <div className="flex flex-col gap-1">
                              <Typography.Text className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-1 truncate">
                                {img.label}
                              </Typography.Text>
                              <div className={`p-1.5 rounded-xl border transition-all ${theme === 'dark' ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                <Form.Item name={img.field} noStyle>
                                  <Upload
                                    fileList={fileLists[img.name] || []}
                                    onChange={handleFileChange(img.name)}
                                    beforeUpload={() => false}
                                    accept="image/*"
                                    listType="picture-card"
                                    className="form-gallery-uploader-compact"
                                  >
                                    {(fileLists[img.name] || []).length < 1 && (
                                      <div className="flex flex-col items-center">
                                        <PlusOutlined className="text-sm text-indigo-400" />
                                        <div className="text-[9px] text-slate-400 font-bold">UP</div>
                                      </div>
                                    )}
                                  </Upload>
                                </Form.Item>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  </Col>
                </Row>
              </Form>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .ant-card-head {
          border-bottom: 1px solid rgba(0,0,0,0.03) !important;
          padding: 0 20px !important;
          min-height: 40px !important;
        }
        .ant-card-head-title {
          padding: 8px 0 !important;
          font-size: 13px !important;
        }
        .ant-form-item-label {
          padding-bottom: 4px !important;
        }
        .ant-form-item-label > label {
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #64748b !important;
        }
        .dark .ant-form-item-label > label {
          color: #94a3b8 !important;
        }

        .form-gallery-uploader-compact .ant-upload-select-picture-card {
          width: 100% !important;
          height: 64px !important;
          margin-bottom: 0 !important;
          margin-inline-end: 0 !important;
          border-radius: 10px !important;
          background-color: transparent !important;
          border: 1px dashed #cbd5e1 !important;
          transition: all 0.3s ease;
        }
        .dark .form-gallery-uploader-compact .ant-upload-select-picture-card {
           border: 1px dashed #334155 !important;
        }
        .form-gallery-uploader-compact .ant-upload-list-item-container {
          width: 100% !important;
          height: 64px !important;
        }
        .form-gallery-uploader-compact .ant-upload-list-item {
          border-radius: 10px !important;
          padding: 2px !important;
        }
        .ant-card-body {
          padding: 20px !important;
        }
      `}</style>
    </ConfigProvider>
  );
};

ProjectForm.propTypes = {
  user: PropTypes.object,
  setUser: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
  setTheme: PropTypes.func.isRequired,
  activeCompany: PropTypes.object,
  setActiveCompany: PropTypes.func,
};

export default ProjectForm;
