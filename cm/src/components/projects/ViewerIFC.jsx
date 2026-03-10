import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button, message, Spin, Typography, Space, Card, Modal, Drawer } from 'antd';
import { CloseOutlined, DownloadOutlined, ExpandOutlined, CompressOutlined, EyeOutlined, ShareAltOutlined, MenuOutlined } from '@ant-design/icons';
import axios from 'axios';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IFCLoader } from 'web-ifc-three/IFCLoader';
import './ViewerIFC.css';

const { Text } = Typography;

// ⭐ Helper function สำหรับสร้าง API URL
const getApiUrl = (endpoint, isPublic = false) => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3050';
  const prefix = isPublic ? '/api/public' : '/api/dashboard';
  return `${baseUrl}${prefix}${endpoint}`;
};

// Custom Icons
const WireframeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
    <path d="M3 9h18"></path>
    <path d="M3 15h18"></path>
    <path d="M9 3v18"></path>
    <path d="M15 3v18"></path>
  </svg>
);

const XRayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m2 17 10 5 10-5"></path>
    <path d="m2 12 10 5 10-5"></path>
    <path d="m2 7 10 5 10-5"></path>
  </svg>
);

const ViewerIFC = () => {
  const navigate = useNavigate();
  const { id, fileId, token } = useParams(); // ⭐ เพิ่ม token
  const location = useLocation();
  const viewerContainerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const ifcLoaderRef = useRef(null);
  const animationIdRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('กำลังเตรียมการ...');
  const [fileName, setFileName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('realistic');
  const [theme, setTheme] = useState('light');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [isPublicMode, setIsPublicMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

  // ✅ ตรวจสอบว่าเป็นมือถือหรือไม่
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ ตรวจสอบว่าเป็น public mode หรือ share token mode
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const publicParam = urlParams.get('public');
    const pathSegments = location.pathname.split('/');
    const pathIsPublic = pathSegments.includes('viewer');
    const isSharedMode = pathSegments.includes('shared');

    const isPublic = publicParam === 'true' || pathIsPublic || isSharedMode || !!token;
    setIsPublicMode(isPublic);

    if (token) {
      console.log('🔐 Share Token Mode (Secure)');
    } else if (isPublic) {
      console.log('🌐 Public Mode (No Auth Required)');
    } else {
      console.log('🔒 Private Mode (Auth Required)');
    }
  }, [location, token]);

  // Check theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
  }, []);

  // Memory cleanup function
  const cleanupMemory = () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }

    if (modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              if (material.map) material.map.dispose();
              if (material.normalMap) material.normalMap.dispose();
              if (material.roughnessMap) material.roughnessMap.dispose();
              if (material.metalnessMap) material.metalnessMap.dispose();
              material.dispose();
            });
          } else {
            if (child.material.map) child.material.map.dispose();
            if (child.material.normalMap) child.material.normalMap.dispose();
            if (child.material.roughnessMap) child.material.roughnessMap.dispose();
            if (child.material.metalnessMap) child.material.metalnessMap.dispose();
            child.material.dispose();
          }
        }
      });
      modelRef.current = null;
    }

    if (sceneRef.current) {
      while (sceneRef.current.children.length > 0) {
        const object = sceneRef.current.children[0];
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
        sceneRef.current.remove(object);
      }
      sceneRef.current = null;
    }

    if (rendererRef.current) {
      const renderer = rendererRef.current;
      rendererRef.current = null;
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }

    if (window.gc) window.gc();
  };

  // Cleanup on unmount
  useEffect(() => {
    const isMounted = { current: true };
    return () => {
      isMounted.current = false;
      cleanupMemory();
    };
  }, []);

  // Enhanced material detection function
  const detectMaterialType = (color, hsl, lightness, saturation) => {
    const r = color.r;
    const g = color.g;
    const b = color.b;

    const isWood = (
      (hsl.h >= 0.02 && hsl.h <= 0.15) &&
      saturation > 0.15 && saturation < 0.85 &&
      lightness > 0.15 && lightness < 0.7 &&
      r > g && g > b
    );

    const isFloor = (
      (
        (saturation < 0.15 && lightness > 0.4 && lightness < 0.75) ||
        ((hsl.h >= 0.08 && hsl.h <= 0.17) && saturation < 0.35 && lightness > 0.5 && lightness < 0.8)
      ) &&
      Math.abs(r - g) < 0.15 && Math.abs(g - b) < 0.15
    );

    const isMetal = (
      saturation < 0.15 &&
      lightness > 0.45 && lightness < 0.85 &&
      Math.abs(r - g) < 0.08 &&
      Math.abs(g - b) < 0.08 &&
      Math.abs(r - b) < 0.08 &&
      !isFloor
    );

    const isConcrete = (
      saturation < 0.15 &&
      lightness < 0.6 &&
      Math.abs(r - g) < 0.1 &&
      Math.abs(g - b) < 0.1 &&
      !isMetal && !isFloor
    );

    const isGlass = (
      lightness > 0.85 &&
      saturation < 0.15 &&
      !isMetal
    );

    const isBrick = (
      (hsl.h >= 0.95 || hsl.h <= 0.05) &&
      saturation > 0.3 &&
      lightness > 0.25 && lightness < 0.55 &&
      r > g * 1.3 && r > b * 1.5
    );

    const isPlastic = (
      saturation > 0.5 &&
      lightness > 0.5 &&
      !isWood && !isBrick
    );

    return {
      isWood,
      isFloor,
      isMetal,
      isConcrete,
      isGlass,
      isBrick,
      isPlastic,
      isOther: !isWood && !isFloor && !isMetal && !isConcrete && !isGlass && !isBrick && !isPlastic
    };
  };

  // Apply material properties
  const applyMaterialProperties = (materialType, color, hsl, lightness, saturation) => {
    let newColor, roughness, metalness, isTransparent, opacity;

    if (materialType.isWood) {
      const woodHue = Math.max(0.04, Math.min(hsl.h, 0.13));
      const woodSaturation = Math.min(Math.max(saturation * 1.4, 0.4), 0.7);
      const woodLightness = Math.max(Math.min(lightness * 0.8, 0.5), 0.2);

      newColor = new THREE.Color().setHSL(woodHue, woodSaturation, woodLightness);
      roughness = 0.85;
      metalness = 0.0;
      isTransparent = false;
      opacity = 1.0;
    }
    else if (materialType.isFloor) {
      if (hsl.h >= 0.08 && hsl.h <= 0.17) {
        newColor = new THREE.Color().setHSL(
          hsl.h,
          Math.min(saturation * 1.1, 0.3),
          Math.max(Math.min(lightness * 0.95, 0.75), 0.55)
        );
      } else {
        newColor = new THREE.Color().setHSL(
          0,
          0.05,
          Math.max(Math.min(lightness * 0.9, 0.7), 0.45)
        );
      }
      roughness = 0.6;
      metalness = 0.0;
      isTransparent = false;
      opacity = 1.0;
    }
    else if (materialType.isMetal) {
      newColor = new THREE.Color().setHSL(
        0,
        0.08,
        Math.max(Math.min(lightness * 1.1, 0.82), 0.58)
      );
      roughness = 0.25;
      metalness = 0.85;
      isTransparent = false;
      opacity = 1.0;
    }
    else if (materialType.isConcrete) {
      newColor = new THREE.Color().setHSL(
        0,
        0.05,
        Math.min(Math.max(lightness * 0.85, 0.3), 0.55)
      );
      roughness = 0.95;
      metalness = 0.0;
      isTransparent = false;
      opacity = 1.0;
    }
    else if (materialType.isGlass) {
      newColor = new THREE.Color(0xaaddff);
      roughness = 0.1;
      metalness = 0.0;
      isTransparent = true;
      opacity = 0.65;
    }
    else if (materialType.isBrick) {
      const brickHue = Math.max(0, Math.min(hsl.h, 0.05));
      newColor = new THREE.Color().setHSL(
        brickHue,
        Math.max(saturation * 0.9, 0.4),
        Math.max(Math.min(lightness * 0.85, 0.5), 0.3)
      );
      roughness = 0.9;
      metalness = 0.0;
      isTransparent = false;
      opacity = 1.0;
    }
    else if (materialType.isPlastic) {
      newColor = new THREE.Color().setHSL(
        hsl.h,
        Math.min(saturation * 1.1, 0.8),
        Math.max(Math.min(lightness * 0.9, 0.7), 0.4)
      );
      roughness = 0.5;
      metalness = 0.0;
      isTransparent = false;
      opacity = 1.0;
    }
    else {
      newColor = new THREE.Color().setHSL(
        hsl.h,
        Math.min(saturation * 1.2, 0.7),
        Math.max(Math.min(lightness * 0.85, 0.7), 0.3)
      );
      roughness = 0.8;
      metalness = 0.0;
      isTransparent = false;
      opacity = 1.0;
    }

    return { newColor, roughness, metalness, isTransparent, opacity };
  };

  // Change view mode
  const changeViewMode = (mode) => {
    if (!modelRef.current || !sceneRef.current) return;

    setViewMode(mode);
    if (isMobile) setMobileMenuVisible(false);

    sceneRef.current.traverse((child) => {
      if (child.isLight) {
        if (mode === 'xray') {
          if (child instanceof THREE.DirectionalLight) {
            child.intensity = 0.6;
          } else if (child instanceof THREE.AmbientLight) {
            child.intensity = 0.5;
          } else if (child instanceof THREE.HemisphereLight) {
            child.intensity = 0.3;
          }
        } else {
          if (child instanceof THREE.DirectionalLight) {
            child.intensity = child.userData.originalIntensity || 0.5;
          } else if (child instanceof THREE.AmbientLight) {
            child.intensity = child.userData.originalIntensity || 0.4;
          } else if (child instanceof THREE.HemisphereLight) {
            child.intensity = child.userData.originalIntensity || 0.25;
          }
        }
      }
    });

    modelRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];

        materials.forEach((mat) => {
          if (mode === 'realistic') {
            mat.wireframe = false;
            mat.transparent = mat.userData.originalTransparent || false;
            mat.opacity = mat.userData.originalOpacity || 1.0;
            mat.roughness = mat.userData.originalRoughness || 0.95;
            mat.metalness = mat.userData.originalMetalness || 0.0;
            mat.envMap = null;
            mat.envMapIntensity = 0;
            mat.side = THREE.FrontSide;
            mat.depthWrite = true;
            mat.depthTest = true;

            if (mat.userData.originalColor) {
              mat.color.copy(mat.userData.originalColor);
            }
          } else if (mode === 'wireframe') {
            mat.wireframe = true;
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.color.set(0x00aaff);
            mat.envMap = null;
            mat.envMapIntensity = 0;
            mat.side = THREE.FrontSide;
            mat.depthWrite = true;
            mat.depthTest = true;
          } else if (mode === 'xray') {
            mat.wireframe = false;
            mat.transparent = true;
            mat.opacity = 0.55;
            mat.color.set(0x88ccff);
            mat.envMap = null;
            mat.envMapIntensity = 0;
            mat.side = THREE.DoubleSide;
            mat.depthWrite = false;
            mat.depthTest = true;
          }
          mat.needsUpdate = true;
        });
      }
    });
  };

  // Initialize viewer
  useEffect(() => {
    const initViewer = async () => {
      if (!viewerContainerRef.current) return;

      try {
        setLoading(true);
        setLoadingStatus('กำลังเตรียมการ...');

        cleanupMemory();

        // Initialize scene
        setLoadingStatus('กำลังสร้าง Scene...');
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(theme === 'dark' ? 0x1a1a1a : 0xf5f5f5);
        sceneRef.current = scene;

        // Initialize camera
        const camera = new THREE.PerspectiveCamera(
          75,
          viewerContainerRef.current.clientWidth / viewerContainerRef.current.clientHeight,
          0.05,
          10000
        );
        camera.position.set(10, 10, 10);
        cameraRef.current = camera;

        // Initialize renderer
        const renderer = new THREE.WebGLRenderer({
          antialias: !isMobile,
          alpha: false,
          powerPreference: isMobile ? 'default' : 'high-performance',
          precision: isMobile ? 'mediump' : 'highp',
          logarithmicDepthBuffer: true,
        });
        renderer.setSize(viewerContainerRef.current.clientWidth, viewerContainerRef.current.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.9;
        renderer.shadowMap.enabled = false;
        renderer.sortObjects = true;
        viewerContainerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Initialize controls with touch support
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxDistance = 2000;
        controls.minDistance = 0.5;
        controls.enablePan = true;
        controls.panSpeed = isMobile ? 1.0 : 1.5;
        controls.rotateSpeed = isMobile ? 0.8 : 1.0;
        controls.zoomSpeed = isMobile ? 1.0 : 1.2;
        controls.touches = {
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN
        };
        controlsRef.current = controls;

        // Setup lighting
        setLoadingStatus('กำลังติดตั้งแสง...');
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        ambientLight.userData = { originalIntensity: 0.4 };
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight1.position.set(10, 15, 10);
        directionalLight1.castShadow = false;
        directionalLight1.userData = { originalIntensity: 0.5 };
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.35);
        directionalLight2.position.set(-10, 10, -10);
        directionalLight2.castShadow = false;
        directionalLight2.userData = { originalIntensity: 0.35 };
        scene.add(directionalLight2);

        const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.25);
        directionalLight3.position.set(0, 5, -10);
        directionalLight3.castShadow = false;
        directionalLight3.userData = { originalIntensity: 0.25 };
        scene.add(directionalLight3);

        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.25);
        hemisphereLight.userData = { originalIntensity: 0.25 };
        scene.add(hemisphereLight);

        // Animation loop
        setLoadingStatus('กำลังเริ่มต้น Animation...');
        const animate = () => {
          if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
          animationIdRef.current = requestAnimationFrame(animate);
          if (controlsRef.current) controlsRef.current.update();
          try {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          } catch (error) {
            console.error('Render error:', error);
            if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
          }
        };
        animate();

        // Handle resize
        const handleResize = () => {
          if (!viewerContainerRef.current || !cameraRef.current || !rendererRef.current) return;
          cameraRef.current.aspect = viewerContainerRef.current.clientWidth / viewerContainerRef.current.clientHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(viewerContainerRef.current.clientWidth, viewerContainerRef.current.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        // ⭐ DOWNLOAD IFC FILE - รองรับ 3 modes
        setLoadingStatus('กำลังดาวน์โหลดไฟล์...');

        const authToken = localStorage.getItem('token');

        let apiEndpoint, headers;

        // ⭐ Mode 0: Planning/Actual IFC (Special prefix)
        if (fileId && fileId.startsWith('planning_')) {
          const parts = fileId.split('_'); // planning_type_id or planning_subtype_id
          const type = parts[1]; // 'type' or 'subtype'
          const itemId = parts[2]; // the ID

          apiEndpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3050'}/api/planning/file/download/${type}/${itemId}`;
          headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
          console.log(`🏗️ Using PLANNING endpoint (${type}): ${apiEndpoint}`);
        }
        // Mode 1: Share Token (ปลอดภัยที่สุด)
        else if (token) {
          apiEndpoint = getApiUrl(`/shared/${token}/download`, true);
          headers = {};
          console.log('🔐 Using SHARED TOKEN endpoint');
        }
        // Mode 2: Private (ต้อง login)
        else if (authToken) {
          apiEndpoint = getApiUrl(`/project/${id}/file/${fileId}/download`, false);
          headers = { Authorization: `Bearer ${authToken}` };
          console.log('🔒 Using PRIVATE endpoint (with auth)');
        }
        // Mode 3: Public (ไม่ต้อง login แต่ดู ID ได้)
        else {
          apiEndpoint = getApiUrl(`/project/${id}/file/${fileId}/download`, true);
          headers = {};
          console.log('🌐 Using PUBLIC endpoint (fallback - no token)');
        }

        const response = await axios.get(apiEndpoint, {
          headers,
          responseType: 'blob',
          timeout: 600000,
          maxContentLength: 500000000,
          maxBodyLength: 500000000,
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setLoadingStatus(`กำลังดาวน์โหลดไฟล์... ${percentCompleted}%`);
            }
          },
        });

        const name =
          location.state?.fileName ||
          response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') ||
          'model.ifc';
        setFileName(name);

        // Initialize IFC Loader
        setLoadingStatus('กำลังเตรียม IFC Loader...');
        const ifcLoader = new IFCLoader();
        ifcLoaderRef.current = ifcLoader;

        const originalConsoleWarn = console.warn;
        const originalConsoleLog = console.log;
        console.warn = () => { };
        console.log = () => { };

        const wasmPath = `${import.meta.env.BASE_URL || '/cm/'}wasm/`;
        await ifcLoader.ifcManager.setWasmPath(wasmPath);
        ifcLoader.ifcManager.setupThreeMeshBVH();
        ifcLoader.ifcManager.applyWebIfcConfig({
          COORDINATE_TO_ORIGIN: true,
          USE_FAST_BOOLS: true,
          OPTIMIZE_PROFILES: true,
        });

        // Load IFC model
        setLoadingStatus('กำลังโหลดโมเดล IFC...');
        const url = URL.createObjectURL(response.data);
        const model = await new Promise((resolve, reject) => {
          ifcLoader.load(
            url,
            (loadedModel) => resolve(loadedModel),
            (progress) => {
              if (progress.total > 0) {
                const percent = (progress.loaded / progress.total) * 100;
                setLoadingStatus(`กำลังโหลดโมเดล... ${percent.toFixed(0)}%`);
              }
            },
            (error) => {
              console.error('IFC loading error:', error);
              reject(error);
            }
          );
        });

        console.warn = originalConsoleWarn;
        console.log = originalConsoleLog;

        if (!model) throw new Error('Model is null or undefined');
        URL.revokeObjectURL(url);

        // Process materials with enhanced detection
        setLoadingStatus('กำลังวิเคราะห์และปรับแต่งวัสดุ...');
        const materialCache = new Map();
        let processedMeshes = 0;
        const totalMeshes = [];

        model.traverse((child) => {
          if (child.isMesh) totalMeshes.push(child);
        });

        const batchSize = isMobile ? 30 : 50;
        for (let i = 0; i < totalMeshes.length; i++) {
          const child = totalMeshes[i];

          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            const newMaterials = [];

            materials.forEach((mat) => {
              const originalColor = mat.color ? mat.color.clone() : new THREE.Color(0xcccccc);
              const colorKey = originalColor.getHexString();

              if (materialCache.has(colorKey)) {
                newMaterials.push(materialCache.get(colorKey));
              } else {
                const hsl = { h: 0, s: 0, l: 0 };
                originalColor.getHSL(hsl);

                const lightness = (Math.max(originalColor.r, originalColor.g, originalColor.b) +
                  Math.min(originalColor.r, originalColor.g, originalColor.b)) / 2;
                const max = Math.max(originalColor.r, originalColor.g, originalColor.b);
                const min = Math.min(originalColor.r, originalColor.g, originalColor.b);
                const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));

                const materialType = detectMaterialType(originalColor, hsl, lightness, saturation);
                const { newColor, roughness, metalness, isTransparent, opacity } =
                  applyMaterialProperties(materialType, originalColor, hsl, lightness, saturation);

                const newMat = new THREE.MeshStandardMaterial({
                  color: newColor,
                  roughness,
                  metalness,
                  flatShading: false,
                  side: THREE.FrontSide,
                  transparent: isTransparent,
                  opacity: opacity,
                  envMap: null,
                  envMapIntensity: 0,
                  depthWrite: true,
                  depthTest: true,
                });

                newMat.userData = {
                  originalColor: newColor.clone(),
                  originalTransparent: isTransparent,
                  originalOpacity: opacity,
                  originalRoughness: roughness,
                  originalMetalness: metalness,
                  materialType: materialType
                };

                materialCache.set(colorKey, newMat);
                newMaterials.push(newMat);
              }

              mat.dispose();
            });

            child.material = newMaterials.length === 1 ? newMaterials[0] : newMaterials;
            child.castShadow = false;
            child.receiveShadow = false;

            if (child.geometry) {
              const bbox = new THREE.Box3().setFromObject(child);
              const size = new THREE.Vector3();
              bbox.getSize(size);

              const maxDim = Math.max(size.x, size.y, size.z);
              const minDim = Math.min(size.x, size.y, size.z);
              const aspectRatio = maxDim / (minDim || 1);

              const isPipeOrCylinder = aspectRatio > 3 && child.material &&
                (Array.isArray(child.material)
                  ? child.material.some(m => m.userData.materialType?.isMetal)
                  : child.material.userData.materialType?.isMetal);

              if (isPipeOrCylinder ||
                (child.material && (Array.isArray(child.material)
                  ? child.material.some(m => m.userData.materialType?.isMetal)
                  : child.material.userData.materialType?.isMetal))) {
                child.geometry.computeVertexNormals();
              } else if (child.geometry.attributes.position.count > 10000) {
                child.geometry.computeVertexNormals();
              }
            }
          }

          processedMeshes++;
          if (processedMeshes % batchSize === 0) {
            setLoadingStatus(`กำลังปรับแต่งวัสดุ... ${Math.round((processedMeshes / totalMeshes.length) * 100)}%`);
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        // Position model
        setLoadingStatus('กำลังจัดวางโมเดล...');
        scene.add(model);
        modelRef.current = model;
        model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.set(-center.x, -box.min.y, -center.z);
        model.updateMatrixWorld(true);

        const maxDim = Math.max(size.x, size.z);
        const gridSize = Math.max(maxDim * 1.5, 50);
        const gridHelper = new THREE.GridHelper(gridSize, 20, 0xbbbbbb, 0x999999);
        gridHelper.position.y = 0;
        scene.add(gridHelper);

        const maxSize = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxSize / Math.sin(fov / 2)) * 1.5;

        const angle = Math.PI / 4;
        camera.position.set(
          Math.cos(angle) * cameraDistance,
          size.y * 0.8,
          Math.sin(angle) * cameraDistance
        );

        const targetPoint = new THREE.Vector3(0, size.y / 2, 0);
        camera.lookAt(targetPoint);
        controls.target.copy(targetPoint);
        controls.update();

        camera.near = 0.05;
        camera.far = cameraDistance * 10;
        camera.updateProjectionMatrix();

        setLoadingStatus('เสร็จสิ้น!');
        setTimeout(() => setLoading(false), 500);

        return () => {
          window.removeEventListener('resize', handleResize);
          console.warn = originalConsoleWarn;
          console.log = originalConsoleLog;
        };
      } catch (err) {
        console.error('❌ Error loading IFC:', err);
        console.error('Error details:', err.response?.data);

        // ⭐ แสดง error message ที่เหมาะสมตาม status code
        let errorMessage = 'เกิดข้อผิดพลาดในการโหลดไฟล์ IFC';

        if (err.response?.status === 403) {
          errorMessage = '🔒 ลิงก์แชร์หมดอายุแล้ว';
        } else if (err.response?.status === 404) {
          errorMessage = '❌ ไม่พบไฟล์หรือลิงก์ไม่ถูกต้อง';
        } else if (err.response?.status === 429) {
          errorMessage = '⚠️ คำขอมากเกินไป กรุณาลองใหม่ในภายหลัง';
        } else if (err?.response?.data?.message) {
          errorMessage = err.response.data.message;
        }

        message.error(errorMessage);
        setLoading(false);
      }
    };

    initViewer();
  }, [id, fileId, token, theme, location.state, isPublicMode, isMobile]);

  // Handle file download
  const handleDownload = async () => {
    try {
      setLoadingStatus('กำลังเตรียมดาวน์โหลด...');
      message.loading({ content: 'กำลังเตรียมดาวน์โหลด...', key: 'download', duration: 0 });

      const authToken = localStorage.getItem('token');

      let apiEndpoint, headers;

      // ⭐ ดาวน์โหลดตาม mode ที่ใช้งาน
      if (token) {
        apiEndpoint = getApiUrl(`/shared/${token}/download`, true);
        headers = {};
      } else if (authToken) {
        apiEndpoint = getApiUrl(`/project/${id}/file/${fileId}/download`, false);
        headers = { Authorization: `Bearer ${authToken}` };
      } else {
        apiEndpoint = getApiUrl(`/project/${id}/file/${fileId}/download`, true);
        headers = {};
      }

      const response = await axios.get(apiEndpoint, {
        headers,
        responseType: 'blob',
        timeout: 600000,
        maxContentLength: 500000000,
        maxBodyLength: 500000000,
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            message.loading({ content: `กำลังดาวน์โหลด... ${percentCompleted}%`, key: 'download', duration: 0 });
          }
        },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success({ content: `ดาวน์โหลด ${fileName} สำเร็จ`, key: 'download' });

      if (isMobile) setMobileMenuVisible(false);
    } catch (err) {
      console.error('❌ Download error:', err);

      let errorMessage = 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์';

      if (err.response?.status === 403) {
        errorMessage = '🔒 ลิงก์แชร์หมดอายุแล้ว';
      } else if (err.response?.status === 404) {
        errorMessage = '❌ ไม่พบไฟล์';
      } else if (err.response?.status === 429) {
        errorMessage = '⚠️ คำขอมากเกินไป กรุณาลองใหม่ในภายหลัง';
      }

      message.error({ content: errorMessage, key: 'download' });
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await viewerContainerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
      if (isMobile) setMobileMenuVisible(false);
    } catch {
      message.warning('ไม่สามารถเข้าสู่โหมดเต็มจอได้');
    }
  };

  // Handle share
  const handleShare = () => {
    setShareModalVisible(true);
    if (isMobile) setMobileMenuVisible(false);
  };

  // ⭐ Copy link to clipboard - สร้าง share token ใหม่
  const copyLinkToClipboard = async () => {
    try {
      const authToken = localStorage.getItem('token');

      if (!authToken) {
        message.warning('กรุณาเข้าสู่ระบบเพื่อสร้างลิงก์แชร์');
        return;
      }

      // ปิด modal ก่อนเพื่อป้องกันการคลิกซ้ำ
      setShareModalVisible(false);

      message.loading({ content: 'กำลังสร้างลิงก์แชร์...', key: 'share', duration: 0 });

      // ⭐ เรียก API สร้าง share token
      const response = await axios.post(
        getApiUrl(`/project/${id}/file/${fileId}/create-share-link`, true),
        { expiresInDays: 7 },
        {
          headers: { Authorization: `Bearer ${authToken}` },
          timeout: 30000
        }
      );

      const shareUrl = response.data.data.shareUrl;
      const expiresAt = response.data.data.expiresAt;

      // ใช้ fallback method สำหรับมือถือ
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          // Fallback สำหรับเบราว์เซอร์เก่า
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
      } catch (clipboardErr) {
        console.warn('Clipboard write failed:', clipboardErr);
        // ถ้าคัดลอกไม่ได้ ก็ยังแสดง URL ให้ user คัดลอกเอง
      }

      message.success({
        content: (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              ✅ สร้างลิงก์แชร์สำเร็จ!
            </div>
            {isMobile && (
              <div style={{
                fontSize: '11px',
                padding: '8px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                marginBottom: '8px',
                maxHeight: '60px',
                overflow: 'auto'
              }}>
                {shareUrl}
              </div>
            )}
            {!isMobile && (
              <div style={{
                fontSize: '11px',
                padding: '8px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                marginBottom: '8px'
              }}>
                {shareUrl}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#52c41a' }}>
              🔐 ลิงก์นี้ปลอดภัย ใช้งานได้ 7 วัน และไม่สามารถเดาได้
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              หมดอายุ: {new Date(expiresAt).toLocaleString('th-TH')}
            </div>
          </div>
        ),
        duration: 10,
        key: 'share',
        style: { minWidth: isMobile ? '90%' : '450px' }
      });

    } catch (err) {
      console.error('[copyLinkToClipboard] Error:', err);
      console.error('[copyLinkToClipboard] Response:', err.response);
      console.error('[copyLinkToClipboard] Status:', err.response?.status);
      console.error('[copyLinkToClipboard] Data:', err.response?.data);

      let errorMessage = 'เกิดข้อผิดพลาดในการสร้างลิงก์แชร์';

      if (err.response?.status === 401) {
        errorMessage = 'กรุณาเข้าสู่ระบบใหม่';
      } else if (err.response?.status === 404) {
        errorMessage = 'ไม่พบไฟล์';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = `${errorMessage}: ${err.message}`;
      }

      message.error({
        content: errorMessage,
        key: 'share',
        duration: 5
      });
    }
  };
  // Handle close page
  const handleClose = () => {
    window.close();
    setTimeout(() => {
      navigate(-1);
    }, 100);
  };

  // Mobile Menu Component
  const MobileMenu = () => (
    <div className="space-y-2">
      <Button
        icon={<EyeOutlined />}
        onClick={() => changeViewMode('realistic')}
        type={viewMode === 'realistic' ? 'primary' : 'default'}
        block
        size="large"
      >
        มุมมองปกติ
      </Button>
      <Button
        icon={<WireframeIcon />}
        onClick={() => changeViewMode('wireframe')}
        type={viewMode === 'wireframe' ? 'primary' : 'default'}
        block
        size="large"
      >
        โครงลวด
      </Button>
      <Button
        icon={<XRayIcon />}
        onClick={() => changeViewMode('xray')}
        type={viewMode === 'xray' ? 'primary' : 'default'}
        block
        size="large"
      >
        X-Ray
      </Button>
      <div className="h-px bg-gray-200 my-3"></div>
      <Button
        icon={<ShareAltOutlined />}
        onClick={handleShare}
        block
        size="large"
      >
        แชร์
      </Button>
      <Button
        icon={<DownloadOutlined />}
        onClick={handleDownload}
        block
        size="large"
      >
        ดาวน์โหลด
      </Button>
      <Button
        icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
        onClick={toggleFullscreen}
        block
        size="large"
      >
        {isFullscreen ? 'ออกจากเต็มจอ' : 'เต็มจอ'}
      </Button>
    </div>
  );

  return (
    <div className={`min-h-screen w-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} font-kanit`}>
      <div className={isMobile ? 'p-2' : 'p-4'}>
        <Card
          className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-lg`}
          styles={{ body: { padding: 0 } }}  // ✅ เพิ่มบรรทัดนี้
        >
          {/* Header */}
          <div className={`${isMobile ? 'p-2' : 'p-4'} border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleClose}
                  type="text"
                  className={theme === 'dark' ? 'text-gray-300 hover:text-white' : ''}
                  danger
                  size={isMobile ? 'small' : 'middle'}
                />
                {!isMobile && <div className="h-8 w-px bg-gray-300"></div>}
                <div className="flex-1 min-w-0">
                  <Text
                    strong
                    className={`${isMobile ? 'text-sm' : 'text-lg'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'} block truncate`}
                    title={fileName || 'IFC Viewer'}
                  >
                    {fileName || 'IFC Viewer'}
                  </Text>
                  {/* ⭐ แสดงสถานะ mode */}
                  <div className="flex items-center gap-1 mt-1">
                    {token && (
                      <span className={`${isMobile ? 'text-xs' : 'text-xs'} px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold`}>
                        🔐 Secure Share
                      </span>
                    )}
                    {isPublicMode && !token && (
                      <span className={`${isMobile ? 'text-xs' : 'text-xs'} px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold`}>
                        🌐 Public
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isMobile ? (
                <Button
                  icon={<MenuOutlined />}
                  onClick={() => setMobileMenuVisible(true)}
                  type="primary"
                  size="large"
                />
              ) : (
                <Space wrap>
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => changeViewMode('realistic')}
                    type={viewMode === 'realistic' ? 'primary' : 'default'}
                  >
                    มุมมองปกติ
                  </Button>
                  <Button
                    icon={<WireframeIcon />}
                    onClick={() => changeViewMode('wireframe')}
                    type={viewMode === 'wireframe' ? 'primary' : 'default'}
                  >
                    โครงลวด
                  </Button>
                  <Button
                    icon={<XRayIcon />}
                    onClick={() => changeViewMode('xray')}
                    type={viewMode === 'xray' ? 'primary' : 'default'}
                  >
                    X-Ray
                  </Button>
                  <Button
                    icon={<ShareAltOutlined />}
                    onClick={handleShare}
                  >
                    แชร์
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleDownload}
                  >
                    ดาวน์โหลด
                  </Button>
                  <Button
                    icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? 'ออกจาก' : ''}เต็มจอ
                  </Button>
                </Space>
              )}
            </div>
          </div>

          {/* Viewer Container */}
          <div
            ref={viewerContainerRef}
            className="relative touch-none"
            style={{
              width: '100%',
              height: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 180px)',
              minHeight: isMobile ? '400px' : '600px'
            }}
          >
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 z-10">
                <Spin size="large" />
                <Text className={`mt-4 ${isMobile ? 'text-sm' : 'text-base'} text-gray-600 px-4 text-center`}>
                  {loadingStatus}
                </Text>
              </div>
            )}
          </div>

          {/* Footer Info */}
          {!isMobile && (
            <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <Space className="w-full justify-between flex-wrap">
                <Text className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  ใช้เมาส์ซ้าย: หมุนมุมมอง | เมาส์ขวา: เลื่อนมุมมอง | ล้อเมาส์: ซูมเข้า-ออก
                </Text>
                <Text className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  โหมด: <strong>{viewMode === 'realistic' ? 'ปกติ' : viewMode === 'wireframe' ? 'โครงลวด' : 'X-Ray'}</strong>
                </Text>
              </Space>
            </div>
          )}

          {/* Mobile Footer */}
          {isMobile && (
            <div className={`p-2 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <Text className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} block text-center`}>
                🖐️ 1 นิ้ว: หมุน | 2 นิ้ว: ซูม & เลื่อน
              </Text>
            </div>
          )}
        </Card>
      </div>

      {/* Mobile Menu Drawer */}
      <Drawer
        title="เมนู"
        placement="bottom"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        height="auto"
        className={theme === 'dark' ? 'dark-drawer' : ''}
      >
        <MobileMenu />
      </Drawer>

      {/* Share Modal */}
      <Modal
        title={
          <span className={theme === 'dark' ? 'text-white' : ''}>
            แชร์ไฟล์ IFC
          </span>
        }
        open={shareModalVisible}
        onCancel={() => setShareModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setShareModalVisible(false)} block={isMobile}>
            ปิด
          </Button>,
          <Button key="copy" type="primary" onClick={copyLinkToClipboard} block={isMobile}>
            🔐 สร้างลิงก์แชร์แบบปลอดภัย
          </Button>,
        ]}
        className={theme === 'dark' ? 'dark-modal' : ''}
        width={isMobile ? '95%' : 600}
      >
        <div className={isMobile ? 'py-2' : 'py-4'}>
          <div className={`${isMobile ? 'mb-3 p-3' : 'mb-4 p-4'} bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg`}>
            <div className="flex items-start gap-3">
              <span className={isMobile ? 'text-xl' : 'text-2xl'}>🔐</span>
              <div className="flex-1">
                <Text className={`text-green-800 font-bold block ${isMobile ? 'mb-1 text-sm' : 'mb-2 text-base'}`}>
                  ลิงก์แชร์แบบปลอดภัย (Secure Share Token)
                </Text>
                <div className={`space-y-${isMobile ? '1' : '2'} ${isMobile ? 'text-xs' : 'text-sm'} text-green-700`}>
                  <div className="flex items-start gap-2">
                    <span>✅</span>
                    <span>เปิดดูได้ทันทีโดยไม่ต้อง Login</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>🔐</span>
                    <span><strong>ปลอดภัย:</strong> ใช้ Token 64 ตัวอักษร ไม่สามารถเดาได้</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>⏰</span>
                    <span>หมดอายุอัตโนมัติใน 7 วัน</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>📊</span>
                    <span>บันทึกสถิติการเข้าถึงและ IP Address</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>🚫</span>
                    <span><strong>ไม่สามารถเปลี่ยน URL ดูไฟล์อื่นได้</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`${isMobile ? 'p-2' : 'p-3'} bg-yellow-50 border border-yellow-200 rounded`}>
            <Text className={`text-yellow-800 ${isMobile ? 'text-xs' : 'text-xs'} flex items-start gap-2`}>
              <span>💡</span>
              <span>
                <strong>วิธีใช้:</strong> กดปุ่ม "สร้างลิงก์แชร์" ด้านล่าง ระบบจะสร้างลิงก์ที่ปลอดภัยให้อัตโนมัติ แล้วส่งให้ผู้ที่ต้องการดูผ่าน Line, Email หรือ Chat
              </span>
            </Text>
          </div>

          {token && (
            <div className={`${isMobile ? 'mt-2 p-2' : 'mt-3 p-3'} bg-blue-50 border border-blue-200 rounded`}>
              <Text className={`text-blue-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <strong>ℹ️ หมายเหตุ:</strong> คุณกำลังเปิดดูผ่านลิงก์แชร์แบบปลอดภัยอยู่แล้ว หากต้องการแชร์ต่อให้คนอื่น กรุณาสร้างลิงก์ใหม่
              </Text>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ViewerIFC;