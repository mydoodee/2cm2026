// src/components/projects/DriveUI.jsx
// Google Drive-style File Manager – Shared Component
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Button, Input, Spin, Tooltip, Popconfirm,
  Modal, Upload, Form, Progress, Checkbox, Tag, message, Dropdown, Typography
} from 'antd';
import {
  FolderOutlined, FolderOpenOutlined, FileOutlined,
  DownloadOutlined, DeleteOutlined, EditOutlined, FolderAddOutlined,
  CloudUploadOutlined, SearchOutlined, AppstoreOutlined, UnorderedListOutlined,
  PlusOutlined, CloseOutlined, CheckOutlined,
  HomeOutlined, RightOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';
import './DriveUI.css';

const { Text } = Typography;

// ─── Helper: ไอคอนไฟล์ตาม extension ───────────────────────────────────────
const getFileEmoji = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map = {
    pdf: '📄',
    dwg: '📐',
    dxf: '📐',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', webp: '🖼️',
    zip: '📦', rar: '📦', '7z': '📦',
    ifc: '🏗️',
    xlsx: '📊', xls: '📊', csv: '📊',
    docx: '📝', doc: '📝',
    pptx: '📊', ppt: '📊',
    mp4: '🎬', avi: '🎬', mov: '🎬',
    mp3: '🎵', wav: '🎵',
    txt: '📃',
    default: '📄'
  };
  return map[ext] || map.default;
};

const getFileColor = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map = {
    pdf: '#ef4444',
    dwg: '#3b82f6', dxf: '#3b82f6',
    jpg: '#22c55e', jpeg: '#22c55e', png: '#22c55e', gif: '#22c55e', bmp: '#22c55e', webp: '#22c55e',
    zip: '#a855f7', rar: '#a855f7',
    ifc: '#06b6d4',
    xlsx: '#16a34a', xls: '#16a34a', csv: '#16a34a',
    docx: '#2563eb', doc: '#2563eb',
    default: '#6b7280'
  };
  return map[ext] || map.default;
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const fuzzySearch = (searchTerm, text) => {
  if (!searchTerm || !text) return true;
  const search = searchTerm.toLowerCase().replace(/\s+/g, '');
  const target = text.toLowerCase().replace(/\s+/g, '');
  let si = 0;
  for (let i = 0; i < target.length && si < search.length; i++) {
    if (target[i] === search[si]) si++;
  }
  return si === search.length;
};

