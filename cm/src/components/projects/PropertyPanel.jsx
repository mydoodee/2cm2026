// PropertyPanel.jsx - แสดงคุณสมบัติของ IFC Element ที่เลือก

import React, { useState } from 'react';
import { Card, Descriptions, Collapse, Empty, Input, Tag, Typography } from 'antd';
import { 
  InfoCircleOutlined, 
  AppstoreOutlined, 
  BgColorsOutlined,
  SearchOutlined,
  CloseOutlined
} from '@ant-design/icons';

const { Panel } = Collapse;
const { Search } = Input;
const { Text, Title } = Typography;

const PropertyPanel = ({ elementData, onClose, theme }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!elementData) {
    return (
      <Card 
        className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'} h-full`}
        title={
          <div className="flex items-center justify-between">
            <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <InfoCircleOutlined className="mr-2" />
              คุณสมบัติ Element
            </span>
          </div>
        }
      >
        <Empty 
          description={
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
              คลิกที่ชิ้นงานเพื่อดูคุณสมบัติ
            </span>
          }
        />
      </Card>
    );
  }

  // กรองข้อมูลตามคำค้นหา
  const filterData = (items) => {
    if (!searchTerm) return items;
    return items.filter(item => 
      item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredProperties = filterData(elementData.properties || []);
  
  const filteredPropertySets = elementData.propertySets?.map(pset => ({
    ...pset,
    properties: filterData(pset.properties)
  })).filter(pset => pset.properties.length > 0);

  return (
    <Card 
      className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'} h-full overflow-auto`}
      title={
        <div className="flex items-center justify-between">
          <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <InfoCircleOutlined className="mr-2" />
            คุณสมบัติ Element
          </span>
          <CloseOutlined 
            className={`cursor-pointer ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
            onClick={onClose}
          />
        </div>
      }
      extra={
        <Tag color="blue">ID: {elementData.expressId}</Tag>
      }
    >
      {/* ช่องค้นหา */}
      <div className="mb-4">
        <Search
          placeholder="ค้นหาคุณสมบัติ..."
          allowClear
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          prefix={<SearchOutlined />}
          className={theme === 'dark' ? 'dark-search' : ''}
        />
      </div>

      {/* ข้อมูลพื้นฐาน */}
      {filteredProperties.length > 0 && (
        <div className="mb-4">
          <Title 
            level={5} 
            className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center mb-3`}
          >
            <InfoCircleOutlined className="mr-2" />
            ข้อมูลพื้นฐาน
          </Title>
          <Descriptions 
            bordered 
            size="small" 
            column={1}
            className={theme === 'dark' ? 'dark-descriptions' : ''}
          >
            {filteredProperties.map((prop, index) => (
              <Descriptions.Item 
                key={index} 
                label={
                  <Text className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    {prop.key}
                  </Text>
                }
              >
                <Text className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                  {prop.value || '-'}
                </Text>
              </Descriptions.Item>
            ))}
          </Descriptions>
        </div>
      )}

      {/* Property Sets */}
      {filteredPropertySets && filteredPropertySets.length > 0 && (
        <div className="mb-4">
          <Title 
            level={5} 
            className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center mb-3`}
          >
            <AppstoreOutlined className="mr-2" />
            Property Sets
          </Title>
          <Collapse 
            defaultActiveKey={['0']}
            className={theme === 'dark' ? 'dark-collapse' : ''}
          >
            {filteredPropertySets.map((pset, index) => (
              <Panel 
                header={
                  <Text className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    {pset.name}
                  </Text>
                } 
                key={index}
              >
                <Descriptions 
                  bordered 
                  size="small" 
                  column={1}
                  className={theme === 'dark' ? 'dark-descriptions' : ''}
                >
                  {pset.properties.map((prop, propIndex) => (
                    <Descriptions.Item 
                      key={propIndex} 
                      label={
                        <Text className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                          {prop.key}
                        </Text>
                      }
                    >
                      <Text className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                        {prop.value || '-'}
                      </Text>
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </Panel>
            ))}
          </Collapse>
        </div>
      )}

      {/* Materials */}
      {elementData.materials && elementData.materials.length > 0 && (
        <div className="mb-4">
          <Title 
            level={5} 
            className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center mb-3`}
          >
            <BgColorsOutlined className="mr-2" />
            วัสดุ
          </Title>
          <Descriptions 
            bordered 
            size="small" 
            column={1}
            className={theme === 'dark' ? 'dark-descriptions' : ''}
          >
            {elementData.materials.map((material, index) => (
              <Descriptions.Item 
                key={index} 
                label={
                  <Text className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    วัสดุ {index + 1}
                  </Text>
                }
              >
                <Text className={theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}>
                  {material.Name?.value || 'ไม่ระบุชื่อ'}
                </Text>
              </Descriptions.Item>
            ))}
          </Descriptions>
        </div>
      )}

      {/* แสดงข้อความเมื่อไม่มีผลลัพธ์ */}
      {searchTerm && filteredProperties.length === 0 && (!filteredPropertySets || filteredPropertySets.length === 0) && (
        <Empty 
          description={
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
              ไม่พบข้อมูลที่ค้นหา "{searchTerm}"
            </span>
          }
        />
      )}
    </Card>
  );
};

export default PropertyPanel;