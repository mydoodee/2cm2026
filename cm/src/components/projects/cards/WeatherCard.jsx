import { Card, Typography, Spin } from 'antd';
import {
  CloudOutlined, SunOutlined, EnvironmentOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const WeatherCard = ({ weather, weatherLoading, address }) => {
  return (
    <Card className="bg-white shadow-md card-hover rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <Title level={4} className="m-0 text-gray-900 font-kanit text-sm">
          <CloudOutlined className="mr-2" /> สภาพอากาศ
        </Title>
        {address && (
          <Text className="text-xs text-gray-500 font-kanit truncate max-w-[60%] text-right">
            <EnvironmentOutlined className="mr-1" />
            {address}
          </Text>
        )}
      </div>
      {weatherLoading ? (
        <div className="flex items-center justify-center h-20">
          <Spin size="small" />
        </div>
      ) : weather ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {weather.icon && (
                <img 
                  src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} 
                  alt={weather.description}
                  className="w-12 h-12"
                />
              )}
              <div>
                {weather.temp !== null && (
                  <Text className="text-2xl font-bold text-gray-900 font-kanit">{weather.temp}°C</Text>
                )}
                <Text className="block text-xs text-gray-600 font-kanit">{weather.description}</Text>
              </div>
            </div>
            {weather.humidity && (
              <div className="text-right">
                <Text className="block text-xs text-gray-600 font-kanit">ความชื้น</Text>
                <Text className="text-sm font-bold text-blue-600 font-kanit">{weather.humidity}%</Text>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center">
              <SunOutlined className="text-lg text-yellow-500 mb-1" />
              <Text className="block text-xs text-gray-600 font-kanit">พระอาทิตย์ขึ้น</Text>
              <Text className="text-xs font-semibold text-gray-900 font-kanit">{weather.sunrise}</Text>
            </div>
            <div className="text-center">
              <SunOutlined className="text-lg text-orange-500 mb-1" style={{ transform: 'rotate(180deg)' }} />
              <Text className="block text-xs text-gray-600 font-kanit">พระอาทิตย์ตก</Text>
              <Text className="text-xs font-semibold text-gray-900 font-kanit">{weather.sunset}</Text>
            </div>
            <div className="text-center">
              <CloudOutlined className="text-lg text-blue-500 mb-1" />
              <Text className="block text-xs text-gray-600 font-kanit">ฝน</Text>
              <Text className="text-xs font-semibold text-gray-900 font-kanit">{weather.rain}</Text>
            </div>
          </div>
          {weather.windSpeed && (
            <div className="text-center pt-2 border-t">
              <Text className="text-xs text-gray-600 font-kanit">
                ลม: {weather.windSpeed} m/s
                {weather.feelsLike && ` | รู้สึกเหมือน: ${weather.feelsLike}°C`}
              </Text>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <SunOutlined className="text-2xl text-yellow-300 mb-2" />
            <Text className="block mb-1 text-xs text-gray-600 font-kanit">เวลาพระอาทิตย์ขึ้น</Text>
            <Text className="text-sm font-bold text-gray-900 font-kanit">06:30</Text>
          </div>
          <div className="text-center">
            <CloudOutlined className="text-2xl text-blue-300 mb-1" />
            <Text className="block mb-1 text-xs text-gray-600 font-kanit">ฝนตก</Text>
            <Text className="text-sm font-bold text-gray-900 font-kanit">ไม่ทราบ</Text>
          </div>
        </div>
      )}
    </Card>
  );
};

export default WeatherCard;