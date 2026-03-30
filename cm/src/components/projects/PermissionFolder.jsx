import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Button, Space, Card, Typography, Input, Form, Checkbox, App, 
  Empty, Tree, Breadcrumb, Modal, Select, List, Tag, Divider, 
  Tooltip, message, Tabs, Layout, Menu, Popconfirm, Spin 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined, 
  SaveOutlined, FolderAddOutlined, SearchOutlined, TeamOutlined, 
  CopyOutlined, AppstoreOutlined, ProjectOutlined 
} from '@ant-design/icons';
import PropTypes from 'prop-types';
import Navbar from '../Navbar';
import api from '../../axiosConfig';

const { Option } = Select;
const { Text, Title } = Typography;

const PermissionFolder = ({ user, setUser, theme, setTheme }) => {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [folders, setFolders] = useState([]);
  const [filteredFolders, setFilteredFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [projectUsers, setProjectUsers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [parentFolderForNew, setParentFolderForNew] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [pendingPermissions, setPendingPermissions] = useState({});
  const [isFetchingFolders, setIsFetchingFolders] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [applyToSubfolders, setApplyToSubfolders] = useState(false);
  const selectedFolderRef = useRef(null);

  // Template states
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateItems, setTemplateItems] = useState([]);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [parentItemForNew, setParentItemForNew] = useState(null);
  const [templateForm] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [isFetchingTemplates, setIsFetchingTemplates] = useState(false);
  const [isFetchingItems, setIsFetchingItems] = useState(false);

  // Copy Folder Structure states
  const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);
  const [sourceProjectId, setSourceProjectId] = useState(null);
  const [sourceFolders, setSourceFolders] = useState([]);
  const [isCopying, setIsCopying] = useState(false);
  const [isFetchingSourceFolders, setIsFetchingSourceFolders] = useState(false);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      setProjects(response.data.projects || []);
    } catch {
      message.error('ไม่สามารถดึงข้อมูลโครงการได้');
    }
  };

  const fetchProjectUsers = async (projectId) => {
    if (!projectId) return;
    try {
      // ดึงเฉพาะผู้ใช้ที่อยู่ในโครงการนี้
      const response = await api.get(`/api/projects/${projectId}/users`);
      setProjectUsers(response.data.users || []);
    } catch {
      // Fallback: ถ้า API ไม่มีหรือ error ให้ดึงทั้งหมด
      try {
        const response = await api.get('/api/users');
        setProjectUsers(response.data.users || []);
      } catch {
        setProjectUsers([]);
      }
    }
  };

  const fetchFoldersData = async (projectId) => {
    if (!projectId) {
      setFolders([]);
      setFilteredFolders([]);
      return;
    }

    setIsFetchingFolders(true);
    try {
      const response = await api.get(`/api/folders?project_id=${projectId}`);
      const folderData = response.data.folders;

      if (!Array.isArray(folderData)) {
        setFolders([]);
        setFilteredFolders([]);
        return;
      }

      setFolders(folderData);

      const filtered = folderData.filter(folder =>
        folder.folder_name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredFolders(filtered);

      if (selectedFolderRef.current) {
        const updatedFolder = folderData.find(f => f.folder_id === selectedFolderRef.current.folder_id);
        if (updatedFolder) {
          setSelectedFolder(updatedFolder);
          selectedFolderRef.current = updatedFolder;

          const newPendingPermissions = {};
          projectUsers.forEach(user => {
            const userPermissions = updatedFolder.permissions
              ?.filter(p => p && p.user_id === user.user_id)
              ?.map(p => `${user.user_id}-${p.permission_type}`) || [];
            newPendingPermissions[user.user_id] = userPermissions;
          });
          setPendingPermissions(newPendingPermissions);
        } else {
          setSelectedFolder(null);
          selectedFolderRef.current = null;
          setPendingPermissions({});
        }
      }
    } catch {
      message.error('เกิดข้อผิดพลาดในการดึงข้อมูลโฟลเดอร์');
    } finally {
      setIsFetchingFolders(false);
    }
  };

  const handleFolderSearch = (value) => {
    setSearchText(value);
    const filtered = folders.filter(folder =>
      folder.folder_name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredFolders(filtered);
  };

  const showFolderModal = (folder = null, parentId = null) => {
    setEditingFolder(folder);
    setParentFolderForNew(parentId);

    if (folder) {
      form.setFieldsValue({
        folder_name: folder.folder_name,
        parent_folder_id: folder.parent_folder_id || null,
      });
    } else {
      form.setFieldsValue({
        folder_name: '',
        parent_folder_id: parentId,
      });
    }
    setIsModalVisible(true);
  };

  const handleFolderOk = async () => {
    try {
      const values = await form.validateFields();

      // ถ้ามี parentFolderForNew ให้ใช้ค่านั้น ถ้าไม่มีก็ใช้ค่าจาก form
      const parentId = parentFolderForNew || values.parent_folder_id || null;

      const data = {
        project_id: selectedProject,
        folder_name: values.folder_name,
        parent_folder_id: parentId,
      };

      console.log('Sending folder data:', data); // Debug log

      const response = editingFolder
        ? await api.put(`/api/folder/${editingFolder.folder_id}`, data)
        : await api.post('/api/folder', data);

      message.success(response.data.message || (editingFolder ? 'แก้ไขโฟลเดอร์สำเร็จ' : 'เพิ่มโฟลเดอร์สำเร็จ'));

      setIsModalVisible(false);
      form.resetFields();
      setEditingFolder(null);
      setParentFolderForNew(null);

      await fetchFoldersData(selectedProject);
      await fetchProjects();
    } catch (error) {
      if (error.errorFields) {
        message.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      } else {
        message.error(error.response?.data?.message || 'ไม่สามารถบันทึกโฟลเดอร์ได้');
      }
    }
  };

  const handleFolderCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingFolder(null);
    setParentFolderForNew(null);
  };

  const handleFolderDelete = (folderId) => {
    Modal.confirm({
      title: 'ยืนยันการลบโฟลเดอร์',
      icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
      content: 'คุณต้องการลบโฟลเดอร์นี้และข้อมูลสิทธิ์ที่เกี่ยวข้องหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      okText: 'ลบ',
      okType: 'danger',
      cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          await api.delete(`/api/folder/${folderId}`);
          message.success('ลบโฟลเดอร์สำเร็จ');

          if (selectedFolder?.folder_id === folderId) {
            setSelectedFolder(null);
            selectedFolderRef.current = null;
            setPendingPermissions({});
          }

          await fetchFoldersData(selectedProject);
          await fetchProjects();
        } catch (error) {
          message.error(error.response?.data?.message || 'ไม่สามารถลบโฟลเดอร์ได้');
        }
      },
    });
  };

  const handleSelectAllPermissions = (userId, type) => {
    const permTypes = ['read', 'write', 'admin'];

    if (type === 'all') {
      const allPerms = permTypes.map(pt => `${userId}-${pt}`);
      setPendingPermissions(prev => ({ ...prev, [userId]: allPerms }));
    } else if (type === 'none') {
      setPendingPermissions(prev => ({ ...prev, [userId]: [] }));
    }
  };

  const handleGlobalSelectAll = (type) => {
    const newPendingPermissions = { ...pendingPermissions };
    const permTypes = ['read', 'write', 'admin'];

    projectUsers.forEach(user => {
      const userId = user.user_id;
      let currentValues = [...(newPendingPermissions[userId] || [])];

      if (type === 'none') {
        newPendingPermissions[userId] = [];
      } else {
        const permValue = `${userId}-${type}`;
        if (!currentValues.includes(permValue)) {
          currentValues.push(permValue);
        }
        newPendingPermissions[userId] = currentValues;
      }
    });

    setPendingPermissions(newPendingPermissions);
  };

  const handlePermissionChange = (userId, values) => {
    setPendingPermissions(prev => ({
      ...prev,
      [userId]: values,
    }));
  };

  const hasPermissionChanges = useMemo(() => {
    if (!selectedFolder || !projectUsers.length) return false;

    return projectUsers.some(user => {
      const currentPermissions = selectedFolder.permissions
        ?.filter(p => p.user_id === user.user_id)
        ?.map(p => `${user.user_id}-${p.permission_type}`) || [];

      const pendingUserPermissions = pendingPermissions[user.user_id] || [];

      const currentSorted = [...currentPermissions].sort();
      const pendingSorted = [...pendingUserPermissions].sort();

      return JSON.stringify(currentSorted) !== JSON.stringify(pendingSorted);
    });
  }, [selectedFolder, projectUsers, pendingPermissions]);

  const handleSaveAllPermissions = async () => {
    if (!selectedFolder || savingPermissions) return;

    setSavingPermissions(true);
    try {
      const allPermissions = [];
      projectUsers.forEach(user => {
        const userPermissions = pendingPermissions[user.user_id] || [];
        ['read', 'write', 'admin'].forEach(permType => {
          allPermissions.push({
            user_id: user.user_id,
            permission_type: permType,
            granted: userPermissions.includes(`${user.user_id}-${permType}`),
          });
        });
      });

      await api.put(`/api/folder/${selectedFolder.folder_id}/permissions`, {
        permissions: allPermissions,
        apply_to_subfolders: applyToSubfolders
      });

      message.success('บันทึกสิทธิ์ทั้งหมดสำเร็จ');
      await fetchFoldersData(selectedProject);
    } catch (error) {
      message.error(error.response?.data?.message || 'ไม่สามารถบันทึกสิทธิ์ได้');
    } finally {
      setSavingPermissions(false);
    }
  };

  const getProjectTreeData = () => {
    const yearMap = projects.reduce((acc, project) => {
      const year = new Date(project.start_date || Date.now()).getFullYear() + 543;
      if (!acc[year]) acc[year] = [];
      acc[year].push(project);
      return acc;
    }, {});

    return Object.keys(yearMap)
      .sort((a, b) => b - a)
      .map(year => ({
        title: `พ.ศ. ${year} (${yearMap[year].length} โครงการ)`,
        key: `year-${year}`,
        selectable: false,
        children: yearMap[year].map(project => {
          const isSelected = selectedProject === project.project_id;
          const folderCount = folders.filter(f => f.project_id === project.project_id).length;
          const titleSuffix = isSelected ? ` (${folderCount} โฟลเดอร์)` : '';
          return {
            title: `${project.project_name}${titleSuffix}`,
            key: project.project_id.toString(),
            icon: <FolderOutlined />,
          };
        }),
      }));
  };

  const getFolderTreeData = (foldersList) => {
    const buildTree = (parentId = null) => {
      return foldersList
        .filter(folder => folder.parent_folder_id === parentId)
        .map(folder => {
          const children = buildTree(folder.folder_id);
          const hasChildren = children.length > 0;

          return {
            title: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderOutlined />
                  <span>{folder.folder_name}</span>
                  {hasChildren && (
                    <Tag color="blue" style={{ fontSize: '11px' }}>
                      {children.length} โฟลเดอร์ย่อย
                    </Tag>
                  )}
                </span>
                <Space size="small">
                  <Tooltip title="เพิ่มโฟลเดอร์ย่อย">
                    <Button
                      icon={<FolderAddOutlined />}
                      size="small"
                      type="primary"
                      ghost
                      onClick={(e) => {
                        e.stopPropagation();
                        showFolderModal(null, folder.folder_id);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="แก้ไข">
                    <Button
                      icon={<EditOutlined />}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        showFolderModal(folder);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="ลบ">
                    <Button
                      icon={<DeleteOutlined />}
                      size="small"
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFolderDelete(folder.folder_id);
                      }}
                    />
                  </Tooltip>
                </Space>
              </div>
            ),
            key: folder.folder_id.toString(),
            icon: <FolderOutlined />,
            children: children,
          };
        });
    };
    return buildTree();
  };

  const getBreadcrumb = () => {
    const items = [
      {
        title: (
          <a onClick={() => {
            setSelectedFolder(null);
            selectedFolderRef.current = null;
            setSelectedProject(null);
            setPendingPermissions({});
          }}>
            โครงการ
          </a>
        ),
      },
    ];
    if (selectedProject) {
      const project = projects.find(p => p.project_id === selectedProject);
      items.push({ title: project?.project_name || 'Unknown Project' });
    }
    if (selectedFolder) {
      items.push({ title: selectedFolder.folder_name });
    }
    return items;
  };

  const getPermissionColor = (permission) => {
    switch (permission) {
      case 'read': return 'blue';
      case 'write': return 'green';
      case 'admin': return 'red';
      default: return 'default';
    }
  };

  // ===== Copy Folder Structure handlers =====
  const handleOpenCopyModal = () => {
    setSourceProjectId(null);
    setSourceFolders([]);
    setIsCopyModalVisible(true);
  };

  const fetchSourceFolders = async (projectId) => {
    if (!projectId) {
      setSourceFolders([]);
      return;
    }
    setIsFetchingSourceFolders(true);
    try {
      const response = await api.get(`/api/folders?project_id=${projectId}`);
      setSourceFolders(response.data.folders || []);
    } catch {
      message.error('ไม่สามารถดึงโฟลเดอร์ต้นทางได้');
      setSourceFolders([]);
    } finally {
      setIsFetchingSourceFolders(false);
    }
  };

  const getSourceFolderTreeData = () => {
    const buildTree = (parentId = null) => {
      return sourceFolders
        .filter(f => f.parent_folder_id === parentId)
        .map(folder => {
          const children = buildTree(folder.folder_id);
          return {
            title: folder.folder_name,
            key: folder.folder_id.toString(),
            icon: <FolderOutlined />,
            children,
          };
        });
    };
    return buildTree();
  };

  const handleCopyStructure = async () => {
    if (!sourceProjectId || !selectedProject) return;
    setIsCopying(true);
    try {
      const response = await api.post('/api/folders/copy-structure', {
        sourceProjectId,
        targetProjectId: selectedProject,
      });
      message.success(response.data.message || 'คัดลอกโครงสร้างสำเร็จ');
      setIsCopyModalVisible(false);
      await fetchFoldersData(selectedProject);
    } catch (error) {
      message.error(error.response?.data?.message || 'ไม่สามารถคัดลอกโครงสร้างได้');
    } finally {
      setIsCopying(false);
    }
  };

  const fetchTemplates = async () => {
    setIsFetchingTemplates(true);
    try {
      const response = await api.get('/api/folder-templates');
      setTemplates(response.data.templates || []);
    } catch {
      message.error('ไม่สามารถดึงข้อมูล Template ได้');
    } finally {
      setIsFetchingTemplates(false);
    }
  };

  const fetchTemplateItems = async (templateId) => {
    if (!templateId) {
      setTemplateItems([]);
      return;
    }
    setIsFetchingItems(true);
    try {
      const response = await api.get(`/api/folder-templates/${templateId}/items`);
      setTemplateItems(response.data.items || []);
    } catch {
      message.error('ไม่สามารถดึงข้อมูลโฟลเดอร์ใน Template ได้');
    } finally {
      setIsFetchingItems(false);
    }
  };

  const showTemplateModal = (template = null) => {
    setEditingTemplate(template);
    if (template) {
      templateForm.setFieldsValue({
        template_name: template.template_name,
        description: template.description,
      });
    } else {
      templateForm.resetFields();
    }
    setIsTemplateModalVisible(true);
  };

  const handleTemplateOk = async () => {
    try {
      const values = await templateForm.validateFields();
      if (editingTemplate) {
        await api.put(`/api/folder-templates/${editingTemplate.template_id}`, values);
        message.success('แก้ไข Template สำเร็จ');
      } else {
        await api.post('/api/folder-templates', values);
        message.success('สร้าง Template สำเร็จ');
      }
      setIsTemplateModalVisible(false);
      fetchTemplates();
    } catch (error) {
      message.error(error.response?.data?.message || 'ไม่สามารถบันทึก Template ได้');
    }
  };

  const handleTemplateDelete = (templateId) => {
    Modal.confirm({
      title: 'ยืนยันการลบ Template',
      content: 'การลบ Template จะลบโครงสร้างโฟลเดอร์ทั้งหมดภายใต้ Template นี้ด้วย ยืนยันหรือไม่?',
      okText: 'ลบ',
      okType: 'danger',
      cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          await api.delete(`/api/folder-templates/${templateId}`);
          message.success('ลบ Template สำเร็จ');
          if (selectedTemplate === templateId) {
            setSelectedTemplate(null);
            setTemplateItems([]);
          }
          fetchTemplates();
        } catch (error) {
          message.error(error.response?.data?.message || 'ไม่สามารถลบ Template ได้');
        }
      },
    });
  };

  const showItemModal = (item = null, parentId = null) => {
    setEditingItem(item);
    setParentItemForNew(parentId);
    if (item) {
      itemForm.setFieldsValue({ folder_name: item.folder_name });
    } else {
      itemForm.resetFields();
    }
    setIsItemModalVisible(true);
  };

  const handleItemOk = async () => {
    try {
      const values = await itemForm.validateFields();
      const data = {
        template_id: selectedTemplate,
        folder_name: values.folder_name,
        parent_item_id: parentItemForNew || null,
      };

      if (editingItem) {
        await api.put(`/api/folder-template-items/${editingItem.item_id}`, { folder_name: values.folder_name });
        message.success('แก้ไขโฟลเดอร์สำเร็จ');
      } else {
        await api.post('/api/folder-template-items', data);
        message.success('เพิ่มโฟลเดอร์สำเร็จ');
      }
      setIsItemModalVisible(false);
      fetchTemplateItems(selectedTemplate);
    } catch (error) {
      message.error(error.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  const handleItemDelete = (itemId) => {
    Modal.confirm({
      title: 'ยืนยันการลบโฟลเดอร์',
      content: 'โฟลเดอร์ย่อยทั้งหมดจะถูกลบไปด้วย ยืนยันหรือไม่?',
      okText: 'ลบ',
      okType: 'danger',
      cancelText: 'ยกเลิก',
      onOk: async () => {
        try {
          await api.delete(`/api/folder-template-items/${itemId}`);
          message.success('ลบโฟลเดอร์สำเร็จ');
          fetchTemplateItems(selectedTemplate);
        } catch (error) {
          message.error(error.response?.data?.message || 'ไม่สามารถลบโฟลเดอร์ได้');
        }
      },
    });
  };

  const getTemplateTreeData = (itemsList) => {
    const buildTree = (parentId = null) => {
      return itemsList
        .filter(item => item.parent_item_id === parentId)
        .map(item => {
          const children = buildTree(item.item_id);
          return {
            title: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderOutlined />
                  <span>{item.folder_name}</span>
                </span>
                <Space size="small">
                  <Tooltip title="เพิ่มโฟลเดอร์ย่อย">
                    <Button
                      icon={<PlusOutlined />}
                      size="small"
                      type="primary"
                      ghost
                      onClick={(e) => {
                        e.stopPropagation();
                        showItemModal(null, item.item_id);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="แก้ไข">
                    <Button
                      icon={<EditOutlined />}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        showItemModal(item);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="ลบ">
                    <Button
                      icon={<DeleteOutlined />}
                      size="small"
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemDelete(item.item_id);
                      }}
                    />
                  </Tooltip>
                </Space>
              </div>
            ),
            key: item.item_id.toString(),
            children: children,
          };
        });
    };
    return buildTree();
  };

  useEffect(() => {
    fetchProjects();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedProject && !isFetchingFolders) {
      fetchProjectUsers(selectedProject);
      fetchFoldersData(selectedProject);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedTemplate) {
      fetchTemplateItems(selectedTemplate);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (selectedFolder && projectUsers.length > 0) {
      const initialPermissions = {};
      projectUsers.forEach(user => {
        const userPermissions = selectedFolder.permissions
          ?.filter(p => p && p.user_id === user.user_id)
          ?.map(p => `${user.user_id}-${p.permission_type}`) || [];
        initialPermissions[user.user_id] = userPermissions;
      });
      setPendingPermissions(initialPermissions);
    }
  }, [selectedFolder, projectUsers]);

  return (
    <div className="permission-folder-container" style={{ minHeight: '100vh', backgroundColor: theme === 'dark' ? '#1f2937' : '#f0f2f5', fontFamily: 'Kanit, sans-serif' }}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
      
      <div className="max-w-[1800px] mx-auto px-4 py-6">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className={theme === 'dark' ? 'dark-tabs' : ''}
          items={[
            {
              key: 'projects',
              label: (
                <span className="flex items-center gap-2 px-4 py-2">
                  <ProjectOutlined />
                  สิทธิ์โฟลเดอร์โครงการ
                </span>
              ),
              children: (
                <div className="flex flex-col lg:flex-row gap-6 mt-4">
                  {/* Project List */}
                  <div className="w-full lg:w-[320px]">
                    <Card
                      className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}
                      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: '12px' }}
                    >
                      <Title level={4} style={{ marginBottom: '16px', color: theme === 'dark' ? '#f3f4f6' : undefined }}>
                        โครงการทั้งหมด
                      </Title>
                      {projects.length > 0 ? (
                        <Tree
                          showLine
                          blockNode
                          treeData={getProjectTreeData()}
                          className={theme === 'dark' ? 'dark-tree' : ''}
                          onSelect={(keys) => {
                            if (keys.length && !keys[0].startsWith('year-')) {
                              setSelectedProject(keys[0]);
                              setSelectedFolder(null);
                              selectedFolderRef.current = null;
                              setPendingPermissions({});
                            }
                          }}
                          selectedKeys={selectedProject ? [selectedProject.toString()] : []}
                        />
                      ) : (
                        <Empty description="ไม่มีโครงการ" />
                      )}
                    </Card>
                  </div>

                  {/* Folder Management */}
                  <div className="flex-1">
                    <Card
                      className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}
                      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: '12px' }}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <Title level={4} style={{ margin: 0, color: theme === 'dark' ? '#f3f4f6' : undefined }}>
                          จัดการโฟลเดอร์
                        </Title>
                      </div>

                      <Breadcrumb
                        items={getBreadcrumb()}
                        style={{ marginBottom: '20px' }}
                        className={theme === 'dark' ? 'dark-breadcrumb' : ''}
                      />

                      {selectedProject ? (
                        <>
                          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                            <Input
                              placeholder="ค้นหาโฟลเดอร์..."
                              value={searchText}
                              onChange={(e) => handleFolderSearch(e.target.value)}
                              style={{ maxWidth: '400px' }}
                              prefix={<SearchOutlined />}
                              allowClear
                              size="large"
                            />
                            <Space>
                              <Button
                                icon={<CopyOutlined />}
                                onClick={handleOpenCopyModal}
                                size="large"
                                style={{ borderRadius: '8px' }}
                              >
                                คัดลอกโครงสร้าง
                              </Button>
                              <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => showFolderModal()}
                                size="large"
                                style={{ borderRadius: '8px' }}
                              >
                                เพิ่มโฟลเดอร์หลัก
                              </Button>
                            </Space>
                          </div>

                          <Divider style={{ margin: '16px 0' }} />

                          {isFetchingFolders ? (
                            <div style={{ textAlign: 'center', padding: '48px 0' }}>
                              <Text style={{ color: theme === 'dark' ? '#9ca3af' : undefined }}>กำลังโหลดโฟลเดอร์...</Text>
                            </div>
                          ) : filteredFolders.length === 0 ? (
                            <Empty
                              description="ไม่มีโฟลเดอร์ในโครงการนี้"
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                            >
                              <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => showFolderModal()}
                              >
                                เพิ่มโฟลเดอร์แรก
                              </Button>
                            </Empty>
                          ) : (
                            <div className={theme === 'dark' ? 'dark-tree-container' : ''}>
                              <Tree
                                showLine
                                blockNode
                                treeData={getFolderTreeData(filteredFolders)}
                                onSelect={(keys) => {
                                  if (keys.length) {
                                    const folder = folders.find(f => f.folder_id.toString() === keys[0]);
                                    if (folder) {
                                      setSelectedFolder(folder);
                                      selectedFolderRef.current = folder;
                                    }
                                  }
                                }}
                                selectedKeys={selectedFolder ? [selectedFolder.folder_id.toString()] : []}
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <Empty
                          description="เลือกโครงการเพื่อเริ่มจัดการโฟลเดอร์"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          style={{ padding: '60px 0' }}
                        />
                      )}
                    </Card>
                  </div>

                  {/* Permission Management */}
                  {selectedFolder && (
                    <div className="w-full lg:w-[420px]">
                      <Card
                        className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}
                        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: '12px' }}
                      >
                        {/* [Existing Permission UI - Keep same] */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <Title level={5} style={{ margin: 0, color: theme === 'dark' ? '#f3f4f6' : undefined }}>
                              สิทธิ์การเข้าถึง
                            </Title>
                            <div className="flex items-center gap-2 mt-1">
                              <FolderOutlined style={{ color: '#8b5cf6' }} />
                              <Text strong style={{ fontSize: '14px', color: theme === 'dark' ? '#a78bfa' : '#7c3aed' }}>
                                {selectedFolder.folder_name}
                              </Text>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              type="primary"
                              icon={<SaveOutlined />}
                              onClick={handleSaveAllPermissions}
                              disabled={!hasPermissionChanges || savingPermissions}
                              loading={savingPermissions}
                              style={{ borderRadius: '8px' }}
                            >
                              บันทึกทั้งหมด
                            </Button>
                            <Checkbox
                              checked={applyToSubfolders}
                              onChange={(e) => setApplyToSubfolders(e.target.checked)}
                              className={theme === 'dark' ? 'text-gray-300' : ''}
                              style={{ fontSize: '11px' }}
                            >
                              นำไปใช้กับโฟลเดอร์ย่อย
                            </Checkbox>
                          </div>
                        </div>

                        <Divider style={{ margin: '12px 0' }} />

                        {projectUsers.length > 0 && (
                          <div
                            className="mb-4 p-4 rounded-xl border-2"
                            style={{
                              backgroundColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#f0f7ff',
                              borderColor: theme === 'dark' ? '#4f46e5' : '#bae7ff',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <Text strong style={{ fontSize: '13px', color: theme === 'dark' ? '#818cf8' : '#096dd9' }}>
                                <TeamOutlined className="mr-2" />
                                ตั้งค่าสิทธิ์กลุ่ม
                              </Text>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <Button type="primary" ghost size="small" onClick={() => handleGlobalSelectAll('read')}>อ่าน</Button>
                              <Button type="primary" ghost size="small" onClick={() => handleGlobalSelectAll('write')}>เขียน</Button>
                              <Button type="primary" ghost size="small" onClick={() => handleGlobalSelectAll('admin')}>ผู้ดูแล</Button>
                              <Button danger ghost size="small" onClick={() => handleGlobalSelectAll('none')}>ล้าง</Button>
                            </div>
                          </div>
                        )}

                        {projectUsers.length > 0 ? (
                          <List
                            dataSource={projectUsers}
                            renderItem={(user) => (
                              <List.Item style={{ display: 'block', padding: '16px 0', borderBottom: theme === 'dark' ? '1px solid #374151' : '1px solid #f0f0f0' }}>
                                <div className="w-full">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <Text strong style={{ color: theme === 'dark' ? '#f3f4f6' : undefined }}>{user.username}</Text>
                                      <div style={{ fontSize: '12px', color: theme === 'dark' ? '#9ca3af' : '#64748b' }}>{user.first_name} {user.last_name}</div>
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-1">
                                      {selectedFolder.permissions?.filter(p => p && p.user_id === user.user_id).map(p => (
                                        <Tag key={p.permission_type} color={getPermissionColor(p.permission_type)} className="text-[10px] m-0">
                                          {p.permission_type === 'read' ? 'อ่าน' : p.permission_type === 'write' ? 'เขียน' : 'ผู้ดูแล'}
                                        </Tag>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-2">
                                      <Text size="small" type="secondary" className="text-[11px] uppercase tracking-wider">กำหนดสิทธิ์</Text>
                                      <Space size={4}>
                                        <Button size="small" type="link" className="text-[11px] p-0" onClick={() => handleSelectAllPermissions(user.user_id, 'all')}>เลือกทั้งหมด</Button>
                                        <Divider type="vertical" />
                                        <Button size="small" type="link" danger className="text-[11px] p-0" onClick={() => handleSelectAllPermissions(user.user_id, 'none')}>ล้าง</Button>
                                      </Space>
                                    </div>
                                    <Checkbox.Group
                                      value={pendingPermissions[user.user_id] || []}
                                      onChange={(values) => handlePermissionChange(user.user_id, values)}
                                      className="w-full"
                                    >
                                      <div className="grid grid-cols-3 gap-2">
                                        <Checkbox value={`${user.user_id}-read`} className={theme === 'dark' ? 'text-gray-300' : ''}>อ่าน</Checkbox>
                                        <Checkbox value={`${user.user_id}-write`} className={theme === 'dark' ? 'text-gray-300' : ''}>เขียน</Checkbox>
                                        <Checkbox value={`${user.user_id}-admin`} className={theme === 'dark' ? 'text-gray-300' : ''}>ผู้ดูแล</Checkbox>
                                      </div>
                                    </Checkbox.Group>
                                  </div>
                                </div>
                              </List.Item>
                            )}
                          />
                        ) : <Empty description="ไม่มีผู้ใช้" />}
                      </Card>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'templates',
              label: (
                <span className="flex items-center gap-2 px-4 py-2">
                  <AppstoreOutlined />
                  Master Folder (Templates)
                </span>
              ),
              children: (
                <div className="flex flex-col lg:flex-row gap-6 mt-4">
                  {/* Template List */}
                  <div className="w-full lg:w-[350px]">
                    <Card
                      className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}
                      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: '12px' }}
                      title={<Text style={{ color: theme === 'dark' ? '#f3f4f6' : undefined }}>Template ทั้งหมด</Text>}
                      extra={
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => showTemplateModal()}>
                          สร้าง Template
                        </Button>
                      }
                    >
                      <List
                        loading={isFetchingTemplates}
                        dataSource={templates}
                        renderItem={(item) => (
                          <List.Item
                            className={`cursor-pointer transition-all p-4 rounded-lg mb-2 ${selectedTemplate === item.template_id ? (theme === 'dark' ? 'bg-indigo-900/40 border-l-4 border-indigo-500' : 'bg-indigo-50 border-l-4 border-indigo-500') : (theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50')}`}
                            onClick={() => setSelectedTemplate(item.template_id)}
                            actions={[
                              <Button key="edit" type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); showTemplateModal(item); }} />,
                              <Button key="delete" type="text" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleTemplateDelete(item.template_id); }} />
                            ]}
                          >
                            <List.Item.Meta
                              avatar={<AppstoreOutlined style={{ fontSize: '20px', color: '#6366f1' }} />}
                              title={<Text strong style={{ color: theme === 'dark' ? '#f3f4f6' : undefined }}>{item.template_name}</Text>}
                              description={<Text type="secondary" className="text-[12px] truncate block max-w-[150px]">{item.description || 'ไม่มีคำอธิบาย'}</Text>}
                            />
                          </List.Item>
                        )}
                        locale={{ emptyText: <Empty description="ยังไม่มี Template" /> }}
                      />
                    </Card>
                  </div>

                  {/* Template Structure */}
                  <div className="flex-1">
                    <Card
                      className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}
                      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: '12px' }}
                      title={
                        <Space>
                          <FolderOutlined style={{ color: '#6366f1' }} />
                          <Text style={{ color: theme === 'dark' ? '#f3f4f6' : undefined }}>โครงสร้างโฟลเดอร์ใน Template</Text>
                        </Space>
                      }
                      extra={
                        selectedTemplate && (
                          <Button type="primary" icon={<PlusOutlined />} onClick={() => showItemModal()}>
                            เพิ่มโฟลเดอร์หลัก
                          </Button>
                        )
                      }
                    >
                      {!selectedTemplate ? (
                        <Empty description="เลือก Template เพื่อจัดการโครงสร้าง" style={{ padding: '60px 0' }} />
                      ) : isFetchingItems ? (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                          <Spin tip="กำลังโหลด..." />
                        </div>
                      ) : templateItems.length === 0 ? (
                        <Empty description="ยังไม่มีโฟลเดอร์ใน Template นี้">
                          <Button type="primary" onClick={() => showItemModal()}>เพิ่มโฟลเดอร์แรก</Button>
                        </Empty>
                      ) : (
                        <div className={theme === 'dark' ? 'dark-tree-container' : ''}>
                          <Tree
                            showLine
                            blockNode
                            defaultExpandAll
                            treeData={getTemplateTreeData(templateItems)}
                            selectable={false}
                          />
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              ),
            }
          ]}
        />
      </div>

      {/* Modal */}
      <Modal
        title={
          editingFolder
            ? 'แก้ไขโฟลเดอร์'
            : parentFolderForNew
              ? 'เพิ่มโฟลเดอร์ย่อย'
              : 'เพิ่มโฟลเดอร์หลัก'
        }
        open={isModalVisible}
        onOk={handleFolderOk}
        onCancel={handleFolderCancel}
        okText="บันทึก"
        cancelText="ยกเลิก"
        okButtonProps={{ size: 'large' }}
        cancelButtonProps={{ size: 'large' }}
        className={theme === 'dark' ? 'dark-modal' : ''}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '16px' }}>
          <Form.Item
            label={<span style={{ color: theme === 'dark' ? '#d1d5db' : undefined }}>ชื่อโฟลเดอร์</span>}
            name="folder_name"
            rules={[{ required: true, message: 'กรุณากรอกชื่อโฟลเดอร์' }]}
          >
            <Input
              placeholder="กรอกชื่อโฟลเดอร์"
              size="large"
              prefix={<FolderOutlined />}
              className={theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''}
            />
          </Form.Item>

          {!editingFolder && (
            <Form.Item
              label={<span style={{ color: theme === 'dark' ? '#d1d5db' : undefined }}>โฟลเดอร์แม่ (ถ้ามี)</span>}
              name="parent_folder_id"
              hidden={!!parentFolderForNew}
            >
              <Select
                placeholder="เลือกโฟลเดอร์แม่"
                allowClear
                size="large"
                className={theme === 'dark' ? 'dark-select' : ''}
              >
                {folders
                  .filter(folder => !editingFolder || folder.folder_id !== editingFolder.folder_id)
                  .map(folder => (
                    <Option key={folder.folder_id} value={folder.folder_id}>
                      {folder.folder_name}
                    </Option>
                  ))}
              </Select>
            </Form.Item>
          )}

          {parentFolderForNew && (
            <div style={{
              backgroundColor: theme === 'dark' ? '#1e3a8a' : '#e6f4ff',
              border: `1px solid ${theme === 'dark' ? '#1e40af' : '#91caff'}`,
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <Text style={{ color: theme === 'dark' ? '#bfdbfe' : '#0369a1' }}>
                โฟลเดอร์นี้จะถูกสร้างภายใต้: <Text strong style={{ color: theme === 'dark' ? '#eff6ff' : undefined }}>
                  {folders.find(f => f.folder_id === parentFolderForNew)?.folder_name}
                </Text>
              </Text>
            </div>
          )}
        </Form>
      </Modal>

      {/* Template Modal */}
      <Modal
        title={editingTemplate ? 'แก้ไข Template' : 'สร้าง Template ใหม่'}
        open={isTemplateModalVisible}
        onOk={handleTemplateOk}
        onCancel={() => setIsTemplateModalVisible(false)}
        okText="บันทึก"
        cancelText="ยกเลิก"
        className={theme === 'dark' ? 'dark-modal' : ''}
      >
        <Form form={templateForm} layout="vertical" className="mt-4">
          <Form.Item
            name="template_name"
            label={<Text style={{ color: theme === 'dark' ? '#d1d5db' : undefined }}>ชื่อ Template</Text>}
            rules={[{ required: true, message: 'กรุณากรอกชื่อ Template' }]}
          >
            <Input size="large" placeholder="เช่น ก่อสร้างอาคารมาตรฐาน" className={theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''} />
          </Form.Item>
          <Form.Item
            name="description"
            label={<Text style={{ color: theme === 'dark' ? '#d1d5db' : undefined }}>คำอธิบาย (ทางเลือก)</Text>}
          >
            <Input.TextArea rows={3} placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับ Template นี้" className={theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Template Item Modal */}
      <Modal
        title={editingItem ? 'แก้ไขชื่อโฟลเดอร์' : (parentItemForNew ? 'เพิ่มโฟลเดอร์ย่อย' : 'เพิ่มโฟลเดอร์หลัก')}
        open={isItemModalVisible}
        onOk={handleItemOk}
        onCancel={() => setIsItemModalVisible(false)}
        okText="บันทึก"
        cancelText="ยกเลิก"
        className={theme === 'dark' ? 'dark-modal' : ''}
      >
        <Form form={itemForm} layout="vertical" className="mt-4">
          <Form.Item
            name="folder_name"
            label={<Text style={{ color: theme === 'dark' ? '#d1d5db' : undefined }}>ชื่อโฟลเดอร์</Text>}
            rules={[{ required: true, message: 'กรุณากรอกชื่อโฟลเดอร์' }]}
          >
            <Input size="large" prefix={<FolderOutlined />} placeholder="ระบุชื่อโฟลเดอร์" className={theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : ''} />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .dark-tabs .ant-tabs-nav::before {
          border-bottom-color: #374151 !important;
        }
        .dark-tabs .ant-tabs-tab {
          color: #9ca3af !important;
        }
        .dark-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #6366f1 !important;
        }
        .dark-tabs .ant-tabs-ink-bar {
          background: #6366f1 !important;
        }
        .dark-tree .ant-tree-node-content-wrapper:hover {
          background-color: #374151 !important;
        }
        .dark-tree .ant-tree-node-selected {
          background-color: #4b5563 !important;
        }
        .dark-tree .ant-tree-title {
          color: #e5e7eb;
        }
        .dark-breadcrumb .ant-breadcrumb-link, 
        .dark-breadcrumb .ant-breadcrumb-separator {
          color: #9ca3af !important;
        }
        .dark-breadcrumb .ant-breadcrumb-link a {
          color: #6366f1 !important;
        }
        .dark-modal .ant-modal-content,
        .dark-modal .ant-modal-header {
          background-color: #1f2937 !important;
        }
        .dark-modal .ant-modal-title {
          color: #f3f4f6 !important;
        }
        .dark-modal .ant-modal-close {
          color: #9ca3af !important;
        }
        .dark-select .ant-select-selector {
          background-color: #374151 !important;
          border-color: #4b5563 !important;
          color: #f3f4f6 !important;
        }
        .dark-tree-container .ant-tree {
          background: transparent !important;
        }
      `}</style>

      {/* Copy Folder Structure Modal */}
      <Modal
        title={
          <span>
            <CopyOutlined className="mr-2" />
            คัดลอกโครงสร้างโฟลเดอร์
          </span>
        }
        open={isCopyModalVisible}
        onCancel={() => setIsCopyModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsCopyModalVisible(false)}>
            ยกเลิก
          </Button>,
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            onClick={handleCopyStructure}
            loading={isCopying}
            disabled={!sourceProjectId || sourceFolders.length === 0}
          >
            คัดลอกโครงสร้าง
          </Button>,
        ]}
        width={600}
        className={theme === 'dark' ? 'dark-modal' : ''}
      >
        <div style={{ marginTop: 16 }}>
          <Text style={{ color: theme === 'dark' ? '#d1d5db' : undefined }}>
            เลือกโครงการต้นทางที่ต้องการคัดลอกโครงสร้างโฟลเดอร์มา
          </Text>

          <Select
            placeholder="เลือกโครงการต้นทาง"
            style={{ width: '100%', marginTop: 12 }}
            size="large"
            value={sourceProjectId}
            onChange={(value) => {
              setSourceProjectId(value);
              fetchSourceFolders(value);
            }}
            className={theme === 'dark' ? 'dark-select' : ''}
            showSearch
            optionFilterProp="children"
          >
            {projects
              .filter(p => p.project_id !== selectedProject)
              .map(p => (
                <Option key={p.project_id} value={p.project_id}>
                  {p.project_name}
                </Option>
              ))}
          </Select>

          {sourceProjectId && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 12,
                border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                backgroundColor: theme === 'dark' ? '#111827' : '#fafafa',
                maxHeight: 350,
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text strong style={{ color: theme === 'dark' ? '#f3f4f6' : undefined }}>
                  📂 โครงสร้างโฟลเดอร์ ({sourceFolders.length} โฟลเดอร์)
                </Text>
              </div>

              {isFetchingSourceFolders ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Text style={{ color: theme === 'dark' ? '#9ca3af' : undefined }}>กำลังโหลด...</Text>
                </div>
              ) : sourceFolders.length === 0 ? (
                <Empty description="โครงการนี้ไม่มีโฟลเดอร์" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Tree
                  showLine
                  showIcon
                  defaultExpandAll
                  treeData={getSourceFolderTreeData()}
                  selectable={false}
                  className={theme === 'dark' ? 'dark-tree' : ''}
                />
              )}
            </div>
          )}

          {sourceProjectId && sourceFolders.length > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                borderRadius: 8,
                backgroundColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#eff6ff',
                border: `1px solid ${theme === 'dark' ? '#4f46e5' : '#bfdbfe'}`,
              }}
            >
              <Text style={{ fontSize: 12, color: theme === 'dark' ? '#818cf8' : '#3b82f6' }}>
                ℹ️ จะคัดลอกเฉพาะโครงสร้างโฟลเดอร์เท่านั้น (ไม่รวมไฟล์และสิทธิ์)
              </Text>
            </div>
          )}
        </div>
      </Modal>

      <style jsx="true">{`
        /* บังคับฟอนต์ Kanit สำหรับส่วนประกอบหลักแบบละมุนขึ้น */
        .permission-folder-container,
        .ant-btn, .ant-input, .ant-select, .ant-tree, .ant-tabs, 
        .ant-breadcrumb, .ant-typographyControls, .ant-modal, .ant-message, .ant-tag {
          font-family: 'Kanit', sans-serif !important;
        }

        /* แก้ไขสไตล์ปุ่มหลักเวลา Hover ให้เนื้อหาและสีพื้นหลังแสดงผลถูกต้อง */
        .ant-btn-primary {
          background-color: #4f46e5 !important;
          border-color: #4f46e5 !important;
        }
        .ant-btn-primary:hover,
        .ant-btn-primary:focus {
          background-color: #4338ca !important;
          border-color: #4338ca !important;
          color: #ffffff !important;
          opacity: 1 !important;
        }

        /* แก้ไขปัญหาข้อความ/ไอคอนหายเวลา Hover ใน Tree */
        .ant-tree-node-content-wrapper:hover {
          background-color: rgba(0, 0, 0, 0.04) !important;
        }
        
        .ant-tree-node-selected {
          background-color: rgba(24, 144, 255, 0.1) !important;
        }

        /* สไตล์พิเศษสำหรับ Dark Mode */
        .dark-tree-container .ant-tree {
          background: transparent !important;
        }
        .dark-tree-container .ant-tree-title {
          color: #d1d5db !important;
        }
        .dark-tree-container .ant-tree-node-content-wrapper:hover {
          background-color: #374151 !important;
        }
        .dark-tree-container .ant-tree-node-selected {
          background-color: #4f46e5 !important;
        }
        .dark-tabs .ant-tabs-nav-list .ant-tabs-tab { color: #9ca3af; }
        .dark-tabs .ant-tabs-nav-list .ant-tabs-tab-active .ant-tabs-tab-btn { color: #6366f1; }
        .dark-breadcrumb .ant-breadcrumb-link { color: #9ca3af; }
        .dark-breadcrumb .ant-breadcrumb-separator { color: #6b7280; }
        .dark-select .ant-select-selector { 
          background-color: #374151 !important; 
          color: #fff !important; 
          border-color: #4b5563 !important; 
        }
      `}</style>
    </div>
  );
};

PermissionFolder.propTypes = {
  user: PropTypes.object,
  setUser: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
  setTheme: PropTypes.func.isRequired,
};

export default PermissionFolder;