// ─── FolderTree recursive sidebar item ─────────────────────────────────────
const SidebarFolderItem = ({
  folder, folders, files, selectedFolderId, theme, level = 0,
  onSelect, onUpload, onCreateFolder, onRenameFolder, onDeleteFolder,
  rootFolderName, user
}) => {
  const [expanded, setExpanded] = useState(level < 2);
  const children = folders.filter(f => String(f.parent_folder_id) === String(folder.folder_id))
    .sort((a, b) => a.folder_name.localeCompare(b.folder_name));
  const fileCount = files.filter(f => String(f.folder_id) === String(folder.folder_id)).length;
  const totalCount = fileCount;
  const isSelected = String(selectedFolderId) === String(folder.folder_id);
  const isDark = theme === 'dark';
  const isRoot = !folder.parent_folder_id;
  const parentFolder = folders.find(f => String(f.folder_id) === String(folder.parent_folder_id));
  const isDirectChildOfRoot = parentFolder && !parentFolder.parent_folder_id;
  const hasSubfolders = children.length > 0;

  const canUpload = ['write', 'admin'].includes(folder.permission_type);
  const canCreateFolder = !isRoot && ['write', 'admin'].includes(folder.permission_type);
  const canRenameFolder = !isRoot && !isDirectChildOfRoot && ['write', 'admin'].includes(folder.permission_type);
  const canDeleteFolder = !isRoot && !isDirectChildOfRoot && !hasSubfolders && ['write', 'admin'].includes(folder.permission_type);

  return (
    <div>
      <div
        className={`drive-folder-item ${isSelected ? 'active' : ''} ${isDark ? 'dark' : ''}`}
        style={{ paddingLeft: `${12 + level * 16}px` }}
        onClick={() => {
          onSelect(folder.folder_id, folder.folder_name);
          if (children.length > 0) setExpanded(e => !e);
        }}
      >
        {children.length > 0 ? (
          <span
            style={{ cursor: 'pointer', fontSize: 10, color: '#5f6368', width: 12, flexShrink: 0, transform: expanded ? 'rotate(90deg)' : '', transition: 'transform 0.15s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          >▶</span>
        ) : <span style={{ width: 12, flexShrink: 0 }} />}

        {isSelected
          ? <FolderOpenOutlined className={`drive-folder-icon ${isDark ? '' : ''}`} style={{ color: '#1a73e8' }} />
          : <FolderOutlined className="drive-folder-icon" />
        }
        <span className={`drive-folder-name ${isDark ? 'dark' : ''}`}>{folder.folder_name}</span>
        {totalCount > 0 && <span className="drive-folder-count">{totalCount}</span>}

        {/* Hover actions */}
        <span className="drive-folder-actions" onClick={e => e.stopPropagation()}>
          {canUpload && (
            <Tooltip title="อัพโหลด"><Button type="text" size="small" icon={<PlusOutlined />}
              onClick={() => onUpload(folder.folder_id, folder.folder_name)} /></Tooltip>
          )}
          {canCreateFolder && (
            <Tooltip title="สร้างโฟลเดอร์"><Button type="text" size="small" icon={<FolderAddOutlined />}
              onClick={() => onCreateFolder(folder.folder_id, folder.folder_name)} /></Tooltip>
          )}
          {canRenameFolder && (
            <Tooltip title="เปลี่ยนชื่อ"><Button type="text" size="small" icon={<EditOutlined />}
              onClick={() => onRenameFolder(folder.folder_id, folder.folder_name)} /></Tooltip>
          )}
          {canDeleteFolder && (
            <Popconfirm title="ลบโฟลเดอร์นี้?" okText="ลบ" cancelText="ยกเลิก" okType="danger"
              onConfirm={() => onDeleteFolder(folder.folder_id)}
              onPopupClick={e => e.stopPropagation()}>
              <Tooltip title="ลบ"><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Tooltip>
            </Popconfirm>
          )}
        </span>
      </div>

      {expanded && children.length > 0 && (
        <div>
          {children.map(child => (
            <SidebarFolderItem
              key={child.folder_id}
              folder={child} folders={folders} files={files}
              selectedFolderId={selectedFolderId} theme={theme} level={level + 1}
              onSelect={onSelect} onUpload={onUpload} onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder} onDeleteFolder={onDeleteFolder}
              rootFolderName={rootFolderName} user={user}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main DriveUI Component ─────────────────────────────────────────────────
const DriveUI = ({
  // Data
  folders = [],
  files = [],
  selectedFolderId,
  selectedFolderName,
  rootFolderName,
  users = [],
  user,
  theme = 'light',

  // States
  loading = false,
  uploading = false,
  uploadProgress = 0,

  // Upload modal state (controlled from parent)
  isUploadModalOpen = false,
  folderToUpload = [],
  selectedUsers = [],
  onSetFolderToUpload,
  onSetSelectedUsers,

  // Callbacks - navigation
  onFolderSelect,

  // Callbacks - file operations
  onUploadOpen,    // (folderId, folderName)
  onUploadSubmit,  // (fileList)
  onDownload,      // (file)
  onPreview,       // (file)
  onDeleteFile,    // (fileId, uploadedBy)
  onRenameFile,    // (file)
  onDeleteSelectedFiles, // (selectedKeys)

  // Callbacks - folder operations
  onCreateFolder,  // (parentId, parentName)
  onRenameFolder,  // (folderId, folderName)
  onDeleteFolder,  // (folderId)

  // Upload modal close
  onUploadClose,

  // Rename/Create folder modal – controlled from parent
  isCreateFolderModalOpen,
  isRenameFolderModalOpen,
  isRenameFileModalOpen,
  onCloseCreateFolder,
  onCloseRenameFolder,
  onCloseRenameFile,
  handleCreateFolder,
  handleRenameFolder,
  handleRenameFile,
  newFolderName, setNewFolderName,
  parentFolderForNewFolder,
  createFolderLoading,
  newFolderNameForRename, setNewFolderNameForRename,
  folderToRename,
  renameFolderLoading,
  fileToRename,
  newFileName, setNewFileName,
  renameLoading,

  // Preview modal
  isPreviewModalOpen,
  previewFile,
  previewUrl,
  previewableFiles = [],
  currentImageIndex,
  onClosePreview,
  onNavigateImage,
}) => {
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchText, setSearchText] = useState('');
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // {x, y, item, type}
  const [breadcrumb, setBreadcrumb] = useState([]); // [{id, name}]
  const mainRef = useRef(null);

  // Build breadcrumb from selectedFolderId
  useEffect(() => {
    if (!selectedFolderId || folders.length === 0) return;
    const buildPath = (folderId) => {
      const folder = folders.find(f => String(f.folder_id) === String(folderId));
      if (!folder) return [];
      if (!folder.parent_folder_id) return [{ id: folder.folder_id, name: folder.folder_name }];
      return [...buildPath(folder.parent_folder_id), { id: folder.folder_id, name: folder.folder_name }];
    };
    setBreadcrumb(buildPath(selectedFolderId));
    setSelectedKeys([]);
    setIsSelectMode(false);
    setSearchText('');
  }, [selectedFolderId, folders]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ─── Root folders (the main section folder) ───
  const rootFolders = folders.filter(f =>
    f.folder_name === rootFolderName && !f.parent_folder_id &&
    ['read', 'write', 'admin'].includes(f.permission_type)
  );
  const rootFolder = rootFolders[0];

  // ─── Items to display in content area ───
  const currentFolderObj = folders.find(f => String(f.folder_id) === String(selectedFolderId));
  const isRootSelected = currentFolderObj && !currentFolderObj.parent_folder_id;

  const childFolders = folders
    .filter(f => String(f.parent_folder_id) === String(selectedFolderId))
    .sort((a, b) => a.folder_name.localeCompare(b.folder_name));

  const currentFiles = files
    .filter(f => String(f.folder_id) === String(selectedFolderId))
    .filter(f => {
      if (!searchText) return true;
      return fuzzySearch(searchText, f.file_name) || fuzzySearch(searchText, f.uploaded_by || '');
    })
    .sort((a, b) => moment(b.created_at).unix() - moment(a.created_at).unix());

  const filteredFolders = childFolders.filter(f => {
    if (!searchText) return true;
    return fuzzySearch(searchText, f.folder_name);
  });

  // ─── Permission for current folder ───
  const canUploadHere = currentFolderObj && !isRootSelected &&
    ['write', 'admin'].includes(currentFolderObj.permission_type);

  const canCreateFolderHere = currentFolderObj && !isRootSelected &&
    ['write', 'admin'].includes(currentFolderObj.permission_type);

  // ─── Stats ───
  const totalSize = currentFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);

  // ─── Drag & Drop ───
  const handleDragOver = (e) => {
    if (!canUploadHere) return;
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canUploadHere) return;
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.size > 0);
    if (droppedFiles.length === 0) return;
    onSetFolderToUpload(droppedFiles);
    onUploadOpen(selectedFolderId, selectedFolderName);
  };

  // ─── Right-click ───
  const handleContextMenu = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item, type });
  };

  // ─── Select ───
  const toggleSelect = (key) => {
    setSelectedKeys(prev => prev.includes(key)
      ? prev.filter(k => k !== key)
      : [...prev, key]
    );
  };

  // ─── "+" New dropdown menuitems ───
  const newMenuItems = [
    canUploadHere && {
      key: 'upload-file',
      icon: <FileOutlined />,
      label: 'อัพโหลดไฟล์',
      onClick: () => {
        onSetFolderToUpload([]);
        onUploadOpen(selectedFolderId, selectedFolderName);
      }
    },
    canUploadHere && {
      key: 'upload-folder',
      icon: <FolderOpenOutlined />,
      label: 'อัพโหลดโฟลเดอร์',
      onClick: () => {
        onSetFolderToUpload([]);
        onUploadOpen(selectedFolderId, selectedFolderName);
      }
    },
    canCreateFolderHere && { type: 'divider' },
    canCreateFolderHere && {
      key: 'new-folder',
      icon: <FolderAddOutlined />,
      label: 'สร้างโฟลเดอร์ใหม่',
      onClick: () => onCreateFolder(selectedFolderId, selectedFolderName)
    },
  ].filter(Boolean);

  // ─── Context Menu Actions ───
  const ContextMenu = () => {
    if (!contextMenu) return null;
    const { x, y, item, type } = contextMenu;
    const isFile = type === 'file';
    const folder = isFile ? folders.find(f => String(f.folder_id) === String(item.folder_id)) : folders.find(f => String(f.folder_id) === String(item.folder_id));
    const canEdit = isFile
      ? (user?.username === item.uploaded_by || folder?.permission_type === 'admin')
      : false;
    const canDel = isFile
      ? (user?.username === item.uploaded_by || folder?.permission_type === 'admin')
      : false;

    return (
      <div className={`drive-context-menu ${isDark ? 'dark' : ''}`}
        style={{ top: y, left: x }}
        onClick={e => e.stopPropagation()}>
        {isFile && (
          <>
            <div className={`drive-ctx-item ${isDark ? 'dark' : ''}`}
              onClick={() => { onPreview(item); setContextMenu(null); }}>
              <FileOutlined /> ดูตัวอย่าง
            </div>
            <div className={`drive-ctx-item ${isDark ? 'dark' : ''}`}
              onClick={() => { onDownload(item); setContextMenu(null); }}>
              <DownloadOutlined /> ดาวน์โหลด
            </div>
            {canEdit && (
              <div className={`drive-ctx-item ${isDark ? 'dark' : ''}`}
                onClick={() => { onRenameFile(item); setContextMenu(null); }}>
                <EditOutlined /> เปลี่ยนชื่อ
              </div>
            )}
            {canDel && (
              <>
                <div className={`drive-ctx-divider ${isDark ? 'dark' : ''}`} />
                <div className={`drive-ctx-item danger`}
                  onClick={() => {
                    Modal.confirm({
                      title: 'ยืนยันการลบไฟล์',
                      icon: <ExclamationCircleOutlined />,
                      content: `ลบไฟล์ "${item.file_name}" ?`,
                      okText: 'ลบ', okType: 'danger', cancelText: 'ยกเลิก',
                      onOk: () => onDeleteFile(item.file_id, item.uploaded_by)
                    });
                    setContextMenu(null);
                  }}>
                  <DeleteOutlined /> ลบ
                </div>
              </>
            )}
          </>
        )}
        {!isFile && (
          <>
            {['write', 'admin'].includes(item.permission_type) && !(!item.parent_folder_id) && (
              <div className={`drive-ctx-item ${isDark ? 'dark' : ''}`}
                onClick={() => { onUploadOpen(item.folder_id, item.folder_name); setContextMenu(null); }}>
                <CloudUploadOutlined /> อัพโหลดไฟล์ที่นี่
              </div>
            )}
            {['write', 'admin'].includes(item.permission_type) && !(!item.parent_folder_id) && (
              <div className={`drive-ctx-item ${isDark ? 'dark' : ''}`}
                onClick={() => { onCreateFolder(item.folder_id, item.folder_name); setContextMenu(null); }}>
                <FolderAddOutlined /> สร้างโฟลเดอร์ย่อย
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ─── Render: Grid Item ───
  const GridItem = ({ item, type }) => {
    const key = type === 'folder' ? `folder-${item.folder_id}` : `file-${item.file_id}`;
    const isSelected = selectedKeys.includes(key);
    const isDark = theme === 'dark';

    return (
      <div
        className={`drive-item-card ${isSelected ? 'selected' : ''} ${isDark ? 'dark' : ''}`}
        onClick={(e) => {
          if (isSelectMode) { toggleSelect(key); return; }
          if (type === 'folder') {
            onFolderSelect(item.folder_id, item.folder_name);
          } else {
            onPreview(item);
          }
        }}
        onDoubleClick={() => {
          if (type === 'folder') onFolderSelect(item.folder_id, item.folder_name);
        }}
        onContextMenu={(e) => handleContextMenu(e, item, type)}
      >
        {isSelectMode && (
          <div style={{ position: 'absolute', top: 6, left: 6 }}>
            <Checkbox checked={isSelected} onChange={() => toggleSelect(key)} onClick={e => e.stopPropagation()} />
          </div>
        )}
        <div className="drive-item-icon-large">
          {type === 'folder' ? '📁' : getFileEmoji(item.file_name)}
        </div>
        <Tooltip title={type === 'folder' ? item.folder_name : item.file_name}>
          <div className={`drive-item-name ${isDark ? 'dark' : ''}`}>
            {type === 'folder' ? item.folder_name : item.file_name}
          </div>
        </Tooltip>
        {type === 'file' && (
          <div className={`drive-item-meta ${isDark ? 'dark' : ''}`}>
            {formatFileSize(item.file_size)}{item.file_name.split('.').pop()?.toUpperCase() !== 'UNDEFINED' ? ` · ${item.file_name.split('.').pop()?.toUpperCase()}` : ''}
          </div>
        )}
        {type === 'folder' && (
          <div className={`drive-item-meta ${isDark ? 'dark' : ''}`}>
            {folders.filter(f => String(f.parent_folder_id) === String(item.folder_id)).length > 0
              ? `${folders.filter(f => String(f.parent_folder_id) === String(item.folder_id)).length} โฟลเดอร์`
              : `${files.filter(f => String(f.folder_id) === String(item.folder_id)).length} ไฟล์`
            }
          </div>
        )}
      </div>
    );
  };

  // ─── Render: List Row ───
  const ListRow = ({ item, type }) => {
    const key = type === 'folder' ? `folder-${item.folder_id}` : `file-${item.file_id}`;
    const isSelected = selectedKeys.includes(key);
    const folder = type === 'file' ? folders.find(f => String(f.folder_id) === String(item.folder_id)) : null;
    const canEdit = type === 'file' && (user?.username === item.uploaded_by || folder?.permission_type === 'admin');

    return (
      <div
        className={`drive-list-row ${isSelected ? 'selected' : ''} ${isDark ? 'dark' : ''}`}
        onClick={() => {
          if (isSelectMode) { toggleSelect(key); return; }
          if (type === 'folder') onFolderSelect(item.folder_id, item.folder_name);
          else onPreview(item);
        }}
        onContextMenu={(e) => handleContextMenu(e, item, type)}
      >
        <div className="drive-list-name">
          {isSelectMode && (
            <Checkbox checked={isSelected} onChange={() => toggleSelect(key)} onClick={e => e.stopPropagation()} />
          )}
          <span style={{ fontSize: 18 }}>{type === 'folder' ? '📁' : getFileEmoji(item.file_name)}</span>
          <Tooltip title={type === 'folder' ? item.folder_name : item.file_name}>
            <span className={`drive-list-name-text ${isDark ? 'dark' : ''}`}>
              {type === 'folder' ? item.folder_name : item.file_name}
            </span>
          </Tooltip>
          {type === 'file' && (
            <Tag color="default" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>
              {item.file_name.split('.').pop()?.toUpperCase()}
            </Tag>
          )}
        </div>
        <div className={`drive-list-cell ${isDark ? 'dark' : ''}`}>
          {type === 'file' ? formatFileSize(item.file_size) : '-'}
        </div>
        <div className={`drive-list-cell ${isDark ? 'dark' : ''}`}>
          {type === 'file' ? (item.uploaded_by || '-') : '-'}
        </div>
        <div className="drive-list-actions" onClick={e => e.stopPropagation()}>
          {type === 'file' && (
            <>
              <Tooltip title="ดาวน์โหลด">
                <Button type="text" size="small" icon={<DownloadOutlined />}
                  onClick={() => onDownload(item)} />
              </Tooltip>
              {canEdit && (
                <Tooltip title="เปลี่ยนชื่อ">
                  <Button type="text" size="small" icon={<EditOutlined />}
                    onClick={() => onRenameFile(item)} />
                </Tooltip>
              )}
              {canEdit && (
                <Popconfirm title="ลบไฟล์นี้?" okText="ลบ" cancelText="ยกเลิก" okType="danger"
                  onConfirm={() => onDeleteFile(item.file_id, item.uploaded_by)}>
                  <Tooltip title="ลบ">
                    <Button type="text" size="small" icon={<DeleteOutlined />} danger />
                  </Tooltip>
                </Popconfirm>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const isImageFile = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}>

      {isDragOver && canUploadHere && (
        <div className="drive-drop-overlay">
          <div className="drive-drop-text">
            <CloudUploadOutlined style={{ marginRight: 8 }} />
            วางไฟล์ที่นี่เพื่ออัพโหลด
          </div>
        </div>
      )}

      <div className={`drive-layout`}>
        {/* ─── Sidebar ─── */}
        <div className={`drive-sidebar ${isDark ? 'dark' : ''}`}>
          <div className="drive-sidebar-new-btn" style={{ marginTop: 8 }}>
            {(canUploadHere || canCreateFolderHere) ? (
              <Dropdown menu={{ items: newMenuItems }} trigger={['click']}>
                <Button size="middle" style={{ fontFamily: 'Kanit, sans-serif' }}>
                  <PlusOutlined /> New
                </Button>
              </Dropdown>
            ) : (
              <Button size="middle" disabled style={{ fontFamily: 'Kanit, sans-serif' }}>
                <PlusOutlined /> New
              </Button>
            )}
          </div>

          <div className="drive-sidebar-section-label">โฟลเดอร์</div>

          {rootFolders.length > 0 ? rootFolders.map(root => (
            <SidebarFolderItem
              key={root.folder_id}
              folder={root} folders={folders} files={files}
              selectedFolderId={selectedFolderId} theme={theme} level={0}
              onSelect={onFolderSelect}
              onUpload={onUploadOpen}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              rootFolderName={rootFolderName}
              user={user}
            />
          )) : (
            <div style={{ padding: '16px', color: '#80868b', fontSize: 12 }}>
              ไม่มีโฟลเดอร์ที่เข้าถึงได้
            </div>
          )}
        </div>

        {/* ─── Main Content ─── */}
        <div className={`drive-main`} ref={mainRef}>
          {/* Select mode bar */}
          {isSelectMode && (
            <div className={`drive-select-bar ${isDark ? 'dark' : ''}`}>
              <span style={{ fontSize: 13, color: isDark ? '#93c5fd' : '#1a73e8' }}>
                เลือกแล้ว {selectedKeys.length} รายการ
              </span>
              {selectedKeys.filter(k => k.startsWith('file-')).length > 0 && (
                <Button size="small" type="primary" danger icon={<DeleteOutlined />}
                  onClick={() => {
                    const fileKeys = selectedKeys.filter(k => k.startsWith('file-'));
                    onDeleteSelectedFiles(fileKeys);
                  }}>
                  ลบที่เลือก
                </Button>
              )}
              <Button size="small" icon={<CloseOutlined />}
                onClick={() => { setIsSelectMode(false); setSelectedKeys([]); }}>
                ยกเลิก
              </Button>
            </div>
          )}

          {/* Toolbar */}
          <div className={`drive-toolbar ${isDark ? 'dark' : ''}`}>
            <div className="drive-breadcrumb-bar">
              {breadcrumb.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  {idx > 0 && <RightOutlined className="drive-breadcrumb-sep" style={{ fontSize: 10 }} />}
                  <span
                    className={`drive-breadcrumb-item ${idx === breadcrumb.length - 1 ? 'current' : ''} ${isDark && idx === breadcrumb.length - 1 ? 'dark' : ''}`}
                    onClick={() => {
                      if (idx < breadcrumb.length - 1) {
                        onFolderSelect(crumb.id, crumb.name);
                      }
                    }}
                  >
                    {idx === 0 && <HomeOutlined style={{ marginRight: 4 }} />}
                    {crumb.name}
                  </span>
                </React.Fragment>
              ))}
            </div>

            <div className={`drive-search ${isDark ? 'dark' : ''}`}>
              <Input
                placeholder="ค้นหา..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
                style={{ fontFamily: 'Kanit, sans-serif' }}
              />
            </div>

            <Tooltip title={isSelectMode ? 'ยกเลิกเลือก' : 'เลือกหลายรายการ'}>
              <Button
                type={isSelectMode ? 'primary' : 'default'}
                icon={<CheckOutlined />}
                size="small"
                onClick={() => { setIsSelectMode(v => !v); setSelectedKeys([]); }}
              />
            </Tooltip>

            <div className={`drive-view-toggle ${isDark ? 'dark' : ''}`}>
              <div className={`drive-view-btn ${viewMode === 'grid' ? 'active' : ''} ${isDark && viewMode === 'grid' ? 'dark' : ''}`}
                onClick={() => setViewMode('grid')}>
                <AppstoreOutlined />
              </div>
              <div className={`drive-view-btn ${viewMode === 'list' ? 'active' : ''} ${isDark && viewMode === 'list' ? 'dark' : ''}`}
                onClick={() => setViewMode('list')}>
                <UnorderedListOutlined />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="drive-content">
            <Spin spinning={loading}>
              {filteredFolders.length === 0 && currentFiles.length === 0 ? (
                <div className="drive-empty">
                  <div className="drive-empty-icon">📂</div>
                  <div className={`drive-empty-text ${isDark ? '' : ''}`}>
                    {searchText ? `ไม่พบ "${searchText}"` :
                      isRootSelected ? 'เลือกโฟลเดอร์ย่อยเพื่อดูไฟล์' :
                      'ยังไม่มีไฟล์ในโฟลเดอร์นี้'}
                  </div>
                  {canUploadHere && !searchText && (
                    <div className="drive-empty-sub">ลากไฟล์มาวางหรือคลิก "+ New" เพื่ออัพโหลด</div>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <>
                  {filteredFolders.length > 0 && (
                    <>
                      <div className={`drive-content-header ${isDark ? '' : ''}`}>
                        <span>📁 โฟลเดอร์ ({filteredFolders.length})</span>
                      </div>
                      <div className="drive-grid" style={{ marginBottom: 20 }}>
                        {filteredFolders.map(f => (
                          <GridItem key={f.folder_id} item={f} type="folder" />
                        ))}
                      </div>
                    </>
                  )}
                  {currentFiles.length > 0 && (
                    <>
                      <div className={`drive-content-header ${isDark ? '' : ''}`}>
                        <span>📄 ไฟล์ ({currentFiles.length})</span>
                        <span style={{ fontSize: 11 }}>รวม {formatFileSize(totalSize)}</span>
                      </div>
                      <div className="drive-grid">
                        {currentFiles.map(f => (
                          <GridItem key={f.file_id} item={f} type="file" />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className={`drive-list-header ${isDark ? 'dark' : ''}`}>
                    <span>ชื่อ</span>
                    <span>ขนาด</span>
                    <span>อัพโหลดโดย</span>
                    <span></span>
                  </div>
                  {filteredFolders.map(f => <ListRow key={f.folder_id} item={f} type="folder" />)}
                  {currentFiles.map(f => <ListRow key={f.file_id} item={f} type="file" />)}
                </>
              )}
            </Spin>
          </div>

          {/* Status bar */}
          <div className={`drive-statusbar ${isDark ? 'dark' : ''}`}>
            <span>{filteredFolders.length} โฟลเดอร์</span>
            <span>{currentFiles.length} ไฟล์</span>
            {totalSize > 0 && <span>รวม {formatFileSize(totalSize)}</span>}
          </div>
        </div>
      </div>

      {/* ─── Context Menu ─── */}
      <ContextMenu />

      {/* ─── Upload Modal ─── */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <CloudUploadOutlined />
            <span>อัพโหลดไปยัง "{selectedFolderName}"</span>
          </div>
        }
        open={isUploadModalOpen}
        onCancel={onUploadClose}
        footer={[
          <Button key="cancel" onClick={onUploadClose}>ยกเลิก</Button>,
          <Button
            key="submit" type="primary" loading={uploading}
            onClick={() => onUploadSubmit(folderToUpload)}
            disabled={folderToUpload.length === 0}
          >
            อัพโหลด ({folderToUpload.length} ไฟล์)
          </Button>
        ]}
        width={680}
        className="font-kanit"
      >
        <Upload.Dragger
          multiple
          directory={false}
          fileList={folderToUpload}
          showUploadList={false}
          beforeUpload={(file) => {
            if (file.size === 0) { message.error(`ไฟล์ "${file.name}" ไม่มีข้อมูล`); return Upload.LIST_IGNORE; }
            onSetFolderToUpload(prev => [...prev, file]);
            return false;
          }}
          openFileDialogOnClick={false}
          className="!rounded-xl !border-2"
          style={{
            background: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)',
            borderColor: isDark ? '#374151' : '#e2e8f0',
          }}
        >
          <div className="py-6 px-4 text-center">
            <CloudUploadOutlined style={{ fontSize: 36, color: '#1a73e8', marginBottom: 8 }} />
            <p style={{ fontFamily: 'Kanit', fontSize: 15, marginBottom: 4, color: isDark ? '#e2e8f0' : '#374151' }}>
              ลากไฟล์หรือโฟลเดอร์มาวางที่นี่
            </p>
            <p style={{ fontFamily: 'Kanit', fontSize: 12, color: '#80868b', marginBottom: 16 }}>
              หรือเลือกจากปุ่มด้านล่าง
            </p>
            <div className="flex justify-center gap-3" onClick={e => e.stopPropagation()}>
              <Upload multiple showUploadList={false}
                beforeUpload={(file) => {
                  if (file.size > 0) onSetFolderToUpload(prev => [...prev, file]);
                  return false;
                }}>
                <Button icon={<FileOutlined />} className="!rounded-full !px-5 !h-9 !text-sm"
                  style={{ fontFamily: 'Kanit' }}>ไฟล์</Button>
              </Upload>
              <Upload multiple directory showUploadList={false}
                beforeUpload={(file) => {
                  if (file.size > 0) onSetFolderToUpload(prev => [...prev, file]);
                  return false;
                }}>
                <Button icon={<FolderOpenOutlined />} className="!rounded-full !px-5 !h-9 !text-sm"
                  style={{ fontFamily: 'Kanit' }}>โฟลเดอร์</Button>
              </Upload>
            </div>
          </div>
        </Upload.Dragger>

        {folderToUpload.length > 0 && (
          <div className={`mt-3 rounded-lg border overflow-hidden ${isDark ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-white'}`}>
            <div className={`flex items-center justify-between px-3 py-2 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <span style={{ fontSize: 12, fontFamily: 'Kanit' }}>
                📎 {folderToUpload.length} ไฟล์พร้อมอัพโหลด
              </span>
              <Button type="link" size="small" danger style={{ fontSize: 12, padding: 0 }}
                onClick={() => onSetFolderToUpload([])}>ล้างทั้งหมด</Button>
            </div>
            <div style={{ maxHeight: 160, overflow: 'auto' }}>
              {folderToUpload.map((file, index) => (
                <div key={index}
                  className={`flex items-center justify-between px-3 py-1.5 ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}
                  style={{ fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <span>{getFileEmoji(file.name)}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isDark ? '#d1d5db' : '#374151' }}>
                      {file.webkitRelativePath || file.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                    <span style={{ color: '#5f6368' }}>{formatFileSize(file.size)}</span>
                    <CloseOutlined
                      style={{ fontSize: 10, cursor: 'pointer', color: '#9ca3af' }}
                      className="hover:text-red-500"
                      onClick={() => onSetFolderToUpload(prev => prev.filter(f => f.uid !== file.uid))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {users.length > 0 && (
          <Form layout="vertical" style={{ marginTop: 16, fontFamily: 'Kanit, sans-serif' }}>
            <Form.Item label={<span style={{ fontFamily: 'Kanit' }}>ส่งการแจ้งเตือนไปยัง</span>}>
              <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                <Button type="primary" size="small" style={{ fontFamily: 'Kanit' }}
                  onClick={() => onSetSelectedUsers(users.map(u => u.username))}>เลือกทั้งหมด</Button>
                <Button size="small" style={{ fontFamily: 'Kanit' }}
                  onClick={() => onSetSelectedUsers([])}>ยกเลิกทั้งหมด</Button>
              </div>
              <Checkbox.Group
                options={users.map(u => ({ label: <span style={{ fontFamily: 'Kanit' }}>{u.first_name || u.username}</span>, value: u.username }))}
                value={selectedUsers}
                onChange={onSetSelectedUsers}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px 8px' }}
              />
            </Form.Item>
          </Form>
        )}

        {uploading && (
          <Progress percent={uploadProgress} status={uploadProgress < 100 ? 'active' : 'success'} style={{ marginTop: 16 }} />
        )}
      </Modal>

      {/* ─── Create Folder Modal ─── */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FolderAddOutlined /><span>สร้างโฟลเดอร์ใหม่ใน "{parentFolderForNewFolder?.name}"</span></div>}
        open={isCreateFolderModalOpen}
        onCancel={onCloseCreateFolder}
        footer={[
          <Button key="cancel" onClick={onCloseCreateFolder}>ยกเลิก</Button>,
          <Button key="ok" type="primary" loading={createFolderLoading}
            onClick={handleCreateFolder} disabled={!newFolderName?.trim()}>สร้างโฟลเดอร์</Button>
        ]}
        className="font-kanit"
      >
        <Form layout="vertical">
          <Form.Item label="ชื่อโฟลเดอร์" required>
            <Input placeholder="กรอกชื่อโฟลเดอร์"
              value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onPressEnter={handleCreateFolder} maxLength={100} autoFocus
              style={{ fontFamily: 'Kanit' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── Rename Folder Modal ─── */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><EditOutlined /><span>แก้ไขชื่อโฟลเดอร์</span></div>}
        open={isRenameFolderModalOpen}
        onCancel={onCloseRenameFolder}
        footer={[
          <Button key="cancel" onClick={onCloseRenameFolder}>ยกเลิก</Button>,
          <Button key="ok" type="primary" loading={renameFolderLoading}
            onClick={handleRenameFolder} disabled={!newFolderNameForRename?.trim()}>บันทึก</Button>
        ]}
        className="font-kanit"
      >
        <Form layout="vertical">
          <Form.Item label="ชื่อโฟลเดอร์เดิม">
            <Input value={folderToRename?.name} disabled style={{ fontFamily: 'Kanit' }} />
          </Form.Item>
          <Form.Item label="ชื่อโฟลเดอร์ใหม่" required>
            <Input placeholder="กรอกชื่อโฟลเดอร์ใหม่"
              value={newFolderNameForRename} onChange={e => setNewFolderNameForRename(e.target.value)}
              onPressEnter={handleRenameFolder} maxLength={100} autoFocus
              style={{ fontFamily: 'Kanit' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── Rename File Modal ─── */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><EditOutlined /><span>แก้ไขชื่อไฟล์</span></div>}
        open={isRenameFileModalOpen}
        onCancel={onCloseRenameFile}
        footer={[
          <Button key="cancel" onClick={onCloseRenameFile}>ยกเลิก</Button>,
          <Button key="ok" type="primary" loading={renameLoading}
            onClick={handleRenameFile} disabled={!newFileName?.trim()}>บันทึก</Button>
        ]}
        className="font-kanit"
      >
        <Form layout="vertical">
          <Form.Item label="ชื่อไฟล์เดิม">
            <Input value={fileToRename?.file_name} disabled style={{ fontFamily: 'Kanit' }} />
          </Form.Item>
          <Form.Item label="ชื่อไฟล์ใหม่" required>
            <Input placeholder="กรอกชื่อไฟล์ใหม่"
              value={newFileName} onChange={e => setNewFileName(e.target.value)}
              onPressEnter={handleRenameFile} maxLength={255} autoFocus
              style={{ fontFamily: 'Kanit' }} />
          </Form.Item>
          <span style={{ fontSize: 12, color: '#5f6368', fontFamily: 'Kanit' }}>
            💡 สามารถเปลี่ยนชื่อและนามสกุลไฟล์ได้
          </span>
        </Form>
      </Modal>

      {/* ─── Image Preview Modal ─── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {previewFile?.file_name}
              </span>
              <Tag color="blue">{formatFileSize(previewFile?.file_size || 0)}</Tag>
              <span style={{ fontSize: 12, color: '#5f6368' }}>{previewFile?.uploaded_by}</span>
            </div>
            {previewableFiles.length > 1 && (
              <span style={{ fontSize: 13, color: isDark ? '#93c5fd' : '#1a73e8' }}>
                {currentImageIndex + 1} / {previewableFiles.length}
              </span>
            )}
          </div>
        }
        open={isPreviewModalOpen}
        onCancel={onClosePreview}
        footer={[
          <Button key="prev" onClick={() => onNavigateImage('prev')} disabled={previewableFiles.length <= 1}>ก่อนหน้า</Button>,
          <Button key="next" onClick={() => onNavigateImage('next')} disabled={previewableFiles.length <= 1}>ถัดไป</Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />}
            onClick={() => previewFile && onDownload(previewFile)}>ดาวน์โหลด</Button>,
          <Button key="close" onClick={onClosePreview}>ปิด</Button>
        ]}
        width={1000}
        className="font-kanit"
        styles={{ body: { padding: 0 } }}
        centered
      >
        <Spin spinning={loading}>
          {previewFile && isImageFile(previewFile.file_name) && previewUrl && (
            <div style={{ height: '70vh', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#1f1f1f' : '#f5f5f5', overflow: 'hidden' }}>
              <img src={previewUrl} alt={previewFile.file_name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: previewableFiles.length > 1 ? 'pointer' : 'default' }}
                onClick={() => previewableFiles.length > 1 && onNavigateImage('next')}
              />
            </div>
          )}
          {previewableFiles.length > 1 && (
            <div style={{ textAlign: 'center', padding: '12px', background: isDark ? '#262626' : '#fafafa', borderTop: `1px solid ${isDark ? '#3f3f3f' : '#e8e8e8'}` }}>
              <span style={{ fontSize: 12, color: '#5f6368', fontFamily: 'Kanit' }}>💡 คลิกที่รูปภาพเพื่อดูรูปถัดไป</span>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default DriveUI;
