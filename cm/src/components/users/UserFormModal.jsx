import React from 'react';
import { Modal, Form, Input, Select, Switch, Upload, Button, Row, Col, Spin } from 'antd';
import { UserOutlined, UploadOutlined } from '@ant-design/icons';

const { Option } = Select;

function UserFormModal({
    visible,
    onCancel,
    form,
    handleSubmit,
    editMode,
    roles,
    projects,
    uploadProps,
    loading,
    theme
}) {
    return (
        <Modal
            title={
                <div className="flex items-center space-x-3 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <UserOutlined className="text-lg" />
                    </div>
                    <span className="font-bold text-lg">{editMode ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</span>
                </div>
            }
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={550}
            centered
            destroyOnHidden
            forceRender
            className={theme === 'dark' ? 'dark-modal' : ''}
            closeIcon={<span className={theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-800'}>✕</span>}
        >
            <Spin spinning={loading}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    className="mt-4"
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="username"
                                label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>ชื่อผู้ใช้</span>}
                                rules={[{ required: true, message: 'กรุณากรอกชื่อผู้ใช้' }]}
                            >
                                <Input placeholder="Username" className="modern-input" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="email"
                                label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>อีเมล</span>}
                                rules={[
                                    { required: true, message: 'กรุณากรอกอีเมล' },
                                    { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' },
                                ]}
                            >
                                <Input placeholder="Email address" className="modern-input" />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="first_name"
                                label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>ชื่อ</span>}
                                rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}
                            >
                                <Input placeholder="First Name" className="modern-input" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="last_name"
                                label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>นามสกุล</span>}
                                rules={[{ required: true, message: 'กรุณากรอกนามสกุล' }]}
                            >
                                <Input placeholder="Last Name" className="modern-input" />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Form.Item
                        name="password"
                        label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>รหัสผ่าน</span>}
                        rules={editMode ? [] : [
                            { required: true, message: 'กรุณากรอกรหัสผ่าน' },
                            { min: 4, message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' },
                        ]}
                    >
                        <Input.Password placeholder={editMode ? "ปล่อยว่างไว้หากไม่ต้องการเปลี่ยน" : "Password"} autoComplete="new-password" className="modern-input" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="role_id"
                                label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>บทบาทระบบ</span>}
                                rules={[{ required: true, message: 'กรุณาเลือกบทบาท' }]}
                            >
                                <Select placeholder="เลือกบทบาท" className="modern-select" popupClassName={theme === 'dark' ? 'dark-dropdown' : ''}>
                                    {roles.map(role => (
                                        <Option key={role.role_id} value={role.role_id}>
                                            {role.role_name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="project_id"
                                label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>โครงการเริ่มต้น (ไม่บังคับ)</span>}
                            >
                                <Select placeholder="เลือกโครงการ" allowClear className="modern-select" popupClassName={theme === 'dark' ? 'dark-dropdown' : ''}>
                                    {projects.map(project => (
                                        <Option key={project.project_id} value={project.project_id}>
                                            {project.project_name} ({project.job_number})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <div className={`p-4 rounded-xl mb-4 ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-50 border border-slate-100'}`}>
                        <Form.Item
                            name="is_pm"
                            valuePropName="checked"
                            className="mb-0"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className={`block font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-slate-700'}`}>สิทธิ์จัดการโครงการ (Project Manager)</span>
                                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>อนุญาตให้จัดการเมนู Planning, Actual, และ Status ในทุกโครงการที่ได้รับมอบหมาย</span>
                                </div>
                                <Switch className="bg-indigo-600" />
                            </div>
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="profile_image"
                        label={<span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>รูปโปรไฟล์</span>}
                    >
                        <Upload {...uploadProps} name="profile_image" className={theme === 'dark' ? 'dark-upload' : ''}>
                            <Button icon={<UploadOutlined />} className={theme === 'dark' ? 'bg-slate-800 border-slate-600 text-gray-300' : ''}>เลือกไฟล์รูปภาพ</Button>
                        </Upload>
                    </Form.Item>
                    
                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700/50 mt-6">
                        <Button
                            onClick={onCancel}
                            className={`rounded-lg px-6 h-10 ${theme === 'dark' ? 'bg-slate-800 text-gray-300 border-slate-600 hover:text-white hover:bg-slate-700 hover:border-slate-500' : ''}`}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 border-0 rounded-lg px-6 h-10 shadow-lg shadow-indigo-500/20"
                        >
                            {editMode ? 'บันทึกการแก้ไข' : 'สร้างผู้ใช้ใหม่'}
                        </Button>
                    </div>
                </Form>
            </Spin>
        </Modal>
    );
}

export default UserFormModal;
