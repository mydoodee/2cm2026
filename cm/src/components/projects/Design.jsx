//src/componentes/projects/Design.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Row, Col, Card, Button, Typography, Tree, Upload, message, Progress, Modal, Avatar, Tag, Input, Breadcrumb, Space, Popconfirm, Form, Checkbox, Spin, Empty, Tooltip, Descriptions
} from 'antd';
import {
  LeftOutlined, ExclamationCircleOutlined, FileOutlined, FolderOutlined, 
  CloudUploadOutlined, FolderOpenOutlined, PlusOutlined, SearchOutlined, 
  DeleteOutlined, DownloadOutlined, EditOutlined, FileTextOutlined, 
  RightOutlined, LeftOutlined as LeftArrow, CloseOutlined, CheckOutlined, 
  StopOutlined, FolderAddOutlined
} from '@ant-design/icons';
import axios from 'axios';
import Navbar from '../Navbar';
import './Design.css';
import moment from 'moment';

moment.locale('th');

const { Title, Text } = Typography;

const fuzzySearch = (searchTerm, text) => {
  if (!searchTerm || !text) return true;
  
  const search = searchTerm.toLowerCase().replace(/\s+/g, '');
  const target = text.toLowerCase().replace(/\s+/g, '');
  
  let searchIndex = 0;
  for (let i = 0; i < target.length && searchIndex < search.length; i++) {
    if (target[i] === search[searchIndex]) {
      searchIndex++;
    }
  }
  
  return searchIndex === search.length;
};

