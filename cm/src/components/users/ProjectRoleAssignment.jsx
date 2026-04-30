import React from 'react';
import { Avatar, Badge, Empty, List, Select, Button, Typography, Space } from 'antd';
import { SettingOutlined, CopyOutlined, UserOutlined, FolderOpenOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

function ProjectRoleAssignment({
    theme,
    selectedUserForRoles,
    projects,
    roles,
    handleRemoveRole,
    handleAssignRole,
    setCopyModalVisible
}) {
    return (
        <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-gray-200' : 'text-slate-800'}`}>
            <div className={`flex items-center justify-between pb-4 mb-4 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'}`}>
                <div className="flex items-center space-x-2">
                    <SettingOutlined className={theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} />
                    <span className="font-semibold text-[15px]">กำหนดสิทธิ์โครงการ</span>
                </div>
                {selectedUserForRoles && (
                    <Button 
                        type="text" 
                        icon={<CopyOutlined />} 
                        size="small"
                        onClick={() => setCopyModalVisible(true)}
                        className={`text-xs ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'}`}
                    >
                        คัดลอกสิทธิ์
                    </Button>
                )}
            </div>

            {selectedUserForRoles ? (
                <div className="flex-1 flex flex-col min-h-0">
                    <div className={`flex items-center justify-between p-3 mb-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800/80 border border-slate-700' : 'bg-slate-50 border border-slate-100'}`}>
                        <div className="flex items-center space-x-3">
                            <Avatar
                                size={40}
                                icon={<UserOutlined />}
                                className="bg-indigo-500 shadow-sm"
                            />
                            <div>
                                <Text strong className={`block text-sm leading-tight ${theme === 'dark' ? 'text-gray-200' : ''}`}>{selectedUserForRoles.username}</Text>
                                <Text type="secondary" className="text-xs">{selectedUserForRoles.email}</Text>
                            </div>
                        </div>
                        <div className="text-center px-3 py-1 bg-indigo-500/10 rounded-lg">
                            <Text className={`block text-xl font-bold leading-none ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>{selectedUserForRoles.project_roles?.length || 0}</Text>
                            <Text className={`text-[10px] ${theme === 'dark' ? 'text-indigo-400/80' : 'text-indigo-600/80'}`}>โครงการ</Text>
                        </div>
                    </div>

                    {projects.length === 0 || roles.length === 0 ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={<span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>ไม่พบข้อมูลโครงการ</span>}
                            className="py-8"
                        />
                    ) : (
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <Space direction="vertical" size="small" className="w-full">
                                {projects.map(project => {
                                    const assignedRole = selectedUserForRoles.project_roles?.find(pr => pr.project_id === project.project_id);
                                    const isAssigned = !!assignedRole;
                                    
                                    return (
                                        <div 
                                            key={project.project_id} 
                                            className={`group p-3 rounded-xl transition-all duration-300 border ${
                                                isAssigned 
                                                    ? (theme === 'dark' ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-100')
                                                    : (theme === 'dark' ? 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300')
                                            }`}
                                        >
                                            <div className="flex justify-between items-center w-full gap-3">
                                                <div className="flex items-start flex-1 min-w-0">
                                                    <div className={`mt-0.5 mr-3 p-1.5 rounded-lg ${isAssigned ? 'bg-indigo-500 text-white' : (theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400')}`}>
                                                        <FolderOpenOutlined className="text-sm" />
                                                    </div>
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <Text strong className={`block truncate text-[13px] ${theme === 'dark' ? 'text-gray-200' : 'text-slate-700'}`} title={project.project_name}>
                                                            {project.project_name || 'ไม่ระบุ'}
                                                        </Text>
                                                        <Text type="secondary" className={`text-[11px] font-medium truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            {project.job_number || 'ไม่ระบุ'}
                                                        </Text>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <Select
                                                        size="small"
                                                        style={{ width: 120 }}
                                                        placeholder="เลือกบทบาท"
                                                        variant="borderless"
                                                        className={`custom-select-small ${isAssigned ? 'font-semibold' : ''}`}
                                                        classNames={{ popup: { root: theme === 'dark' ? 'dark-dropdown' : '' } }}
                                                        value={assignedRole?.role_id || undefined}
                                                        onChange={(roleId) => {
                                                            if (roleId === undefined || roleId === null) {
                                                                handleRemoveRole(project.project_id);
                                                            } else {
                                                                handleAssignRole(project.project_id, roleId);
                                                            }
                                                        }}
                                                        allowClear
                                                    >
                                                        {roles.map(role => (
                                                            <Option key={role.role_id} value={role.role_id}>
                                                                {role.role_name}
                                                            </Option>
                                                        ))}
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </Space>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>เลือกผู้ใช้ด้านซ้ายเพื่อกำหนดสิทธิ์</span>}
                    />
                </div>
            )}
        </div>
    );
}

export default ProjectRoleAssignment;
