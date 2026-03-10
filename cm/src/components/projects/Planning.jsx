import React, { useState, useEffect } from 'react';

import {
  Button, Card, Typography, Space, Spin, Tree, Modal, Form,
  Input, DatePicker, InputNumber, message, Popconfirm, Table,
  Breadcrumb, Tag, Empty, Divider, Tooltip, Alert, Row, Col, Upload
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  CalendarOutlined, PlusSquareOutlined, MinusSquareOutlined,
  CheckCircleOutlined, ClockCircleOutlined, UnorderedListOutlined,
  FolderOutlined, AppstoreOutlined, FileTextOutlined, UploadOutlined,
  FilePdfOutlined, FileImageOutlined, EyeOutlined, PaperClipOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../Navbar';
import axios from 'axios';
import dayjs from 'dayjs';
import './Planning.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Planning = ({ user, setUser, theme, setTheme }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [modalMode, setModalMode] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);
  const [parentId, setParentId] = useState(null);
  const [jobNumber, setJobNumber] = useState('');

  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [ifcFileList, setIfcFileList] = useState([]); // ✅ เพิ่ม IFC file list
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [removeIfc, setRemoveIfc] = useState(false); // ✅ เพิ่ม remove IFC state

  const [treeGridData, setTreeGridData] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [selectedRootId, setSelectedRootId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [duration, setDuration] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ✅ แก้ไข useEffect ให้ดึง job_number มาด้วย
  useEffect(() => {
    fetchProject();
    fetchTreeData();
  }, [id]);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/project/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProject(response.data.project);
      // ✅ เก็บ job_number
      setJobNumber(response.data.project.job_number || 'PROJECT');
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      message.error('ไม่สามารถโหลดข้อมูลโครงการได้');
      setLoading(false);
    }
  };

  const fetchTreeData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/planning/tree/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const formatted = formatTreeData(response.data.data);
      setTreeData(formatted);

      const gridData = formatTreeGridData(response.data.data);
      setTreeGridData(gridData);

      if (formatted.length > 0 && !selectedRootId) {
        const firstRootId = response.data.data[0].root_id;
        setSelectedRootId(firstRootId);
      }
    } catch (error) {
      console.error('Failed to fetch tree data:', error);
      message.error('ไม่สามารถโหลดข้อมูล Planning ได้');
    }
  };

  const checkAllItemsCompleted = (root) => {
    let allCompleted = true;

    if (!root.end_date) allCompleted = false;

    if (root.categories && root.categories.length > 0) {
      root.categories.forEach(cat => {
        if (!cat.end_date) allCompleted = false;
        if (cat.types && cat.types.length > 0) {
          cat.types.forEach(type => {
            if (!type.end_date) allCompleted = false;
            if (type.subtypes && type.subtypes.length > 0) {
              type.subtypes.forEach(sub => {
                if (!sub.end_date) allCompleted = false;
              });
            }
          });
        }
      });
    }

    return allCompleted;
  };

  const getItemStatus = (item, root = null) => {
    if (root) {
      const allCompleted = checkAllItemsCompleted(root);
      return allCompleted
        ? { status: 'completed', label: 'เสร็จสิ้น', color: 'green' }
        : { status: 'pending', label: 'ดำเนินการ', color: 'blue' };
    }

    const endDate = item.end_date ? dayjs(item.end_date) : null;
    if (!endDate) return { status: 'pending', label: 'ดำเนินการ', color: 'orange' };
    return { status: 'completed', label: 'เสร็จสิ้น', color: 'green' };
  };

  const formatTreeData = (roots) => {
    return roots.map(root => {
      const rootStatus = getItemStatus(root, root);
      let totalItems = 0, completedItems = 0;
      let totalPrice = 0;

      if (root.categories) {
        root.categories.forEach(cat => {
          totalItems++;
          if (getItemStatus(cat).status === 'completed') completedItems++;

          if (cat.types) {
            cat.types.forEach(type => {
              totalItems++;
              if (getItemStatus(type).status === 'completed') completedItems++;

              if (type.type_price) {
                totalPrice += parseFloat(type.type_price);
              }

              if (type.subtypes) {
                type.subtypes.forEach(sub => {
                  totalItems++;
                  if (getItemStatus(sub).status === 'completed') completedItems++;

                  if (sub.total_price) {
                    totalPrice += parseFloat(sub.total_price);
                  }
                });
              }
            });
          }
        });
      }

      const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      const isSelected = selectedRootId === root.root_id;

      const priceText = totalPrice > 0
        ? ` ฿${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        : ''

      const dateText = (root.start_date && root.end_date)
        ? `${dayjs(root.start_date).format('DD/MM')} - ${dayjs(root.end_date).format('DD/MM/YY')}`
        : '';

      return {
        title: (
          <div className={`planning-tree-item ${isSelected ? 'selected' : ''}`}>
            <div className="planning-tree-header">
              <div className="planning-tree-code-name">
                <span className="planning-tree-code font-kanit">{root.root_code}</span>
                <span className="planning-tree-name font-kanit">{root.root_name}</span>
              </div>
            </div>

            <div className="planning-tree-summary">
              <div className="planning-tree-summary-left">
                {priceText && <span style={{ color: '#22c55e', fontWeight: 500, fontFamily: 'Kanit, sans-serif' }}>{priceText}</span>}
                {dateText && (
                  <span style={{ fontFamily: 'Kanit, sans-serif' }}>
                    <CalendarOutlined style={{ fontSize: '9px', marginRight: '3px' }} />
                    {dateText}
                  </span>
                )}
              </div>
              <div className="planning-tree-summary-right">
                {totalItems > 0 && (
                  <div className="planning-tree-progress">
                    <div className="planning-tree-progress-bar">
                      <div
                        className="planning-tree-progress-fill"
                        style={{
                          width: `${completionRate}%`,
                          background: completionRate === 100 ? '#22c55e' : 'linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%)'
                        }}
                      />
                    </div>
                    <span className="planning-tree-progress-text font-kanit" style={{ color: completionRate === 100 ? '#22c55e' : '#7c3aed' }}>
                      {completionRate}%
                    </span>
                  </div>
                )}
                <div className="planning-tree-status">
                  <Tag color={rootStatus.color} icon={rootStatus.status === 'completed' ? <CheckCircleOutlined /> : <ClockCircleOutlined />} style={{ fontFamily: 'Kanit, sans-serif' }}>
                    {rootStatus.label}
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
        totalPrice
      };
    });
  };

  const formatTreeGridData = (roots) => {
    const result = [];

    // ✅ Helper: แปลงค่าให้เป็นตัวเลขเสมอ ป้องกัน NaN และ string concatenation
    const toNum = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    };

    roots.forEach(root => {
      // ✅ Calculate root total from its categories
      let rootTotal = 0;
      if (root.categories) {
        root.categories.forEach(cat => {
          let catTotal = 0;
          if (cat.types) {
            cat.types.forEach(type => {
              let typeTotal = toNum(type.type_price);
              if (type.subtypes) {
                type.subtypes.forEach(sub => {
                  typeTotal += toNum(sub.total_price);
                });
              }
              catTotal += typeTotal;
            });
          }
          rootTotal += catTotal;
        });
      }

      result.push({
        key: `root-${root.root_id}`,
        code: root.root_code,
        name: root.root_name,
        description: root.root_description,
        start_date: root.start_date,
        end_date: root.end_date,
        quantity: null,
        unit: null,
        unit_price: null,
        total_price: rootTotal > 0 ? rootTotal : (toNum(root.root_total_price) || null),
        attachment_url: null,
        attachment_name: null,
        ifc_url: null,
        ifc_name: null,
        level: 0,
        type: 'root',
        data: root,
        status: getItemStatus(root, root),
        hasChildren: root.categories && root.categories.length > 0
      });

      if (root.categories) {
        root.categories.forEach(cat => {
          // ✅ Calculate category total from its types
          let catTotal = 0;
          if (cat.types) {
            cat.types.forEach(type => {
              let typeTotal = toNum(type.type_price);
              if (type.subtypes) {
                type.subtypes.forEach(sub => {
                  typeTotal += toNum(sub.total_price);
                });
              }
              catTotal += typeTotal;
            });
          }

          result.push({
            key: `category-${cat.category_id}`,
            code: cat.category_code,
            name: cat.category_name,
            description: cat.category_description,
            start_date: cat.start_date,
            end_date: cat.end_date,
            quantity: null,
            unit: null,
            unit_price: null,
            total_price: catTotal > 0 ? catTotal : null,
            attachment_url: null,
            attachment_name: null,
            ifc_url: null,
            ifc_name: null,
            level: 1,
            type: 'category',
            data: cat,
            status: getItemStatus(cat),
            parent: `root-${root.root_id}`,
            hasChildren: cat.types && cat.types.length > 0
          });

          if (cat.types) {
            cat.types.forEach(type => {
              // ✅ Calculate type total from its subtypes + its own price
              let typeTotal = toNum(type.type_price);
              if (type.subtypes) {
                type.subtypes.forEach(sub => {
                  typeTotal += toNum(sub.total_price);
                });
              }

              result.push({
                key: `type-${type.type_id}`,
                code: type.type_code,
                name: type.type_name,
                description: type.type_description,
                start_date: type.start_date,
                end_date: type.end_date,
                quantity: null,
                unit: null,
                unit_price: null,
                total_price: typeTotal > 0 ? typeTotal : null,
                attachment_url: type.attachment_url,
                attachment_name: type.attachment_name,
                ifc_url: type.ifc_url,
                ifc_name: type.ifc_name,
                level: 2,
                type: 'type',
                data: type,
                status: getItemStatus(type),
                parent: `category-${cat.category_id}`,
                hasChildren: type.subtypes && type.subtypes.length > 0
              });

              if (type.subtypes) {
                type.subtypes.forEach(sub => {
                  result.push({
                    key: `subtype-${sub.subtype_id}`,
                    code: sub.subtype_code,
                    name: sub.subtype_name,
                    description: sub.subtype_description,
                    start_date: sub.start_date,
                    end_date: sub.end_date,
                    quantity: sub.quantity,
                    unit: sub.unit,
                    unit_price: sub.unit_price,
                    total_price: toNum(sub.total_price) > 0 ? toNum(sub.total_price) : null,
                    attachment_url: sub.attachment_url,
                    attachment_name: sub.attachment_name,
                    ifc_url: sub.ifc_url,
                    ifc_name: sub.ifc_name,
                    level: 3,
                    type: 'subtype',
                    data: sub,
                    status: getItemStatus(sub),
                    parent: `type-${type.type_id}`,
                    hasChildren: false
                  });
                });
              }
            });
          }
        });
      }
    });

    return result;
  };

  const generateAutoCode = async (type, parentId) => {
    try {
      const token = localStorage.getItem('token');

      if (type === 'root') {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/planning/roots/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const roots = response.data.data;
        if (roots.length === 0) return { code: '1', sortOrder: 1 };
        const lastRoot = roots[roots.length - 1];
        const nextNum = parseInt(lastRoot.root_code) + 1;
        const nextSort = (lastRoot.sort_order || 0) + 1;
        return { code: String(nextNum), sortOrder: nextSort };

      } else if (type === 'category') {
        const [rootResponse, categoriesResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/planning/roots/${id}`,
            { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/planning/categories/${parentId}`,
            { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const root = rootResponse.data.data.find(r => r.root_id === parentId);
        const parentCode = root ? root.root_code : '01';
        const categories = categoriesResponse.data.data;
        const nextSort = categories.length + 1;

        if (categories.length === 0) {
          return { code: `${parentCode}.01`, sortOrder: nextSort };
        }

        const lastCode = categories[categories.length - 1].category_code;
        const parts = lastCode.split('.');
        const nextNum = parseInt(parts[parts.length - 1]) + 1;
        return { code: `${parentCode}.${String(nextNum).padStart(2, '0')}`, sortOrder: nextSort };

      } else if (type === 'type') {
        const category = treeGridData.find(row =>
          row.type === 'category' && row.data.category_id === parentId
        );
        const categoryCode = category ? category.code : '01.01';

        const typesResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/planning/types/${parentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const types = typesResponse.data.data;
        const nextSort = types.length + 1;

        if (types.length === 0) {
          return { code: `${categoryCode}.01`, sortOrder: nextSort };
        }

        const lastCode = types[types.length - 1].type_code;
        const parts = lastCode.split('.');
        const nextNum = parseInt(parts[parts.length - 1]) + 1;
        return { code: `${categoryCode}.${String(nextNum).padStart(2, '0')}`, sortOrder: nextSort };

      } else if (type === 'subtype') {
        const typeRow = treeGridData.find(row =>
          row.type === 'type' && row.data.type_id === parentId
        );
        const typeCode = typeRow ? typeRow.code : '01.01.01';

        const subtypesResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/planning/subtypes/${parentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const subtypes = subtypesResponse.data.data;
        const nextSort = subtypes.length + 1;

        if (subtypes.length === 0) {
          return { code: `${typeCode}.01`, sortOrder: nextSort };
        }

        const lastCode = subtypes[subtypes.length - 1].subtype_code;
        const parts = lastCode.split('.');
        const nextNum = parseInt(parts[parts.length - 1]) + 1;
        return { code: `${typeCode}.${String(nextNum).padStart(2, '0')}`, sortOrder: nextSort };
      }

      return { code: '01', sortOrder: 1 };

    } catch (error) {
      console.error('Error generating auto code:', error);
      return type === 'root' ? { code: '1', sortOrder: 1 } : { code: '', sortOrder: 1 };
    }
  };

  const openModal = async (type, mode = 'create', item = null, parent = null) => {
    setModalType(type);
    setModalMode(mode);
    setSelectedItem(item);
    setParentId(parent);
    setModalVisible(true);
    setDuration(null);
    setFileList([]);
    setRemoveAttachment(false); // ✅ Reset state

    if (mode === 'edit' && item) {
      const formData = {
        [`${type}_code`]: item[`${type}_code`],
        [`${type}_name`]: item[`${type}_name`],
        [`${type}_description`]: item[`${type}_description`],
        start_date: item.start_date ? dayjs(item.start_date) : null,
        end_date: item.end_date ? dayjs(item.end_date) : null,
        sort_order: item.sort_order
      };

      if (type === 'type') {
        formData.type_price = item.type_price;
        if (item.attachment_url) {
          setFileList([{
            uid: '-1',
            name: item.attachment_name || 'file',
            status: 'done',
            url: `${import.meta.env.VITE_API_URL}${item.attachment_url}`
          }]);
        }
      } else if (type === 'subtype') {
        formData.quantity = item.quantity;
        formData.unit = item.unit;
        formData.unit_price = item.unit_price;
        formData.total_price = item.total_price;
        if (item.attachment_url) {
          setFileList([{
            uid: '-1',
            name: item.attachment_name || 'file',
            status: 'done',
            url: `${import.meta.env.VITE_API_URL}${item.attachment_url}`
          }]);
        }
      }

      form.setFieldsValue(formData);

      if (item.start_date && item.end_date) {
        const start = dayjs(item.start_date);
        const end = dayjs(item.end_date);
        const calculatedDuration = end.diff(start, 'day') + 1;
        setDuration(calculatedDuration);
        form.setFieldsValue({ duration: calculatedDuration });
      }
    } else {
      form.resetFields();
      const autoData = await generateAutoCode(type, parent);

      if (type === 'root') {
        form.setFieldsValue({
          root_code: autoData.code,
          sort_order: autoData.sortOrder
        });
      } else {
        form.setFieldsValue({
          [`${type}_code`]: autoData.code,
          sort_order: autoData.sortOrder
        });
      }
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    form.resetFields();
    setSelectedItem(null);
    setParentId(null);
    setDuration(null);
    setFileList([]);
    setRemoveAttachment(false); // ✅ Reset state
  };

  const handleDurationChange = (value) => {
    setDuration(value);
    const startDate = form.getFieldValue('start_date');
    if (startDate && value) {
      const endDate = startDate.add(value - 1, 'day');
      form.setFieldsValue({ end_date: endDate });
    } else {
      form.setFieldsValue({ end_date: null });
    }
  };

  const handleStartDateChange = (date) => {
    if (date && duration) {
      const endDate = date.add(duration - 1, 'day');
      form.setFieldsValue({ end_date: endDate });
    }
  };

  // ✅ ฟังก์ชันจัดการลบไฟล์แนบ
  const handleRemoveAttachment = () => {
    setFileList([]);
    setRemoveAttachment(true);
    message.success('จะลบไฟล์แนบเมื่อบันทึกข้อมูล');
  };

  // ✅ แก้ไข handleSubmit ให้ส่ง job_number ไปด้วย
  const handleSubmit = async (values) => {
    try {
      const token = localStorage.getItem('token');

      const isFileObject = fileList.length > 0 && fileList[0] instanceof File;
      const hasOriginFileObj = fileList.length > 0 && fileList[0].originFileObj instanceof File;
      const hasNewFile = isFileObject || hasOriginFileObj;

      const isIfcFileObject = ifcFileList.length > 0 && ifcFileList[0] instanceof File;
      const hasOriginIfcObj = ifcFileList.length > 0 && ifcFileList[0].originFileObj instanceof File;
      const hasNewIfcFile = isIfcFileObject || hasOriginIfcObj;

      const needsFormData = (modalType === 'type' || modalType === 'subtype') &&
        (hasNewFile || removeAttachment || hasNewIfcFile || removeIfc);

      let endpoint = '';
      let data;
      let config;

      if (needsFormData) {
        const formData = new FormData();
        formData.append('job_number', jobNumber);

        Object.keys(values).forEach(key => {
          if (key === 'start_date' || key === 'end_date') {
            if (values[key]) {
              formData.append(key, values[key].format('YYYY-MM-DD'));
            }
          } else if (key !== 'duration') {
            const value = values[key];
            if (value !== null && value !== undefined) {
              formData.append(key, value);
            }
          }
        });

        if (hasNewFile) {
          const file = isFileObject ? fileList[0] : fileList[0].originFileObj;
          formData.append('attachment', file);
        }

        if (removeAttachment) formData.append('remove_attachment', 'true');

        if (hasNewIfcFile) {
          const file = isIfcFileObject ? ifcFileList[0] : ifcFileList[0].originFileObj;
          formData.append('ifc_file', file);
        }

        if (removeIfc) formData.append('remove_ifc', 'true');

        if (modalMode === 'create') {
          if (modalType === 'type') {
            formData.append('category_id', parentId);
            endpoint = '/api/planning/types';
          } else if (modalType === 'subtype') {
            formData.append('type_id', parentId);
            endpoint = '/api/planning/subtypes';
          }
        } else {
          const itemId = selectedItem[`${modalType}_id`];
          const pluralType = modalType === 'subtype' ? 'subtypes' : 'types';
          endpoint = `/api/planning/${pluralType}/${itemId}`;
        }

        data = formData;
        config = { headers: { Authorization: `Bearer ${token}` } };
      } else {
        data = {
          ...values,
          start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
          end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
        };
        delete data.duration;

        if (modalMode === 'create') {
          if (modalType === 'root') {
            data.project_id = id;
            endpoint = '/api/planning/roots';
          } else if (modalType === 'category') {
            data.root_id = parentId;
            endpoint = '/api/planning/categories';
          } else if (modalType === 'type') {
            data.category_id = parentId;
            endpoint = '/api/planning/types';
          } else if (modalType === 'subtype') {
            data.type_id = parentId;
            endpoint = '/api/planning/subtypes';
          }
        } else {
          const itemId = selectedItem[`${modalType}_id`];
          const pluralType = modalType === 'category' ? 'categories' : `${modalType}s`;
          endpoint = `/api/planning/${pluralType}/${itemId}`;
        }

        config = {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };
      }

      if (modalMode === 'create') {
        await axios.post(`${import.meta.env.VITE_API_URL}${endpoint}`, data, config);
        message.success('เพิ่มข้อมูลสำเร็จ');
      } else {
        await axios.put(`${import.meta.env.VITE_API_URL}${endpoint}`, data, config);
        message.success('แก้ไขข้อมูลสำเร็จ');
      }

      closeModal();
      if (modalType === 'type' || modalType === 'subtype' || modalType === 'category') {
        await updateRootData();
      }
      fetchTreeData();
    } catch (error) {
      console.error('Error submitting form:', error);
      message.error('เกิดข้อผิดพลาด: ' + (error.response?.data?.message || error.message));
    }
  };

  const updateRootData = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/planning/update-root-data/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Error updating root data:', error);
    }
  };

  const handleDelete = async (item, type) => {
    try {
      const token = localStorage.getItem('token');
      const itemId = item[`${type}_id`];

      const pluralType = type === 'category' ? 'categories' : `${type}s`;

      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/planning/${pluralType}/${itemId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      message.success('ลบข้อมูลสำเร็จ');

      if (type === 'type' || type === 'subtype' || type === 'category') {
        await updateRootData();
      }

      fetchTreeData();
    } catch (error) {
      console.error('Error deleting:', error);
      message.error('ไม่สามารถลบข้อมูลได้');
    }
  };

  const handleTreeSelect = (selectedKeys) => {
    if (selectedKeys.length > 0) {
      const key = selectedKeys[0];
      if (key.startsWith('root-')) {
        const rootId = parseInt(key.replace('root-', ''));
        setSelectedRootId(rootId);
      }
    }
  };

  const handleExpand = (expanded, record) => {
    const key = record.key;
    if (expanded) {
      setExpandedRowKeys([...expandedRowKeys, key]);
    } else {
      setExpandedRowKeys(expandedRowKeys.filter(k => k !== key));
    }
  };

  const renderPlanDates = (record) => {
    if (!record.start_date || !record.end_date) {
      return <Text type="secondary" style={{ fontSize: '12px', fontFamily: 'Kanit, sans-serif' }}>-</Text>;
    }

    const start = dayjs(record.start_date);
    const end = dayjs(record.end_date);
    const duration = end.diff(start, 'day') + 1;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Text style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'Kanit, sans-serif' }}>
          {start.format('DD/MM/YY')} - {end.format('DD/MM/YY')}
        </Text>
        <Text type="secondary" style={{ fontSize: '11px', fontFamily: 'Kanit, sans-serif' }}>
          ({duration} วัน)
        </Text>
      </div>
    );
  };

  const renderAttachment = (record) => {
    if (!record.attachment_url) {
      return <Text type="secondary" style={{ fontSize: '12px' }}>-</Text>;
    }

    const isPdf = record.attachment_url.toLowerCase().endsWith('.pdf');
    const icon = isPdf
      ? <FilePdfOutlined style={{ color: '#ef4444', fontSize: '16px' }} />
      : <FileImageOutlined style={{ color: '#3b82f6', fontSize: '16px' }} />;

    return (
      <Tooltip title={record.attachment_name || 'ดูไฟล์'}>
        <a
          href={`${import.meta.env.VITE_API_URL}${record.attachment_url}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          {icon}
        </a>
      </Tooltip>
    );
  };

  const getTreeGridColumns = () => {
    return [
      {
        title: <span className="font-kanit">รหัส</span>,
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
                  style={{ marginRight: 4, padding: 0, width: 18, height: 18, fontSize: '12px' }}
                />
              )}
              {!hasChildren && <span style={{ width: 22, display: 'inline-block' }}></span>}
              <Text style={{
                fontSize: '12px',
                fontWeight: record.level === 0 ? 600 : 400,
                whiteSpace: 'nowrap',
                fontFamily: 'Kanit, sans-serif'
              }}>
                {text}
              </Text>
            </div>
          );
        }
      },
      {
        title: <span className="font-kanit">ชื่อรายการ</span>,
        dataIndex: 'name',
        key: 'name',
        width: 300,
        ellipsis: true,
        render: (text, record) => (
          <Text strong={record.level === 0} style={{ fontSize: '12px', fontFamily: 'Kanit, sans-serif' }}>
            {text}
          </Text>
        )
      },
      {
        title: <span className="font-kanit">IFC</span>,
        dataIndex: 'ifc_url',
        key: 'ifc',
        width: 50,
        align: 'center',
        render: (url, record) => {
          if (!url) return <Text type="secondary" style={{ fontSize: '11px' }}>-</Text>;

          let fileId = '';
          if (record.type === 'type') {
            fileId = `planning_type_${record.data.type_id}`;
          } else if (record.type === 'subtype') {
            fileId = `planning_subtype_${record.data.subtype_id}`;
          }

          if (!fileId) return <Text type="secondary" style={{ fontSize: '11px' }}>-</Text>;

          return (
            <Tooltip title={record.ifc_name || 'เปิดดูโมเดล 3D'}>
              <Button
                type="text"
                size="small"
                icon={<AppstoreOutlined style={{ color: '#0891b2', fontSize: '16px' }} />}
                onClick={() => window.open(`/cm/project/${id}/viewerifc/${fileId}`, '_blank')}
                style={{ padding: 0 }}
              />
            </Tooltip>
          );
        }
      },
      {
        title: <span className="font-kanit">ไฟล์แนบ</span>,
        key: 'attachment',
        width: 50,
        align: 'center',
        render: (_, record) => renderAttachment(record)
      },
      {
        title: <span className="font-kanit">Plan</span>,
        key: 'plan',
        width: 120,
        render: (_, record) => renderPlanDates(record)
      },
      {
        title: <span className="font-kanit">สถานะ</span>,
        key: 'status',
        width: 80,
        align: 'center',
        render: (_, record) => (
          <Tag
            color={record.status.color}
            icon={record.status.status === 'completed' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
            style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'Kanit, sans-serif' }}
          >
            {record.status.label}
          </Tag>
        )
      },
      {
        title: <span className="font-kanit">ปริมาณ</span>,
        dataIndex: 'quantity',
        key: 'quantity',
        width: 70,
        align: 'right',
        render: (val, record) => {
          if (val === null || val === undefined) return <Text type="secondary" style={{ fontSize: '12px', fontFamily: 'Kanit, sans-serif' }}>-</Text>;
          return (
            <Text style={{ fontSize: '12px', fontFamily: 'Kanit, sans-serif' }}>
              {Number(val).toLocaleString()} {record.unit || ''}
            </Text>
          );
        }
      },
      {
        title: <span className="font-kanit">ราคา/หน่วย</span>,
        dataIndex: 'unit_price',
        key: 'unit_price',
        width: 70,
        align: 'right',
        render: (val) => {
          const num = Number(val);
          if (val === null || val === undefined || isNaN(num)) return <Text type="secondary" style={{ fontSize: '12px', fontFamily: 'Kanit, sans-serif' }}>-</Text>;
          return (
            <Text style={{ fontSize: '12px', fontFamily: 'Kanit, sans-serif' }}>
              ฿{num.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          );
        }
      },
      {
        title: <span className="font-kanit">ราคารวม</span>,
        dataIndex: 'total_price',
        key: 'total_price',
        width: 100,
        align: 'right',
        render: (val, record) => {
          const num = Number(val);
          if (val === null || val === undefined || val === 0 || isNaN(num)) return <Text type="secondary" style={{ fontSize: '12px', fontFamily: 'Kanit, sans-serif' }}>-</Text>;
          return (
            <Text strong style={{ color: record.level === 0 ? '#8b5cf6' : '#22c55e', fontSize: '12px', fontFamily: 'Kanit, sans-serif' }}>
              ฿{num.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          );
        }
      },
      {
        title: <span className="font-kanit">จัดการ</span>,
        key: 'action',
        width: 90,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Tooltip title={<span className="font-kanit">แก้ไข</span>}>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openModal(record.type, 'edit', record.data)}
              />
            </Tooltip>
            {(record.type === 'root' || record.type === 'category' || record.type === 'type') && (
              <Tooltip title={<span className="font-kanit">เพิ่มรายการย่อย</span>}>
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    const childType =
                      record.type === 'root' ? 'category' :
                        record.type === 'category' ? 'type' :
                          'subtype';
                    openModal(childType, 'create', null, record.data[`${record.type}_id`]);
                  }}
                />
              </Tooltip>
            )}
            <Popconfirm
              title={<span className="font-kanit">ยืนยันการลบ</span>}
              description={<span className="font-kanit">คุณแน่ใจว่าต้องการลบรายการนี้?</span>}
              onConfirm={() => handleDelete(record.data, record.type)}
              okText={<span className="font-kanit">ลบ</span>}
              cancelText={<span className="font-kanit">ยกเลิก</span>}
            >
              <Tooltip title={<span className="font-kanit">ลบ</span>}>
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      }
    ];
  };

  const isChildOfSelectedRoot = (row) => {
    if (row.type === 'category') {
      const root = treeGridData.find(r => r.key === row.parent);
      return root && root.data.root_id === selectedRootId;
    } else if (row.type === 'type') {
      const category = treeGridData.find(r => r.key === row.parent);
      if (!category) return false;
      const root = treeGridData.find(r => r.key === category.parent);
      return root && root.data.root_id === selectedRootId;
    } else if (row.type === 'subtype') {
      const type = treeGridData.find(r => r.key === row.parent);
      if (!type) return false;
      const category = treeGridData.find(r => r.key === type.parent);
      if (!category) return false;
      const root = treeGridData.find(r => r.key === category.parent);
      return root && root.data.root_id === selectedRootId;
    }
    return false;
  };

  const getVisibleRows = () => {
    if (!selectedRootId) return [];

    const filteredData = treeGridData.filter(row => {
      if (row.type === 'root') {
        return row.data.root_id === selectedRootId;
      }
      return isChildOfSelectedRoot(row);
    });

    if (expandedRowKeys.length === 0) {
      return filteredData.filter(row => row.level === 0);
    }

    const visible = [];
    const isParentExpanded = (row) => {
      if (row.level === 0) return true;
      if (!row.parent) return true;

      const parentExpanded = expandedRowKeys.includes(row.parent);
      if (!parentExpanded) return false;

      const parent = filteredData.find(r => r.key === row.parent);
      return parent ? isParentExpanded(parent) : false;
    };

    filteredData.forEach(row => {
      if (isParentExpanded(row)) {
        visible.push(row);
      }
    });

    return visible;
  };

  const uploadProps = {
    beforeUpload: (file) => {
      const isValidType = file.type === 'application/pdf' || file.type.startsWith('image/');
      if (!isValidType) {
        message.error('อนุญาตเฉพาะไฟล์รูปภาพหรือ PDF เท่านั้น!');
        return false;
      }
      const isLt500M = file.size / 1024 / 1024 < 500;
      if (!isLt500M) {
        message.error('ไฟล์ต้องมีขนาดไม่เกิน 500MB!');
        return false;
      }

      setFileList([file]);
      return false;
    },
    onRemove: () => {
      setFileList([]);
    },
    fileList: fileList,
    maxCount: 1,
    accept: 'image/*,.pdf'
  };

  const ifcUploadProps = {
    beforeUpload: (file) => {
      const isIfc = file.name.toLowerCase().endsWith('.ifc');
      if (!isIfc) {
        message.error('อนุญาตเฉพาะไฟล์ .ifc เท่านั้น!');
        return false;
      }
      const isLt500M = file.size / 1024 / 1024 < 500;
      if (!isLt500M) {
        message.error('ไฟล์ต้องมีขนาดไม่เกิน 500MB!');
        return false;
      }

      setIfcFileList([file]);
      return false;
    },
    onRemove: () => {
      setIfcFileList([]);
    },
    fileList: ifcFileList,
    maxCount: 1,
    accept: '.ifc'
  };

  const renderModalForm = () => {
    const iconMap = {
      root: <UnorderedListOutlined style={{ color: '#8b5cf6' }} />,
      category: <FolderOutlined style={{ color: '#3b82f6' }} />,
      type: <AppstoreOutlined style={{ color: '#10b981' }} />,
      subtype: <FileTextOutlined style={{ color: '#f59e0b' }} />
    };

    const getTitle = () => {
      const action = modalMode === 'create' ? 'เพิ่ม' : 'แก้ไข';
      const name = modalType === 'root' ? 'หมวดงานหลัก' :
        modalType === 'category' ? 'หมวดงานย่อย' :
          modalType === 'type' ? 'ประเภทงาน' : 'รายการงานย่อย';
      return `${action}${name}`;
    };

    const totalPrice = modalType === 'subtype'
      ? ((form.getFieldValue('quantity') || 0) * (form.getFieldValue('unit_price') || 0))
      : null;

    return (
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 0 12px',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: '16px'
        }}>
          {iconMap[modalType]}
          <Title level={5} style={{ margin: 0, color: '#1f2937', fontFamily: 'Kanit, sans-serif' }}>{getTitle()}</Title>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          size="middle"
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
          style={{ fontFamily: 'Kanit, sans-serif' }}
        >
          {/* ROOT */}
          {modalType === 'root' && (
            <>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="root_code" label={<span className="font-kanit">รหัส</span>} rules={[{ required: true }]}>
                    <Input className="font-kanit" prefix={<Tag style={{ background: '#f0f5ff', border: 'none', color: '#8b5cf6', fontFamily: 'Kanit, sans-serif' }}>AUTO</Tag>} disabled style={{ backgroundColor: '#f9f9f9' }} />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name="root_name" label={<span className="font-kanit">ชื่อหมวดงานหลัก</span>} rules={[{ required: true }]}>
                    <Input className="font-kanit" placeholder="เช่น งานก่อสร้าง, งานระบบ" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="sort_order" hidden><InputNumber /></Form.Item>
              <Alert className="font-kanit" message="รหัสและลำดับจะถูกสร้างอัตโนมัติ" type="info" showIcon style={{ fontSize: '12px', padding: '8px 12px' }} />
            </>
          )}

          {/* CATEGORY */}
          {modalType === 'category' && (
            <>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="category_code" label={<span className="font-kanit">รหัส</span>} rules={[{ required: true }]}>
                    <Input className="font-kanit" prefix={<Tag style={{ background: '#e0f2fe', border: 'none', color: '#0ea5e9', fontFamily: 'Kanit, sans-serif' }}>AUTO</Tag>} disabled style={{ backgroundColor: '#f9f9f9' }} />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name="category_name" label={<span className="font-kanit">ชื่อหมวดงานย่อย</span>} rules={[{ required: true }]}>
                    <Input className="font-kanit" placeholder="เช่น งานฐานราก, งานโครงสร้าง" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="sort_order" hidden><InputNumber /></Form.Item>
              <Alert className="font-kanit" message="รหัสจะถูกสร้างตามลำดับของหมวดงานหลัก" type="info" showIcon style={{ fontSize: '12px', padding: '8px 12px' }} />
            </>
          )}

          {/* TYPE */}
          {modalType === 'type' && (
            <>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="type_code" label={<span className="font-kanit">รหัส</span>} rules={[{ required: true }]}>
                    <Input className="font-kanit" prefix={<Tag style={{ background: '#ecfdf5', border: 'none', color: '#10b981', fontFamily: 'Kanit, sans-serif' }}>AUTO</Tag>} disabled style={{ backgroundColor: '#f9f9f9' }} />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name="type_name" label={<span className="font-kanit">ชื่อประเภทงาน</span>}>
                    <Input className="font-kanit" placeholder="เช่น คอนกรีตเสริมเหล็ก (ไม่บังคับ)" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '16px 0', fontFamily: 'Kanit, sans-serif' }}>ไฟล์ IFC (Building Information Modeling)</Divider>

              {/* ✅ แสดงไฟล์ IFC เดิม (ถ้ามี) */}
              {modalMode === 'edit' && selectedItem && selectedItem.ifc_url && !removeIfc && (
                <Alert
                  message={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <AppstoreOutlined style={{ color: '#0891b2' }} />
                        <span>{selectedItem.ifc_name || 'ไฟล์ IFC'}</span>
                      </Space>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => setRemoveIfc(true)}
                      >
                        ลบไฟล์
                      </Button>
                    </div>
                  }
                  type="info"
                  showIcon={false}
                  style={{ marginBottom: '12px' }}
                />
              )}

              {(!selectedItem?.ifc_url || removeIfc) && (
                <Upload {...ifcUploadProps}>
                  <Button icon={<UploadOutlined />} className="font-kanit" style={{ width: '100%', marginBottom: '12px' }}>
                    อัปโหลดไฟล์ IFC (.ifc)
                  </Button>
                </Upload>
              )}

              <Form.Item name="type_description" label={<span className="font-kanit">รายละเอียด</span>}>
                <TextArea className="font-kanit" rows={2} placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)" />
              </Form.Item>

              <Divider style={{ margin: '16px 0', fontFamily: 'Kanit, sans-serif' }}>ไฟล์แนบ (รูปภาพหรือ PDF)</Divider>

              {/* ✅ แสดงไฟล์เดิม (ถ้ามี) พร้อมปุ่มลบ */}
              {modalMode === 'edit' && fileList.length > 0 && fileList[0].status === 'done' && !removeAttachment && (
                <Alert
                  message={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="font-kanit">
                        <PaperClipOutlined /> ไฟล์ปัจจุบัน: {fileList[0].name}
                      </span>
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={handleRemoveAttachment}
                      >
                        <span className="font-kanit">ลบไฟล์</span>
                      </Button>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: '12px' }}
                />
              )}

              {/* ✅ แสดง Upload เฉพาะเมื่อไม่มีไฟล์เดิม หรือต้องการลบไฟล์เดิมแล้ว */}
              {(fileList.length === 0 || removeAttachment) && (
                <Upload {...uploadProps} className="font-kanit">
                  <Button className="font-kanit" icon={<UploadOutlined />} block>
                    เลือกไฟล์ (รูปภาพ หรือ PDF)
                  </Button>
                </Upload>
              )}

              {fileList.length > 0 && fileList[0].status !== 'done' && (
                <Alert
                  className="font-kanit"
                  message={`ไฟล์ที่เลือก: ${fileList[0].name}`}
                  type="success"
                  showIcon
                  style={{ fontSize: '12px', padding: '8px 12px', marginTop: '8px' }}
                />
              )}

              <Divider style={{ margin: '16px 0', fontFamily: 'Kanit, sans-serif' }}>กำหนดระยะเวลา</Divider>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="start_date" label={<span className="font-kanit">วันที่เริ่มต้น</span>}>
                    <DatePicker className="font-kanit" style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="เลือกวันที่" onChange={handleStartDateChange} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="duration" label={<span className="font-kanit">ระยะเวลา (วัน)</span>}>
                    <InputNumber className="font-kanit" min={0} style={{ width: '100%' }} placeholder="จำนวนวัน" onChange={handleDurationChange} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="end_date" label={<span className="font-kanit">วันที่สิ้นสุด</span>}>
                    <DatePicker className="font-kanit" style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="คำนวณอัตโนมัติ" disabled />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '16px 0', fontFamily: 'Kanit, sans-serif' }}>กำหนดราคา</Divider>
              <Row gutter={12}>
                <Col span={24}>
                  <Form.Item name="type_price" label={<span className="font-kanit">ราคารวม (บาท)</span>}>
                    <InputNumber
                      className="font-kanit"
                      min={0}
                      step={0.01}
                      style={{ width: '100%' }}
                      formatter={value => value ? `฿${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                      parser={value => value.replace(/฿\s?|(,*)/g, '')}
                      placeholder="ระบุราคารวม (ไม่บังคับ)"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="sort_order" hidden><InputNumber /></Form.Item>
            </>
          )}

          {/* SUBTYPE */}
          {modalType === 'subtype' && (
            <>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="subtype_code" label={<span className="font-kanit">รหัส</span>} rules={[{ required: true }]}>
                    <Input className="font-kanit" prefix={<Tag style={{ background: '#fffbeb', border: 'none', color: '#f59e0b', fontFamily: 'Kanit, sans-serif' }}>AUTO</Tag>} disabled style={{ backgroundColor: '#f9f9f9' }} />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name="subtype_name" label={<span className="font-kanit">ชื่อรายการ</span>}>
                    <Input className="font-kanit" placeholder="เช่น เสาเข็ม, คานคอดิน" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="subtype_description" label={<span className="font-kanit">รายละเอียด</span>}>
                <TextArea className="font-kanit" rows={2} placeholder="รายละเอียดเพิ่มเติม" />
              </Form.Item>

              <Divider style={{ margin: '16px 0', fontFamily: 'Kanit, sans-serif' }}>ไฟล์แนบ (รูปภาพหรือ PDF)</Divider>

              {/* ✅ แสดงไฟล์เดิม (ถ้ามี) พร้อมปุ่มลบ */}
              {modalMode === 'edit' && fileList.length > 0 && fileList[0].status === 'done' && !removeAttachment && (
                <Alert
                  message={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="font-kanit">
                        <PaperClipOutlined /> ไฟล์ปัจจุบัน: {fileList[0].name}
                      </span>
                      <Button
                        type="link"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={handleRemoveAttachment}
                      >
                        <span className="font-kanit">ลบไฟล์</span>
                      </Button>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: '12px' }}
                />
              )}

              {/* ✅ แสดง Upload เฉพาะเมื่อไม่มีไฟล์เดิม หรือต้องการลบไฟล์เดิมแล้ว */}
              {(fileList.length === 0 || removeAttachment) && (
                <Upload {...uploadProps} className="font-kanit">
                  <Button className="font-kanit" icon={<UploadOutlined />} block>
                    เลือกไฟล์ (รูปภาพ หรือ PDF)
                  </Button>
                </Upload>
              )}

              {fileList.length > 0 && fileList[0].status !== 'done' && (
                <Alert
                  className="font-kanit"
                  message={`ไฟล์ที่เลือก: ${fileList[0].name}`}
                  type="success"
                  showIcon
                  style={{ fontSize: '12px', padding: '8px 12px', marginTop: '8px' }}
                />
              )}

              <Divider style={{ margin: '16px 0', fontFamily: 'Kanit, sans-serif' }}>ไฟล์ IFC (Building Information Modeling)</Divider>

              {/* ✅ แสดงไฟล์ IFC เดิม (ถ้ามี) */}
              {modalMode === 'edit' && selectedItem && selectedItem.ifc_url && !removeIfc && (
                <Alert
                  message={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <AppstoreOutlined style={{ color: '#0891b2' }} />
                        <span>{selectedItem.ifc_name || 'ไฟล์ IFC'}</span>
                      </Space>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => setRemoveIfc(true)}
                      >
                        ลบไฟล์
                      </Button>
                    </div>
                  }
                  type="info"
                  showIcon={false}
                  style={{ marginBottom: '12px' }}
                />
              )}

              {(!selectedItem?.ifc_url || removeIfc) && (
                <Upload {...ifcUploadProps}>
                  <Button icon={<UploadOutlined />} className="font-kanit" style={{ width: '100%', marginBottom: '12px' }}>
                    อัปโหลดไฟล์ IFC (.ifc)
                  </Button>
                </Upload>
              )}

              {ifcFileList.length > 0 && ifcFileList[0].status !== 'done' && (
                <Alert
                  className="font-kanit"
                  message={`ไฟล์ที่เลือก: ${ifcFileList[0].name}`}
                  type="success"
                  showIcon
                  style={{ fontSize: '12px', padding: '8px 12px', marginTop: '8px' }}
                />
              )}

              <Divider style={{ margin: '16px 0', fontFamily: 'Kanit, sans-serif' }}>กำหนดระยะเวลา</Divider>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="start_date" label={<span className="font-kanit">วันที่เริ่มต้น</span>}>
                    <DatePicker className="font-kanit" style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="เลือกวันที่" onChange={handleStartDateChange} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="duration" label={<span className="font-kanit">ระยะเวลา (วัน)</span>}>
                    <InputNumber className="font-kanit" min={0} style={{ width: '100%' }} placeholder="จำนวนวัน" onChange={handleDurationChange} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="end_date" label={<span className="font-kanit">วันที่สิ้นสุด</span>}>
                    <DatePicker className="font-kanit" style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="คำนวณอัตโนมัติ" disabled />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: '16px 0', fontFamily: 'Kanit, sans-serif' }}>กำหนดราคาและปริมาณ</Divider>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="quantity" label={<span className="font-kanit">ปริมาณ</span>}>
                    <InputNumber
                      className="font-kanit"
                      min={0}
                      step={0.01}
                      style={{ width: '100%' }}
                      placeholder="เช่น 150"
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="unit" label={<span className="font-kanit">หน่วย</span>}>
                    <Input className="font-kanit" placeholder="เช่น ตัว, ตร.ม." />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="unit_price" label={<span className="font-kanit">ราคา/หน่วย</span>}>
                    <InputNumber
                      className="font-kanit"
                      step={0.01}
                      style={{ width: '100%' }}
                      formatter={value => value !== undefined && value !== null && value !== '' ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                      parser={value => value ? value.replace(/,/g, '') : null}
                      placeholder="ว่างได้ (ไม่บังคับ)"
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="total_price" label={<span className="font-kanit">ราคารวม (บาท)</span>}>
                    <InputNumber
                      className="font-kanit"
                      min={0}
                      step={0.01}
                      style={{ width: '100%' }}
                      formatter={value => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                      parser={value => value.replace(/,/g, '')}
                      placeholder="ระบุราคารวม"
                    />
                  </Form.Item>
                </Col>
              </Row>

              {form.getFieldValue('quantity') && form.getFieldValue('unit_price') && (
                <div style={{ marginTop: '4px', textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: '11px', fontFamily: 'Kanit, sans-serif' }}>
                    ผลคูณเบื้องต้น: ฿{((form.getFieldValue('quantity') || 0) * (form.getFieldValue('unit_price') || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </div>
              )}

              <Form.Item name="sort_order" hidden><InputNumber /></Form.Item>
              <Alert className="font-kanit" message="ราคารวม: สามารถกรอกโดยตรง หรือใช้ผลคูณเบื้องต้นเป็นแนวทาง" type="info" showIcon style={{ fontSize: '12px', padding: '8px 12px', marginTop: '12px' }} />
            </>
          )}

          <Form.Item style={{ marginBottom: 0, marginTop: 20 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button className="font-kanit" onClick={closeModal}>ยกเลิก</Button>
              <Button className="font-kanit" type="primary" htmlType="submit">
                {modalMode === 'create' ? 'เพิ่ม' : 'บันทึก'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Text type="danger" style={{ fontFamily: 'Kanit, sans-serif' }}>ไม่พบข้อมูลโครงการ</Text>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full ${theme === 'dark' ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} transition-all duration-300 font-kanit flex flex-col`}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />

      <div className="flex-1 flex flex-col px-4 py-6 md:px-8 lg:px-12 max-w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/project/${id}`)} className="mr-3 text-lg" />
            <div>
              <Title level={3} className="m-0 font-kanit text-xl md:text-2xl">Planning: {project.project_name}</Title>
              <Breadcrumb
                items={[
                  { title: <span className="font-kanit">โครงการ</span> },
                  { title: <span className="font-kanit">{project.project_name}</span> },
                  { title: <span className="font-kanit">Planning</span> }
                ]}
              />
            </div>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('root', 'create')} size="large" className="font-kanit">
            เพิ่มหมวดงานหลัก
          </Button>
        </div>

        <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Sidebar - หมวดงาน */}
          {!sidebarCollapsed && (
            <div className="hidden lg:block lg:w-1/4 h-full transition-all duration-300">
              <Card
                title={
                  <span style={{ fontFamily: 'Kanit, sans-serif' }}>
                    หมวดงาน <Tag color="blue" style={{ fontFamily: 'Kanit, sans-serif' }}>{treeData.length}</Tag>
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
                      <Input.Search
                        placeholder="ค้นหา..."
                        allowClear
                        size="small"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ fontSize: '13px', fontFamily: 'Kanit, sans-serif' }}
                      />
                    </div>

                    <div
                      className="flex-1 overflow-auto"
                      style={{
                        padding: '8px 0',
                        minHeight: 0,
                        backgroundColor: '#fafafa'
                      }}
                    >
                      <Tree
                        showLine={false}
                        showIcon={false}
                        selectedKeys={selectedRootId ? [`root-${selectedRootId}`] : []}
                        onSelect={handleTreeSelect}
                        treeData={treeData.filter(node => {
                          if (!searchText) return true;
                          const searchLower = searchText.toLowerCase();
                          return node.data.root_code.toLowerCase().includes(searchLower) ||
                            node.data.root_name.toLowerCase().includes(searchLower);
                        })}
                        className="planning-tree text-left"
                        style={{ fontSize: '13px', lineHeight: '1.6', fontFamily: 'Kanit, sans-serif' }}
                        blockNode
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 px-4 bg-white">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      imageStyle={{ height: 40 }}
                      description={
                        <span className="text-xs" style={{ fontFamily: 'Kanit, sans-serif' }}>
                          ยังไม่มีหมวดงานหลัก<br />
                          <span className="text-blue-500">คลิก "เพิ่มหมวดงานหลัก"</span>
                        </span>
                      }
                    />
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Main Content - ตารางรายการ */}
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
                  <UnorderedListOutlined />
                  <span style={{ fontFamily: 'Kanit, sans-serif' }}>
                    {selectedRootId
                      ? `รายการใน: ${treeGridData.find(r => r.type === 'root' && r.data.root_id === selectedRootId)?.name || 'หมวดงานหลัก'}`
                      : 'เลือกหมวดงานหลักจากด้านซ้าย'}
                  </span>
                </Space>
              }
              className="h-full shadow-md"
              styles={{ body: { height: 'calc(100% - 55px)', overflow: 'auto' } }}
              extra={selectedRootId && (
                <Space>
                  <Button size="small" onClick={() => {
                    const allKeys = treeGridData.filter(row => row.hasChildren &&
                      (row.type === 'root' ? row.data.root_id === selectedRootId : isChildOfSelectedRoot(row))).map(row => row.key);
                    setExpandedRowKeys(allKeys);
                  }}>
                    <span style={{ fontFamily: 'Kanit, sans-serif' }}>ขยายทั้งหมด</span>
                  </Button>
                  <Button size="small" onClick={() => setExpandedRowKeys([])}>
                    <span style={{ fontFamily: 'Kanit, sans-serif' }}>ย่อทั้งหมด</span>
                  </Button>
                </Space>
              )}
            >
              {!selectedRootId ? (
                <Empty
                  description={
                    <span style={{ fontFamily: 'Kanit, sans-serif' }}>
                      กรุณาเลือกหมวดงานหลักจากโครงสร้างงานด้านซ้าย
                    </span>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : getVisibleRows().length > 0 ? (
                <Table
                  columns={getTreeGridColumns()}
                  dataSource={getVisibleRows()}
                  rowKey="key"
                  pagination={false}
                  scroll={{ x: 1700 }}
                  size="small"
                  bordered
                />
              ) : (
                <Empty
                  description={
                    <span style={{ fontFamily: 'Kanit, sans-serif' }}>
                      ไม่มีข้อมูลในหมวดงานนี้
                    </span>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </div>
        </div>
      </div>

      <Modal
        title={null}
        open={modalVisible}
        onCancel={closeModal}
        footer={null}
        width={560}
        destroyOnClose
        centered
        styles={{ body: { padding: 0 } }}
      >
        {renderModalForm()}
      </Modal>
    </div>
  );
};

export default Planning;