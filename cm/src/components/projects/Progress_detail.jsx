import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Form, InputNumber, Button, Spin, message, Typography, Space, Progress, Statistic, Divider, Table, DatePicker, Modal, Upload, Input, Select, Tag } from 'antd';
import { DollarOutlined, FileDoneOutlined, HistoryOutlined, EditOutlined, DeleteOutlined, UploadOutlined, ArrowLeftOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import api from '../../axiosConfig';
import Navbar from '../Navbar';
import moment from 'moment';
import 'moment/locale/th';

moment.locale('th');

const { Title, Text } = Typography;
const { Option } = Select;

// ✅ ฟังก์ชันสำหรับแสดงสถานะการชำระเงิน
const getStatusConfig = (status) => {
  const configs = {
    paid: {
      color: 'green',
      icon: <CheckCircleOutlined />,
      text: 'ชำระแล้ว',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    pending: {
      color: 'orange',
      icon: <ClockCircleOutlined />,
      text: 'ค้างชำระ',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    overdue: {
      color: 'red',
      icon: <WarningOutlined />,
      text: 'เกินกำหนด',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    cancelled: {
      color: 'default',
      icon: <CloseCircleOutlined />,
      text: 'ยกเลิก',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    }
  };
  return configs[status] || configs.pending;
};

const ProgressDetail = ({ user, setUser, theme }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [progressHistory, setProgressHistory] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    const source = axios.CancelToken.source();
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);

        const projectResponse = await api.get(`/api/dashboard/project/${id}`, {
          cancelToken: source.token
        });
        setProject(projectResponse.data.data);

        try {
          const progressResponse = await api.get(`/api/project/${id}/progress-history`, {
            cancelToken: source.token
          });
          const progressData = progressResponse.data.data || [];
          const sortedProgress = progressData.sort((a, b) => {
            if (b.installment !== a.installment) {
              return b.installment - a.installment;
            }
            return new Date(b.summary_date) - new Date(a.summary_date);
          });
          setProgressHistory(sortedProgress);
        } catch (error) {
          if (error.response?.status === 404) {
            setProgressHistory([]);
          } else {
            throw error;
          }
        }

        try {
          const paymentResponse = await api.get(`/api/project/${id}/payment-history`, {
            cancelToken: source.token
          });
          const paymentData = paymentResponse.data.data || [];
          setPaymentHistory(paymentData);
        } catch (error) {
          if (error.response?.status === 404) {
            setPaymentHistory([]);
          } else {
            throw error;
          }
        }

      } catch (error) {
        if (axios.isCancel(error)) return;

        console.error('❌ Error fetching project details:', error);

        if (error.code === 'ERR_NETWORK') {
          message.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } else if (error.response?.status === 404) {
          message.error('ไม่พบโครงการที่ระบุ');
          setTimeout(() => navigate('/'), 2000);
        } else if (error.response?.status === 401 || error.response?.status === 403) {
          message.error('กรุณาเข้าสู่ระบบใหม่');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          message.error('เกิดข้อผิดพลาดในการดึงข้อมูล');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
    return () => source.cancel('Component unmounted');
  }, [id, navigate]);

  const getLatestInstallment = () => {
    if (!progressHistory || progressHistory.length === 0) return 0;
    return Math.max(...progressHistory.map(p => p.installment || 0));
  };

  const getLatestProgressData = () => {
    if (!progressHistory || progressHistory.length === 0) return null;
    const latestInstallment = getLatestInstallment();
    return progressHistory.find(p => p.installment === latestInstallment) || null;
  };

  const onFinish = async (values) => {
    try {
      setSubmitting(true);

      if (editingSection === 'progress') {
        const progressUrl = editingRecordId
          ? `/api/project/${id}/progress/${editingRecordId}`
          : `/api/project/${id}/progress`;

        await api[editingRecordId ? 'put' : 'post'](
          progressUrl,
          {
            installment: values.installment,
            planned_progress: values.planned_progress,
            actual_progress: values.actual_progress,
            progress_ahead: values.progress_ahead,
            progress_behind: values.progress_behind,
            summary_date: values.summary_date ? values.summary_date.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
            notes: values.notes || '',
          }
        );

        message.success(editingRecordId ? 'อัปเดตข้อมูลสำเร็จ' : 'บันทึกข้อมูลสำเร็จ');

      } else if (editingSection === 'payment') {
        const paymentUrl = editingRecordId
          ? `/api/project/${id}/payment/${editingRecordId}`
          : `/api/project/${id}/payment`;

        const formData = new FormData();

        formData.append('payment_date', values.payment_date ? values.payment_date.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'));
        formData.append('total_installments', values.total_installments);
        formData.append('total_amount', values.total_amount);

        // ✅ คำนวณ submitted_installments และ submitted_amount ให้ถูกต้อง
        // สำหรับการเพิ่มใหม่: ใช้ current_installment - 1 เป็นงวดที่ส่งไปแล้ว
        // สำหรับการแก้ไข: ใช้ค่าที่มีอยู่
        let calculatedSubmittedInstallments, calculatedSubmittedAmount;

        if (editingRecordId) {
          // กรณีแก้ไข: ใช้ค่าเดิมจาก form
          calculatedSubmittedInstallments = values.submitted_installments;
          calculatedSubmittedAmount = values.submitted_amount;
        } else {
          // กรณีเพิ่มใหม่: คำนวณจากงวดปัจจุบัน - 1
          calculatedSubmittedInstallments = values.current_installment - 1;
          calculatedSubmittedAmount = values.submitted_amount; // ใช้ค่าจาก form (ได้คำนวณไว้แล้วใน startEditing)
        }

        formData.append('submitted_installments', calculatedSubmittedInstallments);
        formData.append('submitted_amount', calculatedSubmittedAmount);
        formData.append('current_installment', values.current_installment);
        formData.append('current_installment_amount', values.current_installment_amount);

        // ✅ เพิ่มสถานะการชำระเงิน
        formData.append('payment_status', values.payment_status || 'pending');

        // ✅ เพิ่มข้อมูลเพิ่มเติม (ถ้ามี)
        if (values.payment_method) {
          formData.append('payment_method', values.payment_method);
        }
        if (values.payment_note) {
          formData.append('payment_note', values.payment_note);
        }
        if (values.approved_by) {
          formData.append('approved_by', values.approved_by);
        }

        // เพิ่มไฟล์
        if (values.payment_files && Array.isArray(values.payment_files) && values.payment_files.length > 0) {
          values.payment_files.forEach((file) => {
            if (file.originFileObj) {
              formData.append('payment_files', file.originFileObj);
            }
          });
        }

        await api[editingRecordId ? 'put' : 'post'](
          paymentUrl,
          formData
        );

        message.success(editingRecordId ? 'อัปเดตข้อมูลสำเร็จ' : 'บันทึกข้อมูลสำเร็จ');
      }

      setEditingSection(null);
      setEditingRecordId(null);

      // รีเฟรชข้อมูล
      const progressResponse = await api.get(`/api/project/${id}/progress-history`);
      const sortedProgress = (progressResponse.data.data || []).sort((a, b) => {
        if (b.installment !== a.installment) return b.installment - a.installment;
        return new Date(b.summary_date) - new Date(a.summary_date);
      });
      setProgressHistory(sortedProgress);

      const paymentResponse = await api.get(`/api/project/${id}/payment-history`);
      setPaymentHistory(paymentResponse.data.data || []);

    } catch (error) {
      console.error('❌ Error saving data:', error);

      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (error.response?.status === 500) {
        message.error('เกิดข้อผิดพลาดจาก server กรุณาตรวจสอบ console');
        console.error('Server error details:', error.response?.data);
      } else {
        message.error('เกิดข้อผิดพลาดในการบันทึก');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (section, record = null) => {
    setEditingSection(section);
    setEditingRecordId(record ? (section === 'progress' ? record.summary_id : record.payment_id) : null);
    form.resetFields();

    if (section === 'progress') {
      if (record) {
        form.setFieldsValue({
          installment: record.installment,
          planned_progress: Number(record.planned_progress),
          actual_progress: Number(record.actual_progress),
          progress_ahead: Number(record.progress_ahead || 0),
          progress_behind: Number(record.progress_behind || 0),
          summary_date: record.summary_date ? moment(record.summary_date) : moment(),
          notes: record.notes || '',
        });
      } else {
        const latestInstallment = getLatestInstallment();
        const nextInstallment = latestInstallment + 1;

        form.setFieldsValue({
          installment: nextInstallment,
          planned_progress: 0,
          actual_progress: 0,
          progress_ahead: 0,
          progress_behind: 0,
          summary_date: moment(),
          notes: `งวดที่ ${nextInstallment}`,
        });
      }
    } else if (section === 'payment') {
      if (record) {
        form.setFieldsValue({
          payment_date: record.payment_date ? moment(record.payment_date) : moment(),
          total_installments: record.total_installments || 0,
          total_amount: record.total_amount || 0,
          submitted_installments: record.submitted_installments || 0,
          submitted_amount: record.submitted_amount || 0,
          current_installment: record.current_installment || 0,
          current_installment_amount: record.current_installment_amount || 0,
          payment_status: record.payment_status || 'pending',
          payment_method: record.payment_method || '',
          payment_note: record.payment_note || '',
          approved_by: record.approved_by || '',
          payment_files: [],
        });
      } else {
        // ✅ การเพิ่มข้อมูลใหม่ - หางวดล่าสุดและยอดสะสมที่ถูกต้อง

        let lastInstallment = 0;
        let totalSubmittedAmount = 0;
        let lastPaymentData = null;

        if (paymentHistory && paymentHistory.length > 0) {
          // คำนวณยอดสะสมจากการรวมยอดทุกงวดที่มีอยู่ (ยกเว้นงวดที่อาจจะกำลังยกเลิก)
          paymentHistory.forEach(payment => {
            const installmentNum = Number(payment.current_installment) || 0;
            const amount = Number(payment.current_installment_amount) || 0;

            // ยอดสะสมจะนับเฉพาะงวดที่ชำระแล้วหรือค้างชำระ (ไม่นับยกเลิก)
            if (payment.payment_status !== 'cancelled') {
              totalSubmittedAmount += amount;
              if (installmentNum > lastInstallment) {
                lastInstallment = installmentNum;
                lastPaymentData = payment;
              }
            }
          });
        }

        const hasExistingData = paymentHistory && paymentHistory.length > 0;
        const nextInstallment = lastInstallment + 1;

        console.log('📝 เพิ่มงวดใหม่ (คำนวณใหม่):', {
          lastInstallment,
          nextInstallment,
          totalSubmittedAmount,
          lastPaymentData
        });

        form.setFieldsValue({
          payment_date: moment(),
          total_installments: hasExistingData ? (paymentHistory[0].total_installments || 0) : 0,
          total_amount: hasExistingData ? (paymentHistory[0].total_amount || 0) : 0,
          submitted_installments: lastInstallment,
          submitted_amount: totalSubmittedAmount,
          current_installment: nextInstallment,
          current_installment_amount: 0,
          payment_status: 'pending',
          payment_method: '',
          payment_note: '',
          approved_by: '',
          payment_files: [],
        });
      }
    }
  };

  // ✅ ฟังก์ชันคำนวณ Progress Ahead/Behind อัตโนมัติ
  const handleProgressFormChange = (changedValues, allValues) => {
    const { planned_progress, actual_progress } = allValues;

    if (planned_progress !== undefined || actual_progress !== undefined) {
      const planned = Number(planned_progress || 0);
      const actual = Number(actual_progress || 0);
      const diff = actual - planned;

      if (diff >= 0) {
        form.setFieldsValue({
          progress_ahead: Number(diff.toFixed(2)),
          progress_behind: 0
        });
      } else {
        form.setFieldsValue({
          progress_ahead: 0,
          progress_behind: Number(Math.abs(diff).toFixed(2))
        });
      }
    }
  };

  const handleDelete = async (section, recordId) => {
    Modal.confirm({
      title: 'ยืนยันการลบ',
      content: `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?`,
      okText: 'ลบ',
      okType: 'danger',
      cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          const token = localStorage.getItem('token');
          const url = section === 'progress'
            ? `/api/project/${id}/progress/${recordId}`
            : `/api/project/${id}/payment/${recordId}`;

          await api.delete(url);
          message.success('ลบข้อมูลสำเร็จ');

          const progressResponse = await api.get(`/api/project/${id}/progress-history`);
          const sortedProgress = (progressResponse.data.data || []).sort((a, b) => {
            if (b.installment !== a.installment) return b.installment - a.installment;
            return new Date(b.summary_date) - new Date(a.summary_date);
          });
          setProgressHistory(sortedProgress);

          const paymentResponse = await api.get(`/api/project/${id}/payment-history`);
          setPaymentHistory(paymentResponse.data.data || []);

        } catch (error) {
          console.error('❌ Error deleting:', error);
          message.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบ');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className={`h-screen w-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <Spin size="large" />
      </div>
    );
  }

  const latestProgressData = getLatestProgressData();
  const latestInstallmentNumber = getLatestInstallment();

  const plannedProgress = latestProgressData ? Number(latestProgressData.planned_progress).toFixed(2) : '0.00';
  const actualProgress = latestProgressData ? Number(latestProgressData.actual_progress).toFixed(2) : '0.00';
  const progressAhead = latestProgressData ? Number(latestProgressData.progress_ahead || 0).toFixed(2) : '0.00';
  const progressBehind = latestProgressData ? Number(latestProgressData.progress_behind || 0).toFixed(2) : '0.00';

  const latestPayment = paymentHistory[0] || {};
  const totalInstallments = Number(latestPayment.total_installments) || 0;
  const totalAmount = Number(latestPayment.total_amount) || 0;
  const submittedInstallments = Number(latestPayment.submitted_installments) || 0;
  const submittedAmount = Number(latestPayment.submitted_amount) || 0;
  const currentInstallment = Number(latestPayment.current_installment) || 0;
  const currentInstallmentAmount = Number(latestPayment.current_installment_amount) || 0;
  const totalSubmittedInstallments = submittedInstallments + (currentInstallmentAmount > 0 ? 1 : 0);
  const totalSubmittedAmount = submittedAmount + currentInstallmentAmount;
  const totalSubmittedPercent = totalAmount > 0 ? ((totalSubmittedAmount / totalAmount) * 100).toFixed(2) : '0.00';

  const progressColumns = [
    { title: 'งวดที่', dataIndex: 'installment', key: 'installment', render: (text) => `งวดที่ ${text}` },
    { title: 'วันที่บันทึก', dataIndex: 'summary_date', key: 'summary_date', render: (text) => moment(text).format('DD/MM/YYYY') },
    { title: 'ตามแผน (%)', dataIndex: 'planned_progress', key: 'planned_progress', render: (text) => Number(text).toFixed(2) },
    { title: 'ผลงานจริง (%)', dataIndex: 'actual_progress', key: 'actual_progress', render: (text) => Number(text).toFixed(2) },
    { title: 'เร็วกว่าแผน (%)', dataIndex: 'progress_ahead', key: 'progress_ahead', render: (text) => Number(text || 0).toFixed(2) },
    { title: 'ล่าช้ากว่าแผน (%)', dataIndex: 'progress_behind', key: 'progress_behind', render: (text) => Number(text || 0).toFixed(2) },
    { title: 'หมายเหตุ', dataIndex: 'notes', key: 'notes', render: (text) => text || '-' },
    {
      title: 'การจัดการ',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => startEditing('progress', record)}>
            แก้ไข
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('progress', record.summary_id)}>
            ลบ
          </Button>
        </Space>
      ),
    },
  ];

  const paymentColumns = [
    { title: 'วันที่', dataIndex: 'payment_date', key: 'payment_date', render: (text) => moment(text).format('DD/MM/YYYY') },
    {
      title: 'สถานะ',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      }
    },
    {
      title: 'งวดที่ส่ง',
      dataIndex: 'current_installment',
      key: 'current_installment',
      render: (text) => <Tag color="blue">งวด {text}</Tag>
    },
    {
      title: 'ยอดงวดนี้',
      dataIndex: 'current_installment_amount',
      key: 'current_installment_amount',
      render: (text) => <Text strong>{Number(text).toLocaleString()} ฿</Text>
    },
    {
      title: 'งวดสะสม (รวมงวดนี้)',
      dataIndex: 'current_installment',
      key: 'total_submitted',
      render: (current, record) => {
        const totalInstallments = Number(record.total_installments || 0);
        return <Text>{current}/{totalInstallments}</Text>;
      }
    },
    {
      title: 'ยอดสะสม (รวมงวดนี้)',
      key: 'total_amount_submitted',
      render: (_, record) => {
        const totalSubmitted = Number(record.submitted_amount || 0) + Number(record.current_installment_amount || 0);
        return <Text type="success" strong>{totalSubmitted.toLocaleString()} ฿</Text>;
      }
    },
    { title: 'วิธีชำระ', dataIndex: 'payment_method', key: 'payment_method', render: (text) => text || '-' },
    { title: 'หมายเหตุ', dataIndex: 'payment_note', key: 'payment_note', render: (text) => text || '-' },
    {
      title: 'การจัดการ',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => startEditing('payment', record)}>
            แก้ไข
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete('payment', record.payment_id)}>
            ลบ
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={`min-h-screen w-full font-kanit ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
      <Navbar user={user} setUser={setUser} />
      <div className="w-full px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            type="default"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/project/${id}`)}
            size="large"
          >
            กลับ
          </Button>
          <Title level={2} className="m-0">
            จัดการความคืบหน้าโครงการ: {project?.project_name || 'Loading...'}
          </Title>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Card */}
          <Card className="shadow-lg">
            <Title level={4}>ความคืบหน้า</Title>

            {!latestProgressData && editingSection !== 'progress' && (
              <>
                <Text type="secondary">ไม่มีข้อมูลความคืบหน้า</Text>
                <br />
                <Button type="primary" className="mt-4" onClick={() => startEditing('progress')}>
                  เพิ่มข้อมูล
                </Button>
              </>
            )}

            {latestProgressData && editingSection !== 'progress' && (
              <>
                <Divider />
                <Text strong>ผลงานก่อสร้าง (งวดที่ {latestInstallmentNumber})</Text>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Text>ผลงานตามแผน</Text>
                    <div className="flex items-center gap-2">
                      <Progress percent={Number(plannedProgress)} strokeColor="#1890ff" size="small" showInfo={false} style={{ width: 100 }} />
                      <Text>{plannedProgress}%</Text>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Text>ผลงานทำได้จริง</Text>
                    <div className="flex items-center gap-2">
                      <Progress percent={Number(actualProgress)} strokeColor="#52c41a" size="small" showInfo={false} style={{ width: 100 }} />
                      <Text>{actualProgress}%</Text>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Text>ผลงานเร็วกว่าแผน</Text>
                    <Text type={Number(progressAhead) > 0 ? 'success' : 'secondary'}>{progressAhead}%</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text>งานล่าช้ากว่าแผน</Text>
                    <Text type={Number(progressBehind) > 0 ? 'danger' : 'secondary'}>{progressBehind}%</Text>
                  </div>
                </div>

                <Button type="primary" className="mt-4" onClick={() => startEditing('progress')}>
                  เพิ่มข้อมูลใหม่
                </Button>

                <Divider />
                <Title level={5}><HistoryOutlined /> ประวัติความคืบหน้า</Title>
                <Table
                  columns={progressColumns}
                  dataSource={progressHistory}
                  rowKey="summary_id"
                  pagination={{ pageSize: 5 }}
                  size="small"
                  scroll={{ x: true }}
                />
              </>
            )}

            {editingSection === 'progress' && (
              <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handleProgressFormChange}>
                <Form.Item name="installment" label="งวดที่" rules={[{ required: true, type: 'number', min: 1 }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <div className="grid grid-cols-2 gap-4">
                  <Form.Item name="planned_progress" label="ผลงานตามแผน (%)" rules={[{ required: true, type: 'number', min: 0, max: 100 }]}>
                    <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="actual_progress" label="ผลงานทำได้จริง (%)" rules={[{ required: true, type: 'number', min: 0, max: 100 }]}>
                    <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Form.Item name="progress_ahead" label="เร็วกว่าแผน (%)" tooltip="🔒 คำนวณอัตโนมัติ (ผลงานจริง - ตามแผน)">
                    <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} disabled className="bg-gray-50" />
                  </Form.Item>
                  <Form.Item name="progress_behind" label="ล่าช้ากว่าแผน (%)" tooltip="🔒 คำนวณอัตโนมัติ (ตามแผน - ผลงานจริง)">
                    <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} disabled className="bg-gray-50" />
                  </Form.Item>
                </div>
                <Form.Item name="summary_date" label="วันที่บันทึก" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="notes" label="หมายเหตุ">
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={submitting}>
                    {editingRecordId ? 'อัปเดต' : 'บันทึก'}
                  </Button>
                  <Button onClick={() => { setEditingSection(null); setEditingRecordId(null); }}>
                    ยกเลิก
                  </Button>
                </Space>
              </Form>
            )}
          </Card>

          {/* Payment Card */}
          <Card className="shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <Title level={4} className="m-0"><DollarOutlined /> การชำระเงิน</Title>
              {totalInstallments > 0 && (
                <Progress
                  type="circle"
                  percent={Number(totalSubmittedPercent)}
                  size={40}
                  format={() => `${totalSubmittedInstallments}/${totalInstallments}`}
                />
              )}
            </div>

            {!latestPayment?.payment_date && editingSection !== 'payment' && (
              <>
                <Text type="secondary">ไม่มีข้อมูลการชำระเงิน</Text>
                <br />
                <Button type="primary" className="mt-4" onClick={() => startEditing('payment')}>
                  เพิ่มข้อมูล
                </Button>
              </>
            )}

            {latestPayment?.payment_date && editingSection !== 'payment' && (
              <>
                <Divider />
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1">
                    <Text type="secondary" className="text-xs">ค่างานตามสัญญา</Text>
                    <div>
                      <Text strong className="text-sm">{totalInstallments} งวด</Text>
                      <Text className="text-xs text-gray-500"> / {totalAmount.toLocaleString()} บาท</Text>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Text type="secondary" className="text-xs">ส่งงานมาแล้ว</Text>
                    <div>
                      <Text strong className="text-sm">{submittedInstallments} งวด</Text>
                      <Text className="text-xs text-gray-500"> / {submittedAmount.toLocaleString()} บาท</Text>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Text type="secondary" className="text-xs">ส่งงานครั้งนี้</Text>
                    <div>
                      <Text strong className="text-sm">งวด {currentInstallment}</Text>
                      <Text className="text-xs text-gray-500"> / {currentInstallmentAmount.toLocaleString()} บาท</Text>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Text type="secondary" className="text-xs">รวมส่งถึงครั้งนี้</Text>
                    <div>
                      <Text strong className="text-sm">{totalSubmittedInstallments} งวด</Text>
                      <Text className="text-xs text-gray-500"> / {totalSubmittedAmount.toLocaleString()} บาท</Text>
                    </div>
                  </div>
                </div>

                <Button type="primary" onClick={() => startEditing('payment')}>
                  เพิ่มข้อมูลใหม่
                </Button>

                <Divider />
                <Title level={5}><HistoryOutlined /> ประวัติการชำระเงิน</Title>
                <Table
                  columns={paymentColumns}
                  dataSource={paymentHistory}
                  rowKey="payment_id"
                  pagination={{ pageSize: 5 }}
                  size="small"
                  scroll={{ x: true }}
                />
              </>
            )}

            {editingSection === 'payment' && (
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <Form.Item name="payment_date" label="วันที่ชำระเงิน" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                  name="total_installments"
                  label="จำนวนงวดทั้งหมด"
                  rules={
                    paymentHistory.length > 0 && paymentHistory[0].total_installments > 0
                      ? []
                      : [{ required: true, type: 'number', min: 1, message: 'กรุณาระบุจำนวนงวดทั้งหมด' }]
                  }
                  tooltip={paymentHistory.length > 0 && paymentHistory[0].total_installments > 0 ? "🔒 ค่านี้ถูกล็อคเพราะมีข้อมูลอยู่แล้ว" : "ระบุจำนวนงวดทั้งหมดตามสัญญา"}
                >
                  <InputNumber
                    min={1}
                    style={{ width: '100%' }}
                    disabled={paymentHistory.length > 0 && paymentHistory[0].total_installments > 0}
                    placeholder="ระบุจำนวนงวด"
                  />
                </Form.Item>

                <Form.Item
                  name="total_amount"
                  label="ยอดเงินทั้งหมด (บาท)"
                  rules={
                    paymentHistory.length > 0 && paymentHistory[0].total_amount > 0
                      ? []
                      : [{ required: true, type: 'number', min: 1, message: 'กรุณาระบุยอดเงินทั้งหมด' }]
                  }
                  tooltip={paymentHistory.length > 0 && paymentHistory[0].total_amount > 0 ? "🔒 ค่านี้ถูกล็อคเพราะมีข้อมูลอยู่แล้ว" : "ระบุยอดเงินทั้งหมดตามสัญญา"}
                >
                  <InputNumber
                    min={1}
                    style={{ width: '100%' }}
                    disabled={paymentHistory.length > 0 && paymentHistory[0].total_amount > 0}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    placeholder="ระบุยอดเงิน"
                  />
                </Form.Item>

                <Form.Item
                  name="submitted_installments"
                  label="จำนวนงวดที่ส่งแล้ว"
                  tooltip="🔒 คำนวณอัตโนมัติจากงวดก่อนหน้า (ไม่สามารถแก้ไขได้)"
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    disabled
                  />
                </Form.Item>

                <Form.Item
                  name="submitted_amount"
                  label="ยอดเงินที่ส่งแล้ว (บาท)"
                  tooltip="🔒 คำนวณอัตโนมัติจากงวดก่อนหน้า (ไม่สามารถแก้ไขได้)"
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    disabled
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                  />
                </Form.Item>

                <Form.Item
                  name="current_installment"
                  label="งวดปัจจุบัน"
                  rules={[
                    { required: true, type: 'number', min: 1, message: 'กรุณาระบุงวดปัจจุบัน' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const totalInstallments = getFieldValue('total_installments');
                        if (!value || !totalInstallments) {
                          return Promise.resolve();
                        }
                        if (value > totalInstallments) {
                          return Promise.reject(new Error(`งวดปัจจุบันต้องไม่เกิน ${totalInstallments} งวด`));
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                  tooltip={!editingRecordId ? "🔒 งวดถัดไปจากครั้งก่อน (ไม่สามารถแก้ไขได้)" : "งวดที่กำลังส่งในครั้งนี้"}
                >
                  <InputNumber
                    min={1}
                    style={{ width: '100%' }}
                    disabled={!editingRecordId}
                  />
                </Form.Item>

                <Form.Item
                  name="current_installment_amount"
                  label="ยอดเงินงวดปัจจุบัน (บาท)"
                  rules={[
                    { required: true, type: 'number', min: 0, message: 'กรุณาระบุยอดเงินงวดปัจจุบัน' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const totalAmount = getFieldValue('total_amount');
                        const submittedAmount = getFieldValue('submitted_amount') || 0;
                        const remainingAmount = totalAmount - submittedAmount;

                        if (!value || !totalAmount) {
                          return Promise.resolve();
                        }

                        if (value > remainingAmount) {
                          return Promise.reject(new Error(`ยอดเงินต้องไม่เกิน ${remainingAmount.toLocaleString()} บาท (ยอดคงเหลือ)`));
                        }

                        return Promise.resolve();
                      },
                    }),
                  ]}
                  tooltip="ระบุยอดเงินที่ขอเบิกในงวดนี้"
                  dependencies={['total_amount', 'submitted_amount']}
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    placeholder="ระบุยอดเงิน"
                  />
                </Form.Item>

                {/* ✅ เพิ่มฟิลด์สถานะการชำระเงิน */}
                <Form.Item
                  name="payment_status"
                  label="สถานะการชำระเงิน"
                  rules={[{ required: true, message: 'กรุณาเลือกสถานะการชำระเงิน' }]}
                  tooltip="เลือกสถานะการชำระเงินปัจจุบัน"
                >
                  <Select placeholder="เลือกสถานะ" style={{ width: '100%' }}>
                    <Option value="pending">
                      <Tag color="orange" icon={<ClockCircleOutlined />}>ค้างชำระ</Tag>
                    </Option>
                    <Option value="paid">
                      <Tag color="green" icon={<CheckCircleOutlined />}>ชำระแล้ว</Tag>
                    </Option>
                    <Option value="overdue">
                      <Tag color="red" icon={<WarningOutlined />}>เกินกำหนด</Tag>
                    </Option>
                    <Option value="cancelled">
                      <Tag color="default" icon={<CloseCircleOutlined />}>ยกเลิก</Tag>
                    </Option>
                  </Select>
                </Form.Item>

                {/* ✅ เพิ่มฟิลด์วิธีการชำระเงิน */}
                <Form.Item
                  name="payment_method"
                  label="วิธีการชำระเงิน"
                  tooltip="ระบุวิธีการชำระเงิน (ถ้ามี)"
                >
                  <Select
                    placeholder="เลือกวิธีการชำระเงิน"
                    style={{ width: '100%' }}
                    allowClear
                  >
                    <Option value="เงินสด">เงินสด</Option>
                    <Option value="โอนเงิน">โอนเงิน</Option>
                    <Option value="เช็ค">เช็ค</Option>
                    <Option value="บัตรเครดิต">บัตรเครดิต</Option>
                  </Select>
                </Form.Item>

                {/* ✅ เพิ่มฟิลด์ผู้อนุมัติ */}
                <Form.Item
                  name="approved_by"
                  label="ผู้อนุมัติ"
                  tooltip="ระบุชื่อผู้อนุมัติ (ถ้ามี)"
                >
                  <Input placeholder="ชื่อผู้อนุมัติ" />
                </Form.Item>

                {/* ✅ เพิ่มฟิลด์หมายเหตุ */}
                <Form.Item
                  name="payment_note"
                  label="หมายเหตุการชำระเงิน"
                  tooltip="ระบุข้อมูลเพิ่มเติม (ถ้ามี)"
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="เช่น: ชำระผ่านธนาคารกสิกรไทย, เลขที่เช็ค 123456, etc."
                  />
                </Form.Item>

                <Form.Item
                  name="payment_files"
                  label="ไฟล์เอกสาร (สูงสุด 3 ไฟล์)"
                  valuePropName="fileList"
                  getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}
                  tooltip="อัปโหลดเอกสารประกอบการขอเบิกเงิน"
                >
                  <Upload maxCount={3} beforeUpload={() => false} accept=".pdf,.jpg,.jpeg,.png">
                    <Button icon={<UploadOutlined />}>เลือกไฟล์</Button>
                  </Upload>
                </Form.Item>

                <Space>
                  <Button type="primary" htmlType="submit" loading={submitting} icon={<FileDoneOutlined />}>
                    {editingRecordId ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}
                  </Button>
                  <Button onClick={() => { setEditingSection(null); setEditingRecordId(null); }}>
                    ยกเลิก
                  </Button>
                </Space>
              </Form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProgressDetail;