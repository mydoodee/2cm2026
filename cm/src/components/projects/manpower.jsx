import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, message, Card, Typography } from 'antd';

import axios from 'axios';
import api from '../../axiosConfig';

const { Title } = Typography;
const { Option } = Select;

const ManpowerAdd = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { id } = useParams(); // project_id
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        project_id: id,
        work_date: values.work_date.format('YYYY-MM-DD'),
        zone: values.zone,
        staff_position: values.staff_position,
        staff_type: values.staff_type,
        amount: Number(values.amount),
      };

      await api.post(`/api/project/${id}/manpower`, payload);

      message.success('เพิ่มข้อมูล manpower สำเร็จ');
      navigate(`/project/${id}`); // กลับไปหน้า detail หรือปรับตามต้องการ
    } catch (error) {
      console.error('❌ Error adding manpower:', error);
      message.error('เกิดข้อผิดพลาดในการเพิ่มข้อมูล กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <Card className="max-w-md mx-auto">
        <Title level={4} className="text-center mb-6 font-kanit">เพิ่มข้อมูล Manpower</Title>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="work_date"
            label="วันที่ทำงาน"
            rules={[{ required: true, message: 'กรุณาเลือกวันที่ทำงาน' }]}
          >
            <DatePicker format="YYYY-MM-DD" className="w-full" />
          </Form.Item>
          <Form.Item
            name="zone"
            label="โซนงาน"
            rules={[{ required: true, message: 'กรุณากรอกโซนงาน' }]}
          >
            <Input placeholder="เช่น Zone A" />
          </Form.Item>
          <Form.Item
            name="staff_position"
            label="ตำแหน่งพนักงาน"
            rules={[{ required: true, message: 'กรุณากรอกตำแหน่งพนักงาน' }]}
          >
            <Input placeholder="เช่น PROJECT MANAGER" />
          </Form.Item>
          <Form.Item
            name="staff_type"
            label="ประเภท"
            rules={[{ required: true, message: 'กรุณาเลือกประเภท' }]}
          >
            <Select placeholder="เลือกประเภท">
              <Option value="Staff">Staff</Option>
              <Option value="Labour">Labour</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="amount"
            label="จำนวนคน"
            rules={[{ required: true, message: 'กรุณากรอกจำนวนคน' }]}
          >
            <Input type="number" placeholder="เช่น 10" min={0} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} className="w-full font-kanit">
              บันทึกข้อมูล
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ManpowerAdd;