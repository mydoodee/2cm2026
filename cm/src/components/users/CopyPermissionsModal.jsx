import React from 'react';
import { Modal, Typography, Select, Alert } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

function CopyPermissionsModal({
    visible,
    onCancel,
    handleCopyPermissions,
    isCopying,
    selectedUserForRoles,
    users,
    sourceUserId,
    setSourceUserId,
    theme
}) {
    return (
        <Modal
            title={
                <div className="flex items-center space-x-2">
                    <CopyOutlined className={theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} />
                    <span className="font-bold">คัดลอกสิทธิ์จากผู้ใช้อื่น</span>
                </div>
            }
            open={visible}
            onCancel={onCancel}
            onOk={handleCopyPermissions}
            confirmLoading={isCopying}
            okText="คัดลอกสิทธิ์"
            cancelText="ยกเลิก"
            centered
            className={theme === 'dark' ? 'dark-modal' : ''}
            okButtonProps={{ className: 'bg-indigo-600 border-0 shadow-md h-10 px-6 rounded-lg' }}
            cancelButtonProps={{ className: theme === 'dark' ? 'bg-slate-800 text-gray-300 border-slate-600 h-10 px-6 rounded-lg' : 'h-10 px-6 rounded-lg' }}
        >
            <div className="py-4 space-y-4">
                <Text className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                    เลือกผู้ใช้ต้นทางที่ต้องการคัดลอกสิทธิ์โครงการมายัง <Text strong className={theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}>{selectedUserForRoles?.username}</Text>
                </Text>
                
                <Select
                    placeholder="เลือกผู้ใช้ต้นทาง"
                    style={{ width: '100%' }}
                    onChange={setSourceUserId}
                    value={sourceUserId}
                    showSearch
                    optionFilterProp="children"
                    className="modern-select"
                    popupClassName={theme === 'dark' ? 'dark-dropdown' : ''}
                >
                    {users
                        .filter(u => u.user_id !== selectedUserForRoles?.user_id)
                        .map(u => (
                            <Option key={u.user_id} value={u.user_id}>
                                {u.username} ({u.first_name} {u.last_name})
                            </Option>
                        ))}
                </Select>

                <Alert
                    message="ข้อมูลควรทราบ"
                    description="ระบบจะเพิ่มโครงการที่ผู้ใช้ต้นทางมีอยู่ หากผู้ใช้ปลายทางมีโครงการเดียวกันอยู่แล้ว บทบาทจะถูกอัปเดตตามต้นทาง"
                    type="info"
                    showIcon
                    className={`rounded-xl ${theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-blue-50 border-blue-100'}`}
                />
            </div>
        </Modal>
    );
}

export default CopyPermissionsModal;
