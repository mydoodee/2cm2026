// src/components/projects/Design.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Typography, message, Modal, Space, Breadcrumb } from 'antd';
import { LeftOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import Navbar from '../Navbar';
import DriveUI from './DriveUI';
import './Design.css';
import moment from 'moment';

moment.locale('th');

const { Title, Text } = Typography;

const Design = ({ user, setUser, theme, setTheme }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [folderToUpload, setFolderToUpload] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previewableFiles, setPreviewableFiles] = useState([]);
  const isMounted = useRef(true);
  const cancelTokenSource = useRef(null);

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderForNewFolder, setParentFolderForNewFolder] = useState(null);
  const [createFolderLoading, setCreateFolderLoading] = useState(false);

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState(null);
  const [newFolderNameForRename, setNewFolderNameForRename] = useState('');
  const [renameFolderLoading, setRenameFolderLoading] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (cancelTokenSource.current) cancelTokenSource.current.cancel('Component unmounted');
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ─── fetchFolders ──────────────────────────────────────────────────────────
  const fetchFolders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { message.error('กรุณาเข้าสู่ระบบ'); navigate('/login'); return; }
      cancelTokenSource.current = axios.CancelToken.source();
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folders`, {
        headers: { Authorization: `Bearer ${token}` },
        cancelToken: cancelTokenSource.current.token
      });
      if (!isMounted.current) return;
      const allFolders = response.data.data || [];
      const folderMap = new Map();
      allFolders.forEach(folder => folderMap.set(folder.folder_id, { ...folder }));
      const getEffectivePermission = (folderId, visited = new Set()) => {
        if (visited.has(folderId)) return null;
        visited.add(folderId);
        const folder = folderMap.get(folderId);
        if (!folder) return null;
        if (folder.permission_type && ['read', 'write', 'admin'].includes(folder.permission_type)) return folder.permission_type;
        if (folder.parent_folder_id) return getEffectivePermission(folder.parent_folder_id, visited);
        return null;
      };
      const foldersWithPermission = allFolders.map(folder => {
        if (folder.permission_type && ['read', 'write', 'admin'].includes(folder.permission_type)) return folder;
        const effectivePermission = getEffectivePermission(folder.parent_folder_id);
        return { ...folder, permission_type: effectivePermission || folder.permission_type, _inherited: !!effectivePermission };
      });
      setFolders(foldersWithPermission);
      const designFolder = foldersWithPermission.find(f => f.folder_name === 'Design' && !f.parent_folder_id);
      if (designFolder) { setSelectedFolderId(designFolder.folder_id); setSelectedFolderName(designFolder.folder_name); }
    } catch (error) {
      if (axios.isCancel(error)) return;
      message.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลโฟลเดอร์');
      if (error.response?.status === 401) navigate('/login');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  // ─── fetchFiles ────────────────────────────────────────────────────────────
  const fetchFiles = async (folderId) => {
    if (!folderId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const getAllSubfolderIds = (fId, isRoot = true) => {
        const subfolders = folders.filter(f => String(f.parent_folder_id) === String(fId));
        const results = [{ id: fId, isRoot }];
        subfolders.forEach(sub => results.push(...getAllSubfolderIds(sub.folder_id, false)));
        return results;
      };
      const folderIdsInfo = getAllSubfolderIds(folderId, true);
      const allFiles = [];
      cancelTokenSource.current = axios.CancelToken.source();
      for (const folderInfo of folderIdsInfo) {
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${folderInfo.id}/files`,
            { headers: { Authorization: `Bearer ${token}` }, cancelToken: cancelTokenSource.current.token }
          );
          if (!isMounted.current) return;
          const currentFolder = folders.find(f => String(f.folder_id) === String(folderInfo.id));
          const filesWithFolderInfo = (response.data.data || []).map(file => ({
            ...file, folder_id: folderInfo.id,
            folder_name: currentFolder?.folder_name || '',
            is_root_folder: folderInfo.isRoot,
            subfolder_name: folderInfo.isRoot ? null : currentFolder?.folder_name
          }));
          allFiles.push(...filesWithFolderInfo);
        } catch (error) { if (axios.isCancel(error)) return; }
      }
      setFiles(allFiles.sort((a, b) => moment(b.created_at).unix() - moment(a.created_at).unix()));
    } catch (err) {
      if (axios.isCancel(err)) return;
      if (err.response?.status === 401) navigate('/login');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => { fetchFolders(); }, [id, navigate]);
  useEffect(() => { if (selectedFolderId) fetchFiles(selectedFolderId); }, [selectedFolderId, folders]);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/users`, { headers: { Authorization: `Bearer ${token}` } });
        if (response.data.data && Array.isArray(response.data.data)) setUsers(response.data.data);
      } catch (err) { if (err.response?.status === 401) navigate('/login'); }
    };
    fetchUsers();
  }, [id, navigate]);

  // ─── handleDownload ────────────────────────────────────────────────────────
  const handleDownload = async (file) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${file.file_id}/download`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url; link.download = file.file_name; link.click();
      window.URL.revokeObjectURL(url);
      message.success(`กำลังดาวน์โหลด ${file.file_name}`);
    } catch (err) {
      if (err.response?.status === 401) { message.error('กรุณาเข้าสู่ระบบ'); navigate('/login'); }
      else if (err.response?.status === 404) message.error(`ไม่พบไฟล์ ${file.file_name} ในระบบ`);
      else message.error('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์');
    }
  };

  // ─── handleDeleteFile ──────────────────────────────────────────────────────
  const handleDeleteFile = async (fileId, uploadedBy) => {
    const folder = folders.find(f => String(f.folder_id) === String(selectedFolderId));
    if (user.username !== uploadedBy && folder?.permission_type !== 'admin') {
      message.error('คุณไม่มีสิทธิ์ลบไฟล์นี้'); return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${fileId}`, { headers: { Authorization: `Bearer ${token}` } });
      message.success('ลบไฟล์สำเร็จ');
      fetchFiles(selectedFolderId);
    } catch (err) {
      if (err.response?.status === 401) { message.error('กรุณาเข้าสู่ระบบ'); navigate('/login'); }
      else if (err.response?.status === 403) message.error('คุณไม่มีสิทธิ์ลบไฟล์นี้');
      else if (err.response?.status === 404) message.error('ไม่พบไฟล์ในระบบ');
      else message.error('เกิดข้อผิดพลาดในการลบไฟล์');
    }
  };

  // ─── handleDeleteSelectedFiles ─────────────────────────────────────────────
  const handleDeleteSelectedFiles = async (fileKeys) => {
    const folder = folders.find(f => String(f.folder_id) === String(selectedFolderId));
    const filesToDelete = [];
    const noPermFiles = [];
    for (const key of fileKeys) {
      const fileId = key.replace('file-', '');
      const file = files.find(f => String(f.file_id) === String(fileId));
      if (!file) continue;
      const canDel = user.username === file.uploaded_by || folder?.permission_type === 'admin';
      if (canDel) filesToDelete.push(file); else noPermFiles.push(file.file_name);
    }
    if (noPermFiles.length > 0) message.warning(`คุณไม่มีสิทธิ์ลบ ${noPermFiles.length} ไฟล์`);
    if (filesToDelete.length === 0) return message.error('ไม่มีไฟล์ที่สามารถลบได้');
    Modal.confirm({
      title: 'ยืนยันการลบไฟล์', icon: <ExclamationCircleOutlined />,
      content: `ลบ ${filesToDelete.length} ไฟล์ที่เลือก?`,
      okText: 'ลบ', okType: 'danger', cancelText: 'ยกเลิก',
      onOk: async () => {
        const token = localStorage.getItem('token'); let cnt = 0;
        for (const file of filesToDelete) {
          try { await axios.delete(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${file.file_id}`, { headers: { Authorization: `Bearer ${token}` } }); cnt++; } catch {}
        }
        if (cnt > 0) message.success(`ลบสำเร็จ ${cnt} ไฟล์`);
        fetchFiles(selectedFolderId);
      }
    });
  };

  // ─── handleNavigateImage ───────────────────────────────────────────────────
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
        { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
      );
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
      setPreviewFile(nextFile);
      setPreviewUrl(window.URL.createObjectURL(new Blob([response.data])));
    } catch { message.error('เกิดข้อผิดพลาดในการโหลดไฟล์'); }
    finally { setLoading(false); }
  };

  // ─── handleOpenCreateFolderModal ───────────────────────────────────────────
  const handleOpenCreateFolderModal = (parentFolderId, parentFolderName) => {
    const folder = folders.find(f => String(f.folder_id) === String(parentFolderId));
    if (!folder || !['write', 'admin'].includes(folder.permission_type)) { message.error('คุณไม่มีสิทธิ์สร้างโฟลเดอร์ในตำแหน่งนี้'); return; }
    if (!folder.parent_folder_id && folder.folder_name === 'Design') { message.warning('ไม่สามารถสร้างโฟลเดอร์ในโฟลเดอร์หลัก Design ได้โดยตรง'); return; }
    setParentFolderForNewFolder({ id: parentFolderId, name: parentFolderName });
    setNewFolderName('');
    setIsCreateFolderModalOpen(true);
  };

  // ─── handleCreateFolder ────────────────────────────────────────────────────
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) { message.warning('กรุณาระบุชื่อโฟลเดอร์'); return; }
    const existingFolder = folders.find(f => String(f.parent_folder_id) === String(parentFolderForNewFolder.id) && f.folder_name.toLowerCase() === newFolderName.trim().toLowerCase());
    if (existingFolder) { message.error('มีโฟลเดอร์ชื่อนี้อยู่แล้วในตำแหน่งนี้'); return; }
    setCreateFolderLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder`,
        { folder_name: newFolderName.trim(), parent_folder_id: parentFolderForNewFolder.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success(`สร้างโฟลเดอร์ "${newFolderName}" สำเร็จ`);
      setIsCreateFolderModalOpen(false); setNewFolderName(''); setParentFolderForNewFolder(null);
      await fetchFolders();
    } catch (err) {
      if (err.response?.status === 401) { message.error('กรุณาเข้าสู่ระบบ'); navigate('/login'); }
      else if (err.response?.status === 403) message.error('คุณไม่มีสิทธิ์สร้างโฟลเดอร์');
      else message.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างโฟลเดอร์');
    } finally { setCreateFolderLoading(false); }
  };

  // ─── handleOpenRenameFolderModal ───────────────────────────────────────────
  const handleOpenRenameFolderModal = (folderId, folderName) => {
    const folder = folders.find(f => String(f.folder_id) === String(folderId));
    if (!folder || !['write', 'admin'].includes(folder.permission_type)) { message.error('คุณไม่มีสิทธิ์แก้ไขชื่อโฟลเดอร์นี้'); return; }
    if (!folder.parent_folder_id && folder.folder_name === 'Design') { message.warning('ไม่สามารถเปลี่ยนชื่อโฟลเดอร์หลัก Design ได้'); return; }
    if (folder.parent_folder_id) {
      const parentFolder = folders.find(f => String(f.folder_id) === String(folder.parent_folder_id));
      if (parentFolder && !parentFolder.parent_folder_id && parentFolder.folder_name === 'Design') {
        message.warning('ไม่สามารถเปลี่ยนชื่อโฟลเดอร์ย่อยระดับแรกของ Design ได้'); return;
      }
    }
    setFolderToRename({ id: folderId, name: folderName }); setNewFolderNameForRename(folderName); setIsRenameFolderModalOpen(true);
  };

  // ─── handleRenameFolder ────────────────────────────────────────────────────
  const handleRenameFolder = async () => {
    if (!newFolderNameForRename.trim()) { message.warning('กรุณาระบุชื่อโฟลเดอร์'); return; }
    if (newFolderNameForRename.trim() === folderToRename.name) { message.info('ชื่อโฟลเดอร์ไม่เปลี่ยนแปลง'); setIsRenameFolderModalOpen(false); return; }
    const currentFolder = folders.find(f => String(f.folder_id) === String(folderToRename.id));
    const existingFolder = folders.find(f => String(f.parent_folder_id) === String(currentFolder.parent_folder_id) && String(f.folder_id) !== String(folderToRename.id) && f.folder_name.toLowerCase() === newFolderNameForRename.trim().toLowerCase());
    if (existingFolder) { message.error('มีโฟลเดอร์ชื่อนี้อยู่แล้วในตำแหน่งนี้'); return; }
    setRenameFolderLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${folderToRename.id}/rename`,
        { new_name: newFolderNameForRename.trim() }, { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success(`เปลี่ยนชื่อโฟลเดอร์เป็น "${newFolderNameForRename}" สำเร็จ`);
      setIsRenameFolderModalOpen(false); setFolderToRename(null); setNewFolderNameForRename('');
      await fetchFolders();
      if (String(folderToRename.id) === String(selectedFolderId)) setSelectedFolderName(newFolderNameForRename.trim());
    } catch (err) {
      if (err.response?.status === 401) { message.error('กรุณาเข้าสู่ระบบ'); navigate('/login'); }
      else if (err.response?.status === 403) message.error('คุณไม่มีสิทธิ์แก้ไขชื่อโฟลเดอร์นี้');
      else message.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขชื่อโฟลเดอร์');
    } finally { setRenameFolderLoading(false); }
  };

  // ─── handleOpenRenameModal (file) ──────────────────────────────────────────
  const handleOpenRenameModal = (file) => {
    const folder = folders.find(f => String(f.folder_id) === String(file.folder_id));
    if (user.username !== file.uploaded_by && folder?.permission_type !== 'admin') { message.error('คุณไม่มีสิทธิ์แก้ไขชื่อไฟล์นี้'); return; }
    setFileToRename(file); setNewFileName(file.file_name); setIsRenameModalOpen(true);
  };

  // ─── handleRenameFile ──────────────────────────────────────────────────────
  const handleRenameFile = async () => {
    if (!newFileName.trim()) { message.warning('กรุณาระบุชื่อไฟล์'); return; }
    if (newFileName.trim() === fileToRename.file_name) { message.info('ชื่อไฟล์ไม่เปลี่ยนแปลง'); setIsRenameModalOpen(false); return; }
    const existingFile = files.find(f => String(f.folder_id) === String(fileToRename.folder_id) && f.file_id !== fileToRename.file_id && f.file_name.toLowerCase() === newFileName.trim().toLowerCase());
    if (existingFile) { message.error('มีไฟล์ชื่อนี้อยู่แล้วในโฟลเดอร์นี้'); return; }
    setRenameLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${fileToRename.file_id}/rename`,
        { new_name: newFileName.trim() }, { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success(`เปลี่ยนชื่อไฟล์เป็น "${newFileName}" สำเร็จ`);
      setIsRenameModalOpen(false); setFileToRename(null); setNewFileName('');
      await fetchFiles(selectedFolderId);
    } catch (err) {
      if (err.response?.status === 401) { message.error('กรุณาเข้าสู่ระบบ'); navigate('/login'); }
      else if (err.response?.status === 403) message.error('คุณไม่มีสิทธิ์แก้ไขชื่อไฟล์นี้');
      else message.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขชื่อไฟล์');
    } finally { setRenameLoading(false); }
  };

  // ─── handleOpenUploadModal ─────────────────────────────────────────────────
  const handleOpenUploadModal = (folderId, folderName) => {
    const folder = folders.find(f => String(f.folder_id) === String(folderId));
    if (!folder) { message.error('ไม่พบโฟลเดอร์'); return; }
    if (!folder.parent_folder_id && folder.folder_name === 'Design') { message.warning('ไม่สามารถอัพโหลดไฟล์ในโฟลเดอร์หลักได้ กรุณาเลือก subfolder'); return; }
    if (!['write', 'admin'].includes(folder.permission_type)) { message.error('คุณไม่มีสิทธิ์อัพโหลดไฟล์ในโฟลเดอร์นี้'); return; }
    setSelectedFolderId(folderId); setSelectedFolderName(folderName); setIsUploadModalOpen(true);
  };

  // ─── handleDeleteFolder ────────────────────────────────────────────────────
  const handleDeleteFolder = async (folderId) => {
    const token = localStorage.getItem('token');
    if (!token) { message.error('กรุณาเข้าสู่ระบบ'); navigate('/login'); return; }
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${folderId}`, { headers: { Authorization: `Bearer ${token}` } });
      message.success('ลบโฟลเดอร์สำเร็จ'); fetchFolders();
    } catch (err) {
      if (err.response?.data?.needsConfirmation) {
        const fileCount = err.response.data.fileCount;
        Modal.confirm({
          title: 'ยืนยันการลบโฟลเดอร์', icon: <ExclamationCircleOutlined />,
          content: (<div><p>โฟลเดอร์นี้มีไฟล์อยู่ <strong>{fileCount}</strong> ไฟล์</p><p>คุณต้องการลบโฟลเดอร์พร้อมไฟล์ทั้งหมดหรือไม่?</p></div>),
          okText: 'ลบทั้งหมด', okType: 'danger', cancelText: 'ยกเลิก',
          onOk: async () => {
            try {
              await axios.delete(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${folderId}?force=true`, { headers: { Authorization: `Bearer ${token}` } });
              message.success(`ลบโฟลเดอร์และไฟล์ ${fileCount} ไฟล์สำเร็จ`); fetchFolders(); fetchFiles(selectedFolderId);
            } catch (forceError) { message.error(forceError.response?.data?.message || 'เกิดข้อผิดพลาดในการลบโฟลเดอร์'); }
          }
        });
      } else {
        if (err.response?.status === 401) { message.error('กรุณาเข้าสู่ระบบ'); navigate('/login'); }
        else if (err.response?.status === 403) message.error('คุณไม่มีสิทธิ์ลบโฟลเดอร์นี้');
        else message.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบโฟลเดอร์');
      }
    }
  };

  // ─── handleFolderUpload ────────────────────────────────────────────────────
  const handleFolderUpload = async (fileList) => {
    if (!selectedFolderId) { message.error('กรุณาเลือกโฟลเดอร์ก่อนอัพโหลด'); return; }
    const folder = folders.find(f => String(f.folder_id) === String(selectedFolderId));
    if (!folder || !['write', 'admin'].includes(folder.permission_type)) { message.error('คุณไม่มีสิทธิ์อัพโหลดไฟล์ในโฟลเดอร์นี้'); return; }
    const validFiles = fileList.filter(file => { const fo = file.originFileObj || file; if (!fo || fo.size === 0) { message.warning(`ข้ามไฟล์ "${file.name}" เนื่องจากไม่มีข้อมูล`); return false; } return true; });
    if (validFiles.length === 0) { message.error('ไม่มีไฟล์ที่ถูกต้องให้อัพโหลด'); return; }
    message.info(`กำลังอัพโหลด ${validFiles.length} ไฟล์ไปที่: ${selectedFolderName}`);
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      let uploadedCount = 0;
      const totalFiles = validFiles.length;
      const versionedFiles = [];
      for (const file of validFiles) {
        const fileObj = file.originFileObj || file;
        if (!fileObj || fileObj.size === 0) continue;
        const formData = new FormData();
        formData.append('file', fileObj);
        let uploadUrl;
        let relativePath = null;
        if (file.webkitRelativePath || file.relativePath) {
          relativePath = file.webkitRelativePath || file.relativePath;
          const parts = relativePath.split('/');
          if (parts.length > 0 && parts[0] === selectedFolderName) { parts.shift(); relativePath = parts.join('/'); }
          if (!relativePath.includes('/')) relativePath = null;
          if (relativePath) uploadUrl = `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${selectedFolderId}/upload?relativePath=${encodeURIComponent(relativePath)}`;
          else uploadUrl = `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${selectedFolderId}/upload`;
        } else {
          uploadUrl = `${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/folder/${selectedFolderId}/upload`;
        }
        try {
          const response = await axios.post(uploadUrl, formData, {
            headers: { Authorization: `Bearer ${token}` },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(Math.round((uploadedCount + (percentCompleted / 100)) / totalFiles * 100));
            }
          });
          if (response.data.isNewVersion) versionedFiles.push({ original: response.data.originalFileName, versioned: response.data.data.file_name });
          uploadedCount++;
        } catch (uploadError) { message.error(`ไม่สามารถอัพโหลด "${fileObj.name}": ${uploadError.response?.data?.message || uploadError.message}`, 5); }
      }
      if (selectedUsers.length > 0 && uploadedCount > 0) {
        try {
          await axios.post(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/notify`,
            { folderId: selectedFolderId, users: selectedUsers, fileCount: uploadedCount, folderName: selectedFolderName },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (notifyError) { console.error('ส่งเมล์ล้มเหลว:', notifyError); }
      }
      if (uploadedCount > 0) {
        message.success({
          content: (<div><div className="font-medium mb-1">{uploadedCount === totalFiles ? `✅ อัพโหลดสำเร็จทั้งหมด ${uploadedCount} ไฟล์` : `⚠️ อัพโหลดสำเร็จ ${uploadedCount} จาก ${totalFiles} ไฟล์`}</div>{versionedFiles.length > 0 && (<div className="mt-1 text-sm">📝 สร้าง Version ใหม่ {versionedFiles.length} ไฟล์</div>)}</div>),
          duration: versionedFiles.length > 0 ? 5 : 3
        });
      } else { message.error('ไม่สามารถอัพโหลดไฟล์ได้'); }
      setIsUploadModalOpen(false); setFolderToUpload([]); setSelectedUsers([]);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const currentFolderId = selectedFolderId; const currentFolderName = selectedFolderName;
      await fetchFolders();
      await new Promise(resolve => setTimeout(resolve, 800));
      setSelectedFolderId(currentFolderId); setSelectedFolderName(currentFolderName);
      await new Promise(resolve => setTimeout(resolve, 300));
      if (currentFolderId) await fetchFiles(currentFolderId);
    } catch (err) {
      if (err.response?.status === 401) { message.error('กรุณาเข้าสู่ระบบ'); navigate('/login'); }
      else if (err.response?.status === 403) message.error('คุณไม่มีสิทธิ์อัพโหลดไฟล์ในโฟลเดอร์นี้');
      else message.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการอัพโหลด');
    } finally { setUploading(false); setUploadProgress(0); }
  };

  // ─── handleFolderSelect ────────────────────────────────────────────────────
  const handleFolderSelect = (folderId, folderName) => {
    setSelectedFolderId(folderId);
    setSelectedFolderName(folderName);
  };

  // ─── handlePreview ─────────────────────────────────────────────────────────
  const handlePreview = async (file) => {
    const ext = file.file_name.split('.').pop()?.toLowerCase();
    if (ext === 'ifc') {
      const baseUrl = import.meta.env.BASE_URL || '/';
      window.open(`${baseUrl}project/${id}/viewerifc/${file.file_id}`.replace(/\/+/g, '/'), '_blank');
      return;
    }
    if (ext === 'pdf') {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${file.file_id}/download`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          const link = document.createElement('a'); link.href = url; link.download = file.file_name; link.target = '_blank'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
          setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } else {
          const newWindow = window.open(url, '_blank');
          if (!newWindow) { const link = document.createElement('a'); link.href = url; link.download = file.file_name; link.click(); message.warning('Browser บล็อก popup, กำลังดาวน์โหลดแทน'); }
          setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        }
      } catch (err) {
        if (err.response?.status === 401) { message.error('กรุณาเข้าสู่ระบบ'); navigate('/login'); }
        else message.error('เกิดข้อผิดพลาดในการเปิดไฟล์ PDF');
      }
      return;
    }
    const excelExtensions = ['xlsx', 'xls', 'xlsm', 'xlsb', 'csv'];
    if (excelExtensions.includes(ext)) { Modal.confirm({ title: 'เปิดไฟล์ Excel', icon: <ExclamationCircleOutlined />, content: `ต้องการดาวน์โหลดและเปิดไฟล์ "${file.file_name}"?`, okText: 'ดาวน์โหลด', cancelText: 'ยกเลิก', onOk: () => handleDownload(file) }); return; }
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    if (!imageExtensions.includes(ext)) { message.info('สามารถดูตัวอย่างได้เฉพาะไฟล์รูปภาพเท่านั้น'); return; }
    const allPreviewableFiles = files.filter(f => imageExtensions.includes(f.file_name.split('.').pop()?.toLowerCase()));
    const currentIndex = allPreviewableFiles.findIndex(f => f.file_id === file.file_id);
    setPreviewableFiles(allPreviewableFiles); setCurrentImageIndex(currentIndex);
    try {
      const token = localStorage.getItem('token'); setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/project/${id}/file/${file.file_id}/download`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
      setPreviewFile(file); setPreviewUrl(window.URL.createObjectURL(new Blob([response.data]))); setIsPreviewModalOpen(true);
    } catch (err) {
      if (err.response?.status === 401) { message.error('กรุณาเข้าสู่ระบบ'); navigate('/login'); }
      else message.error('เกิดข้อผิดพลาดในการดึงไฟล์เพื่อดูตัวอย่าง');
    } finally { setLoading(false); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} font-kanit`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />

      <div className={`custom-header ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="w-full">
          <div className="relative h-32 md:h-48 overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2070&auto=format&fit=crop')` }} />
            <div className="absolute inset-0 bg-black bg-opacity-40" />
            <div className="relative z-10 p-4 md:p-6">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Breadcrumb items={[{ title: 'Folder' }, { title: 'Design' }]} />
                <Title level={2} className={`text-shadow-lg ${theme === 'dark' ? 'text-white' : 'text-white'}`}>
                  Phase: Design
                </Title>
                <Text className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-200'}`}>
                  จัดการไฟล์ design และเอกสารโครงการ
                </Text>
                <Button type="primary" icon={<LeftOutlined />} onClick={() => navigate(`/project/${id}`)}
                  className="!bg-indigo-500 hover:!bg-indigo-600 !text-white !border-none">
                  กลับ
                </Button>
              </Space>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <DriveUI
          folders={folders} files={files}
          selectedFolderId={selectedFolderId} selectedFolderName={selectedFolderName}
          rootFolderName="Design"
          users={users} user={user} theme={theme}
          loading={loading} uploading={uploading} uploadProgress={uploadProgress}
          isUploadModalOpen={isUploadModalOpen}
          folderToUpload={folderToUpload} selectedUsers={selectedUsers}
          onSetFolderToUpload={setFolderToUpload} onSetSelectedUsers={setSelectedUsers}
          onFolderSelect={handleFolderSelect}
          onUploadOpen={handleOpenUploadModal}
          onUploadSubmit={handleFolderUpload}
          onUploadClose={() => { setIsUploadModalOpen(false); setFolderToUpload([]); setSelectedUsers([]); }}
          onDownload={handleDownload} onPreview={handlePreview}
          onDeleteFile={handleDeleteFile} onRenameFile={handleOpenRenameModal}
          onDeleteSelectedFiles={handleDeleteSelectedFiles}
          onCreateFolder={handleOpenCreateFolderModal}
          onRenameFolder={handleOpenRenameFolderModal}
          onDeleteFolder={handleDeleteFolder}
          isCreateFolderModalOpen={isCreateFolderModalOpen}
          isRenameFolderModalOpen={isRenameFolderModalOpen}
          isRenameFileModalOpen={isRenameModalOpen}
          onCloseCreateFolder={() => { setIsCreateFolderModalOpen(false); setNewFolderName(''); setParentFolderForNewFolder(null); }}
          onCloseRenameFolder={() => { setIsRenameFolderModalOpen(false); setFolderToRename(null); setNewFolderNameForRename(''); }}
          onCloseRenameFile={() => { setIsRenameModalOpen(false); setFileToRename(null); setNewFileName(''); }}
          handleCreateFolder={handleCreateFolder} handleRenameFolder={handleRenameFolder} handleRenameFile={handleRenameFile}
          newFolderName={newFolderName} setNewFolderName={setNewFolderName}
          parentFolderForNewFolder={parentFolderForNewFolder} createFolderLoading={createFolderLoading}
          newFolderNameForRename={newFolderNameForRename} setNewFolderNameForRename={setNewFolderNameForRename}
          folderToRename={folderToRename} renameFolderLoading={renameFolderLoading}
          fileToRename={fileToRename} newFileName={newFileName} setNewFileName={setNewFileName} renameLoading={renameLoading}
          isPreviewModalOpen={isPreviewModalOpen} previewFile={previewFile} previewUrl={previewUrl}
          previewableFiles={previewableFiles} currentImageIndex={currentImageIndex}
          onClosePreview={() => { setIsPreviewModalOpen(false); setPreviewFile(null); if (previewUrl) { window.URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }}
          onNavigateImage={handleNavigateImage}
        />
      </div>
    </div>
  );
};

export default Design;