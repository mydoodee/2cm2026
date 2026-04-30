import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button, message, Spin, Typography, Space, Card, Drawer, Tooltip } from 'antd';
import { 
  CloseOutlined, 
  DownloadOutlined, 
  ExpandOutlined, 
  CompressOutlined, 
  EyeOutlined, 
  ShareAltOutlined, 
  MenuOutlined,
  BlockOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  BorderOutlined
} from '@ant-design/icons';
import api from '../../axiosConfig';
import { DxfViewer } from 'dxf-viewer';
import * as THREE from 'three';
import './ViewerDXF.css';

const { Text, Title } = Typography;

const ViewerDXF = ({ user, setUser, theme, setTheme }) => {
  const navigate = useNavigate();
  const { id, fileId, token } = useParams();
  const location = useLocation();
  const viewerContainerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('กำลังเตรียมการ...');
  const [fileName, setFileName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layers, setLayers] = useState([]);
  const [layersVisible, setLayersVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const initializedRef = useRef(false);

  // ✅ ตรวจสอบว่าเป็นมือถือหรือไม่
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        viewerRef.current.Destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // ✅ Initialize viewer
  useEffect(() => {
    if (initializedRef.current) return;
    
    const initViewer = async () => {
      if (!viewerContainerRef.current) return;
      initializedRef.current = true;

      try {
        console.log('📂 Starting DXF Viewer initialization...');
        setLoading(true);
        setLoadingStatus('กำลังโหลดไฟล์จาก Server...');

        // 1. Download file
        const authToken = localStorage.getItem('token');
        let relativePath;

        if (token) {
          relativePath = `/api/public/shared/${token}/download`;
        } else if (authToken) {
          relativePath = `/api/dashboard/project/${id}/file/${fileId}/download`;
        } else {
          relativePath = `/api/public/project/${id}/file/${fileId}/download`;
        }

        console.log('📡 Fetching from:', relativePath);
        const response = await api.get(relativePath, {
          responseType: 'blob',
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setLoadingStatus(`กำลังดาวน์โหลดไฟล์... ${percent}%`);
            }
          },
        });

        // Helper to extract filename from Content-Disposition
        const getFilenameFromHeader = (header) => {
          if (!header) return null;
          
          // Try UTF-8 filename (filename*)
          const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
          if (utf8Match) return decodeURIComponent(utf8Match[1]);
          
          // Try regular filename
          const regMatch = header.match(/filename="?([^";]+)"?/i);
          if (regMatch) return regMatch[1];
          
          return null;
        };

        const queryParams = new URLSearchParams(location.search);
        const urlFileName = queryParams.get('name');

        const name = urlFileName || 
                     location.state?.fileName || 
                     getFilenameFromHeader(response.headers['content-disposition']) || 
                     'แบบแปลน.dxf';
                     
        setFileName(name);
        console.log('✅ File detected:', name);

        setLoadingStatus('กำลังเตรียมตัวประมวลผลแบบแปลน...');
        const url = URL.createObjectURL(response.data);

        // 2. Setup DxfViewer
        console.log('🏗️ Initializing DxfViewer instance...');
        const viewer = new DxfViewer(viewerContainerRef.current, {
          autoResize: true,
          clearColor: theme === 'dark' ? new THREE.Color(0x1a1a1a) : new THREE.Color(0xf5f5f5),
        });
        viewerRef.current = viewer;

        console.log('🎨 Starting viewer.Load()...');
        setLoadingStatus('กำลังส่งไฟล์ไปประมวลผล (อาจใช้เวลาสักครู่)...');
        
        await viewer.Load({
          url: url,
          fonts: ["/cm/fonts/Sarabun-Regular.ttf"], // ✅ แก้ไข Path ให้ถูกต้องตาม Base URL (/cm/)
          workerFactory: () => new Worker(new URL('../../workers/dxfWorker.js', import.meta.url), { type: 'module' }),
          progressCbk: (phase, loaded, total) => {
            if (phase === 'fetch') {
              const percent = total ? Math.round((loaded / total) * 100) : 0;
              setLoadingStatus(`กำลังอ่านข้อมูล DXF... ${percent}%`);
            } else if (phase === 'parse') {
              setLoadingStatus('กำลังวิเคราะห์โครงสร้างแบบแปลน...');
            } else if (phase === 'prepare') {
              setLoadingStatus('กำลังสร้างโมเดล Geometry...');
            } else {
              setLoadingStatus(`กำลังประมวลผล... (${phase})`);
            }
          }
        });

        console.log('✨ DXF Loaded successfully!');
        URL.revokeObjectURL(url);

        // 3. Get Layers
        const dxfLayers = viewer.GetLayers();
        setLayers(dxfLayers);

        setLoading(false);
      } catch (err) {
        console.error('❌ DXF Viewer Error:', err);
        message.error(`ไม่สามารถโหลดไฟล์ได้: ${err.message || 'ข้อผิดพลาดภายใน'}`);
        setLoadingStatus(`เกิดข้อผิดพลาด: ${err.message}`);
        setLoading(false);
      }
    };

    initViewer();
  }, [id, fileId, token, theme, location.state]);

  // ✅ UI Actions
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (viewerContainerRef.current.requestFullscreen) {
        viewerContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const zoomFit = () => {
    if (viewerRef.current) viewerRef.current.ZoomFit();
  };

  const zoomIn = () => {
    if (viewerRef.current) viewerRef.current.ZoomIn();
  };

  const zoomOut = () => {
    if (viewerRef.current) viewerRef.current.ZoomOut();
  };

  const toggleLayer = (layerName) => {
    if (viewerRef.current) {
      const isVisible = viewerRef.current.IsLayerVisible(layerName);
      viewerRef.current.SetLayerVisible(layerName, !isVisible);
      setLayers([...viewerRef.current.GetLayers()]);
    }
  };

  return (
    <div className={`viewer-dxf-container ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
      {/* Header */}
      <div className="viewer-header">
        <div className="header-left">
          <Button 
            icon={<CloseOutlined />} 
            onClick={() => navigate(-1)}
            className="back-button"
          />
          <Title level={5} className="file-name text-truncate">
            {fileName || 'DXF Viewer'}
          </Title>
        </div>

        <div className="header-actions">
          <Space>
            {!isMobile && (
              <>
                <Tooltip title="Zoom Fit">
                  <Button icon={<BorderOutlined />} onClick={zoomFit} />
                </Tooltip>
                <Tooltip title="Zoom In">
                  <Button icon={<ZoomInOutlined />} onClick={zoomIn} />
                </Tooltip>
                <Tooltip title="Zoom Out">
                  <Button icon={<ZoomOutOutlined />} onClick={zoomOut} />
                </Tooltip>
              </>
            )}
            <Button 
              icon={<BlockOutlined />} 
              onClick={() => setLayersVisible(true)}
            >
              Layers
            </Button>
            <Button 
              icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />} 
              onClick={toggleFullscreen}
            />
          </Space>
        </div>
      </div>

      {/* Main Viewer Area */}
      <div className="viewer-main">
        <div ref={viewerContainerRef} className="dxf-canvas-container" />
        
        {loading && (
          <div className="viewer-loading">
            <div className="loading-card">
              {/* Custom Animated Spinner */}
              <div className="loading-spinner">
                <div className="spinner-ring" />
                <div className="spinner-ring" />
                <div className="spinner-ring" />
                <div className="spinner-dot" />
              </div>

              {/* Loading Info */}
              <div className="loading-info">
                <div className="loading-title">กำลังเปิดแบบแปลน</div>
                <div className="loading-status">{loadingStatus}</div>
                <div className="loading-progress-track">
                  <div className="loading-progress-bar" style={{ width: '100%' }} />
                </div>
                <div className="loading-hint">CAD Viewer by SPK Construction</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Layers Drawer */}
      <Drawer
        title="จัดการ Layers"
        placement="right"
        onClose={() => setLayersVisible(false)}
        open={layersVisible}
        width={isMobile ? '80%' : 300}
        className={theme === 'dark' ? 'dark-drawer' : ''}
      >
        <div className="layers-list">
          {layers.map(layer => (
            <div 
              key={layer.name} 
              className={`layer-item ${layer.visible ? 'visible' : 'hidden'}`}
              onClick={() => toggleLayer(layer.name)}
            >
              <EyeOutlined className="layer-eye" />
              <span className="layer-name">{layer.name}</span>
              <div 
                className="layer-color" 
                style={{ backgroundColor: `#${layer.color.toString(16).padStart(6, '0')}` }} 
              />
            </div>
          ))}
        </div>
      </Drawer>

      {/* Bottom Controls (Mobile) */}
      {isMobile && (
        <div className="mobile-controls">
          <Button icon={<BorderOutlined />} onClick={zoomFit} />
          <Button icon={<ZoomInOutlined />} onClick={zoomIn} />
          <Button icon={<ZoomOutOutlined />} onClick={zoomOut} />
        </div>
      )}
    </div>
  );
};

export default ViewerDXF;
