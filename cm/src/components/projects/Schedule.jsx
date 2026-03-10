import React, { useState, useEffect } from 'react';
import { 
  Button, Card, Typography, Space, Spin, Tree, Modal, Form, 
  Input, DatePicker, InputNumber, message, Popconfirm, Table,
  Breadcrumb, Tag, Empty, Divider, Alert, Row, Col, Select
} from 'antd';
import { 
  ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  CalendarOutlined, PlusSquareOutlined, MinusSquareOutlined, 
  CheckCircleOutlined, ClockCircleOutlined, UnorderedListOutlined,
  FolderOutlined, AppstoreOutlined, FileTextOutlined, WarningOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Schedule = ({ user, projectId, onClose }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedTask, setSelectedTask] = useState(null);
  const [parentTaskId, setParentTaskId] = useState(null);
  
  const [form] = Form.useForm();
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/project/${projectId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProject(response.data.project);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      message.error('ไม่สามารถโหลดข้อมูลโครงการได้');
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/schedule/tasks/${projectId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const formatted = formatTreeData(response.data.data);
      setTreeData(formatted);
      
      const gridData = formatTableData(response.data.data);
      setTableData(gridData);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      message.error('ไม่สามารถโหลดข้อมูลงานได้');
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      not_started: { label: 'ยังไม่เริ่ม', color: 'default', icon: <ClockCircleOutlined /> },
      in_progress: { label: 'กำลังดำเนินการ', color: 'processing', icon: <ClockCircleOutlined /> },
      completed: { label: 'เสร็จสิ้น', color: 'success', icon: <CheckCircleOutlined /> },
      delayed: { label: 'ล่าช้า', color: 'error', icon: <WarningOutlined /> }
    };
    return statusMap[status] || statusMap.not_started;
  };

  const formatTreeData = (tasks) => {
    const mainTasks = tasks.filter(t => t.task_type === 'main');
    
    return mainTasks.map(task => {
      const subTasks = tasks.filter(t => t.parent_task_id === task.task_id);
      const statusInfo = getStatusInfo(task.status);
      
      return {
        title: (
          <div style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Text strong style={{ fontSize: '13px' }}>{task.task_number}</Text>
              <Text style={{ fontSize: '13px' }}>{task.task_name}</Text>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
              {task.start_date && task.end_date && (
                <Text type="secondary">
                  <CalendarOutlined style={{ marginRight: '4px' }} />
                  {dayjs(task.start_date).format('DD/MM/YY')} - {dayjs(task.end_date).format('DD/MM/YY')}
                </Text>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '60px', 
                  height: '4px', 
                  background: '#f0f0f0', 
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${task.progress_percent}%`, 
                    height: '100%',
                    background: task.progress_percent === 100 ? '#52c41a' : '#1890ff'
                  }} />
                </div>
                <Text type="secondary">{task.progress_percent}%</Text>
              </div>
              <Tag color={statusInfo.color} icon={statusInfo.icon} style={{ fontSize: '10px', padding: '0 6px' }}>
                {statusInfo.label}
              </Tag>
            </div>
          </div>
        ),
        key: `task-${task.task_id}`,
        data: task,
        children: subTasks.length > 0 ? subTasks.map(sub => {
          const subStatusInfo = getStatusInfo(sub.status);
          return {
            title: (
              <div style={{ padding: '2px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text style={{ fontSize: '12px' }}>{sub.task_number}</Text>
                  <Text style={{ fontSize: '12px' }}>{sub.task_name}</Text>
                  <Tag color={subStatusInfo.color} style={{ fontSize: '10px', padding: '0 4px' }}>
                    {sub.progress_percent}%
                  </Tag>
                </div>
              </div>
            ),
            key: `task-${sub.task_id}`,
            data: sub,
            isLeaf: true
          };
        }) : undefined
      };
    });
  };

  const formatTableData = (tasks) => {
    const result = [];
    const mainTasks = tasks.filter(t => t.task_type === 'main');
    
    mainTasks.forEach(task => {
      result.push({
        key: `task-${task.task_id}`,
        ...task,
        level: 0,
        hasChildren: tasks.some(t => t.parent_task_id === task.task_id)
      });
      
      const subTasks = tasks.filter(t => t.parent_task_id === task.task_id);
      subTasks.forEach(sub => {
        result.push({
          key: `task-${sub.task_id}`,
          ...sub,
          level: 1,
          hasChildren: false,
          parent: `task-${task.task_id}`
        });
      });
    });
    
    return result;
  };

  const generateAutoTaskNumber = async (parentId = null) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/schedule/tasks/${projectId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const tasks = response.data.data;
      
      if (!parentId) {
        const mainTasks = tasks.filter(t => t.task_type === 'main');
        if (mainTasks.length === 0) return '1';
        const lastNum = Math.max(...mainTasks.map(t => parseInt(t.task_number)));
        return String(lastNum + 1);
      } else {
        const parentTask = tasks.find(t => t.task_id === parentId);
        const parentNum = parentTask?.task_number || '1';
        const subTasks = tasks.filter(t => t.parent_task_id === parentId);
        if (subTasks.length === 0) return `${parentNum}.1`;
        const lastSubNum = Math.max(...subTasks.map(t => {
          const parts = t.task_number.split('.');
          return parseInt(parts[parts.length - 1]);
        }));
        return `${parentNum}.${lastSubNum + 1}`;
      }
    } catch (error) {
      console.error('Error generating task number:', error);
      return parentId ? '1.1' : '1';
    }
  };

  const openModal = async (mode = 'create', task = null, parentId = null) => {
    setModalMode(mode);
    setSelectedTask(task);
    setParentTaskId(parentId);
    setModalVisible(true);
    setDuration(null);
    
    if (mode === 'edit' && task) {
      form.setFieldsValue({
        task_number: task.task_number,
        task_name: task.task_name,
        start_date: task.start_date ? dayjs(task.start_date) : null,
        end_date: task.end_date ? dayjs(task.end_date) : null,
        progress_percent: task.progress_percent,
        status: task.status,
        color: task.color,
        responsible_person: task.responsible_person,
        notes: task.notes
      });
      
      if (task.start_date && task.end_date) {
        const calculatedDuration = dayjs(task.end_date).diff(dayjs(task.start_date), 'day') + 1;
        setDuration(calculatedDuration);
        form.setFieldsValue({ duration: calculatedDuration });
      }
    } else {
      form.resetFields();
      const autoNumber = await generateAutoTaskNumber(parentId);
      form.setFieldsValue({
        task_number: autoNumber,
        progress_percent: 0,
        status: 'not_started',
        color: parentId ? '#52c41a' : '#1890ff'
      });
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    form.resetFields();
    setSelectedTask(null);
    setParentTaskId(null);
    setDuration(null);
  };

  const handleDurationChange = (value) => {
    setDuration(value);
    const startDate = form.getFieldValue('start_date');
    if (startDate && value) {
      const endDate = startDate.add(value - 1, 'day');
      form.setFieldsValue({ end_date: endDate });
    } else {
      form.setFieldsValue({ end_date: null });
    }
  };

  const handleStartDateChange = (date) => {
    if (date && duration) {
      const endDate = date.add(duration - 1, 'day');
      form.setFieldsValue({ end_date: endDate });
    }
  };

  const handleSubmit = async (values) => {
    try {
      const token = localStorage.getItem('token');
      
      const data = {
        ...values,
        project_id: projectId,
        task_type: parentTaskId ? 'sub' : 'main',
        parent_task_id: parentTaskId,
        start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
        duration_days: duration || 0
      };
      
      delete data.duration;

      if (modalMode === 'create') {
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/schedule/tasks`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        message.success('เพิ่มงานสำเร็จ');
      } else {
        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/schedule/tasks/${selectedTask.task_id}`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        message.success('แก้ไขงานสำเร็จ');
      }
      
      closeModal();
      fetchTasks();
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error('เกิดข้อผิดพลาด: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/schedule/tasks/${taskId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success('ลบงานสำเร็จ');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      message.error('ไม่สามารถลบงานได้');
    }
  };

  const handleExpand = (expanded, record) => {
    const key = record.key;
    if (expanded) {
      setExpandedRowKeys([...expandedRowKeys, key]);
    } else {
      setExpandedRowKeys(expandedRowKeys.filter(k => k !== key));
    }
  };

  const getVisibleRows = () => {
    if (expandedRowKeys.length === 0) {
      return tableData.filter(row => row.level === 0);
    }

    const visible = [];
    const isParentExpanded = (row) => {
      if (row.level === 0) return true;
      if (!row.parent) return true;
      return expandedRowKeys.includes(row.parent);
    };

    tableData.forEach(row => {
      if (isParentExpanded(row)) {
        visible.push(row);
      }
    });

    return visible;
  };

  const columns = [
    {
      title: 'หมายเลข',
      dataIndex: 'task_number',
      key: 'task_number',
      width: 120,
      fixed: 'left',
      render: (text, record) => {
        const indent = record.level * 32;
        const hasChildren = record.hasChildren;
        const isExpanded = expandedRowKeys.includes(record.key);
        
        return (
          <div style={{ paddingLeft: indent, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {hasChildren && (
              <Button
                type="text"
                size="small"
                icon={isExpanded ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
                onClick={() => handleExpand(!isExpanded, record)}
                style={{ padding: 0, width: 18, height: 18 }}
              />
            )}
            {!hasChildren && <span style={{ width: 22, display: 'inline-block' }}></span>}
            <Text strong={record.level === 0} style={{ fontSize: '12px' }}>{text}</Text>
          </div>
        );
      }
    },
    {
      title: 'ชื่องาน',
      dataIndex: 'task_name',
      key: 'task_name',
      width: 250,
      ellipsis: true,
      render: (text, record) => (
        <Text strong={record.level === 0} style={{ fontSize: '12px' }}>{text}</Text>
      )
    },
    {
      title: 'วันที่เริ่ม',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 110,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-'
    },
    {
      title: 'วันที่สิ้นสุด',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 110,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-'
    },
    {
      title: 'ระยะเวลา (วัน)',
      dataIndex: 'duration_days',
      key: 'duration_days',
      width: 100,
      align: 'center',
      render: (val) => val || '-'
    },
    {
      title: 'ความคืบหน้า',
      dataIndex: 'progress_percent',
      key: 'progress_percent',
      width: 120,
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${val}%`, 
              height: '100%',
              background: val === 100 ? '#52c41a' : '#1890ff'
            }} />
          </div>
          <Text style={{ fontSize: '11px', minWidth: '35px' }}>{val}%</Text>
        </div>
      )
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const info = getStatusInfo(status);
        return <Tag color={info.color} icon={info.icon}>{info.label}</Tag>;
      }
    },
    {
      title: 'ผู้รับผิดชอบ',
      dataIndex: 'responsible_person',
      key: 'responsible_person',
      width: 150,
      ellipsis: true,
      render: (text) => text || '-'
    },
    {
      title: 'จัดการ',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openModal('edit', record)}
          />
          {record.task_type === 'main' && (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => openModal('create', null, record.task_id)}
            />
          )}
          <Popconfirm
            title="ยืนยันการลบ"
            description="คุณแน่ใจว่าต้องการลบงานนี้?"
            onConfirm={() => handleDelete(record.task_id)}
            okText="ลบ"
            cancelText="ยกเลิก"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Schedule: {project?.project_name}</Title>
          <Breadcrumb 
            items={[
              { title: 'โครงการ' }, 
              { title: project?.project_name }, 
              { title: 'Schedule' }
            ]} 
          />
        </div>
        <Space>
          <Button onClick={onClose}>ปิด</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('create')}>
            เพิ่มงานหลัก
          </Button>
        </Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px' }}>
        <Card title={`รายการงาน (${treeData.length})`} style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
          {treeData.length > 0 ? (
            <Tree
              showLine={false}
              showIcon={false}
              treeData={treeData}
              defaultExpandAll
              blockNode
            />
          ) : (
            <Empty description="ยังไม่มีงาน" />
          )}
        </Card>

        <Card 
          title="ตารางงาน"
          extra={
            <Space>
              <Button size="small" onClick={() => {
                const allKeys = tableData.filter(row => row.hasChildren).map(row => row.key);
                setExpandedRowKeys(allKeys);
              }}>
                ขยายทั้งหมด
              </Button>
              <Button size="small" onClick={() => setExpandedRowKeys([])}>
                ย่อทั้งหมด
              </Button>
            </Space>
          }
        >
          <Table 
            columns={columns}
            dataSource={getVisibleRows()}
            pagination={false}
            scroll={{ x: 1400, y: 'calc(100vh - 350px)' }}
            size="small"
            bordered
          />
        </Card>
      </div>

      <Modal
        title={modalMode === 'create' ? 'เพิ่มงาน' : 'แก้ไขงาน'}
        open={modalVisible}
        onCancel={closeModal}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="task_number" label="หมายเลขงาน" rules={[{ required: true }]}>
                <Input disabled style={{ backgroundColor: '#f5f5f5' }} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="task_name" label="ชื่องาน" rules={[{ required: true }]}>
                <Input placeholder="เช่น งานเตรียมพื้นที่" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>กำหนดระยะเวลา</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="start_date" label="วันที่เริ่มต้น" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" onChange={handleStartDateChange} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="duration" label="ระยะเวลา (วัน)">
                <InputNumber min={1} style={{ width: '100%' }} onChange={handleDurationChange} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="end_date" label="วันที่สิ้นสุด" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Divider>รายละเอียด</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="progress_percent" label="ความคืบหน้า (%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="สถานะ">
                <Select>
                  <Option value="not_started">ยังไม่เริ่ม</Option>
                  <Option value="in_progress">กำลังดำเนินการ</Option>
                  <Option value="completed">เสร็จสิ้น</Option>
                  <Option value="delayed">ล่าช้า</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="color" label="สีแสดง">
                <Input type="color" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="responsible_person" label="ผู้รับผิดชอบ">
            <Input placeholder="ชื่อผู้รับผิดชอบ" />
          </Form.Item>

          <Form.Item name="notes" label="หมายเหตุ">
            <TextArea rows={3} placeholder="หมายเหตุเพิ่มเติม" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={closeModal}>ยกเลิก</Button>
              <Button type="primary" htmlType="submit">
                {modalMode === 'create' ? 'เพิ่ม' : 'บันทึก'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Schedule;