const Design = ({ user, setUser, theme, setTheme }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [fileTreeData, setFileTreeData] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [folderToUpload, setFolderToUpload] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [expandedFileKeys, setExpandedFileKeys] = useState([]);
  const [selectedFileKeys, setSelectedFileKeys] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previewableFiles, setPreviewableFiles] = useState([]);
  const isMounted = useRef(true);
  const cancelTokenSource = useRef(null);
  const preservedExpandedKeys = useRef([]);
  
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderForNewFolder, setParentFolderForNewFolder] = useState(null);
  const [createFolderLoading, setCreateFolderLoading] = useState(false);
  
  // ✅ State สำหรับ Rename File
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  
  // ✅ State สำหรับ Rename Folder (เพิ่มใหม่)
  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState(null);
  const [newFolderNameForRename, setNewFolderNameForRename] = useState('');
  const [renameFolderLoading, setRenameFolderLoading] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (cancelTokenSource.current) {
        cancelTokenSource.current.cancel('Component unmounted');
      }
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('กรุณาเข้าสู่ระบบ');
        navigate('/login');
        return;
      }
      
      cancelTokenSource.current = axios.CancelToken.source();
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folders`, {
        headers: { Authorization: `Bearer ${token}` },
        cancelToken: cancelTokenSource.current.token
      });
      
      if (!isMounted.current) return;
      
      const allFolders = response.data.data || [];
      
      // ✅ สร้าง Map เพื่อจัดการ permission inheritance
      const folderMap = new Map();
      allFolders.forEach(folder => {
        folderMap.set(folder.folder_id, { ...folder });
      });
      
      // ✅ ฟังก์ชันหา permission จาก parent hierarchy
      const getEffectivePermission = (folderId, visited = new Set()) => {
        if (visited.has(folderId)) return null;
        visited.add(folderId);
        
        const folder = folderMap.get(folderId);
        if (!folder) return null;
        
        if (folder.permission_type && ['read', 'write', 'admin'].includes(folder.permission_type)) {
          return folder.permission_type;
        }
        
        if (folder.parent_folder_id) {
          return getEffectivePermission(folder.parent_folder_id, visited);
        }
        
        return null;
      };
      
      // ✅ เติม permission ให้ทุกโฟลเดอร์
      const foldersWithPermission = allFolders.map(folder => {
        if (folder.permission_type && ['read', 'write', 'admin'].includes(folder.permission_type)) {
          return folder;
        }
        
        const effectivePermission = getEffectivePermission(folder.parent_folder_id);
        
        return {
          ...folder,
          permission_type: effectivePermission || folder.permission_type,
          _inherited: !!effectivePermission
        };
      });
      
      setFolders(foldersWithPermission);
      
      const designFolder = foldersWithPermission.find(f => f.folder_name === 'Design' && !f.parent_folder_id);
      if (designFolder) {
        setSelectedFolderId(designFolder.folder_id);
        setSelectedFolderName(designFolder.folder_name);
      }
    } catch (error) {
      if (axios.isCancel(error)) return;
      message.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลโฟลเดอร์');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };
  
  const fetchFiles = async (folderId) => {
    if (!folderId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const getAllSubfolderIds = (fId, isRoot = true) => {
        const subfolders = folders.filter(f => String(f.parent_folder_id) === String(fId));
        const results = [{ id: fId, isRoot }];
        subfolders.forEach(sub => {
          results.push(...getAllSubfolderIds(sub.folder_id, false));
        });
        return results;
      };
      
      const folderIdsInfo = getAllSubfolderIds(folderId, true);
      const allFiles = [];
      
      cancelTokenSource.current = axios.CancelToken.source();
      
      for (const folderInfo of folderIdsInfo) {
        const currentFolderId = folderInfo.id;
        const isRootFolder = folderInfo.isRoot;
        
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${currentFolderId}/files`,
            { 
              headers: { Authorization: `Bearer ${token}` },
              cancelToken: cancelTokenSource.current.token
            }
          );
          if (!isMounted.current) return;
          
          const currentFolder = folders.find(f => String(f.folder_id) === String(currentFolderId));
          
          const filesWithFolderInfo = (response.data.data || []).map(file => ({
            ...file,
            folder_id: currentFolderId,
            folder_name: currentFolder?.folder_name || '',
            is_root_folder: isRootFolder,
            subfolder_name: isRootFolder ? null : currentFolder?.folder_name
          }));
          
          allFiles.push(...filesWithFolderInfo);
        } catch (error) {
          if (axios.isCancel(error)) return;
        }
      }
      
      const sortedFiles = allFiles.sort((a, b) => 
        moment(b.created_at).unix() - moment(a.created_at).unix()
      );
      
      setFiles(sortedFiles);
    } catch (err) {
      if (axios.isCancel(err)) return;
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [id, navigate]);

  useEffect(() => {
    if (selectedFolderId) {
      fetchFiles(selectedFolderId);
    }
  }, [selectedFolderId, folders]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.data && Array.isArray(response.data.data)) {
          setUsers(response.data.data);
        }
      } catch (err) {
        if (axios.isCancel(err)) return;
        if (err.response?.status === 401) {
          navigate('/login');
        }
      }
    };
    fetchUsers();
  }, [id, navigate]);

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const iconColors = {
      pdf: 'text-red-500',
      dwg: 'text-blue-500',
      jpg: 'text-green-500',
      jpeg: 'text-green-500',
      png: 'text-green-500',
      zip: 'text-purple-500',
      ifc: 'text-cyan-500',
      default: 'text-gray-500'
    };
    return React.createElement(FileOutlined, { className: iconColors[ext] || iconColors.default });
  };

 const getFileTypeTag = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const tagConfig = {
    pdf: { color: 'red', emoji: '📄' },
    dwg: { color: 'blue', emoji: '📐' },
    jpg: { color: 'green', emoji: '🖼️' },
    jpeg: { color: 'green', emoji: '🖼️' },
    png: { color: 'green', emoji: '🖼️' },
    zip: { color: 'purple', emoji: '📦' },
    ifc: { color: 'cyan', emoji: '🏗️' },
    xlsx: { color: 'success', emoji: '📊' },
    xls: { color: 'success', emoji: '📊' },
    csv: { color: 'success', emoji: '📊' },
    default: { color: 'default', emoji: '📄' }
  };
  
  const config = tagConfig[ext] || tagConfig.default;
  
  return React.createElement(
    Tag, 
    { color: config.color, className: "text-xs" }, 
    `${config.emoji} ${ext.toUpperCase()}`
  );
};
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async (file) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${file.file_id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success(`กำลังดาวน์โหลด ${file.file_name}`);
    } catch (err) {
      if (err.response?.status === 401) {
        message.error('กรุณาเข้าสู่ระบบ');
        navigate('/login');
      } else if (err.response?.status === 404) {
        message.error(`ไม่พบไฟล์ ${file.file_name} ในระบบ`);
      } else {
        message.error('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์');
      }
    }
  };

  const handleDeleteFile = async (fileId, uploadedBy) => {
    const folder = folders.find(f => String(f.folder_id) === String(selectedFolderId));
    if (user.username !== uploadedBy && folder?.permission_type !== 'admin') {
      message.error('คุณไม่มีสิทธิ์ลบไฟล์นี้');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${fileId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success('ลบไฟล์สำเร็จ');
      fetchFiles(selectedFolderId);
    } catch (err) {
      if (err.response?.status === 401) {
        message.error('กรุณาเข้าสู่ระบบ');
        navigate('/login');
      } else if (err.response?.status === 403) {
        message.error('คุณไม่มีสิทธิ์ลบไฟล์นี้');
      } else if (err.response?.status === 404) {
        message.error('ไม่พบไฟล์ในระบบ');
      } else {
        message.error('เกิดข้อผิดพลาดในการลบไฟล์');
      }
    }
  };

const handleDeleteSelectedFiles = async () => {
  if (selectedFileKeys.length === 0) {
    message.warning('กรุณาเลือกไฟล์ที่ต้องการลบ');
    return;
  }

  const keysToProcess = [...selectedFileKeys];
  const currentFolderId = selectedFolderId;
  const folder = folders.find(f => String(f.folder_id) === String(currentFolderId));
  
  const filesToDelete = [];
  const noPermissionFiles = [];
  
  for (const key of keysToProcess) {
    let fileId;
    
    if (key.includes('-file-')) {
      const parts = key.split('-file-');
      fileId = parts[parts.length - 1];
    } else if (key.startsWith('file-')) {
      fileId = key.replace('file-', '');
    } else {
      continue;
    }
    
    const file = files.find(f => String(f.file_id) === String(fileId));
    
    if (!file) continue;
    
    const isUploader = user.username === file.uploaded_by;
    const isAdmin = folder?.permission_type === 'admin';
    const canDelete = isUploader || isAdmin;
    
    if (canDelete) {
      filesToDelete.push(file);
    } else {
      noPermissionFiles.push(file.file_name);
    }
  }
  
  if (noPermissionFiles.length > 0) {
    message.warning({
      content: `คุณไม่มีสิทธิ์ลบ ${noPermissionFiles.length} ไฟล์`,
      duration: 4
    });
  }
  
  if (filesToDelete.length === 0) {
    message.error('ไม่มีไฟล์ที่สามารถลบได้');
    setIsSelectMode(false);
    setSelectedFileKeys([]);
    return;
  }
  
  Modal.confirm({
    title: 'ยืนยันการลบไฟล์',
    icon: <ExclamationCircleOutlined />,
    content: `คุณต้องการลบไฟล์ ${filesToDelete.length} ไฟล์ที่เลือกหรือไม่?`,
    okText: 'ลบ',
    okType: 'danger',
    cancelText: 'ยกเลิก',
    onOk: async () => {
      const token = localStorage.getItem('token');
      let successCount = 0;

      for (const file of filesToDelete) {
        try {
          await axios.delete(
            `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${file.file_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          successCount++;
        } catch (err) {
          console.error('Delete error:', err);
        }
      }

      if (successCount > 0) {
        message.success(`ลบไฟล์สำเร็จ ${successCount} ไฟล์`);
      }

      setSelectedFileKeys([]);
      setIsSelectMode(false);
      await fetchFiles(currentFolderId);
    }
  });
};


const isImageFile = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
};

const handleNavigateImage = async (direction) => {
  const newIndex = direction === 'next' 
    ? (currentImageIndex + 1) % previewableFiles.length
    : (currentImageIndex - 1 + previewableFiles.length) % previewableFiles.length;
  
  setCurrentImageIndex(newIndex);
  const nextFile = previewableFiles[newIndex];
  
  try {
    const token = localStorage.getItem('token');
    setLoading(true);
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${nextFile.file_id}/download`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      }
    );
    
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    setPreviewFile(nextFile);
    setPreviewUrl(url);
  } catch {
    // ✅ ลบ err ออก เพราะไม่ได้ใช้
    message.error('เกิดข้อผิดพลาดในการโหลดไฟล์');
  } finally {
    setLoading(false);
  }
};

  const handleOpenCreateFolderModal = (parentFolderId, parentFolderName) => {
  const folder = folders.find(f => String(f.folder_id) === String(parentFolderId));
  
  if (!folder || !['write', 'admin'].includes(folder.permission_type)) {
    message.error('คุณไม่มีสิทธิ์สร้างโฟลเดอร์ในตำแหน่งนี้');
    return;
  }
  
  const isRootDesignFolder = !folder.parent_folder_id && folder.folder_name === 'Design';
  
  if (isRootDesignFolder) {
    message.warning('ไม่สามารถสร้างโฟลเดอร์ในโฟลเดอร์หลัก Design ได้โดยตรง กรุณาสร้างใน subfolder');
    return;
  }
  
  setParentFolderForNewFolder({ id: parentFolderId, name: parentFolderName });
  setNewFolderName('');
  setIsCreateFolderModalOpen(true);
};

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      message.warning('กรุณาระบุชื่อโฟลเดอร์');
      return;
    }

    const existingFolder = folders.find(
      f => String(f.parent_folder_id) === String(parentFolderForNewFolder.id) && 
           f.folder_name.toLowerCase() === newFolderName.trim().toLowerCase()
    );

    if (existingFolder) {
      message.error('มีโฟลเดอร์ชื่อนี้อยู่แล้วในตำแหน่งนี้');
      return;
    }

    setCreateFolderLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder`,
        {
          folder_name: newFolderName.trim(),
          parent_folder_id: parentFolderForNewFolder.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      message.success(`สร้างโฟลเดอร์ "${newFolderName}" สำเร็จ`);
      setIsCreateFolderModalOpen(false);
      setNewFolderName('');
      setParentFolderForNewFolder(null);
      await fetchFolders();
    } catch (err) {
      if (err.response?.status === 401) {
        message.error('กรุณาเข้าสู่ระบบ');
        navigate('/login');
      } else if (err.response?.status === 403) {
        message.error('คุณไม่มีสิทธิ์สร้างโฟลเดอร์');
      } else {
        message.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างโฟลเดอร์');
      }
    } finally {
      setCreateFolderLoading(false);
    }
  };

// ✅ ฟังก์ชัน: เปิด Modal แก้ไขชื่อโฟลเดอร์
const handleOpenRenameFolderModal = (folderId, folderName) => {
  const folder = folders.find(f => String(f.folder_id) === String(folderId));
  
  if (!folder || !['write', 'admin'].includes(folder.permission_type)) {
    message.error('คุณไม่มีสิทธิ์แก้ไขชื่อโฟลเดอร์นี้');
    return;
  }
  
  // ✅ ตรวจสอบว่าเป็น root Design หรือไม่
  const isRootDesignFolder = !folder.parent_folder_id && folder.folder_name === 'Design';
  
  if (isRootDesignFolder) {
    message.warning('ไม่สามารถเปลี่ยนชื่อโฟลเดอร์หลัก Design ได้');
    return;
  }
  
  // ✅ ตรวจสอบว่าเป็นโฟลเดอร์ลูกโดยตรงของ Design หรือไม่ (เช่น Drawings, Documents)
  if (folder.parent_folder_id) {
    const parentFolder = folders.find(f => String(f.folder_id) === String(folder.parent_folder_id));
    const isDirectChildOfRoot = parentFolder && !parentFolder.parent_folder_id && parentFolder.folder_name === 'Design';
    
    if (isDirectChildOfRoot) {
      message.warning('ไม่สามารถเปลี่ยนชื่อโฟลเดอร์หลักย่อยของ Design ได้ (เช่น Drawings, Documents)');
      return;
    }
  }
  
  setFolderToRename({ id: folderId, name: folderName });
  setNewFolderNameForRename(folderName);
  setIsRenameFolderModalOpen(true);
};

// ✅ ฟังก์ชัน: ยืนยันการแก้ไขชื่อโฟลเดอร์
const handleRenameFolder = async () => {
  if (!newFolderNameForRename.trim()) {
    message.warning('กรุณาระบุชื่อโฟลเดอร์');
    return;
  }

  if (newFolderNameForRename.trim() === folderToRename.name) {
    message.info('ชื่อโฟลเดอร์ไม่เปลี่ยนแปลง');
    setIsRenameFolderModalOpen(false);
    return;
  }

  // หา parent folder ของโฟลเดอร์ที่จะเปลี่ยนชื่อ
  const currentFolder = folders.find(f => String(f.folder_id) === String(folderToRename.id));
  
  const existingFolder = folders.find(
    f => String(f.parent_folder_id) === String(currentFolder.parent_folder_id) &&
         String(f.folder_id) !== String(folderToRename.id) &&
         f.folder_name.toLowerCase() === newFolderNameForRename.trim().toLowerCase()
  );

  if (existingFolder) {
    message.error('มีโฟลเดอร์ชื่อนี้อยู่แล้วในตำแหน่งนี้');
    return;
  }

  setRenameFolderLoading(true);
  try {
    const token = localStorage.getItem('token');
    await axios.put(
      `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${folderToRename.id}/rename`,
      { new_name: newFolderNameForRename.trim() },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    message.success(`เปลี่ยนชื่อโฟลเดอร์เป็น "${newFolderNameForRename}" สำเร็จ`);
    setIsRenameFolderModalOpen(false);
    setFolderToRename(null);
    setNewFolderNameForRename('');
    
    // ✅ รีเฟรชข้อมูลโฟลเดอร์
    await fetchFolders();
    
    // ✅ ถ้าเป็นโฟลเดอร์ที่เลือกอยู่ ให้อัพเดทชื่อด้วย
    if (String(folderToRename.id) === String(selectedFolderId)) {
      setSelectedFolderName(newFolderNameForRename.trim());
    }
  } catch (err) {
    if (err.response?.status === 401) {
      message.error('กรุณาเข้าสู่ระบบ');
      navigate('/login');
    } else if (err.response?.status === 403) {
      message.error('คุณไม่มีสิทธิ์แก้ไขชื่อโฟลเดอร์นี้');
    } else {
      message.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขชื่อโฟลเดอร์');
    }
  } finally {
    setRenameFolderLoading(false);
  }
};

  const handleOpenRenameModal = (file) => {
    const folder = folders.find(f => String(f.folder_id) === String(file.folder_id));
    
    const canRename = user.username === file.uploaded_by || folder?.permission_type === 'admin';
    
    if (!canRename) {
      message.error('คุณไม่มีสิทธิ์แก้ไขชื่อไฟล์นี้');
      return;
    }
    
    setFileToRename(file);
    setNewFileName(file.file_name);
    setIsRenameModalOpen(true);
  };

  const handleRenameFile = async () => {
    if (!newFileName.trim()) {
      message.warning('กรุณาระบุชื่อไฟล์');
      return;
    }

    if (newFileName.trim() === fileToRename.file_name) {
      message.info('ชื่อไฟล์ไม่เปลี่ยนแปลง');
      setIsRenameModalOpen(false);
      return;
    }

    const existingFile = files.find(
      f => String(f.folder_id) === String(fileToRename.folder_id) &&
           f.file_id !== fileToRename.file_id &&
           f.file_name.toLowerCase() === newFileName.trim().toLowerCase()
    );

    if (existingFile) {
      message.error('มีไฟล์ชื่อนี้อยู่แล้วในโฟลเดอร์นี้');
      return;
    }

    setRenameLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${fileToRename.file_id}/rename`,
        { new_name: newFileName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      message.success(`เปลี่ยนชื่อไฟล์เป็น "${newFileName}" สำเร็จ`);
      setIsRenameModalOpen(false);
      setFileToRename(null);
      setNewFileName('');
      await fetchFiles(selectedFolderId);
    } catch (err) {
      if (err.response?.status === 401) {
        message.error('กรุณาเข้าสู่ระบบ');
        navigate('/login');
      } else if (err.response?.status === 403) {
        message.error('คุณไม่มีสิทธิ์แก้ไขชื่อไฟล์นี้');
      } else {
        message.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขชื่อไฟล์');
      }
    } finally {
      setRenameLoading(false);
    }
  };

  useEffect(() => {
    const buildFileTree = () => {
      const filteredFiles = files.filter(file => {
        if (!searchText) return true;
        
        if (fuzzySearch(searchText, file.file_name)) return true;
        if (file.folder_name && fuzzySearch(searchText, file.folder_name)) return true;
        if (file.subfolder_name && fuzzySearch(searchText, file.subfolder_name)) return true;
        if (file.uploaded_by && fuzzySearch(searchText, file.uploaded_by)) return true;
        
        return false;
      });

const buildFolderHierarchy = (parentId, inheritedPermission = null) => {
  const structure = {};
  
  // หา parent folder เพื่อเช็คสิทธิ์
  const parentFolder = folders.find(pf => String(pf.folder_id) === String(parentId));
  const parentPermission = inheritedPermission || parentFolder?.permission_type;
  
  const children = folders.filter(f => {
    if (String(f.parent_folder_id) !== String(parentId)) return false;
    
    // ถ้ามี permission โดยตรง
    if (f.permission_type && ['read', 'write', 'admin'].includes(f.permission_type)) {
      return true;
    }
    
    // ถ้าสืบทอดจาก parent (ไม่ว่าจะมาจาก inheritedPermission หรือ parentFolder)
    if (parentPermission && ['read', 'write', 'admin'].includes(parentPermission)) {
      return true;
    }
    
    return false;
  });
  
  children.forEach(folder => {
    // ใช้ permission ของ folder เอง หรือสืบทอดจาก parent
    const effectivePermission = folder.permission_type || parentPermission;
    
    structure[folder.folder_name] = {
      files: [],
      subfolders: buildFolderHierarchy(folder.folder_id, effectivePermission),
      folder_id: folder.folder_id,
      permission_type: effectivePermission
    };
  });
  
  return structure;
};

const rootStructure = buildFolderHierarchy(selectedFolderId);

// หาสิทธิ์ของ root folder เพื่อส่งต่อไปยัง subfolder
const rootFolder = folders.find(f => String(f.folder_id) === String(selectedFolderId));
const rootPermission = rootFolder?.permission_type;

const folderStructure = {
  _root: { 
    files: [], 
    subfolders: rootStructure, 
    folder_id: selectedFolderId,
    permission_type: rootPermission
  }
};
      
      filteredFiles.forEach(file => {
        if (String(file.folder_id) === String(selectedFolderId)) {
          folderStructure['_root'].files.push(file);
        } else {
          const findAndAddFile = (structure) => {
            for (const [folderName, data] of Object.entries(structure)) {
              if (folderName === '_root') continue;
              
              if (String(data.folder_id) === String(file.folder_id)) {
                data.files.push(file);
                return true;
              }
              
              if (data.subfolders && Object.keys(data.subfolders).length > 0) {
                if (findAndAddFile(data.subfolders)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          findAndAddFile(folderStructure._root.subfolders);
        }
      });
      
      const createFileNode = (file, parentKey = '') => {
        const fileKey = parentKey ? `${parentKey}-file-${file.file_id}` : `file-${file.file_id}`;
        
        const highlightText = (text, search) => {
          if (!search) return text;
          
          const regex = new RegExp(`(${search.split('').join('.*')})`, 'gi');
          const parts = text.split(regex);
          
          return parts.map((part, i) => {
            if (regex.test(part)) {
              return <mark key={i} className="bg-yellow-200">{part}</mark>;
            }
            return part;
          });
        };
        
        const folder = folders.find(f => String(f.folder_id) === String(file.folder_id));
        const canRename = user.username === file.uploaded_by || folder?.permission_type === 'admin';
        
        return {
          title: (
            <div className="flex items-center justify-between group w-full">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {isSelectMode && (
                  <Checkbox
                    checked={selectedFileKeys.includes(fileKey)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (e.target.checked) {
                        setSelectedFileKeys(prev => [...prev, fileKey]);
                      } else {
                        setSelectedFileKeys(prev => prev.filter(k => k !== fileKey));
                      }
                    }}
                  />
                )}
                {getFileIcon(file.file_name)}
                <Tooltip title={file.file_name}>
                  <Text 
                    className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate`}
                    style={{ maxWidth: '200px' }}
                  >
                    {searchText ? highlightText(file.file_name, searchText) : file.file_name}
                  </Text>
                </Tooltip>
                {getFileTypeTag(file.file_name)}
                <Text className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-xs flex-shrink-0`}>
                  {formatFileSize(file.file_size)}
                </Text>
                <Tooltip title={`อัพโหลดโดย: ${file.uploaded_by}`}>
                  <Text className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} text-xs flex-shrink-0`}>
                    {file.uploaded_by}
                  </Text>
                </Tooltip>
                <Tooltip title={moment(file.created_at).format('DD/MM/YYYY HH:mm')}>
                  <Text className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} text-xs flex-shrink-0`}>
                    {moment(file.created_at).fromNow()}
                  </Text>
                </Tooltip>
              </div>
              {!isSelectMode && (
                <div className="flex space-x-1 opacity-0group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <Button
                    type="text"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    title="ดาวน์โหลด"
                  />
                  {canRename && (
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRenameModal(file);
                      }}
                      title="แก้ไขชื่อไฟล์"
                    />
                  )}
                  {(user.username === file.uploaded_by || folder?.permission_type === 'admin') && (
                    <Popconfirm
                      title="คุณแน่ใจหรือไม่ที่จะลบไฟล์นี้?"
                      onConfirm={(e) => {
                        if (e && e.stopPropagation) e.stopPropagation();
                        handleDeleteFile(file.file_id, file.uploaded_by);
                      }}
                      okText="ลบ"
                      cancelText="ยกเลิก"
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                        onClick={(e) => e.stopPropagation()}
                        title="ลบไฟล์"
                      />
                    </Popconfirm>
                  )}
                </div>
              )}
            </div>
          ),
          key: fileKey,
          icon: null,
          isLeaf: true,
          fileData: file
        };
      };

      const createFolderNode = (folderName, data, parentKey = '') => {
        const folderKey = parentKey ? `${parentKey}-${folderName}` : folderName;
        const fileCount = data.files.length;
        const subfolderCount = Object.keys(data.subfolders).length;
        const totalItems = fileCount + subfolderCount;

        const isRootFolder = !folders.find(f => String(f.folder_id) === String(data.folder_id))?.parent_folder_id && 
                             folderName === 'Design';

        const hasSubfolders = subfolderCount > 0;
        
       

     // ✅ โฟลเดอร์ที่ไม่ใช่ root สามารถมีเครื่องมือได้ทั้งหมด
const canCreateFolder = !isRootFolder && ['write', 'admin'].includes(data.permission_type);
const canUpload = !isRootFolder && ['write', 'admin'].includes(data.permission_type);
// ✅ ลบได้เฉพาะโฟลเดอร์ที่ไม่มี subfolder
const canDelete = !isRootFolder && !hasSubfolders && ['write', 'admin'].includes(data.permission_type);
        
        const showActions = canCreateFolder || canUpload || canDelete;

        if (searchText && totalItems > 0) {
          if (!preservedExpandedKeys.current.includes(folderKey)) {
            preservedExpandedKeys.current.push(folderKey);
          }
        }

        return {
          title: (
            <div className="flex items-center justify-between group w-full">
              <div className="flex items-center space-x-2">
                <FolderOutlined className="text-blue-500" />
                <Text className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>
                  {folderName}
                </Text>
                <Text className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-xs`}>
                  ({totalItems} รายการ)
                </Text>
              </div>
              {!isSelectMode && showActions && (
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {canCreateFolder && (
                    <Button
                      type="text"
                      size="small"
                      icon={<FolderAddOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCreateFolderModal(data.folder_id, folderName);
                      }}
                      title="สร้างโฟลเดอร์ย่อย"
                    />
                  )}
                  {canUpload && (
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenUploadModal(data.folder_id, folderName);
                      }}
                      title="อัพโหลดไฟล์"
                    />
                  )}
                  {canDelete && (
                    <Popconfirm
                      title="คุณแน่ใจหรือไม่ที่จะลบโฟลเดอร์นี้?"
                      onConfirm={(e) => {
                        if (e && e.stopPropagation) e.stopPropagation();
                        handleDeleteFolder(data.folder_id);
                      }}
                      okText="ลบ"
                      cancelText="ยกเลิก"
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                        onClick={(e) => e.stopPropagation()}
                        title="ลบโฟลเดอร์"
                      />
                    </Popconfirm>
                  )}
                </div>
              )}
            </div>
          ),
          key: folderKey,
          icon: null,
          children: [],
          isFolderNode: true,
          folderData: data
        };
      };
      
      const createTreeNodes = (structure, parentKey = '') => {
        const nodes = [];
        
        Object.entries(structure).forEach(([folderName, data]) => {
          if (folderName === '_root') return;
          
          const folderKey = parentKey ? `${parentKey}-${folderName}` : folderName;
          
          const folderNode = createFolderNode(folderName, data, parentKey);
          
          const fileNodes = data.files.map(file => createFileNode(file, folderKey));
          
          const subfolderNodes = createTreeNodes(data.subfolders, folderKey);
          
          folderNode.children = [...fileNodes, ...subfolderNodes];
          
          nodes.push(folderNode);
        });
        
        return nodes;
      };

      const rootFileNodes = filteredFiles
        .filter(f => String(f.folder_id) === String(selectedFolderId))
        .map(file => createFileNode(file));
      
      const subfolderNodes = createTreeNodes(folderStructure._root.subfolders);
      
      const innerTreeNodes = [...rootFileNodes, ...subfolderNodes];

      const rootKey = `root-${selectedFolderId}`;
      const rootNode = {
        title: (
          <div className="flex items-center space-x-2 font-bold">
            <FolderOpenOutlined className="text-blue-600" />
            <Text className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-bold`}>
              {selectedFolderName}
            </Text>
            <Text className={`${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} text-sm font-normal`}>
              ({innerTreeNodes.length} รายการ)
            </Text>
          </div>
        ),
        key: rootKey,
        icon: null,
        children: innerTreeNodes,
      };

      const treeNodes = [rootNode];
      
      setFileTreeData(treeNodes);
      
      if (searchText && filteredFiles.length > 0) {
        setExpandedFileKeys(preservedExpandedKeys.current);
      } else if (preservedExpandedKeys.current.length > 0) {
        setExpandedFileKeys(preservedExpandedKeys.current);
      } else {
        setExpandedFileKeys([rootKey]);
        preservedExpandedKeys.current = [rootKey];
      }
    };

    buildFileTree();
  }, [files, searchText, theme, user, folders, selectedFolderId, selectedFolderName, isSelectMode, selectedFileKeys]);

  useEffect(() => {
    preservedExpandedKeys.current = expandedFileKeys;
  }, [expandedFileKeys]);

  const handleOpenUploadModal = (folderId, folderName) => {
    const folder = folders.find(f => String(f.folder_id) === String(folderId));
    
    if (!folder) {
      message.error('ไม่พบโฟลเดอร์');
      return;
    }
    
    const isRootFolder = !folder.parent_folder_id && folder.folder_name === 'Design';
    
    if (isRootFolder) {
      message.warning('ไม่สามารถอัพโหลดไฟล์ในโฟลเดอร์หลักได้ กรุณาเลือก subfolder');
      return;
    }
    
    if (!['write', 'admin'].includes(folder.permission_type)) {
      message.error('คุณไม่มีสิทธิ์อัพโหลดไฟล์ในโฟลเดอร์นี้');
      return;
    }
    
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
    setIsUploadModalOpen(true);
  };

  const handleDeleteFolder = async (folderId) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
        message.error('กรุณาเข้าสู่ระบบ');
        navigate('/login');
        return;
    }
    
    try {
        await axios.delete(
            `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${folderId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        message.success('ลบโฟลเดอร์สำเร็จ');
        fetchFolders();
        
    } catch (err) {
        if (err.response?.data?.needsConfirmation) {
            const fileCount = err.response.data.fileCount;
            
            Modal.confirm({
                title: 'ยืนยันการลบโฟลเดอร์',
                icon: <ExclamationCircleOutlined />,
                content: (
                    <div>
                        <p>โฟลเดอร์นี้มีไฟล์อยู่ <strong>{fileCount}</strong> ไฟล์</p>
                        <p>คุณต้องการลบโฟลเดอร์พร้อมไฟล์ทั้งหมดหรือไม่?</p>
                    </div>
                ),
                okText: 'ลบทั้งหมด',
                okType: 'danger',
                cancelText: 'ยกเลิก',
                onOk: async () => {
                    try {
                        await axios.delete(
                            `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${folderId}?force=true`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        
                        message.success(`ลบโฟลเดอร์และไฟล์ ${fileCount} ไฟล์สำเร็จ`);
                        fetchFolders();
                        fetchFiles(selectedFolderId);
                    } catch (forceError) {
                        message.error(forceError.response?.data?.message || 'เกิดข้อผิดพลาดในการลบโฟลเดอร์');
                    }
                }
            });
        } else {
            if (err.response?.status === 401) {
                message.error('กรุณาเข้าสู่ระบบ');
                navigate('/login');
            } else if (err.response?.status === 403) {
                message.error('คุณไม่มีสิทธิ์ลบโฟลเดอร์นี้');
            } else {
                message.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบโฟลเดอร์');
            }
        }
    }
  };

  const handleFolderUpload = async (fileList) => {
    if (!selectedFolderId) {
      message.error('กรุณาเลือกโฟลเดอร์ก่อนอัพโหลด');
      return;
    }

    const folder = folders.find(f => String(f.folder_id) === String(selectedFolderId));
    if (!folder || !['write', 'admin'].includes(folder.permission_type)) {
      message.error('คุณไม่มีสิทธิ์อัพโหลดไฟล์ในโฟลเดอร์นี้');
      return;
    }

    const validFiles = fileList.filter(file => {
      const fileObj = file.originFileObj || file;
      if (!fileObj || fileObj.size === 0) {
        message.warning(`ข้ามไฟล์ "${file.name}" เนื่องจากไม่มีข้อมูล`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      message.error('ไม่มีไฟล์ที่ถูกต้องให้อัพโหลด');
      return;
    }

    message.info(`กำลังอัพโหลด ${validFiles.length} ไฟล์ไปที่: ${selectedFolderName}`);

    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      let uploadedCount = 0;
      const totalFiles = validFiles.length;
      const versionedFiles = [];

      for (const file of validFiles) {
        const fileObj = file.originFileObj || file;
        
        if (!fileObj || fileObj.size === 0) {
          continue;
        }

        const formData = new FormData();
        formData.append('file', fileObj);
        
        let uploadUrl;
        let relativePath = null;
        
        if (file.webkitRelativePath || file.relativePath) {
          relativePath = file.webkitRelativePath || file.relativePath;
          
          const parts = relativePath.split('/');
          if (parts.length > 0 && parts[0] === selectedFolderName) {
            parts.shift();
            relativePath = parts.join('/');
          }
          
          if (!relativePath.includes('/')) {
            relativePath = null;
          }
          
          if (relativePath) {
            uploadUrl = `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${selectedFolderId}/upload?relativePath=${encodeURIComponent(relativePath)}`;
          } else {
            uploadUrl = `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${selectedFolderId}/upload`;
          }
        } else {
          uploadUrl = `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${selectedFolderId}/upload`;
        }
        
        try {
          const response = await axios.post(
            uploadUrl,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              },
              onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                const fileProgress = (uploadedCount + (percentCompleted / 100)) / totalFiles * 100;
                setUploadProgress(Math.round(fileProgress));
              }
            }
          );
          
          if (response.data.isNewVersion) {
            versionedFiles.push({
              original: response.data.originalFileName,
              versioned: response.data.data.file_name
            });
          }
          
          uploadedCount++;
        } catch (uploadError) {
          const errorMsg = uploadError.response?.data?.message || uploadError.message;
          message.error(`ไม่สามารถอัพโหลด "${fileObj.name}": ${errorMsg}`, 5);
        }
      }

      if (selectedUsers.length > 0 && uploadedCount > 0) {
        try {
          const notifyData = {
            folderId: selectedFolderId,
            users: selectedUsers,
            fileCount: uploadedCount,
            folderName: selectedFolderName
          };

          await axios.post(
            `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/notify`,
            notifyData,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
        } catch (notifyError) {
          console.error('ส่งเมล์ล้มเหลว:', notifyError);
        }
      }

      if (uploadedCount > 0) {
        const hasVersionedFiles = versionedFiles.length > 0;
        
        message.success({
          content: (
            <div>
              <div className="font-medium mb-1">
                {uploadedCount === totalFiles 
                  ? `✅ อัพโหลดสำเร็จทั้งหมด ${uploadedCount} ไฟล์`
                  : `⚠️ อัพโหลดสำเร็จ ${uploadedCount} จาก ${totalFiles} ไฟล์`}
              </div>
              
              {selectedUsers.length > 0 && (
                <div className="text-xs text-gray-500 mb-1">
                  📧 ส่งการแจ้งเตือนไปยัง {selectedUsers.length} ผู้ใช้
                </div>
              )}
              
              {hasVersionedFiles && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-sm font-medium mb-1">
                    📝 สร้าง Version ใหม่ ({versionedFiles.length} ไฟล์)
                  </div>
                  <div className="max-h-32 overflow-auto text-xs">
                    {versionedFiles.slice(0, 5).map((file, idx) => (
                      <div key={idx} className="py-1">
                        <div className="text-gray-500">{file.original}</div>
                        <div className="text-blue-600">→ {file.versioned}</div>
                      </div>
                    ))}
                    {versionedFiles.length > 5 && (
                      <div className="text-gray-400 mt-1">
                        และอีก {versionedFiles.length - 5} ไฟล์...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ),
          duration: hasVersionedFiles ? 5 : 3,
          style: {
            marginTop: '20vh',
          }
        });
      } else {
        message.error('ไม่สามารถอัพโหลดไฟล์ได้');
      }
      
      setIsUploadModalOpen(false);
      setFolderToUpload([]);
      setSelectedUsers([]);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const currentFolderId = selectedFolderId;
      const currentFolderName = selectedFolderName;
      
      await fetchFolders();
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSelectedFolderId(currentFolderId);
      setSelectedFolderName(currentFolderName);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (currentFolderId) {
        await fetchFiles(currentFolderId);
      }
      
    } catch (err) {
      if (err.response?.status === 401) {
        message.error('กรุณาเข้าสู่ระบบ');
        navigate('/login');
      } else if (err.response?.status === 403) {
        message.error('คุณไม่มีสิทธิ์อัพโหลดไฟล์ในโฟลเดอร์นี้');
      } else {
        message.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการอัพโหลด');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

const handleFolderSelect = (selectedKeys, info) => {
    if (selectedKeys.length > 0) {
      const folderId = info.node.value;
      const folderName = info.node.title;
      
      const folder = folders.find(f => String(f.folder_id) === String(folderId));
      
      if (folder) {
        setSelectedFolderId(folderId);
        setSelectedFolderName(folderName);
        // ✅ รีเซ็ต preserved keys เมื่อเปลี่ยนโฟลเดอร์
        preservedExpandedKeys.current = [];
      } else {
        setSelectedFolderId(folderId);
        setSelectedFolderName(folderName);
        preservedExpandedKeys.current = [];
      }
    }
  };
  
  const handleFileTreeSelect = (selectedKeys, info) => {
    if (!info.node.isLeaf && info.node.children && info.node.children.length > 0) {
      const nodeKey = info.node.key;
      setExpandedFileKeys(prev => {
        if (prev.includes(nodeKey)) {
          return prev.filter(key => key !== nodeKey);
        } else {
          return [...prev, nodeKey];
        }
      });
    }
    
    if (info.node.isLeaf && info.node.fileData) {
      handlePreview(info.node.fileData);
    }
  };


const handlePreview = async (file) => {
  const ext = file.file_name.split('.').pop()?.toLowerCase();
  
  // เปิด IFC Viewer
  if (ext === 'ifc') {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const url = `${baseUrl}project/${id}/viewerifc/${file.file_id}`.replace(/\/+/g, '/');
    window.open(url, '_blank');
    return;
  }

  // ✅ จัดการไฟล์ PDF - รองรับทั้ง Desktop และ Mobile
  if (ext === 'pdf') {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${file.file_id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // ✅ ตรวจสอบว่าเป็นมือถือหรือไม่
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // ✅ มือถือ: ใช้วิธีดาวน์โหลดแทน (เปิดใน PDF Viewer ของระบบ)
        const link = document.createElement('a');
        link.href = url;
        link.download = file.file_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // ล้าง URL หลังจาก 1 นาที
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 60000);
        
        message.success(`กำลังเปิดไฟล์ ${file.file_name}`);
      } else {
        // ✅ Desktop: เปิดในแท็บใหม่
        const newWindow = window.open(url, '_blank');
        
        if (!newWindow) {
          // ถ้าถูกบล็อก popup ให้ดาวน์โหลดแทน
          const link = document.createElement('a');
          link.href = url;
          link.download = file.file_name;
          link.click();
          message.warning('Browser บล็อก popup, กำลังดาวน์โหลดแทน');
        } else {
          message.success(`กำลังเปิดไฟล์ ${file.file_name} ในแท็บใหม่`);
        }
        
        // ล้าง URL หลังจาก 1 นาที
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 60000);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        message.error('กรุณาเข้าสู่ระบบ');
        navigate('/login');
      } else if (err.response?.status === 404) {
        message.error(`ไม่พบไฟล์ ${file.file_name} ในระบบ`);
      } else {
        message.error('เกิดข้อผิดพลาดในการเปิดไฟล์ PDF');
      }
    }
    return;
  }

  // ✅ จัดการไฟล์ Excel - ดาวน์โหลดและเปิดในโปรแกรมภายนอก
  const excelExtensions = ['xlsx', 'xls', 'xlsm', 'xlsb', 'csv'];
  if (excelExtensions.includes(ext)) {
    Modal.confirm({
      title: 'เปิดไฟล์ Excel',
      icon: <ExclamationCircleOutlined />,
      content: `ต้องการดาวน์โหลดและเปิดไฟล์ "${file.file_name}" หรือไม่?`,
      okText: 'ดาวน์โหลด',
      cancelText: 'ยกเลิก',
      onOk: () => handleDownload(file)
    });
    return;
  }

  // ✅ ตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
  const isImage = imageExtensions.includes(ext);

  if (!isImage) {
    message.info('สามารถดูตัวอย่างได้เฉพาะไฟล์รูปภาพเท่านั้น');
    return;
  }

  // ✅ กรองเฉพาะไฟล์รูปภาพ (ไม่รวม PDF แล้ว)
  const allPreviewableFiles = files.filter(f => {
    const fileExt = f.file_name.split('.').pop()?.toLowerCase();
    return imageExtensions.includes(fileExt);
  });
  
  const currentIndex = allPreviewableFiles.findIndex(f => f.file_id === file.file_id);

  setPreviewableFiles(allPreviewableFiles);
  setCurrentImageIndex(currentIndex);

  try {
    const token = localStorage.getItem('token');
    setLoading(true);
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${file.file_id}/download`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      }
    );
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    setPreviewFile(file);
    setPreviewUrl(url);
    setIsPreviewModalOpen(true);
  } catch (err) {
    if (err.response?.status === 401) {
      message.error('กรุณาเข้าสู่ระบบ');
      navigate('/login');
    } else if (err.response?.status === 404) {
      message.error(`ไม่พบไฟล์ ${file.file_name} ในระบบ`);
    } else {
      message.error('เกิดข้อผิดพลาดในการดึงไฟล์เพื่อดูตัวอย่าง');
    }
  } finally {
    setLoading(false);
  }
};

  const uniqueFolders = Array.from(
    new Map(
      folders.map(f => [
        `${f.folder_id}-${f.parent_folder_id || 'root'}-${f.folder_name}`,
        f
      ])
    ).values()
  );

  
