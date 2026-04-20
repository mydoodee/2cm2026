import React from 'react';
import { Modal, Card, Form, Row, Col, Input, Button, List, Avatar, Badge, Typography } from 'antd';
import { SettingOutlined, UserOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

function RoleManagementModal({
    visible,
    onCancel,
    roleForm,
    handleSaveRole,
    editingRole,
    setEditingRole,
    roleLoading,
    roles,
    handleDeleteRole,
    theme
}) {
    return (
        <Modal
            title={
                <div className="flex items-center space-x-2">
                    <SettingOutlined className={theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} />
                    <span className="font-bold">จัดการบทบาทผู้ใช้งาน</span>
                </div>
            }
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={600}
            forceRender
            centered
            className={theme === 'dark' ? 'dark-modal' : ''}
        >
            <div className="space-y-6 pt-2">
                <Card 
                    size="small" 
                    title={
                        <span className={theme === 'dark' ? 'text-gray-200' : 'text-slate-700'}>
                            {editingRole ? "แก้ไขบทบาท" : "เพิ่มบทบาทใหม่"}
                        </span>
                    } 
                    className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                >
                    <Form
                        form={roleForm}
                        layout="vertical"
                        onFinish={handleSaveRole}
                        initialValues={{ role_name: '', description: '' }}
                    >
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item
                                    name="role_name"
                                    label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>ชื่อบทบาท</span>}
                                    rules={[{ required: true, message: 'กรุณากรอกชื่อบทบาท' }]}
                                >
                                    <Input placeholder="เช่น Purchasing, Support" className="modern-input" />
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="description"
                                    label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>คำอธิบาย</span>}
                                >
                                    <Input.TextArea rows={2} placeholder="รายละเอียดหน้าที่ของบทบาทนี้" className="modern-input" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <div className="flex justify-end space-x-2">
                            {editingRole && (
                                <Button 
                                    onClick={() => { setEditingRole(null); roleForm.resetFields(); }}
                                    className={theme === 'dark' ? 'bg-slate-700 text-gray-300 border-slate-600' : ''}
                                >
                                    ยกเลิกการแก้ไข
                                </Button>
                            )}
                            <Button type="primary" htmlType="submit" loading={roleLoading} className="bg-indigo-600 border-0 shadow-md">
                                {editingRole ? 'บันทึกการแก้ไข' : 'เพิ่มบทบาท'}
                            </Button>
                        </div>
                    </Form>
                </Card>

                <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                    <List
                        itemLayout="horizontal"
                        dataSource={roles}
                        className={theme === 'dark' ? 'dark-list' : ''}
                        renderItem={(item) => (
                            <List.Item
                                className={`px-3 rounded-xl mb-2 transition-all ${theme === 'dark' ? 'hover:bg-slate-800/50 border-b border-white/5' : 'hover:bg-slate-50 border-b border-slate-100'}`}
                                actions={[
                                    <Button 
                                        key="edit" 
                                        type="text" 
                                        icon={<EditOutlined className="text-blue-500" />} 
                                        onClick={() => {
                                            setEditingRole(item);
                                            roleForm.setFieldsValue(item);
                                        }}
                                    />,
                                    <Button 
                                        key="delete" 
                                        type="text" 
                                        icon={<DeleteOutlined className={item.role_id <= 4 ? "text-gray-300" : "text-red-500"} />} 
                                        onClick={() => handleDeleteRole(item.role_id)}
                                        disabled={item.role_id <= 4} 
                                    />
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <Avatar 
                                            icon={<UserOutlined />} 
                                            className={theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-500'} 
                                        />
                                    }
                                    title={
                                        <div className="flex items-center space-x-2">
                                            <Text strong className={theme === 'dark' ? 'text-gray-200' : ''}>{item.role_name}</Text>
                                            {item.role_id <= 4 && <Badge status="default" text={<span className="text-[10px] text-gray-400">System</span>} />}
                                        </div>
                                    }
                                    description={<span className={theme === 'dark' ? 'text-gray-500 text-xs' : 'text-xs'}>{item.description || 'ไม่มีคำอธิบาย'}</span>}
                                />
                            </List.Item>
                        )}
                    />
                </div>
            </div>
        </Modal>
    );
}

export default RoleManagementModal;
