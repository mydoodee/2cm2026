// TeamMembersCard.jsx
import { Card, Typography, Avatar, Tooltip } from 'antd';
import { TeamOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const TeamMembersCard = ({ teamMembers }) => {
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'manager': return 'ผู้จัดการ';
      case 'member': return 'สมาชิก';
      case 'viewer': return 'ผู้ดู';
      default: return role;
    }
  };

  const getProfileImageUrl = (member) => {
    const profileImage = member.profile_image || member.avatar || member.profile_picture;

    if (!profileImage) {
      return null;
    }

    // ถ้าเป็น URL เต็ม
    if (profileImage.startsWith('http')) {
      return profileImage;
    }

    // ต่อกับ API URL
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const fullUrl = `${apiUrl}/${profileImage}`.replace(/\/\//g, '/').replace(':/', '://');
    return fullUrl;
  };

  return (
    <Card className="bg-white shadow-md rounded-lg overflow-hidden" style={{ borderRadius: '12px' }}>
      <div className="p-3">
        <div className="flex items-center mb-3">
          <TeamOutlined className="text-lg text-purple-500 mr-2" />
          <Title level={4} className="m-0 text-gray-900 font-kanit text-sm">สมาชิกทีม</Title>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {teamMembers?.length > 0 ? (
            teamMembers.map((member) => {
              const imageUrl = getProfileImageUrl(member);
              const displayName = member.name || member.username || member.email?.split('@')[0] || 'ผู้ใช้';

              return (
                <Tooltip
                  key={member.user_id}
                  title={
                    <div>
                      <div className="font-semibold">{displayName}</div>
                      <div className="text-xs">{member.email}</div>
                      <div className="text-xs">{getRoleDisplayName(member.role)}</div>
                    </div>
                  }
                >
                  <div className="p-2 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 shadow-sm flex items-center h-16 hover:shadow-md transition-shadow cursor-pointer">
                    <Avatar
                      size={32}
                      className="bg-purple-500 mr-2 flex-shrink-0"
                      src={imageUrl}
                      onError={() => true}
                    >
                      <div className="flex items-center justify-center w-full h-full text-white font-bold">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <Text className="font-medium text-gray-900 font-kanit text-xs truncate block">
                        {displayName}
                      </Text>
                      <div className="flex items-center">
                        <Text className="text-[10px] text-gray-600 font-kanit mr-1">
                          {getRoleDisplayName(member.role)}
                        </Text>
                        <Text className="text-[10px] text-gray-500 font-kanit truncate max-w-[80px]">
                          {member.email}
                        </Text>
                      </div>
                    </div>
                  </div>
                </Tooltip>
              );
            })
          ) : (
            <Text className="text-xs italic text-gray-600 font-kanit text-center w-full py-3 col-span-full">
              ไม่มีข้อมูลสมาชิกทีม
            </Text>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TeamMembersCard;