// ✅ ในส่วน buildTree function (สำหรับ Sidebar)

const buildTree = (allFolders, parentId) => {
  return allFolders
    .filter(folder => {
      if (String(folder.parent_folder_id) !== String(parentId)) return false;
      return true;
    })
    .sort((a, b) => a.folder_name.localeCompare(b.folder_name))
    .map(folder => {
      const fileCount = files.filter(f => String(f.folder_id) === String(folder.folder_id)).length;
      
      // ✅ ตรวจสอบว่าเป็น root folder หรือไม่
      const isRootFolder = !folder.parent_folder_id && folder.folder_name === 'Design';
      
      // ✅ ตรวจสอบว่าเป็นลูกโดยตรงของ root Design หรือไม่
      const parentFolder = allFolders.find(f => String(f.folder_id) === String(folder.parent_folder_id));
      const isDirectChildOfRoot = parentFolder && !parentFolder.parent_folder_id && parentFolder.folder_name === 'Design';
      
      // ✅ ตรวจสอบว่ามี subfolder หรือไม่
      const hasSubfolders = allFolders.some(f => String(f.parent_folder_id) === String(folder.folder_id));
      
      // ✅ สิทธิ์ต่างๆ
      const canDelete = !isRootFolder && !isDirectChildOfRoot && !hasSubfolders && ['write', 'admin'].includes(folder.permission_type);
      const canUpload = ['write', 'admin'].includes(folder.permission_type);
      const canCreateFolder = !isRootFolder && ['write', 'admin'].includes(folder.permission_type);
      
      // ✅ สามารถเปลี่ยนชื่อได้ถ้า: ไม่ใช่ root และไม่ใช่ลูกโดยตรงของ root
      const canRename = !isRootFolder && !isDirectChildOfRoot && ['write', 'admin'].includes(folder.permission_type);
      
      const showActions = canCreateFolder || canUpload || canRename || canDelete;
      
      return {
        title: (
          <div className="flex items-center justify-between group">
            <div className="flex items-center space-x-2">
              <Text className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {folder.folder_name}
              </Text>
              {fileCount > 0 && (
                <Text className={`${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} text-xs`}>
                  ({fileCount})
                </Text>
              )}
            </div>
            {showActions && (
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {canCreateFolder && (
                  <Button
                    type="text"
                    size="small"
                    icon={<FolderAddOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCreateFolderModal(folder.folder_id, folder.folder_name);
                    }}
                    title="สร้างโฟลเดอร์ย่อย"
                  />
                )}
                {canUpload && (
                  <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenUploadModal(folder.folder_id, folder.folder_name);
                    }}
                    title="อัพโหลดไฟล์"
                  />
                )}
                {/* ✅ เพิ่มปุ่มแก้ไขชื่อโฟลเดอร์ */}
                {canRename && (
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRenameFolderModal(folder.folder_id, folder.folder_name);
                    }}
                    title="แก้ไขชื่อโฟลเดอร์"
                  />
                )}
                {canDelete && (
                  <Popconfirm
                    title="คุณแน่ใจหรือไม่ที่จะลบโฟลเดอร์นี้?"
                    onConfirm={(e) => {
                      if (e && e.stopPropagation) e.stopPropagation();
                      handleDeleteFolder(folder.folder_id);
                    }}
                    okText="ลบ"
                    cancelText="ยกเลิก"
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      danger
                      onClick={(e) => e.stopPropagation()}
                      title="ลบโฟลเดอร์"
                    />
                  </Popconfirm>
                )}
              </div>
            )}
          </div>
        ),
        key: `folder-${folder.folder_id}`,
        value: folder.folder_id,
        icon: <FolderOutlined />,
        children: buildTree(allFolders, folder.folder_id),
      };
    });
};

