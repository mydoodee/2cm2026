import React, { useState, useEffect } from 'react';
import { Card, Progress, Typography, Spin } from 'antd';
import {
  InfoCircleOutlined, RightOutlined, LinkOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

const JobStatusCard = ({
  project,
  imageLoading,
  imageErrors,
  setImageLoading,
  setImageErrors,
}) => {
  const [details, setDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const progressValue = Number(project.job_status_progress) || 0;

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoadingDetails(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/project/${project.project_id}/job-status-details`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
          setDetails(result.data || []);
        }
      } catch (error) {
        console.error('Error fetching job status details:', error);
      } finally {
        setLoadingDetails(false);
      }
    };

    if (project.project_id) {
      fetchDetails();
    }
  }, [project.project_id]);

  return (
    <Card 
      className="bg-white shadow-md rounded-lg relative overflow-hidden h-fit min-h-[360px]"
      style={{ 
        borderRadius: '12px',
        backgroundImage: project.job_status_image && !imageErrors.job_status 
          ? `url(${project.job_status_image})` 
          : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
      bodyStyle={{ padding: '16px' }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-white/90 z-0" style={{ backdropFilter: 'blur(3px)' }} />
      
      <div className="relative z-10 flex flex-col h-full">
        {project.job_status_image && !imageErrors.job_status && (
          <img
            src={project.job_status_image}
            alt="Job Status Background"
            className="hidden"
            onLoad={() => setImageLoading((prev) => ({ ...prev, job_status: false }))}
            onError={() => {
              setImageErrors((prev) => ({ ...prev, job_status: true }));
              setImageLoading((prev) => ({ ...prev, job_status: false }));
            }}
          />
        )}

        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <div className="flex items-center">
            <InfoCircleOutlined className="mr-2 text-teal-600 text-lg" />
            <Title level={5} className="m-0 text-gray-800 font-kanit">Job Status</Title>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 font-kanit">Progress:</span>
            <span className="font-bold text-teal-600 font-kanit">{progressValue}%</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar pr-1">
          {loadingDetails ? (
            <div className="flex items-center justify-center p-12">
              <Spin size="default" />
            </div>
          ) : details.length > 0 ? (
            <div className="space-y-0.5">
              {/* Ultra-compact Header */}
              <div className="flex items-center px-4 py-1 text-[8px] font-black text-teal-600/50 uppercase tracking-[0.2em]">
                <div className="w-5/12">CATEGORIES</div>
                <div className="w-7/12 grid grid-cols-4 gap-4 text-center">
                  <span>S1</span><span>S2</span><span>S3</span><span>S4</span>
                </div>
              </div>

            {details.map((row, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center px-4 py-3 hover:bg-teal-50/30 rounded-xl transition-all duration-300 group"
                >
                  {/* Category Name */}
                  <div className="w-5/12 pr-4 truncate">
                    <Text className="text-gray-800 text-[13px] font-kanit font-bold group-hover:text-teal-700 transition-colors uppercase">
                      {row.category_name || '-'}
                    </Text>
                  </div>
                  
                  {/* Systems Progress - Separate Colors for each system */}
                  <div className="w-7/12 grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(num => {
                      const val = Number(row[`system_${num}`]) || 0;
                      
                      // Assign a unique color for each system to "separate colors"
                      const systemColors = {
                        1: '#2196f3', // Blue
                        2: '#4caf50', // Green
                        3: '#ff9800', // Orange
                        4: '#9c27b0'  // Purple
                      };
                      
                      const color = val > 0 ? systemColors[num] : '#f0f0f0';
                      
                      const link = row[`system_${num}_link`];
                      
                      return (
                        <div key={num} className="flex items-center space-x-1.5 min-w-0">
                          <div className="flex-1 flex items-center space-x-1.5 min-w-0">
                            <Progress 
                              percent={val} 
                              strokeWidth={8}
                              showInfo={false}
                              strokeColor={color}
                              trailColor="#f5f5f5"
                              className="flex-1 m-0"
                              strokeLinecap="round"
                            />
                            {link && (
                              <a 
                                href={link.startsWith('http') ? link : `https://${link}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-shrink-0 hover:scale-110 transition-transform"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <LinkOutlined 
                                  style={{ color: systemColors[num], fontSize: '10px' }} 
                                />
                              </a>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold tabular-nums min-w-[42px] transition-colors`} style={{ color: val > 0 ? systemColors[num] : '#cbd5e1' }}>
                            {val.toFixed(2)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
               <div className="relative mb-6">
                 <Progress
                    type="circle"
                    percent={progressValue}
                    width={140}
                    strokeColor={{ '0%': '#13c2c2', '100%': '#52c41a' }}
                    strokeWidth={10}
                  />
                  <div className="absolute inset-0 flex items-center justify-center -z-10 bg-teal-50/30 rounded-full blur-xl scale-125" />
               </div>
               <div className="text-center">
                 <Text className="text-gray-400 text-sm italic font-kanit">
                   กรุณาเพิ่มรายละเอียดสถานะงานที่ปุ่ม
                 </Text>
                 <br />
                 <Text strong className="text-teal-600 font-kanit">"สถานะงาน"</Text>
                 <Text className="text-gray-400 text-sm italic font-kanit"> ด้านบนครับ</Text>
               </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .ant-progress-inner {
            background-color: #f5f5f5 !important;
        }
      `}</style>
    </Card>
  );
};

export default JobStatusCard;
