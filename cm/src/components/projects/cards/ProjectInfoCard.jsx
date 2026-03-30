import { Card, Progress, Typography, Tag, Button, Skeleton, Space, Select, message } from 'antd';
import { Link } from 'react-router-dom';
import {
  CalendarOutlined, UserOutlined, ToolOutlined, EnvironmentOutlined, TrophyOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text } = Typography;

const ProjectInfoCard = ({
  project,
  actualProgress,
  imageLoading,
  imageErrors,
  setImageLoading,
  setImageErrors,
  handleRetry,
  getStatusColor,
  canViewProgress,
  user,
  isTenderMode,
  onMoveProject,
  onTenderStatusChange,
}) => {
  return (
    <Card className="image-card bg-white shadow-md rounded-lg overflow-hidden h-[360px]">
      <div className="flex flex-col h-full">
        {/* ---------- รูปภาพ ---------- */}
        <div className="relative h-[160px] w-full overflow-hidden">
          {project.image && !imageErrors.general ? (
            <>
              <Skeleton.Image
                active={imageLoading.general}
                className={
                  imageLoading.general
                    ? 'block css-dev-only-do-not-override-1odpy8d'
                    : 'hidden css-dev-only-do-not-override-1odpy8d'
                }
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1,
                }}
              />
              <img
                src={project.image}
                alt={project.project_name}
                className={`w-full h-full object-cover ${imageLoading.general ? 'hidden' : 'block'
                  } z-10 relative`}
                onLoad={() =>
                  setImageLoading((prev) => ({ ...prev, general: false }))
                }
                onError={() => {
                  setImageErrors((prev) => ({ ...prev, general: true }));
                  setImageLoading((prev) => ({ ...prev, general: false }));
                }}
              />
              {imageErrors.general && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-20">
                  <Space direction="vertical" align="center">
                    <Text className="text-xs text-gray-600 font-kanit">
                      ไม่สามารถโหลดรูปภาพได้
                    </Text>
                    <Button
                      type="primary"
                      size="small"
                      onClick={handleRetry('general')}
                    >
                      ลองใหม่
                    </Button>
                  </Space>
                </div>
              )}
            </>
          ) : (
            <div className="h-full w-full bg-gray-200 flex items-center justify-center z-20">
              <Text className="text-xs text-gray-600 font-kanit">
                ไม่มีรูปภาพโครงการ
              </Text>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
          <div className="absolute bottom-2 left-2 z-20">
            <Title level={5} className="m-0 text-white font-kanit text-sm">
              {project.project_name}
            </Title>
            <Text className="text-xs text-blue-200 font-kanit">
              {project.job_number || 'ไม่ระบุ'}
            </Text>
          </div>
          <div className="absolute top-2 right-2 z-20">
            <Progress
              type="circle"
              percent={Number(actualProgress)}
              size={36}
              strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
              format={() => `${actualProgress}%`}
            />
          </div>
          <div className="absolute bottom-2 right-2 z-20">
            <Tag color={getStatusColor(project.status)} className="font-kanit text-xs">
              {project.status === 'In Progress'
                ? 'กำลังดำเนินการ'
                : project.status === 'Completed'
                  ? 'เสร็จสมบูรณ์'
                  : 'วางแผน'}
            </Tag>
          </div>
        </div>

        {/* ---------- ข้อมูลโครงการ ---------- */}
        <div className="p-3 flex flex-col flex-1">
          <div className="space-y-1.5 text-xs flex-1">
            <div className="flex items-center">
              <CalendarOutlined className="mr-2 text-blue-600 w-4" />
              <Text className="text-gray-600 font-kanit text-xs">ระยะเวลา</Text>
              <Text className="text-gray-800 font-kanit ml-auto text-xs">
                {moment(project.start_date).format('DD/MM/YY')} -{' '}
                {moment(project.end_date).format('DD/MM/YY')}
              </Text>
            </div>

            {project.owner && (
              <div className="flex items-center">
                <UserOutlined className="mr-2 text-purple-600 w-4" />
                <Text className="text-gray-600 font-kanit text-xs">เจ้าของ</Text>
                <Text className="text-gray-800 font-kanit ml-auto truncate max-w-[150px] text-xs">
                  {project.owner}
                </Text>
              </div>
            )}

            {project.contractor && (
              <div className="flex items-center">
                <ToolOutlined className="mr-2 text-orange-600 w-4" />
                <Text className="text-gray-600 font-kanit text-xs">ผู้รับเหมา</Text>
                <Text className="text-gray-800 font-kanit ml-auto truncate max-w-[150px] text-xs">
                  {project.contractor}
                </Text>
              </div>
            )}

            {project.address && (
              <div className="flex items-start">
                <EnvironmentOutlined className="mr-2 text-green-600 w-4" />
                <Text className="text-gray-600 font-kanit text-xs">ที่อยู่</Text>
                <Text className="text-gray-800 font-kanit ml-auto text-right max-w-[150px] line-clamp-2 text-xs">
                  {project.address}
                </Text>
              </div>
            )}
          </div>

          {(user?.isAdmin || user?.is_pm) && (
            <div className="pt-2 mt-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {/* 1. Planning + Actual – แบ่ง 2 คอลัมน์ใน sm+ */}
                <div className="grid grid-cols-2 gap-1.5 col-span-1">
                  <Link to={`/project/${project.project_id}/planning`} className="col-span-1">
                    <Button
                      type="default"
                      size="small"
                      className="w-full h-7 font-kanit text-xs leading-tight"
                    >
                      Planning
                    </Button>
                  </Link>
                  <Link to={`/project/${project.project_id}/Actual`} className="col-span-1">
                    <Button
                      type="default"
                      size="small"
                      className="w-full h-7 font-kanit text-xs leading-tight"
                    >
                      Actual
                    </Button>
                  </Link>
                </div>

                {/* 2. & 3. ความคืบหน้า + สถานะงาน */}
                <Link to={`/project/${project.project_id}/progress`} className="col-span-1">
                  <Button
                    type="default"
                    size="small"
                    className="w-full h-7 font-kanit text-xs leading-tight"
                  >
                    ความคืบหน้า
                  </Button>
                </Link>

                <Link to={`/project/${project.project_id}/job-status`} title="Job Status Detail" className="col-span-1">
                  <Button
                    type="default"
                    size="small"
                    className="w-full h-7 font-kanit text-xs border-teal-200 text-teal-600 hover:border-teal-400 hover:text-teal-700 bg-teal-50"
                  >
                    สถานะงาน
                  </Button>
                </Link>

                {/* ✅ ปุ่ม Win Tender & Status - เพิ่มเฉพาะตอนเป็น Tender Mode */}
                {isTenderMode && (
                   <div className="col-span-full mt-1.5 flex flex-col gap-2">
                     <Select
                        size="small"
                        value={project.tender_status || 'tender_in_progress'}
                        onChange={(val) => onTenderStatusChange(val)}
                        className="w-full font-kanit text-xs"
                        options={[
                          { value: 'tender_in_progress', label: '🔵 กำลังดำเนินงาน' },
                          { value: 'tender_win', label: '🟢 ได้งาน (Win)' },
                          { value: 'tender_loss', label: '🔴 ไม่ได้งาน (Loss)' },
                          { value: 'tender_cancelled', label: '🟠 ยกเลิกประมูล' },
                          { value: 'tender_announcement_cancelled', label: '⚫ ยกเลิกประกาศ' },
                        ]}
                     />
                     <Button
                        type="primary"
                        size="small"
                        icon={<TrophyOutlined />}
                        onClick={onMoveProject}
                        className="w-full h-8 font-kanit text-xs bg-amber-500 border-amber-500 hover:bg-amber-600 hover:border-amber-600 shadow-sm shadow-amber-200"
                      >
                        ✅ Win Tender / ย้ายเข้างานจริง
                      </Button>
                   </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ProjectInfoCard;