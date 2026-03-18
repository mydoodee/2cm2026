import { Card, Progress, Typography, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import {
  ExperimentOutlined, SettingOutlined, BuildOutlined,
  TeamOutlined, ToolOutlined, FileTextOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const PhaseCard = ({
  phase,
  project,
  imageLoading,
  imageErrors,
  setImageLoading,
  setImageErrors
}) => {

  // ใช้ image_field เป็น key แทน name
  const imageKey = phase.image_field;

  const getPhaseDisplayName = (phaseName) => {
    const map = {
      'Design': 'Design',
      'Bidding': 'Bidding',
      'PreConstruction': 'PreConstruction',
      'Construction': 'Construction',
      'Precast': 'Precast',
      'Construction Management': 'Construction Management',
    };
    return map[phaseName] || phaseName;
  };

  const getPhaseIcon = (phaseName) => {
    const icons = {
      'Design': (
        <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-blue-50">
          <ExperimentOutlined className="text-2xl text-blue-600" />
          <div className="absolute inset-0 border-2 border-blue-200 rounded-full opacity-50" />
        </div>
      ),
      'Bidding': (
        <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-pink-50">
          <FileTextOutlined className="text-2xl text-pink-600" />
          <div className="absolute inset-0 border-2 border-pink-200 rounded-full opacity-50" />
        </div>
      ),
      'PreConstruction': (
        <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-green-50">
          <SettingOutlined className="text-2xl text-green-600" />
          <div className="absolute inset-0 border-2 border-green-200 rounded-full opacity-50" />
        </div>
      ),
      'Construction': (
        <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-orange-50">
          <BuildOutlined className="text-2xl text-orange-600" />
          <div className="absolute inset-0 border-2 border-orange-200 rounded-full opacity-50" />
        </div>
      ),
      'Precast': (
        <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-purple-50">
          <ToolOutlined className="text-2xl text-purple-600" />
          <div className="absolute inset-0 border-2 border-purple-200 rounded-full opacity-50" />
        </div>
      ),
      'Construction Management': (
        <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
          <TeamOutlined className="text-2xl text-red-600" />
          <div className="absolute inset-0 border-2 border-red-200 rounded-full opacity-50" />
        </div>
      ),
    };
    return icons[phaseName] || (
      <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gray-50">
        <SettingOutlined className="text-2xl text-gray-600" />
        <div className="absolute inset-0 border-2 border-gray-200 rounded-full opacity-50" />
      </div>
    );
  };

  const handleImageLoad = () => {
    setImageLoading(prev => ({ ...prev, [imageKey]: false }));
  };

  const handleImageError = () => {
    setImageErrors(prev => ({ ...prev, [imageKey]: true }));
    setImageLoading(prev => ({ ...prev, [imageKey]: false }));
  };

  return (
    <Link to={phase.path} className="block">
      <Card
        hoverable
        className="bg-white shadow-md rounded-lg transition-all duration-200 hover:shadow-xl"
        styles={{ body: { padding: '16px' } }}
      >
        <div className="text-center">
          {/* รูปภาพ */}
          <div className="relative h-24 w-full mb-3 overflow-hidden rounded-lg bg-gray-100">
            {project[imageKey] && !imageErrors[imageKey] ? (
              <>
                {imageLoading[imageKey] && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Skeleton.Image active className="w-full h-full" />
                  </div>
                )}
                <img
                  src={project[imageKey]}
                  alt={getPhaseDisplayName(phase.name)}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading[imageKey] ? 'opacity-0' : 'opacity-100'
                    }`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              </>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-gray-500">
                <Text className="text-xs font-kanit">ไม่มีรูปภาพ</Text>
                {imageErrors[imageKey] && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setImageErrors(prev => ({ ...prev, [imageKey]: false }));
                      setImageLoading(prev => ({ ...prev, [imageKey]: true }));
                    }}
                    className="text-xs text-blue-500 underline mt-1"
                  >
                    ลองใหม่
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ไอคอน */}
          <div className="flex justify-center mb-3">
            {getPhaseIcon(phase.name)}
          </div>

          {/* ชื่อเฟส */}
          <Title level={5} className="mb-2 text-gray-900 font-kanit text-sm">
            {getPhaseDisplayName(phase.name)}
          </Title>

          {/* Progress */}
          <Progress
            percent={phase.progress}
            strokeColor={phase.color}
            size="small"
            className="mb-1"
          />
          <Text className="text-xs text-gray-600 font-kanit">
            {phase.progress}% เสร็จสมบูรณ์
          </Text>
        </div>
      </Card>
    </Link>
  );
};

export default PhaseCard;