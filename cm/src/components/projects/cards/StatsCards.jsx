import { Card, Statistic, Typography } from 'antd';
import {
  UserOutlined, TeamOutlined, RiseOutlined,
  ToolOutlined, ThunderboltOutlined, CalendarOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const StatsCards = ({ dailyStats }) => {
  return (
    <>
      <Card className="bg-white shadow-md card-hover rounded-lg">
        <Title level={4} className="mb-4 text-gray-900 font-kanit text-sm">
          <UserOutlined className="mr-2" /> สรุปแรงงาน
        </Title>
        <div className="grid grid-cols-2 gap-4">
          <Statistic
            title="แรงงานวันนี้"
            value={dailyStats.workers}
            prefix={<TeamOutlined className="text-blue-500" />}
            suffix="คน"
            valueStyle={{ fontSize: '12px', color: '#000', fontFamily: 'Kanit' }}
          />
          <Statistic
            title="งานที่เสร็จแล้ว"
            value={dailyStats.completedTasks}
            prefix={<RiseOutlined className="text-green-500" />}
            suffix="งาน"
            valueStyle={{ fontSize: '12px', color: '#000', fontFamily: 'Kanit' }}
          />
        </div>
      </Card>
      <Card className="bg-white shadow-md card-hover rounded-lg">
        <Title level={4} className="mb-4 text-gray-900 font-kanit text-sm">
          <ToolOutlined className="mr-2" /> เครื่องจักรและงานค้าง
        </Title>
        <div className="grid grid-cols-2 gap-4">
          <Statistic
            title="เครื่องจักร"
            value={dailyStats.machinery}
            prefix={<ThunderboltOutlined className="text-orange-500" />}
            suffix="หน่วย"
            valueStyle={{ fontSize: '12px', color: '#000', fontFamily: 'Kanit' }}
          />
          <Statistic
            title="งานค้าง"
            value={dailyStats.pendingTasks}
            prefix={<CalendarOutlined className="text-red-500" />}
            suffix="งาน"
            valueStyle={{ fontSize: '12px', color: '#000', fontFamily: 'Kanit' }}
          />
        </div>
      </Card>
    </>
  );
};

export default StatsCards;