const designRoots = uniqueFolders.filter(f => f.folder_name === 'Design' && !f.parent_folder_id && f.permission_type && ['read', 'write', 'admin'].includes(f.permission_type));

const treeData = designRoots.map(root => {
  const rootFileCount = files.filter(f => String(f.folder_id) === String(root.folder_id)).length;
  
  return {
    title: (
      <div className="flex items-center space-x-2">
        <Text className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>
          {root.folder_name}
        </Text>
        {rootFileCount > 0 && (
          <Text className={`${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} text-xs`}>
            ({rootFileCount})
          </Text>
        )}
      </div>
    ),
    key: `folder-${root.folder_id}`,
    value: root.folder_id,
    icon: <FolderOpenOutlined />,
    children: buildTree(uniqueFolders, root.folder_id),
  };
});


return (
    <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} font-kanit`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
      
      <div className={`custom-header ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="w-full">
          <div className="relative h-32 md:h-48 overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=2070&auto=format&fit=crop')`
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-40" />
            <div className="relative z-10 p-4 md:p-6">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Breadcrumb
                  items={[
                    { title: 'Folder' },
                    { title: 'Design' },
                  ]}
                />
                <Title level={2} className="text-white text-shadow-lg">
                  Phase: Design
                </Title>
                <Text className="text-gray-200">
                  จัดการไฟล์ออกแบบและเอกสารโครงการ
                </Text>
                <Button
                  type="primary"
                  icon={<LeftOutlined />}
                  onClick={() => navigate(`/project/${id}`)}
                  className="!bg-indigo-500 hover:!bg-indigo-600 !text-white !border-none"
                >
                  กลับ
                </Button>
              </Space>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Row gutter={[16, 16]} style={{ flex: 1, margin: 0 }}>
          <Col xs={24} lg={6} style={{ display: 'flex' }}>
            <Card
              title={
                <div className="flex items-center">
                  <FolderOutlined className="mr-2" />
                  <Title level={5} className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} m-0`}>
                    โฟลเดอร์
                  </Title>
                </div>
              }
              className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              style={{ width: '100%' }}
            >
              <Spin spinning={loading}>
                {treeData.length > 0 ? (
                  <Tree
                    treeData={treeData}
                    defaultExpandedKeys={treeData.length > 0 ? [treeData[0].key] : []}
                    onSelect={handleFolderSelect}
                    showLine
                    selectable={true}
                    multiple={false}
                    className="custom-tree"
                  />
                ) : (
                  <Empty description="ไม่มีโฟลเดอร์ที่คุณมีสิทธิ์เข้าถึง" />
                )}
              </Spin>
            </Card>
          </Col>

          <Col xs={24} lg={18} style={{ display: 'flex' }}>
            <Card
              title={
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileTextOutlined className="mr-2" />
                    <Title level={5} className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} m-0`}>
                      ไฟล์ในโฟลเดอร์: {selectedFolderName}
                    </Title>
                  </div>
                  <Space>
                    {isSelectMode ? (
                      <>
                        <Text className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          เลือกแล้ว {selectedFileKeys.length} ไฟล์
                        </Text>
                        <Button
                          type="primary"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={handleDeleteSelectedFiles}
                          disabled={selectedFileKeys.length === 0}
                        >
                          ลบที่เลือก
                        </Button>
                        <Button
                          icon={<CloseOutlined />}
                          onClick={() => {
                            setIsSelectMode(false);
                            setSelectedFileKeys([]);
                          }}
                        >
                          ยกเลิก
                        </Button>
                      </>
                    ) : (
                      <>
                        <Input
                          placeholder="ค้นหาไฟล์... (รองรับ fuzzy search)"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          prefix={<SearchOutlined />}
                          style={{ width: 250 }}
                          className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                          allowClear
                        />
                        <Button
                          icon={<CheckOutlined />}
                          onClick={() => setIsSelectMode(true)}
                        >
                          เลือกหลายไฟล์
                        </Button>
                      </>
                    )}
                  </Space>
                </div>
              }
              className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              style={{ width: '100%' }}
            >
              <Spin spinning={loading}>
                {fileTreeData.length > 0 ? (
                  <Tree
                    showLine
                    showIcon
                    expandedKeys={expandedFileKeys}
                    onExpand={setExpandedFileKeys}
                    onSelect={handleFileTreeSelect}
                    treeData={fileTreeData}
                    className={`${theme === 'dark' ? 'dark-tree' : ''} custom-file-tree`}
                    selectable={true}
                    multiple={false}
                  />
                ) : (
                  <Empty 
                    description={
                      searchText 
                        ? `ไม่พบไฟล์ที่ตรงกับคำค้นหา "${searchText}"` 
                        : 'ไม่มีไฟล์ในโฟลเดอร์นี้หรือคุณไม่มีสิทธิ์เข้าถึง'
                    } 
                  />
                )}
              </Spin>
            </Card>
          </Col>
        </Row>
      </div>

      <Modal
        title={
          <div className="flex items-center space-x-2">
            <CloudUploadOutlined />
            <span>อัพโหลดไฟล์หรือโฟลเดอร์ไปยัง "{selectedFolderName}"</span>
          </div>
        }
        open={isUploadModalOpen}
        onCancel={() => {
          setIsUploadModalOpen(false);
          setFolderToUpload([]);
          setSelectedUsers([]);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsUploadModalOpen(false);
              setFolderToUpload([]);
              setSelectedUsers([]);
            }}
          >
            ยกเลิก
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={uploading}
            onClick={() => handleFolderUpload(folderToUpload)}
            disabled={folderToUpload.length === 0}
          >
            อัพโหลด ({folderToUpload.length} ไฟล์)
          </Button>,
        ]}
        width={700}
        className="font-kanit"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Upload.Dragger
            multiple
            fileList={folderToUpload}
            showUploadList={false}
            beforeUpload={(file) => {
              if (file.size === 0) {
                message.error(`ไฟล์ "${file.name}" ไม่มีข้อมูล`);
                return Upload.LIST_IGNORE;
              }
              setFolderToUpload(prev => [...prev, file]);
              return false;
            }}
            onRemove={(file) => {
              setFolderToUpload(prev => prev.filter(f => f.uid !== file.uid));
            }}
            className="upload-dragger"
            openFileDialogOnClick={true}
            accept="*"
          >
            <p className="ant-upload-drag-icon">
              <CloudUploadOutlined />
            </p>
            <p className="ant-upload-text">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
            <p className="ant-upload-hint">
              รองรับการอัพโหลดหลายไฟล์พร้อมกัน
            </p>
          </Upload.Dragger>

          <Upload
            multiple
            directory
            showUploadList={false}
            beforeUpload={(file) => {
              if (file.size === 0) {
                return Upload.LIST_IGNORE;
              }
              setFolderToUpload(prev => [...prev, file]);
              return false;
            }}
          >
            <Button 
              icon={<FolderOpenOutlined />} 
              block
              type="dashed"
            >
              หรือเลือกโฟลเดอร์ทั้งโฟลเดอร์
            </Button>
          </Upload>
        </Space>

        {folderToUpload.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong>ไฟล์ที่เลือก: {folderToUpload.length} ไฟล์</Text>
            <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
              {folderToUpload.map((file, index) => (
                <div key={index} className="flex items-center justify-between py-1 hover:bg-gray-50 px-2 rounded">
                  <Text className="text-sm truncate" style={{ maxWidth: '60%' }}>
                    {file.webkitRelativePath || file.name}
                  </Text>
                  <div className="flex items-center gap-2">
                    <Text className="text-xs text-gray-500">{formatFileSize(file.size)}</Text>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setFolderToUpload(prev => prev.filter(f => f.uid !== file.uid));
                      }}
                      style={{ 
                        padding: '2px 8px',
                        color: '#ff4d4f'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {users.length > 0 && (
          <Form layout="vertical" className="font-kanit" style={{ marginTop: 16, fontFamily: 'Kanit, sans-serif' }}>
            <Form.Item label={<span style={{ fontFamily: 'Kanit, sans-serif' }}>ส่งการแจ้งเตือนไปยัง</span>}>
              <Space style={{ marginBottom: 8 }}>
                <Button
                  type="primary"
                  size="small"
                  style={{ fontFamily: 'Kanit, sans-serif' }}
                  onClick={() => setSelectedUsers(users.map(u => u.username))}
                >
                  เลือกทั้งหมด
                </Button>
                <Button
                  size="small"
                  style={{ fontFamily: 'Kanit, sans-serif' }}
                  onClick={() => setSelectedUsers([])}
                >
                  ยกเลิกทั้งหมด
                </Button>
              </Space>
              <Checkbox.Group
                options={users.map(u => ({ 
                  label: <span style={{ fontFamily: 'Kanit, sans-serif' }}>{u.first_name || u.username}</span>, 
                  value: u.username 
                }))}
                value={selectedUsers}
                onChange={setSelectedUsers}
                className="font-kanit grid grid-cols-5 gap-2"
              />
            </Form.Item>
          </Form>
        )}

        {uploading && (
          <Progress
            percent={uploadProgress}
            status={uploadProgress < 100 ? 'active' : 'success'}
            style={{ marginTop: 16 }}
          />
        )}
      </Modal>

      <Modal
  title={
    <div className="flex items-center justify-between w-full pr-10">
      <div className="flex items-center space-x-3">
        {/* ✅ แสดงเฉพาะข้อมูลไฟล์ ไม่แสดงรูปภาพ */}
        <span className="truncate max-w-md">{previewFile?.file_name || ''}</span>
        <Tag color="blue" className="text-xs">
          {formatFileSize(previewFile?.file_size || 0)}
        </Tag>
        <Text className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs`}>
          {previewFile?.uploaded_by}
        </Text>
        <Text className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-xs`}>
          {moment(previewFile?.created_at).format('DD/MM/YYYY HH:mm')}
        </Text>
      </div>
      {previewableFiles.length > 1 && (
        <Text className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} font-medium`}>
          {currentImageIndex + 1} / {previewableFiles.length}
        </Text>
      )}
    </div>
  }
  open={isPreviewModalOpen}
  onCancel={() => {
    setIsPreviewModalOpen(false);
    setPreviewFile(null);
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }}
  footer={[
    <Button
      key="prev"
      icon={<LeftArrow />}
      onClick={() => handleNavigateImage('prev')}
      disabled={previewableFiles.length <= 1}
    >
      ก่อนหน้า
    </Button>,
    <Button
      key="next"
      icon={<RightOutlined />}
      onClick={() => handleNavigateImage('next')}
      disabled={previewableFiles.length <= 1}
    >
      ถัดไป
    </Button>,
    <Button
      key="download"
      type="primary"
      icon={<DownloadOutlined />}
      onClick={() => {
        if (previewFile) handleDownload(previewFile);
      }}
    >
      ดาวน์โหลด
    </Button>,
    <Button
      key="close"
      onClick={() => {
        setIsPreviewModalOpen(false);
        setPreviewFile(null);
        if (previewUrl) {
          window.URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      }}
    >
      ปิด
    </Button>,
  ]}
  width={1000}
  className="font-kanit"
  styles={{ body: { padding: 0 } }}
  centered
>
  {/* ✅ Body: แสดงรูปภาพเพียงที่เดียว */}
  <Spin spinning={loading}>
    {previewFile && (
      <div>
        {isImageFile(previewFile.file_name) && previewUrl && (
          <div 
            style={{ 
              height: '70vh',
              minHeight: '400px',
              maxHeight: '800px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme === 'dark' ? '#1f1f1f' : '#f5f5f5',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <img
              src={previewUrl}
              alt={previewFile.file_name}
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                cursor: previewableFiles.length > 1 ? 'pointer' : 'default',
                display: 'block'
              }}
              onClick={() => {
                if (previewableFiles.length > 1) {
                  handleNavigateImage('next');
                }
              }}
            />
          </div>
        )}
        
        {previewableFiles.length > 1 && (
          <div 
            className="text-center" 
            style={{ 
              padding: '12px',
              backgroundColor: theme === 'dark' ? '#262626' : '#fafafa',
              borderTop: `1px solid ${theme === 'dark' ? '#3f3f3f' : '#e8e8e8'}`
            }}
          >
            <Text className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-xs`}>
              💡 คลิกที่รูปภาพหรือใช้ปุ่มเพื่อดูรูปถัดไป
            </Text>
          </div>
        )}
      </div>
    )}
  </Spin>
