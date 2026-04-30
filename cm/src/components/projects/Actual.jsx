import React, { useState, useEffect } from 'react';
import {
  Button, Card, Typography, Space, Spin, Tree, Table,
  Breadcrumb, Tag, Empty, Input, Progress, Tooltip, Modal, InputNumber, message, DatePicker, Popconfirm, Form, Divider, Upload, Avatar, List, Image
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  PlusSquareOutlined, MinusSquareOutlined,
  CheckCircleOutlined, ClockCircleOutlined, HistoryOutlined,
  FilePdfOutlined, FileImageOutlined, DeleteOutlined, ExclamationCircleOutlined,
  SearchOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PlusOutlined,
  CameraOutlined, AppstoreOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../Navbar';
import axios from 'axios';
import api from '../../axiosConfig';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modal state
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [additionalProgress, setAdditionalProgress] = useState(0);
  const [additionalQuantity, setAdditionalQuantity] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [updateDate, setUpdateDate] = useState(dayjs());
  const [fileList, setFileList] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [progressHistory, setProgressHistory] = useState([]);
  const [allHistories, setAllHistories] = useState({});
  const [deletingHistory, setDeletingHistory] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchActualData();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/api/project/${id}`);
      setProject(response.data.project);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchActualData = async () => {
    try {
      const response = await api.get(`/api/actual/tree-with-actual/${id}`);

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
      const response = await api.get(`/api/actual/history/${id}?limit=1000`);

      if (response.data.success) {
        const histories = response.data.data || [];
        console.log('📜 Fetched all histories:', histories.length, 'records');

        const grouped = {};
        histories.forEach(h => {
          let key = '';

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
        setAllHistories(grouped);
      }
    } catch (error) {
      console.error('❌ Failed to fetch all histories:', error.response?.data || error.message);
      setAllHistories({});
    }
  };

  const fetchProgressHistory = async (record) => {
    try {
      const params = new URLSearchParams({ limit: 100 });

      if (record.type === 'type' && record.data.type_id) {
        params.append('type_id', record.data.type_id);
      } else if (record.type === 'subtype' && record.data.subtype_id) {
        params.append('subtype_id', record.data.subtype_id);
      } else if (record.type === 'subsubtype' && record.data.subsubtype_id) {
        params.append('subsubtype_id', record.data.subsubtype_id);
      }

      console.log('🔍 Fetching history for:', record.type, params.toString());

      const response = await api.get(`/api/actual/history/${id}?${params.toString()}`);

      if (response.data.success) {
        const historyData = response.data.data || [];
        console.log('📜 History data received:', historyData.length, 'records');

        historyData.forEach((h, idx) => {
          console.log(`  [${idx + 1}]history_id: ${h.history_id}, remarks: "${h.remarks}"`);
        });

        setProgressHistory(historyData);
      }
    } catch (error) {
      console.error('Failed to fetch progress history:', error);
      setProgressHistory([]);
    }
  };

  const handleDeleteHistory = async (historyId) => {
    setDeletingHistory(true);
    try {
      const response = await api.delete(`/api/actual/history-item/${historyId}`);

      if (response.data.success) {
        message.success('ลบประวัติสำเร็จ');

        // ✅ Option 1: ปิด Modal (แนะนำ)
        setUpdateModalVisible(false);
        await fetchActualData();

        // ✅ Option 2: เปิด Modal ค้างไว้ แต่อัปเดตข้อมูล (comment ออกถ้าไม่ใช้)
        // await fetchActualData();
        // await fetchProgressHistory(selectedRecord);
        //
        // // อัปเดต selectedRecord ด้วยข้อมูลใหม่
        // const updatedTreeGridData = treeGridData.map(item => {
        //   if (item.key === selectedRecord.key) {
        //     return {
        //       ...item,
        //       individualProgress: response.data.data.current_progress || 0
        //     };
        //   }
        //   return item;
        // });
        // setTreeGridData(updatedTreeGridData);
        //
        // // อัปเดต selectedRecord
        // setSelectedRecord({
        //   ...selectedRecord,
        //   individualProgress: response.data.data.current_progress || 0
        // });
      } else {
        message.error(response.data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error deleting history:', error);
      message.error('เกิดข้อผิดพลาดในการลบประวัติ');
    } finally {
      setDeletingHistory(false);
    }
  };

  const handleDeleteAllHistory = async () => {
    if (!selectedRecord) return;

    Modal.confirm({
      title: '⚠️ ยืนยันการลบประวัติทั้งหมด',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div style={{ fontFamily: "'Kanit', sans-serif" }}>
          <p style={{ marginBottom: 12 }}>
            คุณกำลังจะลบประวัติทั้งหมดของ:
          </p>
          <div style={{
            padding: 12,
            background: '#f9fafb',
            borderRadius: 6,
            marginBottom: 12
          }}>
            <div><strong>รหัส:</strong> {selectedRecord.code}</div>
            <div><strong>ชื่อ:</strong> {selectedRecord.name}</div>
            <div><strong>ระดับ:</strong> {selectedRecord.type}</div>
            <div><strong>ความคืบหน้าปัจจุบัน:</strong> {selectedRecord.individualProgress}%</div>
          </div>
          <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: 0 }}>
            ⚠️ การดำเนินการนี้จะลบ:
          </p>
          <ul style={{ color: '#dc2626', marginTop: 8, marginBottom: 0 }}>
            <li>ประวัติการอัปเดตทั้งหมด ({progressHistory.length} รายการ)</li>
            <li>ข้อมูลความคืบหน้าของรายการนี้</li>
          </ul>
          <p style={{
            color: '#ef4444',
            fontWeight: 'bold',
            marginTop: 12,
            marginBottom: 0
          }}>
            🚨 ไม่สามารถย้อนกลับได้!
          </p>
        </div>
      ),
      okText: 'ยืนยันลบทั้งหมด',
      okType: 'danger',
      cancelText: 'ยกเลิก',
      width: 500,
      onOk: async () => {
        try {
          const params = new URLSearchParams();
          if (selectedRecord.type === 'root') params.append('root_id', selectedRecord.data.root_id);
          else if (selectedRecord.type === 'category') params.append('category_id', selectedRecord.data.category_id);
          else if (selectedRecord.type === 'type') params.append('type_id', selectedRecord.data.type_id);
          else if (selectedRecord.type === 'subtype') params.append('subtype_id', selectedRecord.data.subtype_id);
          else if (selectedRecord.type === 'subsubtype') params.append('subsubtype_id', selectedRecord.data.subsubtype_id);

          const url = `/api/actual/delete-all-history/${id}?${params.toString()}`;
          console.log('🗑️ Deleting all history URL:', url);
          const response = await api.delete(url);

          if (response.data.success) {
            message.success(`ลบประวัติทั้งหมดสำเร็จ(${response.data.data.deleted_count} รายการ)`);
            setUpdateModalVisible(false);
            await fetchActualData();
          } else {
            message.error(response.data.message || 'เกิดข้อผิดพลาด');
          }
        } catch (error) {
          console.error('Error deleting all history:', error);
          message.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบประวัติทั้งหมด');
        }
      }
    });
  };
  const getItemStatus = (item) => {
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
    // 1. If it's a leaf node (subtype or subsubtype), return its own progress
    if (itemType === 'subtype' || itemType === 'subsubtype') {
      return Number(item.actual_progress || item.progress || 0);
    }

    // 2. If it's a parent node (type, category, root), calculate WEIGHTED progress from children
    if (children && children.length > 0) {
      let totalWeightedProgress = 0;
      let totalWeight = 0;

      children.forEach(child => {
        // Use total_price (for subtypes) or type_price (for types) or weight as weight
        const progress = Number(child.individualProgress || 0);
        const weight = Number(child.total_price || child.type_price || child.root_total_price || 0);

        if (weight > 0) {
          totalWeightedProgress += (progress * weight);
          totalWeight += weight;
        } else {
          // Fallback if no price is set (fallback to simple average weight for this child)
          // We'll give it a neutral weight based on the average weight of others or 1
        }
      });

      // If we have weights, use weighted average.
      // If no children have weights, fallback to simple average.
      if (totalWeight > 0) {
        return Number((totalWeightedProgress / totalWeight).toFixed(2));
      } else {
        const sumProgress = children.reduce((acc, child) => acc + (Number(child.individualProgress) || 0), 0);
        return Number((sumProgress / children.length).toFixed(2));
      }
    }

    // 3. Last fallback: use own progress if no children but has progress
    return Number(item.actual_progress || 0);
  };

  const formatTreeData = (roots, gridData) => {
    if (!Array.isArray(roots)) return [];

    return roots.map(root => {
      const rootGridData = gridData.find(item => item.type === 'root' && item.data.root_id === root.root_id);
      const rootProgress = rootGridData?.individualProgress || 0;
      const rootStatus = getItemStatus({ ...root, actual_progress: rootProgress });

      let totalItems = 0, completedItems = 0;

      gridData.forEach(item => {
        if (item.type === 'root' && item.data.root_id === root.root_id) return;

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
          <div className={`Actual - tree - item ${isSelected ? 'selected' : ''} `}>
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
                          width: `${rootProgress}% `,
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
        key: `root - ${root.root_id} `,
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

      const categoriesWithProgress = categories.map(cat => {
        const types = cat.types || [];

        const typesWithProgress = types.map(type => {
          const subtypes = type.subtypes || [];

          const subtypesWithProgress = subtypes.map(sub => {
            const subsubtypes = sub.subsubtypes || [];

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

          return {
            ...type,
            subtypesWithProgress,
            individualProgress: calculateProgress(type, subtypesWithProgress, 'type')
          };
        });

        return {
          ...cat,
          typesWithProgress,
          individualProgress: calculateProgress(cat, typesWithProgress, 'category')
        };
      });

      const rootProgress = calculateProgress(root, categoriesWithProgress, 'root');

      result.push({
        key: `root - ${root.root_id} `,
        code: root.root_code || 'N/A',
        name: root.root_name || 'Untitled',
        description: root.root_description || '',
        start_date: root.start_date,
        end_date: root.end_date,
        quantity: null,
        unit: null,
        unit_price: null,
        total_price: root.root_total_price || null,
        attachment_url: null,
        attachment_name: null,
        level: 0,
        type: 'root',
        data: { ...root, actual_progress: rootProgress },
        status: getItemStatus({ ...root, actual_progress: rootProgress }),
        hasChildren: categories.length > 0,
        individualProgress: rootProgress,
        cumulativeProgress: rootProgress,
        canEdit: false
      });

      categoriesWithProgress.forEach(cat => {
        result.push({
          key: `category - ${cat.category_id} `,
          code: cat.category_code || 'N/A',
          name: cat.category_name || 'Untitled',
          description: cat.category_description || '',
          start_date: cat.start_date,
          end_date: cat.end_date,
          quantity: null,
          unit: null,
          unit_price: null,
          total_price: null,
          attachment_url: null,
          attachment_name: null,
          level: 1,
          type: 'category',
          data: { ...cat, actual_progress: cat.individualProgress },
          status: getItemStatus({ ...cat, actual_progress: cat.individualProgress }),
          parent: `root - ${root.root_id} `,
          hasChildren: cat.typesWithProgress && cat.typesWithProgress.length > 0,
          individualProgress: cat.individualProgress,
          cumulativeProgress: cat.individualProgress,
          canEdit: false
        });

        if (cat.typesWithProgress) {
          cat.typesWithProgress.forEach(type => {
            result.push({
              key: `type - ${type.type_id} `,
              code: type.type_code || 'N/A',
              name: type.type_name || 'Untitled',
              description: type.type_description || '',
              start_date: type.start_date,
              end_date: type.end_date,
              quantity: null,
              unit: null,
              unit_price: null,
              total_price: type.type_price || null,
              attachment_url: type.attachment_url,
              attachment_name: type.attachment_name,
              ifc_url: type.ifc_url || null,
              ifc_name: type.ifc_name || null,
              level: 2,
              type: 'type',
              data: { ...type, actual_progress: type.individualProgress },
              status: getItemStatus({ ...type, actual_progress: type.individualProgress }),
              parent: `category - ${cat.category_id} `,
              hasChildren: type.subtypesWithProgress && type.subtypesWithProgress.length > 0,
              individualProgress: type.individualProgress,
              cumulativeProgress: type.individualProgress,
              canEdit: true
            });

            if (type.subtypesWithProgress) {
              type.subtypesWithProgress.forEach(sub => {
                result.push({
                  key: `subtype - ${sub.subtype_id} `,
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
                  attachment_url: sub.attachment_url,
                  attachment_name: sub.attachment_name,
                  ifc_url: sub.ifc_url || null,
                  ifc_name: sub.ifc_name || null,
                  level: 3,
                  type: 'subtype',
                  data: sub,
                  status: getItemStatus(sub),
                  parent: `type - ${type.type_id} `,
                  hasChildren: sub.subsubtypesWithProgress && sub.subsubtypesWithProgress.length > 0,
                  individualProgress: sub.individualProgress,
                  cumulativeProgress: sub.individualProgress,
                  canEdit: true
                });

                if (sub.subsubtypesWithProgress) {
                  sub.subsubtypesWithProgress.forEach(subsub => {
                    result.push({
                      key: `subsubtype - ${subsub.subsubtype_id} `,
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
                      attachment_url: subsub.attachment_url,
                      attachment_name: subsub.attachment_name,
                      level: 4,
                      type: 'subsubtype',
                      data: subsub,
                      status: getItemStatus(subsub),
                      parent: `subtype - ${sub.subtype_id} `,
                      hasChildren: false,
                      individualProgress: subsub.individualProgress,
                      cumulativeProgress: subsub.individualProgress,
                      canEdit: true
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
    if (!record.canEdit) {
      message.warning('ไม่สามารถแก้ไขระดับนี้ได้โดยตรง กรุณาแก้ไขที่รายการย่อย');
      return;
    }

    setSelectedRecord(record);
    setAdditionalProgress(0);
    setAdditionalQuantity(0);
    setRemarks('');
    setUpdateDate(dayjs());

    await fetchProgressHistory(record);
    setFileList([]);
    setUpdateModalVisible(true);
  };

  const handleUpdateProgress = async () => {
    if (!selectedRecord) return;

    if (!updateDate) {
      message.error('กรุณาเลือกวันที่อัปเดต');
      return;
    }

    const finalProgress = (selectedRecord.individualProgress || 0) + additionalProgress;

    if (finalProgress > 100) {
      message.error('ความคืบหน้าไม่สามารถเกิน 100% ได้');
      return;
    }

    if (finalProgress < 0) {
      message.error('ความคืบหน้าไม่สามารถติดลบได้');
      return;
    }

    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append('project_id', id);
      formData.append('actual_progress', finalProgress);
      formData.append('remarks', remarks || '');
      formData.append('update_date', updateDate.format('YYYY-MM-DD'));

      if (selectedRecord.type === 'root') formData.append('root_id', selectedRecord.data.root_id);
      else if (selectedRecord.type === 'category') formData.append('category_id', selectedRecord.data.category_id);
      else if (selectedRecord.type === 'type') formData.append('type_id', selectedRecord.data.type_id);
      else if (selectedRecord.type === 'subtype') formData.append('subtype_id', selectedRecord.data.subtype_id);
      else if (selectedRecord.type === 'subsubtype') formData.append('subsubtype_id', selectedRecord.data.subsubtype_id);

      fileList.forEach(file => {
        formData.append('photos', file.originFileObj);
      });

      const response = await api.post('/api/actual/update-progress', formData);

      if (response.data.success) {
        message.success('บันทึกความคืบหน้าสำเร็จ');
        setUpdateModalVisible(false);
        await fetchActualData();
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

  const renderAttachment = (record) => {
    if (!record.attachment_url) {
      return <Text type="secondary" style={{ fontSize: '12px', fontFamily: 'Kanit, sans-serif' }}>-</Text>;
    }

    const url = record.attachment_url.toLowerCase();
    const isPdf = url.endsWith('.pdf');
    const isDxf = url.endsWith('.dxf');

    let icon;
    if (isPdf) icon = <FilePdfOutlined style={{ color: '#ef4444', fontSize: '16px' }} />;
    else if (isDxf) icon = <AppstoreOutlined style={{ color: '#6366f1', fontSize: '16px' }} />;
    else icon = <FileImageOutlined style={{ color: '#3b82f6', fontSize: '16px' }} />;

    const handleClick = (e) => {
      if (isDxf) {
        e.preventDefault();
        const fileId = record.key.replace('-', '_');
        const fileName = record.attachment_name || 'แบบแปลน.dxf';
        const baseUrl = import.meta.env.BASE_URL || '/';
        window.open(`${baseUrl}project/${id}/viewerdxf/${fileId}?name=${encodeURIComponent(fileName)}`.replace(/\/+/g, '/'), '_blank');
      }
    };

    return (
      <Tooltip title={record.attachment_name || 'ดูไฟล์'}>
        <a
          href={isDxf ? '#' : `${import.meta.env.VITE_API_URL}${record.attachment_url}`}
          target={isDxf ? '_self' : '_blank'}
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100px' }}
          onClick={handleClick}
        >
          {icon}
          <Text style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'Kanit, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.attachment_name?.length > 10
              ? record.attachment_name.substring(0, 10) + '...'
              : record.attachment_name}
          </Text>
        </a>
      </Tooltip>
    );
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

    const recordHistory = allHistories[record.key] || [];

    const updates = recordHistory
      .filter(h => {
        const changeAmount = (h.new_progress || 0) - (h.old_progress || 0);
        return changeAmount > 0;
      })
      .sort((a, b) => new Date(a.update_date) - new Date(b.update_date));

    const totalUpdates = updates.length;

    const updatesText = updates.map((u, i) => {
      const changeAmount = (u.new_progress || 0) - (u.old_progress || 0);
      return `${i + 1}/${changeAmount}%`;
    }).join(', ');

    return (
      <div style={{ width: '100%' }}>
        <Tooltip
          classNames={{ root: "progress-tooltip" }}
          styles={{
            body: {
              fontFamily: "'Kanit', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '6px',
              padding: '8px 12px'
            }
          }}
          title={
            record.canEdit
              ? (
                <div style={{ fontFamily: "'Kanit', sans-serif" }}>
                  <div style={{ marginBottom: 4, fontWeight: 500 }}>
                    คลิกเพื่อแก้ไขความคืบหน้า: <strong>{progress}%</strong>
                  </div>
                  {totalUpdates > 0 && (
                    <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: 400 }}>
                      อัปเดตแล้ว <strong>{totalUpdates}</strong> ครั้ง
                    </div>
                  )}
                </div>
              )
              : <div style={{ fontFamily: "'Kanit', sans-serif", fontWeight: 400 }}>คำนวณอัตโนมัติจากรายการย่อย<br />(ไม่สามารถแก้ไขโดยตรง)</div>
          }
        >
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
              {!record.canEdit && progress > 5 && (
                <div style={{
                  fontSize: '10px',
                  color: 'white',
                  fontWeight: 600,
                  opacity: 0.9,
                  marginRight: 'auto',
                  whiteSpace: 'nowrap'
                }}>
                  AUTO {progress}%
                </div>
              )}

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
      width: 350,
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
      title: 'IFC',
      dataIndex: 'ifc_url',
      key: 'ifc',
      width: 120,
      render: (url, record) => {
        if (!url) return <Text type="secondary" style={{ fontSize: '11px', fontFamily: 'Kanit, sans-serif' }}>-</Text>;

        let fileId = '';
        if (record.type === 'type') {
          fileId = `planning_type_${record.data.type_id}`;
        } else if (record.type === 'subtype') {
          fileId = `planning_subtype_${record.data.subtype_id}`;
        }

        if (!fileId) return <Text type="secondary" style={{ fontSize: '11px', fontFamily: 'Kanit, sans-serif' }}>-</Text>;

        return (
          <Tooltip title={record.ifc_name || 'เปิดดูโมเดล 3D'}>
            <Button
              type="link"
              size="small"
              icon={<AppstoreOutlined style={{ color: '#0891b2' }} />}
              onClick={() => window.open(`/cm/project/${id}/viewerifc/${fileId}`, '_blank')}
              style={{ fontSize: '11px', padding: 0, fontFamily: 'Kanit, sans-serif' }}
            >
              {record.ifc_name ? (record.ifc_name.length > 15 ? record.ifc_name.substring(0, 12) + '...' : record.ifc_name) : 'IFC Model'}
            </Button>
          </Tooltip>
        );
      }
    },
    {
      title: 'ไฟล์แนบ',
      key: 'attachment',
      width: 100,
      align: 'center',
      render: (_, record) => renderAttachment(record)
    },
    {
      title: 'ปริมาณ',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (val) => val != null ? <Text style={{ fontSize: '11px' }}>{val.toLocaleString()}</Text> : '-'
    },
    {
      title: 'หน่วย',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center',
      render: (val) => val ? <Tag color="blue" style={{ fontSize: '10px' }}>{val}</Tag> : '-'
    },
    {
      title: 'Plan',
      key: 'plan',
      width: 190,
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
      width: 100,
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

        <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Sidebar - หมวดงาน */}
          {!sidebarCollapsed && (
            <div className="hidden lg:block lg:w-1/4 h-full transition-all duration-300">
              <Card
                title={
                  <span style={{ fontFamily: "'Kanit', sans-serif" }}>
                    หมวดงาน <Tag color="blue">{treeData.length}</Tag>
                  </span>
                }
                className="h-full shadow-md bg-white border border-gray-200"
                styles={{
                  body: {
                    height: 'calc(100% - 48px)',
                    padding: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#fafafa'
                  }
                }}
              >
                {treeData.length > 0 ? (
                  <>
                    <div className="px-3 pt-3 pb-2 border-b border-gray-200 bg-white">
                      <Input
                        placeholder="ค้นหา..."
                        allowClear
                        size="small"
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
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
                    description={
                      <span style={{ fontFamily: "'Kanit', sans-serif" }}>
                        ยังไม่มีข้อมูล
                      </span>
                    }
                    className="flex-1 flex items-center justify-center"
                  />
                )}
              </Card>
            </div>
          )}

          {/* Main Content - รายการ */}
          <div className={`${sidebarCollapsed ? 'w-full' : 'w-full lg:w-3/4'} h-full transition-all duration-300`}>
            <Card
              title={
                <Space>
                  <Button
                    type="text"
                    icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="mr-1 hidden lg:flex items-center justify-center"
                  />
                  <span style={{ fontFamily: "'Kanit', sans-serif" }}>
                    {selectedRootId
                      ? `รายการ: ${treeGridData.find(r => r.type === 'root' && r.data.root_id === selectedRootId)?.name}`
                      : 'เลือกหมวดงาน'}
                  </span>
                </Space>
              }
              className="h-full shadow-md"
              extra={selectedRootId && (
                <Space>
                  <Button
                    size="small"
                    onClick={() => setExpandedRowKeys(
                      treeGridData.filter(r => r.hasChildren).map(r => r.key)
                    )}
                  >
                    <span style={{ fontFamily: "'Kanit', sans-serif" }}>ขยายทั้งหมด</span>
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setExpandedRowKeys([])}
                  >
                    <span style={{ fontFamily: "'Kanit', sans-serif" }}>ย่อทั้งหมด</span>
                  </Button>
                </Space>
              )}
              styles={{ body: { height: 'calc(100% - 55px)', overflow: 'auto' } }}
            >
              {!selectedRootId ? (
                <Empty
                  description={
                    <span style={{ fontFamily: "'Kanit', sans-serif" }}>
                      กรุณาเลือกหมวดงานจากด้านซ้าย
                    </span>
                  }
                />
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
                <Empty
                  description={
                    <span style={{ fontFamily: "'Kanit', sans-serif" }}>
                      ไม่มีข้อมูล
                    </span>
                  }
                />
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Modal สำหรับอัปเดต Progress */}
      <Modal
        title={
          <Space size="small">
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
          <div style={{ padding: '12px 0' }}>
            {/* ข้อมูลรายการ */}
            <div style={{
              marginBottom: 16,
              padding: 12,
              background: '#f9fafb',
              borderRadius: 6,
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ marginBottom: 6 }}>
                <Text strong style={{ fontSize: '14px' }}>{selectedRecord.name}</Text>
                <Text type="secondary" style={{ fontSize: '11px', marginLeft: 8 }}>
                  ({selectedRecord.code})
                </Text>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: '11px' }}>ปัจจุบัน: </Text>
                <Tag color="purple" style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>
                  {selectedRecord.individualProgress || 0}%
                </Tag>
              </div>
            </div>

            {/* ฟอร์มเพิ่มความคืบหน้า */}
            <div style={{
              marginBottom: 16,
              padding: 14,
              background: 'white',
              borderRadius: 6,
              border: '1px solid #e0e7ff'
            }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {/* วันที่อัปเดต */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: '13px' }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    วันที่อัปเดต
                  </Text>
                  <DatePicker
                    value={updateDate}
                    onChange={setUpdateDate}
                    format="DD/MM/YYYY"
                    style={{ width: '100%' }}
                    placeholder="เลือกวันที่"
                    size="small"
                    disabledDate={(current) => {
                      return current && current > dayjs().endOf('day');
                    }}
                  />
                </div>

                {/* เพิ่มความคืบหน้า (Quantity & %) */}
                <div style={{ display: 'flex', gap: '16px' }}>
                  {/* เพิ่มตามปริมาณ (ถ้ามี) */}
                  {selectedRecord.quantity > 0 && (
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ display: 'block', marginBottom: 6, fontSize: '13px' }}>
                        เพิ่มงาน ({selectedRecord.unit || 'หน่วย'})
                      </Text>
                      <InputNumber
                        min={0}
                        max={selectedRecord.quantity - ((selectedRecord.individualProgress || 0) * selectedRecord.quantity / 100)}
                        value={additionalQuantity}
                        onChange={(val) => {
                          const qty = val || 0;
                          setAdditionalQuantity(qty);
                          // Sync with percentage: (qty / total_qty) * 100
                          const percent = (qty / selectedRecord.quantity) * 100;
                          setAdditionalProgress(parseFloat(percent.toFixed(2)));
                        }}
                        style={{ width: '100%' }}
                        placeholder="กรอกจำนวน"
                        step={0.01}
                      />
                    </div>
                  )}

                  {/* เพิ่มตามเปอร์เซ็นต์ */}
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ display: 'block', marginBottom: 6, fontSize: '13px' }}>
                      เพิ่มความคืบหน้า (%)
                    </Text>
                    <InputNumber
                      min={0}
                      max={100 - (selectedRecord.individualProgress || 0)}
                      value={additionalProgress}
                      onChange={(val) => {
                        const percent = val || 0;
                        setAdditionalProgress(percent);
                        // Sync with quantity: (percent / 100) * total_qty
                        if (selectedRecord.quantity > 0) {
                          const qty = (percent / 100) * selectedRecord.quantity;
                          setAdditionalQuantity(parseFloat(qty.toFixed(2)));
                        }
                      }}
                      style={{ width: '100%' }}
                      formatter={value => `+${value}%`}
                      parser={value => value.replace(/\+|%/g, '')}
                    />
                  </div>
                </div>

                <div style={{
                  marginBottom: 16,
                  padding: 8,
                  background: '#f0f9ff',
                  borderRadius: 4,
                  border: '1px solid #bfdbfe'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: '12px', color: '#1e40af' }}>
                      ความคืบหน้าใหม่:
                      <Text strong style={{ color: '#8b5cf6', fontSize: '14px', marginLeft: 4 }}>
                        {((selectedRecord.individualProgress || 0) + additionalProgress).toFixed(2)}%
                      </Text>
                    </Text>
                    {selectedRecord.quantity > 0 && (
                      <Text style={{ fontSize: '11px', color: '#64748b' }}>
                        รวมสะสม: {(((selectedRecord.individualProgress || 0) + additionalProgress) * selectedRecord.quantity / 100).toLocaleString()} / {selectedRecord.quantity.toLocaleString()} {selectedRecord.unit}
                      </Text>
                    )}
                  </div>
                  <Progress
                    percent={parseFloat(((selectedRecord.individualProgress || 0) + additionalProgress).toFixed(2))}
                    strokeColor={
                      ((selectedRecord.individualProgress || 0) + additionalProgress) >= 100
                        ? '#22c55e'
                        : '#a78bfa'
                    }
                    style={{ marginTop: 6, marginBottom: 0 }}
                    size={8}
                  />
                </div>

                {/* หมายเหตุ */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: '13px' }}>
                    หมายเหตุ
                  </Text>
                  <TextArea
                    rows={3}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="ระบุหมายเหตุ (ถ้ามี)"
                  />
                </div>

                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8, fontSize: '13px' }}>แนบรูปภาพถ่ายความคืบหน้า (สูงสุด 5 รูป)</Text>
                  <Upload
                    listType="picture-card"
                    fileList={fileList}
                    onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                    beforeUpload={() => false}
                    accept="image/*"
                    multiple
                    maxCount={5}
                  >
                    {fileList.length < 5 && (
                      <div>
                        <PlusOutlined />
                        <div style={{ marginTop: 8 }}>อัปโหลด</div>
                      </div>
                    )}
                  </Upload>
                </div>
              </Space>
            </div>

            {/* แสดงประวัติการอัปเดต */}
            {progressHistory.length > 0 && (
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: '13px' }}>
                    <HistoryOutlined style={{ marginRight: 4 }} />
                    ประวัติ ({progressHistory.length} ครั้ง)
                  </Text>
                  {progressHistory.length > 0 && (
                    <Button
                      type="link"
                      danger
                      size="small"
                      onClick={handleDeleteAllHistory}
                      style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                    >
                      ลบทั้งหมด
                    </Button>
                  )}
                </div>
                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                  {progressHistory.map((history, index) => {
                    const changeAmount = (history.new_progress || 0) - (history.old_progress || 0);
                    if (changeAmount <= 0) return null;

                    return (
                      <div key={history.history_id} style={{
                        marginBottom: 6,
                        padding: 8,
                        background: 'white',
                        borderRadius: 4,
                        fontSize: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Space size={6}>
                            <Tag color="purple" style={{ margin: 0, fontSize: '10px', padding: '0 4px' }}>
                              #{progressHistory.length - index}
                            </Tag>
                            <Text strong style={{ fontSize: '12px', color: '#8b5cf6' }}>
                              +{changeAmount}%
                            </Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              ({history.old_progress || 0}→{history.new_progress}%)
                            </Text>
                          </Space>
                          <Space size={4}>
                            <Text type="secondary" style={{ fontSize: '10px' }}>
                              {history.update_date ? dayjs(history.update_date).format('DD/MM/YY') :
                                history.created_at ? dayjs(history.created_at).format('DD/MM/YY') : '-'}
                            </Text>
                            <Popconfirm
                              title="ยืนยันการลบ"
                              description="คุณต้องการลบประวัตินี้ใช่หรือไม่?"
                              onConfirm={() => handleDeleteHistory(history.history_id)}
                              okText="ลบ"
                              cancelText="ยกเลิก"
                              okButtonProps={{ danger: true, loading: deletingHistory }}
                            >
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                style={{ padding: '0 4px', height: 'auto' }}
                              />
                            </Popconfirm>
                          </Space>
                        </div>
                        {history.remarks && history.remarks !== 'null' && String(history.remarks).trim() !== '' && (
                          <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic', display: 'block', marginTop: 4 }}>
                            💬 {String(history.remarks)}
                          </Text>
                        )}
                        {history.photos && history.photos.length > 0 && (
                          <div style={{
                            marginTop: '10px',
                            padding: '8px',
                            background: '#f8fafc',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <Text type="secondary" style={{ fontSize: '10px', display: 'flex', alignItems: 'center' }}>
                                <CameraOutlined style={{ marginRight: 4 }} /> รูปถ่ายความคืบหน้า
                              </Text>
                              <Tag color="blue" style={{ margin: 0, fontSize: '9px', borderRadius: '10px' }}>
                                {history.photos.length} รูป
                              </Tag>
                            </div>
                            <Image.PreviewGroup>
                              <Space size={6} wrap>
                                {history.photos.map((photo, pIdx) => (
                                  <div key={pIdx} style={{
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                    lineHeight: 0
                                  }}>
                                    <Image
                                      width={56}
                                      height={56}
                                      src={`${import.meta.env.VITE_API_URL}/${photo.startsWith('/') ? photo.substring(1) : photo}`}
                                      style={{ objectFit: 'cover' }}
                                    />
                                  </div>
                                ))}
                              </Space>
                            </Image.PreviewGroup>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Actual;