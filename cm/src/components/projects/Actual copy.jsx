import React, { useState, useEffect } from 'react';
import {
  Button, Card, Typography, Space, Spin, Tree, Table,
  Breadcrumb, Tag, Empty, Input, Progress, Tooltip, Modal, InputNumber, message
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  PlusSquareOutlined, MinusSquareOutlined,
  CheckCircleOutlined, ClockCircleOutlined, HistoryOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../Navbar';
import axios from 'axios';
import dayjs from 'dayjs';
import './Actual.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Actual = ({ user, setUser, theme }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState([]);
  const [treeGridData, setTreeGridData] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [selectedRootId, setSelectedRootId] = useState(null);
  const [searchText, setSearchText] = useState('');

  // Modal state
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [additionalProgress, setAdditionalProgress] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [updating, setUpdating] = useState(false);
  const [progressHistory, setProgressHistory] = useState([]);
  const [allHistories, setAllHistories] = useState({}); // เก็บ history ทั้งหมดแยกตาม key

  useEffect(() => {
    fetchProject();
    fetchActualData();
  }, [id]);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/project/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProject(response.data.project);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchActualData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/actual/tree-with-actual/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch data');
      }

      console.log('📊 Raw data from API:', response.data.data);

      const gridData = formatTreeGridData(response.data.data || []);
      console.log('📋 Formatted grid data:', gridData);
      setTreeGridData(gridData);

      const formatted = formatTreeData(response.data.data || [], gridData);
      setTreeData(formatted);

      if (formatted.length > 0 && !selectedRootId) {
        const firstRootId = response.data.data[0].root_id;
        setSelectedRootId(firstRootId);
      }

      // ดึง history ทั้งหมดมาเก็บไว้
      await fetchAllHistories();

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch actual data:', error);
      setTreeData([]);
      setTreeGridData([]);
      setLoading(false);
    }
  };

  const fetchAllHistories = async () => {
    try {
      const token = localStorage.getItem('token');
      // ดึงทั้งหมดโดยไม่ filter
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/actual/history/${id}?limit=1000`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const histories = response.data.data || [];
        console.log('📜 Fetched all histories:', histories.length, 'records');

        // จัดกลุ่ม history ตาม actual_id แล้วแมปกับ record key
        const grouped = {};
        histories.forEach(h => {
          let key = '';

          // สร้าง key ให้ตรงกับ record.key ในตาราง
          if (h.subsubtype_id) {
            key = `subsubtype-${h.subsubtype_id}`;
          } else if (h.subtype_id) {
            key = `subtype-${h.subtype_id}`;
          } else if (h.type_id) {
            key = `type-${h.type_id}`;
          } else if (h.category_id) {
            key = `category-${h.category_id}`;
          } else if (h.root_id) {
            key = `root-${h.root_id}`;
          }

          if (key) {
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(h);
          }
        });

        console.log('📦 Grouped histories by key:', Object.keys(grouped).length, 'groups');
        console.log('📦 Sample grouped data:', Object.keys(grouped).slice(0, 5).map(k => ({
          key: k,
          count: grouped[k].length
        })));

        setAllHistories(grouped);
      }
    } catch (error) {
      console.error('❌ Failed to fetch all histories:', error.response?.data || error.message);
      setAllHistories({});
    }
  };

  const fetchProgressHistory = async (record) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ limit: 100 });

      if (record.type === 'type' && record.data.type_id) {
        params.append('type_id', record.data.type_id);
      } else if (record.type === 'subtype' && record.data.subtype_id) {
        params.append('subtype_id', record.data.subtype_id);
      } else if (record.type === 'subsubtype' && record.data.subsubtype_id) {
        params.append('subsubtype_id', record.data.subsubtype_id);
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/actual/history/${id}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setProgressHistory(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch progress history:', error);
      setProgressHistory([]);
    }
  };

  const getItemStatus = (item) => {
    // ถ้ามี actual_progress ที่ครบ 100% ถือว่าเสร็จสิ้น
    if (item.actual_progress >= 100) {
      return { status: 'completed', color: 'green' };
    }

    if (!item || !item.end_date) {
      return { status: 'pending', color: 'orange' };
    }

    const endDate = dayjs(item.end_date);
    const today = dayjs();

    if (item.actual_progress > 0) {
      return { status: 'in-progress', color: 'blue' };
    }

    if (endDate.isBefore(today) && item.actual_progress < 100) {
      return { status: 'overdue', color: 'red' };
    }

    return { status: 'pending', color: 'orange' };
  };

  const calculateProgress = (item, children, itemType) => {
    // สำหรับ Type - ตรวจสอบว่ามี actual_progress ที่บันทึกไว้หรือไม่
    if (itemType === 'type') {
      // ถ้ามี actual_progress จาก API ให้ใช้ค่านั้น (รวมถึงค่า 0)
      if (item.actual_progress != null) {
        return Number(item.actual_progress);
      }
      // ถ้าไม่มี ให้คำนวณจาก children (Subtypes)
      if (children && children.length > 0) {
        let totalProgress = 0;
        let validChildren = 0;
        children.forEach(child => {
          const childProgress = child.individualProgress;
          if (childProgress != null) {
            totalProgress += Number(childProgress);
            validChildren++;
          }
        });
        return validChildren > 0 ? Math.round(totalProgress / validChildren) : 0;
      }
      return 0;
    }

    // สำหรับ Subtype และ Subsubtype (leaf nodes) - ใช้ค่า actual_progress ที่บันทึกไว้
    if (itemType === 'subtype' || itemType === 'subsubtype') {
      if (item.actual_progress != null) {
        return Number(item.actual_progress);
      }
      // ถ้าไม่มี actual_progress ใช้ progress จาก plan
      if (item.progress != null) {
        return Number(item.progress);
      }
      return 0;
    }

    // สำหรับ Root และ Category - คำนวณจาก children เท่านั้น (AUTO)
    if (itemType === 'root' || itemType === 'category') {
      // ถ้ามี actual_progress จาก API (คำนวณจาก backend แล้ว) ให้ใช้ค่านั้น
      if (item.actual_progress != null) {
        return Number(item.actual_progress);
      }
      // ถ้าไม่มี ให้คำนวณจาก children
      if (children && children.length > 0) {
        let totalProgress = 0;
        let validChildren = 0;
        children.forEach(child => {
          const childProgress = child.individualProgress;
          if (childProgress != null) {
            totalProgress += Number(childProgress);
            validChildren++;
          }
        });
        return validChildren > 0 ? Math.round(totalProgress / validChildren) : 0;
      }
      return 0;
    }

    // Default: คำนวณจาก children
    if (!children || children.length === 0) {
      return 0;
    }

    let totalProgress = 0;
    let validChildren = 0;
    children.forEach(child => {
      const childProgress = child.individualProgress;
      if (childProgress != null) {
        totalProgress += Number(childProgress);
        validChildren++;
      }
    });
    return validChildren > 0 ? Math.round(totalProgress / validChildren) : 0;
  };

  const formatTreeData = (roots, gridData) => {
    if (!Array.isArray(roots)) return [];

    return roots.map(root => {
      // หาข้อมูล Root จาก gridData
      const rootGridData = gridData.find(item => item.type === 'root' && item.data.root_id === root.root_id);
      const rootProgress = rootGridData?.individualProgress || 0;
      const rootStatus = getItemStatus({ ...root, actual_progress: rootProgress });

      let totalItems = 0, completedItems = 0;

      // นับจาก gridData แทน
      gridData.forEach(item => {
        if (item.type === 'root' && item.data.root_id === root.root_id) return;

        // เช็คว่าเป็น child ของ root นี้หรือไม่
        if (item.type === 'category') {
          const parentRoot = gridData.find(r => r.key === item.parent);
          if (parentRoot?.data.root_id === root.root_id) {
            totalItems++;
            if (item.individualProgress >= 100) completedItems++;
          }
        } else if (item.type === 'type') {
          const parentCat = gridData.find(r => r.key === item.parent);
          const parentRoot = parentCat ? gridData.find(r => r.key === parentCat.parent) : null;
          if (parentRoot?.data.root_id === root.root_id) {
            totalItems++;
            if (item.individualProgress >= 100) completedItems++;
          }
        } else if (item.type === 'subtype') {
          const parentType = gridData.find(r => r.key === item.parent);
          const parentCat = parentType ? gridData.find(r => r.key === parentType.parent) : null;
          const parentRoot = parentCat ? gridData.find(r => r.key === parentCat.parent) : null;
          if (parentRoot?.data.root_id === root.root_id) {
            totalItems++;
            if (item.individualProgress >= 100) completedItems++;
          }
        } else if (item.type === 'subsubtype') {
          const parentSub = gridData.find(r => r.key === item.parent);
          const parentType = parentSub ? gridData.find(r => r.key === parentSub.parent) : null;
          const parentCat = parentType ? gridData.find(r => r.key === parentType.parent) : null;
          const parentRoot = parentCat ? gridData.find(r => r.key === parentCat.parent) : null;
          if (parentRoot?.data.root_id === root.root_id) {
            totalItems++;
            if (item.individualProgress >= 100) completedItems++;
          }
        }
      });

      const isSelected = selectedRootId === root.root_id;

      return {
        title: (
          <div className={`Actual-tree-item ${isSelected ? 'selected' : ''}`}>
            <div className="Actual-tree-row1">
              <div className="Actual-tree-code-name">
                <div className="Actual-tree-code">{root.root_code || 'N/A'}</div>
                <div className="Actual-tree-name">{root.root_name || 'Untitled'}</div>
              </div>
            </div>
            <div className="Actual-tree-row2">
              <div className="Actual-tree-info">
                {(root.start_date && root.end_date) && (
                  <div className="Actual-tree-date">
                    <CalendarOutlined />
                    <span>{dayjs(root.start_date).format('DD/MM')} - {dayjs(root.end_date).format('DD/MM/YY')}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                {totalItems > 0 && (
                  <div className="Actual-tree-progress">
                    <div className="Actual-tree-progress-bar">
                      <div
                        className="Actual-tree-progress-fill"
                        style={{
                          width: `${rootProgress}%`,
                          background: rootProgress === 100 ? '#22c55e' : 'linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%)'
                        }}
                      />
                    </div>
                    <div
                      className="Actual-tree-progress-text"
                      style={{ color: rootProgress === 100 ? '#22c55e' : '#7c3aed' }}
                    >
                      {rootProgress}%
                    </div>
                  </div>
                )}
                <div className="Actual-tree-status">
                  <Tag
                    color={rootStatus.color}
                    icon={rootStatus.status === 'completed' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                  >
                    {rootStatus.status === 'completed' ? 'เสร็จสิ้น' : 'ดำเนินการ'}
                  </Tag>
                </div>
              </div>
            </div>
          </div>
        ),
        key: `root-${root.root_id}`,
        data: root,
        type: 'root',
        isLeaf: true,
        totalItems,
        completedItems,
        actualProgress: rootProgress
      };
    });
  };

  const formatTreeGridData = (roots) => {
    if (!Array.isArray(roots)) return [];

    const result = [];

    roots.forEach(root => {
      const categories = root.categories || [];

      // คำนวณ Progress สำหรับทุกระดับจากล่างขึ้นบน (Bottom-Up)
      const categoriesWithProgress = categories.map(cat => {
        const types = cat.types || [];

        const typesWithProgress = types.map(type => {
          const subtypes = type.subtypes || [];

          // ระดับ Subtype - ใช้ actual_progress ที่บันทึกไว้
          const subtypesWithProgress = subtypes.map(sub => {
            const subsubtypes = sub.subsubtypes || [];

            // ระดับ Subsubtype - ใช้ actual_progress
            const subsubtypesWithProgress = subsubtypes.map(subsub => ({
              ...subsub,
              individualProgress: calculateProgress(subsub, null, 'subsubtype')
            }));

            return {
              ...sub,
              subsubtypesWithProgress,
              individualProgress: calculateProgress(sub, subsubtypesWithProgress.length > 0 ? subsubtypesWithProgress : null, 'subtype')
            };
          });

          // ระดับ Type - ใช้ actual_progress ถ้ามี หรือคำนวณจาก Subtypes
          return {
            ...type,
            subtypesWithProgress,
            individualProgress: calculateProgress(type, subtypesWithProgress, 'type')
          };
        });

        // ระดับ Category - คำนวณจาก Types (AUTO เท่านั้น)
        return {
          ...cat,
          typesWithProgress,
          individualProgress: calculateProgress(cat, typesWithProgress, 'category')
        };
      });

      // ระดับ Root - คำนวณจาก Categories (AUTO เท่านั้น)
      const rootProgress = calculateProgress(root, categoriesWithProgress, 'root');

      // สร้าง Root Row
      result.push({
        key: `root-${root.root_id}`,
        code: root.root_code || 'N/A',
        name: root.root_name || 'Untitled',
        description: root.root_description || '',
        start_date: root.start_date,
        end_date: root.end_date,
        quantity: null,
        unit: null,
        unit_price: null,
        total_price: root.root_total_price || null,
        level: 0,
        type: 'root',
        data: { ...root, actual_progress: rootProgress },
        status: getItemStatus({ ...root, actual_progress: rootProgress }),
        hasChildren: categories.length > 0,
        individualProgress: rootProgress,
        cumulativeProgress: rootProgress,
        canEdit: false // Root AUTO
      });

      // สร้าง Category Rows
      categoriesWithProgress.forEach(cat => {
        result.push({
          key: `category-${cat.category_id}`,
          code: cat.category_code || 'N/A',
          name: cat.category_name || 'Untitled',
          description: cat.category_description || '',
          start_date: cat.start_date,
          end_date: cat.end_date,
          quantity: null,
          unit: null,
          unit_price: null,
          total_price: null,
          level: 1,
          type: 'category',
          data: { ...cat, actual_progress: cat.individualProgress },
          status: getItemStatus({ ...cat, actual_progress: cat.individualProgress }),
          parent: `root-${root.root_id}`,
          hasChildren: cat.typesWithProgress && cat.typesWithProgress.length > 0,
          individualProgress: cat.individualProgress,
          cumulativeProgress: cat.individualProgress,
          canEdit: false // Category AUTO
        });

        // สร้าง Type Rows
        if (cat.typesWithProgress) {
          cat.typesWithProgress.forEach(type => {
            result.push({
              key: `type-${type.type_id}`,
              code: type.type_code || 'N/A',
              name: type.type_name || 'Untitled',
              description: type.type_description || '',
              start_date: type.start_date,
              end_date: type.end_date,
              quantity: null,
              unit: null,
              unit_price: null,
              total_price: type.type_price || null,
              level: 2,
              type: 'type',
              data: { ...type, actual_progress: type.individualProgress },
              status: getItemStatus({ ...type, actual_progress: type.individualProgress }),
              parent: `category-${cat.category_id}`,
              hasChildren: type.subtypesWithProgress && type.subtypesWithProgress.length > 0,
              individualProgress: type.individualProgress,
              cumulativeProgress: type.individualProgress,
              canEdit: true // Type สามารถแก้ไขได้
            });

            // สร้าง Subtype Rows
            if (type.subtypesWithProgress) {
              type.subtypesWithProgress.forEach(sub => {
                result.push({
                  key: `subtype-${sub.subtype_id}`,
                  code: sub.subtype_code || 'N/A',
                  name: sub.subtype_name || 'Untitled',
                  description: sub.subtype_description || '',
                  start_date: sub.start_date,
                  end_date: sub.end_date,
                  quantity: sub.quantity,
                  unit: sub.unit,
                  unit_price: sub.unit_price,
                  total_price: sub.total_price,
                  progress: sub.progress,
                  level: 3,
                  type: 'subtype',
                  data: sub,
                  status: getItemStatus(sub),
                  parent: `type-${type.type_id}`,
                  hasChildren: sub.subsubtypesWithProgress && sub.subsubtypesWithProgress.length > 0,
                  individualProgress: sub.individualProgress,
                  cumulativeProgress: sub.individualProgress,
                  canEdit: true // Subtype สามารถแก้ไขได้
                });

                // สร้าง Subsubtype Rows
                if (sub.subsubtypesWithProgress) {
                  sub.subsubtypesWithProgress.forEach(subsub => {
                    result.push({
                      key: `subsubtype-${subsub.subsubtype_id}`,
                      code: subsub.subsubtype_code || 'N/A',
                      name: subsub.subsubtype_name || 'Untitled',
                      description: subsub.subsubtype_description || '',
                      start_date: subsub.start_date,
                      end_date: subsub.end_date,
                      quantity: subsub.quantity,
                      unit: subsub.unit,
                      unit_price: subsub.unit_price,
                      total_price: subsub.total_price,
                      progress: subsub.progress,
                      level: 4,
                      type: 'subsubtype',
                      data: subsub,
                      status: getItemStatus(subsub),
                      parent: `subtype-${sub.subtype_id}`,
                      hasChildren: false,
                      individualProgress: subsub.individualProgress,
                      cumulativeProgress: subsub.individualProgress,
                      canEdit: true // Subsubtype สามารถแก้ไขได้
                    });
                  });
                }
              });
            }
          });
        }
      });
    });

    return result;
  };

  const handleTreeSelect = (selectedKeys) => {
    if (selectedKeys.length > 0) {
      const key = selectedKeys[0];
      if (key.startsWith('root-')) {
        setSelectedRootId(parseInt(key.replace('root-', '')));
      }
    }
  };

  const handleExpand = (expanded, record) => {
    const key = record.key;
    setExpandedRowKeys(prev => expanded ? [...prev, key] : prev.filter(k => k !== key));
  };

  const handleProgressClick = async (record) => {
    // ตรวจสอบว่าสามารถแก้ไขได้หรือไม่
    if (!record.canEdit) {
      message.warning('ไม่สามารถแก้ไขระดับนี้ได้โดยตรง กรุณาแก้ไขที่รายการย่อย');
      return;
    }

    setSelectedRecord(record);
    setAdditionalProgress(0);
    setRemarks('');

    // ดึงประวัติการอัปเดต
    await fetchProgressHistory(record);
    setUpdateModalVisible(true);
  };

  const handleUpdateProgress = async () => {
    if (!selectedRecord) return;

    // คำนวณ progress รวม
    const finalProgress = (selectedRecord.individualProgress || 0) + additionalProgress;

    // ตรวจสอบว่า progress ไม่เกิน 100
    if (finalProgress > 100) {
      message.error('ความคืบหน้าไม่สามารถเกิน 100% ได้');
      return;
    }

    // ตรวจสอบว่า progress ไม่ติดลบ
    if (finalProgress < 0) {
      message.error('ความคืบหน้าไม่สามารถติดลบได้');
      return;
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem('token');

      const payload = {
        project_id: id,
        actual_progress: finalProgress,
        remarks: remarks || null
      };

      // เพิ่ม ID ตามระดับของ record
      if (selectedRecord.type === 'root') {
        payload.root_id = selectedRecord.data.root_id;
      } else if (selectedRecord.type === 'category') {
        payload.category_id = selectedRecord.data.category_id;
      } else if (selectedRecord.type === 'type') {
        payload.type_id = selectedRecord.data.type_id;
      } else if (selectedRecord.type === 'subtype') {
        payload.subtype_id = selectedRecord.data.subtype_id;
      } else if (selectedRecord.type === 'subsubtype') {
        payload.subsubtype_id = selectedRecord.data.subsubtype_id;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/actual/update-progress`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        message.success('บันทึกความคืบหน้าสำเร็จ');
        setUpdateModalVisible(false);
        await fetchActualData(); // Refresh data และ history
      } else {
        message.error(response.data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      message.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setUpdating(false);
    }
  };

  const renderPlanDates = (record) => {
    if (!record.start_date || !record.end_date) {
      return <Text type="secondary">-</Text>;
    }

    const start = dayjs(record.start_date);
    const end = dayjs(record.end_date);
    const duration = end.diff(start, 'day') + 1;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Text style={{ fontSize: '12px', fontWeight: 500 }}>
          {start.format('DD/MM/YY')} - {end.format('DD/MM/YY')}
        </Text>
        <Text type="secondary" style={{ fontSize: '11px' }}>
          ({duration} วัน)
        </Text>
      </div>
    );
  };

  const renderProgressBar = (record) => {
    if (!record.start_date || !record.end_date) return '-';

    const progress = record.individualProgress || 0;

    // ดึง history จาก allHistories
    const recordHistory = allHistories[record.key] || [];

    // คำนวณข้อมูลจาก history - เฉพาะที่เพิ่มขึ้น
    const updates = recordHistory
      .filter(h => {
        const changeAmount = (h.new_progress || 0) - (h.old_progress || 0);
        return changeAmount > 0;
      })
      .sort((a, b) => new Date(a.update_date) - new Date(b.update_date)); // เรียงจากเก่าไปใหม่

    const totalUpdates = updates.length;

    // สร้างข้อความแสดงผลแบบ "1/10%, 2/50%, 3/15%"
    const updatesText = updates.map((u, i) => {
      const changeAmount = (u.new_progress || 0) - (u.old_progress || 0);
      return `${i + 1}/${changeAmount}%`;
    }).join(', ');

    return (
      <div style={{ width: '100%' }}>
        <Tooltip title={
          record.canEdit
            ? (
              <div>
                <div>คลิกเพื่ออัปเดตความคืบหน้า: {progress}%</div>
                {totalUpdates > 0 && (
                  <div style={{ marginTop: 4, fontSize: '11px' }}>
                    อัปเดตแล้ว {totalUpdates} ครั้ง
                  </div>
                )}
              </div>
            )
            : 'คำนวณอัตโนมัติจากรายการย่อย (ไม่สามารถแก้ไขโดยตรง)'
        }>
          <div
            style={{
              height: '24px',
              background: record.canEdit ? '#f0f0f0' : '#fafafa',
              borderRadius: '4px',
              overflow: 'visible',
              position: 'relative',
              cursor: record.canEdit ? 'pointer' : 'not-allowed',
              border: record.canEdit ? '1px solid #e0e0e0' : '1px dashed #d0d0d0'
            }}
            onClick={() => handleProgressClick(record)}
          >
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: progress === 100
                ? '#22c55e'
                : record.canEdit
                  ? 'linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%)'
                  : 'linear-gradient(90deg, #cbd5e1 0%, #94a3b8 100%)',
              transition: 'width 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: '8px',
              paddingRight: '8px',
              position: 'relative'
            }}>
              {/* ข้อความ AUTO สำหรับ progress bar ที่คำนวณอัตโนมัติ */}
              {!record.canEdit && progress > 5 && (
                <div style={{
                  fontSize: '10px',
                  color: 'white',
                  fontWeight: 600,
                  opacity: 0.9,
                  marginRight: 'auto'
                }}>
                  AUTO {progress}%
                </div>
              )}

              {/* ข้อความ updates พร้อมเปอร์เซ็นต์รวมสำหรับ record ที่แก้ไขได้ */}
              {record.canEdit && totalUpdates > 0 && progress > 5 && (
                <div style={{
                  fontSize: '10px',
                  color: 'white',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  width: '100%',
                  textAlign: 'center'
                }}>
                  {updatesText}
                </div>
              )}

              {/* แสดงแค่เปอร์เซ็นต์เมื่อไม่มี updates */}
              {record.canEdit && totalUpdates === 0 && progress > 20 && (
                <Text style={{
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 600,
                  marginLeft: 'auto'
                }}>
                  {progress}%
                </Text>
              )}
            </div>

            {/* เปอร์เซ็นต์ด้านนอกเมื่อ progress น้อย */}
            {progress > 0 && progress <= 20 && (
              <Text style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '11px',
                color: record.canEdit ? '#666' : '#94a3b8',
                fontWeight: 600
              }}>
                {progress}%
              </Text>
            )}

            {/* ข้อความเมื่อ progress = 0 */}
            {progress === 0 && (
              <Text style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '10px',
                color: '#94a3b8',
                fontWeight: 500
              }}>
                {record.canEdit ? 'ยังไม่ได้อัปเดต' : 'AUTO 0%'}
              </Text>
            )}
          </div>
        </Tooltip>
      </div>
    );
  };
  //////////////
  const getTreeGridColumns = () => [
    {
      title: 'รหัส',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      fixed: 'left',
      render: (text, record) => {
        const indent = record.level * 32;
        const hasChildren = record.hasChildren;
        const isExpanded = expandedRowKeys.includes(record.key);

        return (
          <div style={{
            paddingLeft: indent,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {hasChildren && (
              <Button
                type="text"
                size="small"
                icon={isExpanded ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
                onClick={() => handleExpand(!isExpanded, record)}
                style={{
                  marginRight: 4,
                  padding: 0,
                  width: 18,
                  height: 18,
                  fontSize: '12px'
                }}
              />
            )}
            {!hasChildren && <span style={{ width: 22, display: 'inline-block' }}></span>}

            <Text style={{
              fontSize: '12px',
              fontWeight: record.level === 0 ? 600 : 400,
              whiteSpace: 'nowrap'
            }}>
              {text}
            </Text>
          </div>
        );
      }
    },
    {
      title: 'ชื่อรายการ',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      ellipsis: true,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Text strong={record.level === 0} style={{ fontSize: '12px' }}>
            {text}
          </Text>
          {!record.canEdit && (
            <Tag color="default" style={{ fontSize: '10px', padding: '0 4px' }}>
              Auto
            </Tag>
          )}
        </div>
      )
    },
    {
      title: 'Plan',
      key: 'plan',
      width: 280,
      render: (_, record) => renderPlanDates(record)
    },
    {
      title: 'Actual',
      key: 'actual',
      width: 200,
      render: (_, record) => renderProgressBar(record)
    },
    {
      title: 'ความคืบหน้า',
      dataIndex: 'individualProgress',
      key: 'individualProgress',
      width: 120,
      align: 'center',
      render: (progress) => {
        if (progress == null) return '-';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <Progress
              type="circle"
              percent={progress}
              size={40}
              strokeColor={progress === 100 ? '#22c55e' : '#a78bfa'}
            />
          </div>
        );
      }
    },
    {
      title: 'สถานะ',
      dataIndex: 'cumulativeProgress',
      key: 'status',
      width: 120,
      align: 'center',
      render: (progress, record) => {
        if (progress == null) return '-';
        const statusColor = record.status.color;
        const statusText = record.status.status === 'completed' ? 'เสร็จสิ้น' :
          record.status.status === 'overdue' ? 'เกินกำหนด' : 'ดำเนินการ';

        return (
          <Tag color={statusColor} style={{ fontSize: '11px', fontWeight: 'bold' }}>
            {statusText}
          </Tag>
        );
      }
    }
  ];

  const isChildOfSelectedRoot = (row) => {
    if (row.type === 'category') {
      return treeGridData.find(r => r.key === row.parent)?.data.root_id === selectedRootId;
    }
    if (row.type === 'type') {
      const cat = treeGridData.find(r => r.key === row.parent);
      return cat && treeGridData.find(r => r.key === cat.parent)?.data.root_id === selectedRootId;
    }
    if (row.type === 'subtype') {
      const type = treeGridData.find(r => r.key === row.parent);
      if (!type) return false;
      const cat = treeGridData.find(r => r.key === type.parent);
      return cat && treeGridData.find(r => r.key === cat.parent)?.data.root_id === selectedRootId;
    }
    if (row.type === 'subsubtype') {
      const sub = treeGridData.find(r => r.key === row.parent);
      if (!sub) return false;
      const type = treeGridData.find(r => r.key === sub.parent);
      if (!type) return false;
      const cat = treeGridData.find(r => r.key === type.parent);
      return cat && treeGridData.find(r => r.key === cat.parent)?.data.root_id === selectedRootId;
    }
    return false;
  };

  const getVisibleRows = () => {
    if (!selectedRootId) return [];
    return treeGridData.filter(row => {
      if (row.type === 'root') return row.data.root_id === selectedRootId;
      if (expandedRowKeys.length === 0) return row.level === 0;

      const parentExpanded = (r) => {
        if (r.level === 0) return true;
        if (!r.parent) return false;
        if (!expandedRowKeys.includes(r.parent)) return false;
        const parentRow = treeGridData.find(p => p.key === r.parent);
        return parentExpanded(parentRow);
      };

      return isChildOfSelectedRoot(row) && parentExpanded(row);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Text type="danger">ไม่พบข้อมูลโครงการ</Text>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900 text-white' : 'bg-gray-100'} font-kanit flex flex-col`}>
      <Navbar user={user} setUser={setUser} theme={theme} />

      <div className="flex-1 px-4 py-6 md:px-8 lg:px-12">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/project/${id}`)}
              className="mr-3"
            />
            <div>
              <Title level={3} className="m-0">Actual: {project.project_name}</Title>
              <Breadcrumb
                items={[
                  { title: 'โครงการ' },
                  { title: project.project_name },
                  { title: 'Actual' }
                ]}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card
              title={
                <span>
                  หมวดงาน <Tag color="blue">{treeData.length}</Tag>
                </span>
              }
              className="h-full"
              styles={{
                body: {
                  padding: 0,
                  height: 'calc(100% - 48px)',
                  display: 'flex',
                  flexDirection: 'column'
                }
              }}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {treeData.length > 0 ? (
                <>
                  <div className="p-3 border-b">
                    <Input.Search
                      placeholder="ค้นหา..."
                      size="small"
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 overflow-auto p-2">
                    <Tree
                      className="Actual-tree"
                      treeData={treeData.filter(n =>
                        !searchText ||
                        n.data.root_name.toLowerCase().includes(searchText.toLowerCase()) ||
                        n.data.root_code.toLowerCase().includes(searchText.toLowerCase())
                      )}
                      selectedKeys={selectedRootId ? [`root-${selectedRootId}`] : []}
                      onSelect={handleTreeSelect}
                      blockNode
                      style={{ width: '100%' }}
                    />
                  </div>
                </>
              ) : (
                <Empty
                  description="ยังไม่มีข้อมูล"
                  className="flex-1 flex items-center justify-center"
                />
              )}
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card
              title={
                selectedRootId
                  ? `รายการ: ${treeGridData.find(r => r.type === 'root' && r.data.root_id === selectedRootId)?.name}`
                  : 'เลือกหมวดงาน'
              }
              className="h-full"
              extra={selectedRootId && (
                <Space>
                  <Button
                    size="small"
                    onClick={() => setExpandedRowKeys(
                      treeGridData.filter(r => r.hasChildren).map(r => r.key)
                    )}
                  >
                    ขยายทั้งหมด
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setExpandedRowKeys([])}
                  >
                    ย่อทั้งหมด
                  </Button>
                </Space>
              )}
              styles={{ body: { height: 'calc(100% - 55px)', overflow: 'auto' } }}
            >
              {!selectedRootId ? (
                <Empty description="กรุณาเลือกหมวดงานจากด้านซ้าย" />
              ) : getVisibleRows().length > 0 ? (
                <Table
                  columns={getTreeGridColumns()}
                  dataSource={getVisibleRows()}
                  rowKey="key"
                  pagination={false}
                  scroll={{ x: 1300 }}
                  size="small"
                />
              ) : (
                <Empty description="ไม่มีข้อมูล" />
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Modal สำหรับอัปเดต Progress */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            <span>เพิ่มความคืบหน้า</span>
          </Space>
        }
        open={updateModalVisible}
        onOk={handleUpdateProgress}
        onCancel={() => setUpdateModalVisible(false)}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={updating}
        width={600}
      >
        {selectedRecord && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ marginBottom: 20 }}>
              <Text strong>รายการ: </Text>
              <Text>{selectedRecord.name}</Text>
            </div>
            <div style={{ marginBottom: 20 }}>
              <Text strong>รหัส: </Text>
              <Text>{selectedRecord.code}</Text>
            </div>
            <div style={{ marginBottom: 20 }}>
              <Text strong>ความคืบหน้าปัจจุบัน: </Text>
              <Tag color="blue" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                {selectedRecord.individualProgress || 0}%
              </Tag>
            </div>

            {/* แสดงประวัติการอัปเดต */}
            {progressHistory.length > 0 && (
              <div style={{ marginBottom: 20, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <Text strong style={{ display: 'block', marginBottom: 12 }}>
                  ประวัติการอัปเดต ({progressHistory.length} ครั้ง)
                </Text>
                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                  {progressHistory.map((history, index) => {
                    const changeAmount = (history.new_progress || 0) - (history.old_progress || 0);
                    if (changeAmount <= 0) return null;

                    return (
                      <div key={index} style={{
                        marginBottom: 8,
                        padding: '8px 12px',
                        background: 'white',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Tag color="purple" style={{ margin: 0 }}>
                            ครั้งที่ {progressHistory.length - index}
                          </Tag>
                          <Text style={{ fontSize: '13px' }}>
                            +{changeAmount}%
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                              ({history.old_progress || 0}% → {history.new_progress}%)
                            </Text>
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {dayjs(history.update_date).format('DD/MM/YY HH:mm')}
                        </Text>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                เพิ่มความคืบหน้า (%)
              </Text>
              <InputNumber
                min={0}
                max={100 - (selectedRecord.individualProgress || 0)}
                value={additionalProgress}
                onChange={(value) => setAdditionalProgress(value || 0)}
                style={{ width: '100%' }}
                formatter={value => `+${value}%`}
                parser={value => value.replace(/\+|%/g, '')}
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#6b7280' }}>
                ความคืบหน้าใหม่จะเป็น: <Text strong style={{ color: '#8b5cf6', fontSize: '14px' }}>
                  {(selectedRecord.individualProgress || 0) + additionalProgress}%
                </Text>
              </div>
              <Progress
                percent={(selectedRecord.individualProgress || 0) + additionalProgress}
                strokeColor={((selectedRecord.individualProgress || 0) + additionalProgress) === 100 ? '#22c55e' : '#a78bfa'}
                style={{ marginTop: 10 }}
              />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                หมายเหตุ
              </Text>
              <TextArea
                rows={4}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="ระบุหมายเหตุ (ถ้ามี)"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Actual;