</Modal>

      <Modal
        title={
          <div className="flex items-center space-x-2">
            <FolderAddOutlined />
            <span>สร้างโฟลเดอร์ใหม่ใน "{parentFolderForNewFolder?.name}"</span>
          </div>
        }
        open={isCreateFolderModalOpen}
        onCancel={() => {
          setIsCreateFolderModalOpen(false);
          setNewFolderName('');
          setParentFolderForNewFolder(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsCreateFolderModalOpen(false);
              setNewFolderName('');
              setParentFolderForNewFolder(null);
            }}
          >
            ยกเลิก
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={createFolderLoading}
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
          >
            สร้างโฟลเดอร์
          </Button>,
        ]}
        className="font-kanit"
      >
        <Form layout="vertical" className="font-kanit">
          <Form.Item label="ชื่อโฟลเดอร์" required>
            <Input
              placeholder="กรอกชื่อโฟลเดอร์"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onPressEnter={handleCreateFolder}
              maxLength={100}
              className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
              autoFocus
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center space-x-2">
            <EditOutlined />
            <span>แก้ไขชื่อไฟล์</span>
          </div>
        }
        open={isRenameModalOpen}
        onCancel={() => {
          setIsRenameModalOpen(false);
          setFileToRename(null);
          setNewFileName('');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsRenameModalOpen(false);
              setFileToRename(null);
              setNewFileName('');
            }}
          >
            ยกเลิก
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={renameLoading}
            onClick={handleRenameFile}
            disabled={!newFileName.trim()}
          >
            บันทึก
          </Button>,
        ]}
        className="font-kanit"
      >
        <Form layout="vertical" className="font-kanit">
          <Form.Item label="ชื่อไฟล์เดิม">
            <Input
              value={fileToRename?.file_name}
              disabled
              className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-100'}`}
            />
          </Form.Item>
          <Form.Item label="ชื่อไฟล์ใหม่" required>
            <Input
              placeholder="กรอกชื่อไฟล์ใหม่"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onPressEnter={handleRenameFile}
              maxLength={255}
              className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
              autoFocus
            />
          </Form.Item>
          <Text className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs`}>
            💡 สามารถเปลี่ยนชื่อและนามสกุลไฟล์ได้
          </Text>
        </Form>
      </Modal>
    
      {/* ✅ Modal แก้ไขชื่อโฟลเดอร์ */}
<Modal
  title={
    <div className="flex items-center space-x-2">
      <EditOutlined />
      <span>แก้ไขชื่อโฟลเดอร์</span>
    </div>
  }
  open={isRenameFolderModalOpen}
  onCancel={() => {
    setIsRenameFolderModalOpen(false);
    setFolderToRename(null);
    setNewFolderNameForRename('');
  }}
  footer={[
    <Button
      key="cancel"
      onClick={() => {
        setIsRenameFolderModalOpen(false);
        setFolderToRename(null);
        setNewFolderNameForRename('');
      }}
    >
      ยกเลิก
    </Button>,
    <Button
      key="submit"
      type="primary"
      loading={renameFolderLoading}
      onClick={handleRenameFolder}
      disabled={!newFolderNameForRename.trim()}
    >
      บันทึก
    </Button>,
  ]}
  className="font-kanit"
>
  <Form layout="vertical" className="font-kanit">
    <Form.Item label="ชื่อโฟลเดอร์เดิม">
      <Input
        value={folderToRename?.name}
        disabled
        className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-100'}`}
      />
    </Form.Item>
    <Form.Item label="ชื่อโฟลเดอร์ใหม่" required>
      <Input
        placeholder="กรอกชื่อโฟลเดอร์ใหม่"
        value={newFolderNameForRename}
        onChange={(e) => setNewFolderNameForRename(e.target.value)}
        onPressEnter={handleRenameFolder}
        maxLength={100}
        className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
        autoFocus
      />
    </Form.Item>
    {/* <Text className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs`}>
      💡 ไม่สามารถเปลี่ยนชื่อโฟลเดอร์หลัก Design และโฟลเดอร์ย่อยระดับแรก (เช่น Drawings, Documents) ได้
    </Text> */}
  </Form>
</Modal>
    </div>
  );
};

export default Design;