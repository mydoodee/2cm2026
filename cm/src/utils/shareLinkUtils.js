import api from '../axiosConfig';
import { message } from 'antd';

/**
 * สร้าง Share Link สำหรับไฟล์ IFC
 * @param {number} projectId - ID ของโปรเจกต์
 * @param {number} fileId - ID ของไฟล์
 * @param {number} expiresInDays - จำนวนวันที่ link จะหมดอายุ (default: 7)
 * @returns {Promise<Object>} - ข้อมูล share link
 */
export const createShareLink = async (projectId, fileId, expiresInDays = 7) => {
  try {
    const response = await api.post(
      `/api/public/project/${projectId}/file/${fileId}/create-share-link`,
      { expiresInDays },
      { timeout: 30000 }
    );

    message.success({ 
      content: '✅ สร้างลิงก์แชร์สำเร็จ!', 
      key: 'createShareLink',
      duration: 2
    });

    return response.data.data;
    
  } catch (error) {
    console.error('[createShareLink] Error:', error);
    
    let errorMessage = 'เกิดข้อผิดพลาดในการสร้างลิงก์แชร์';
    
    if (error.response?.status === 401) {
      errorMessage = 'กรุณาเข้าสู่ระบบใหม่';
    } else if (error.response?.status === 404) {
      errorMessage = 'ไม่พบไฟล์';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    
    message.error({ 
      content: errorMessage, 
      key: 'createShareLink',
      duration: 3
    });
    
    return null;
  }
};

/**
 * คัดลอก Share Link ไปยัง Clipboard
 * @param {string} shareUrl - URL ของ share link
 * @param {boolean} isMobile - เป็นมือถือหรือไม่
 * @returns {Promise<boolean>} - สำเร็จหรือไม่
 */
export const copyShareLinkToClipboard = async (shareUrl, isMobile = false) => {
  try {
    await navigator.clipboard.writeText(shareUrl);
    
    message.success({
      content: (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            ✅ คัดลอกลิงก์แชร์สำเร็จ!
          </div>
          {!isMobile && (
            <div style={{ 
              fontSize: '11px', 
              padding: '8px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '4px',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              maxWidth: '400px'
            }}>
              {shareUrl}
            </div>
          )}
          <div style={{ fontSize: '12px', marginTop: '8px', color: '#52c41a' }}>
            🔐 ลิงก์นี้ปลอดภัย ใช้งานได้ 7 วัน และไม่สามารถเดาได้
          </div>
        </div>
      ),
      duration: 8,
      style: { minWidth: isMobile ? '90%' : '450px' }
    });
    
    return true;
    
  } catch (error) {
    console.error('[copyShareLinkToClipboard] Error:', error);
    
    message.warning({
      content: (
        <div>
          <div style={{ marginBottom: '8px' }}>
            ⚠️ ไม่สามารถคัดลอกอัตโนมัติได้
          </div>
          {!isMobile && (
            <div style={{ 
              fontSize: '11px', 
              padding: '8px', 
              backgroundColor: '#fff7e6', 
              borderRadius: '4px',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              maxWidth: '400px'
            }}>
              {shareUrl}
            </div>
          )}
          <div style={{ fontSize: '12px', marginTop: '8px' }}>
            กรุณาคัดลอกลิงก์ด้วยตนเอง
          </div>
        </div>
      ),
      duration: 10,
      style: { minWidth: isMobile ? '90%' : '450px' }
    });
    
    return false;
  }
};

/**
 * สร้างและคัดลอก Share Link ในขั้นตอนเดียว
 * @param {number} projectId - ID ของโปรเจกต์
 * @param {number} fileId - ID ของไฟล์
 * @param {number} expiresInDays - จำนวนวันที่หมดอายุ
 * @param {boolean} isMobile - เป็นมือถือหรือไม่
 * @returns {Promise<Object|null>} - ข้อมูล share link หรือ null
 */
export const createAndCopyShareLink = async (projectId, fileId, expiresInDays = 7, isMobile = false) => {
  const shareLinkData = await createShareLink(projectId, fileId, expiresInDays);
  
  if (shareLinkData && shareLinkData.shareUrl) {
    await copyShareLinkToClipboard(shareLinkData.shareUrl, isMobile);
    return shareLinkData;
  }
  
  return null;
};

/**
 * ตรวจสอบข้อมูล Share Link จาก token
 * @param {string} token - Share token
 * @returns {Promise<Object|null>} - ข้อมูลไฟล์หรือ null
 */
export const getShareLinkInfo = async (token) => {
  try {
    const response = await api.get(
      `/api/public/shared/${token}/info`,
      { timeout: 10000 }
    );

    return response.data.data;
    
  } catch (error) {
    console.error('[getShareLinkInfo] Error:', error);
    
    if (error.response?.status === 403) {
      message.error('ลิงก์แชร์หมดอายุแล้ว');
    } else if (error.response?.status === 404) {
      message.error('ลิงก์ไม่ถูกต้องหรือไม่มีอยู่ในระบบ');
    } else if (error.response?.status === 429) {
      message.warning('คำขอมากเกินไป กรุณาลองใหม่ในภายหลัง');
    }
    
    return null;
  }
};

/**
 * ยกเลิก Share Link
 * @param {string} token - Share token
 * @returns {Promise<boolean>} - สำเร็จหรือไม่
 */
export const revokeShareLink = async (token) => {
  try {
    await api.delete(
      `/api/public/shared/${token}`,
      { timeout: 10000 }
    );

    message.success({ 
      content: '✅ ยกเลิกลิงก์แชร์สำเร็จ', 
      key: 'revokeShareLink',
      duration: 2
    });

    return true;
    
  } catch (error) {
    console.error('[revokeShareLink] Error:', error);
    
    message.error({ 
      content: 'เกิดข้อผิดพลาดในการยกเลิกลิงก์', 
      key: 'revokeShareLink',
      duration: 3
    });
    
    return false;
  }
};

/**
 * Format วันหมดอายุให้อ่านง่าย
 * @param {string|Date} expiresAt - วันหมดอายุ
 * @returns {string} - ข้อความที่อ่านง่าย
 */
export const formatExpiryDate = (expiresAt) => {
  if (!expiresAt) return 'ไม่มีกำหนด';
  
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return '❌ หมดอายุแล้ว';
  if (diffDays === 0) return '⚠️ หมดอายุวันนี้';
  if (diffDays === 1) return '⚠️ หมดอายุพรุ่งนี้';
  if (diffDays <= 7) return `⚠️ เหลือ ${diffDays} วัน`;
  
  return `✅ เหลือ ${diffDays} วัน`;
};

export default {
  createShareLink,
  copyShareLinkToClipboard,
  createAndCopyShareLink,
  getShareLinkInfo,
  revokeShareLink,
  formatExpiryDate
};