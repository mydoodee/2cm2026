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
    <Card className="bg-white shadow-md rounded-lg overflow-hidden border-none" styles={{ body: { padding: '12px' } }}>
      <div className="flex items-center mb-2 px-1">
        <TeamOutlined className="text-sm text-purple-500 mr-2" />
        <Title level={4} className="m-0 text-gray-800 font-kanit text-xs font-semibold">สมาชิกทีม</Title>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-3 gap-y-1">
        {teamMembers?.length > 0 ? (
          teamMembers.map((member) => {
            const imageUrl = getProfileImageUrl(member);
            const displayName = member.name || member.username || member.email?.split('@')[0] || 'ผู้ใช้';

            return (
              <Tooltip
                key={member.user_id}
                title={
                  <div className="font-kanit p-1">
                    <div className="font-semibold text-sm">{displayName}</div>
                    <div className="text-[10px] opacity-80">{member.email}</div>
                    <div className="text-[10px] mt-1 bg-white/20 px-1.5 py-0.5 rounded inline-block">
                      {getRoleDisplayName(member.role)}
                    </div>
                  </div>
                }
              >
                <div className="group flex items-center gap-2 p-1 rounded-md hover:bg-gray-50 transition-all cursor-pointer min-w-0">
                  <Avatar
                    size={24}
                    className="bg-purple-500 flex-shrink-0 shadow-sm border border-white"
                    src={imageUrl}
                    onError={() => true}
                  >
                    <div className="flex items-center justify-center w-full h-full text-white font-bold text-[10px]">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  </Avatar>
                  <Text className="flex-1 font-medium text-gray-700 font-kanit text-[11px] truncate block group-hover:text-purple-600 transition-colors">
                    {displayName}
                  </Text>
                </div>
              </Tooltip>
            );
          })
        ) : (
          <Text className="text-xs italic text-gray-400 font-kanit text-center w-full py-4 col-span-full">
            ไม่มีข้อมูลสมาชิกทีม
          </Text>
        )}
      </div>
    </Card>
  );
};

export default TeamMembersCard;