import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://app.spkconstruction.co.th:3050',
    timeout: 5 * 60 * 1000, // ✅ ลดเป็น 5 นาที (เพียงพอสำหรับ API calls ทั่วไป)
});

// Request Interceptor - เพิ่ม token ทุกครั้งที่ส่ง request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // ✅ เพิ่ม Company Context Header
        const activeCompanyId = localStorage.getItem('activeCompanyId');
        if (activeCompanyId && activeCompanyId !== 'null' && activeCompanyId !== 'undefined') {
            config.headers['X-Company-Id'] = activeCompanyId;
        }

        // ตรวจสอบว่า URL มี 'undefined' หรือไม่
        if (config.url && config.url.includes('undefined')) {
            console.error('❌ Invalid URL detected:', config.url);
            return Promise.reject(new Error('URL ไม่ถูกต้อง: มีค่า undefined ใน URL'));
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor - จัดการ error
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // ✅ จัดการ Timeout Error
        if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
            console.error('❌ Request Timeout:', error.message);
            return Promise.reject(new Error('คำขอหมดเวลา กรุณาลองใหม่อีกครั้ง (Timeout: 5 นาที)'));
        }

        // ✅ ข้ามการจัดการถ้าเป็น Cancelled Error (เช่น Component Unmounted)
        if (axios.isCancel(error)) {
            return Promise.reject(error);
        }

        // ถ้าไม่มี response (network error)
        if (!error.response) {
            console.error('❌ Network Error:', error.message);
            return Promise.reject(new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'));
        }

        const { status } = error.response;

        // Log error สำหรับ debug
        console.error(`❌ API Error [${status}]:`, {
            url: originalRequest?.url,
            method: originalRequest?.method,
            status: status,
            data: error.response?.data,
            message: error.response?.data?.message || error.message
        });

        // 401/403 - Token หมดอายุหรือไม่ถูกต้อง และยังไม่ได้ลอง retry
        if ((status === 401 || status === 403) && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token');

                console.log('🔄 Attempting to refresh token...');
                const response = await axios.post(`${import.meta.env.VITE_API_URL}/refresh-token`, { refreshToken });

                const newToken = response.data.token;
                localStorage.setItem('token', newToken);

                // Update Header และลองใหม่
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error('❌ Refresh token failed:', refreshError);
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');

                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/cm/login';
                }
                return Promise.reject(new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'));
            }
        }

        // ✅ 400 - missing company header (Safety Net)
        if (status === 400 && error.response?.data?.message?.includes('เลือกบริษัทก่อน')) {
            const isSelectorCall = originalRequest?.url?.includes('/companies') || originalRequest?.url?.includes('/user');
            
            // ล้างค่าที่อาจเป็นขยะออกเพื่อให้ระบบ Redirect ไปเริ่มใหม่ได้ถูกต้อง
            localStorage.removeItem('activeCompanyId');
            localStorage.removeItem('activeCompany');

            if (!isSelectorCall) {
                console.warn(`🏢 Missing company header for ${originalRequest?.url} - redirecting to select-company`);
                if (!window.location.pathname.includes('/select-company') && !window.location.pathname.includes('/login')) {
                    window.location.href = '/select-company';
                }
            }
            return Promise.reject(new Error(`กรุณาเลือกบริษัทก่อนเข้าใช้งาน (${originalRequest?.url})`));
        }

        // Error อื่นๆ
        const errorMessage = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาด';
        return Promise.reject(new Error(errorMessage));
    }
);

export default api;