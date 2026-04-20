import React from 'react';
import { Table, Spin, Empty, Badge, Typography, Space, Button, Switch } from 'antd';
import { UserOutlined, EditOutlined, DeleteOutlined, UndoOutlined } from '@ant-design/icons';

const { Text } = Typography;

function UserListTable({
  theme,
  loading,
  filteredUsers,
  activeTab,
  selectedUserForRoles,
  handleSelectUser,
  handleEdit,
  handleDelete,
  handleRestore,
  handlePermanentDelete,
  handleTogglePM,
  adminUsernames = ['admin', 'adminspk']
}) {
  const userColumns = [
    {
        title: 'ชื่อผู้ใช้',
        dataIndex: 'username',
        key: 'username',
        width: '25%',
        render: (text, record) => (
            <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl flex items-center justify-center transition-colors ${record.active === 0 ? 'bg-gray-100 text-gray-400' : (theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600')}`}>
                  <UserOutlined />
                </div>
                <div>
                  <Text className={`text-sm font-medium ${record.active === 0 ? "text-gray-400 line-through" : (theme === 'dark' ? 'text-gray-200' : 'text-gray-800')}`}>{text || 'ไม่ระบุ'}</Text>
                  {record.active === 0 && <div className="mt-0.5"><Badge status="default" text={<Text type="secondary" style={{ fontSize: '10px' }}>ลบแล้ว</Text>} /></div>}
                </div>
            </div>
        ),
    },
    {
        title: 'อีเมล',
        dataIndex: 'email',
        key: 'email',
        width: '25%',
        render: (text) => <Text className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{text || 'ไม่ระบุ'}</Text>,
    },
    {
        title: 'ชื่อ-นามสกุล',
        key: 'name',
        width: '25%',
        render: (_, record) => (
            <Text className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{`${record.first_name || ''} ${record.last_name || ''}`.trim() || 'ไม่ระบุ'}</Text>
        ),
    },
    {
        title: 'จัดการโครงการ',
        key: 'is_pm',
        width: '10%',
        align: 'center',
        render: (_, record) => {
          const disabled = adminUsernames.includes(record.username);
          return (
            <div className="flex flex-col items-center">
                <Switch 
                    size="small"
                    checked={!!record.is_pm} 
                    onChange={(checked) => handleTogglePM(record.user_id, checked)}
                    disabled={disabled}
                    className={!!record.is_pm && !disabled ? 'bg-indigo-600' : ''}
                />
            </div>
        );
      },
    },
    {
        title: 'การดำเนินการ',
        key: 'action',
        width: '15%',
        align: 'right',
        render: (_, record) => (
            <Space size="small" onClick={(e) => e.stopPropagation()}>
                {record.active !== 0 ? (
                    <>
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleEdit(record); }}
                            className={`${theme === 'dark' ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`}
                        />
                        <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleDelete(record.user_id); }}
                            className={`${theme === 'dark' ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                        />
                    </>
                ) : (
                    <>
                        <Button
                            type="text"
                            icon={<UndoOutlined />}
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleRestore(record.user_id); }}
                            className={`${theme === 'dark' ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}`}
                            title="กู้คืน"
                        />
                        <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handlePermanentDelete(record.user_id); }}
                            className={`${theme === 'dark' ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                            title="ลบทิ้งถาวร"
                        />
                    </>
                )}
            </Space>
        ),
    },
  ];

  const dataSource = filteredUsers.filter(u => activeTab === '1' ? u.active !== 0 : u.active === 0);

  return (
    <Spin spinning={loading}>
        {dataSource.length === 0 && !loading ? (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{activeTab === '1' ? "ไม่พบผู้ใช้ที่ใช้งานอยู่" : "ไม่มีผู้ใช้ในถังขยะ"}</span>}
                className="py-12"
            />
        ) : (
            <Table
                columns={userColumns}
                dataSource={dataSource}
                rowKey="user_id"
                rowClassName={(record) => `cursor-pointer transition-colors ${
                  record.user_id === selectedUserForRoles?.user_id 
                    ? (theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-50/50') 
                    : (theme === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50/50')
                }`}
                onRow={(record) => ({
                    onClick: () => handleSelectUser(record),
                })}
                pagination={{
                    pageSize: 8,
                    showSizeChanger: false,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} จาก ${total} ผู้ใช้`,
                    className: "px-4 pt-4 border-t border-slate-100 dark:border-slate-700/50"
                }}
                className={`custom-table ${theme === 'dark' ? 'ant-table-dark' : ''}`}
                scroll={{ y: 'calc(100vh - 450px)' }}
                rowSelection={false}
            />
        )}
    </Spin>
  );
}

export default UserListTable;
