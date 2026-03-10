import { Card, Progress, Typography, Select, Button } from 'antd';
import { Link } from 'react-router-dom';
import {
  RiseOutlined, CalendarOutlined, BuildOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text } = Typography;

const ProgressSummaryCard = ({
  project,
  progressSummary,
  progressHistory,
  selectedProgressInstallment,
  setSelectedProgressInstallment,
  actualProgress,
  imageErrors,
  setImageLoading,
  setImageErrors,
  user,
  projectId
}) => {
  if (!progressSummary) {
    return (
      <Card className="bg-white shadow-md rounded-lg h-[420px] flex flex-col items-center justify-center">
        <Text className="text-sm italic text-gray-600 font-kanit text-center block py-4">
          ไม่มีข้อมูลความคืบหน้าสำหรับโครงการนี้
        </Text>
        {user && user.isAdmin && (
          <Link to={`/project/${projectId}/progress`}>
            <Button type="primary" size="middle">เพิ่มข้อมูล</Button>
          </Link>
        )}
      </Card>
    );
  }

  const totalDays = Number(progressSummary.total_contract_days) || 0;
  const daysPassed = Number(progressSummary.days_worked) || 0;
  const daysRemaining = Number(progressSummary.remaining_days) || 0;
  const plannedProgress = Number(progressSummary.planned_progress) || 0;
  const actualProgressValue = Number(progressSummary.actual_progress) || 0;
  const progressAhead = Number(progressSummary.progress_ahead) || 0;
  const progressBehind = Number(progressSummary.progress_behind) || 0;
  const installment = Number(progressSummary.installment) || 0;

  return (
    <Card 
      className="bg-white shadow-md card-hover rounded-lg relative overflow-hidden h-[420px]"
      style={{ 
        borderRadius: '12px',
        backgroundImage: project.progress_summary_image && !imageErrors.progress_summary 
          ? `url(${project.progress_summary_image})` 
          : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-white/80 z-0" style={{ backdropFilter: 'blur(2px)' }} />
      <div className="p-3 relative z-10 h-full overflow-y-auto">
        {project.progress_summary_image && !imageErrors.progress_summary && (
          <img
            src={project.progress_summary_image}
            alt="Progress Summary Background"
            className="hidden"
            onLoad={() => setImageLoading((prev) => ({ ...prev, progress_summary: false }))}
            onError={() => {
              setImageErrors((prev) => ({ ...prev, progress_summary: true }));
              setImageLoading((prev) => ({ ...prev, progress_summary: false }));
            }}
          />
        )}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center flex-1">
              <RiseOutlined className="mr-2 text-blue-500 text-base" />
              <Title level={5} className="m-0 text-gray-900 font-kanit text-sm">Progress summary</Title>
            </div>
            <Progress type="circle" percent={Number(actualProgress)} size={32} strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} format={() => `${actualProgress}%`} />
          </div>
          {progressHistory.length > 1 && (
            <Select
              value={selectedProgressInstallment}
              onChange={setSelectedProgressInstallment}
              className="w-full"
              placeholder="เลือกงวด"
              size="small"
            >
              {progressHistory.map((prog) => (
                <Select.Option key={prog.installment} value={prog.installment}>
                  งวดที่ {prog.installment} ({moment(prog.summary_date).format('DD/MM/YYYY')})
                </Select.Option>
              ))}
            </Select>
          )}
        </div>
        <div className="space-y-2 text-xs">
          <div>
            <Text className="block font-semibold text-gray-800 font-kanit mb-1 text-xs">
              <CalendarOutlined className="mr-1 text-blue-500" />
              จำนวนวันทำงาน ณ วันที่ {moment(progressSummary.summary_date).format('DD/MM/YYYY')}
            </Text>
            <div className="space-y-1">
              <div className="flex justify-between">
                <Text className="text-gray-600 font-kanit text-xs">วันเริ่มสัญญา</Text>
                <Text className="text-gray-800 font-kanit text-xs">{moment(progressSummary.contract_start_date).format('DD/MM/YYYY')}</Text>
              </div>
              <div className="flex justify-between">
                <Text className="text-gray-600 font-kanit text-xs">วันสิ้นสุดสัญญา</Text>
                <Text className="text-gray-800 font-kanit text-xs">{moment(progressSummary.contract_end_date).format('DD/MM/YYYY')}</Text>
              </div>
              <div className="flex justify-between">
                <Text className="text-gray-600 font-kanit text-xs">ระยะเวลารวม</Text>
                <Text className="text-gray-800 font-kanit text-xs">{totalDays} วัน (100%)</Text>
              </div>
              <div className="flex justify-between">
                <Text className="text-gray-600 font-kanit text-xs">ดำเนินการมาแล้ว</Text>
                <Text className="text-gray-800 font-kanit text-xs">{daysPassed} วัน</Text>
              </div>
              <div className="flex justify-between">
                <Text className="text-gray-600 font-kanit text-xs">คงเหลือ</Text>
                <Text className={daysRemaining < 0 ? 'text-red-600 font-kanit text-xs' : 'text-gray-800 font-kanit text-xs'}>
                  {daysRemaining < 0 ? `เลยกำหนด ${Math.abs(daysRemaining)} วัน` : `${daysRemaining} วัน`}
                </Text>
              </div>
            </div>
          </div>
          <div>
            <Text className="block font-semibold text-gray-800 font-kanit mb-1 text-xs">
              <BuildOutlined className="mr-1 text-blue-500" />
              ผลงานก่อสร้าง ณ วันที่ {moment(progressSummary.summary_date).format('DD/MM/YYYY')}
              {installment > 0 && ` (งวดที่ ${installment})`}
            </Text>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Text className="text-gray-600 font-kanit text-xs">ผลงานตามแผน</Text>
                <div className="flex items-center">
                  <Progress percent={Number(plannedProgress)} strokeColor="#1890ff" size="small" showInfo={false} className="w-16 mr-1" />
                  <Text className="text-gray-800 font-kanit text-xs">{plannedProgress.toFixed(2)}%</Text>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <Text className="text-gray-600 font-kanit text-xs">ผลงานทำได้จริง</Text>
                <div className="flex items-center">
                  <Progress percent={Number(actualProgressValue)} strokeColor="#52c41a" size="small" showInfo={false} className="w-16 mr-1" />
                  <Text className="text-gray-800 font-kanit text-xs">{actualProgressValue.toFixed(2)}%</Text>
                </div>
              </div>
              <div className="flex justify-between">
                <Text className="text-gray-600 font-kanit text-xs">ผลงานเร็วกว่าแผน</Text>
                <Text className={Number(progressAhead) > 0 ? 'text-green-600 font-kanit text-xs' : 'text-gray-600 font-kanit text-xs'}>
                  {progressAhead > 0 ? `+${progressAhead.toFixed(2)}%` : '0.00%'}
                </Text>
              </div>
              <div className="flex justify-between">
                <Text className="text-gray-600 font-kanit text-xs">งานล่าช้ากว่าแผน</Text>
                <Text className={Number(progressBehind) > 0 ? 'text-red-600 font-kanit text-xs' : 'text-gray-600 font-kanit text-xs'}>
                  {progressBehind > 0 ? `-${progressBehind.toFixed(2)}%` : '0.00%'}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProgressSummaryCard;