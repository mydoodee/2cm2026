import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/cm/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Only split the exceptionally large 3D and heavy graphics libraries
            if (id.includes('three') || id.includes('web-ifc')) {
              return 'vendor-3d';
            }
            // Keep everything else together to ensure stable initialization
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  assetsInclude: ['**/*.woff', '**/*.woff2'],
  resolve: {
    alias: {
      '@': '/src', // Simple alias - Vite automatically resolves this relative to project root
      antd: 'antd', // ช่วยให้แน่ใจว่าการนำเข้า antd ถูกต้อง
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        // รองรับ LESS สำหรับ Antd
        javascriptEnabled: true,
        // ปรับแต่งตัวแปร Antd (ถ้าต้องการเปลี่ยนธีม)
        modifyVars: {
          '@font-family': "'Kanit', sans-serif", // ใช้ฟอนต์ Kanit เป็นค่าเริ่มต้น
          '@primary-color': '#1890ff', // สีหลักของ Antd (ปรับได้ตามต้องการ)
          '@body-background': '#f7fafc', // พื้นหลังสำหรับโหมดสว่าง
          '@text-color': '#4a5568', // สีตัวอักษรหลัก
        },
      },
    },
  },
});