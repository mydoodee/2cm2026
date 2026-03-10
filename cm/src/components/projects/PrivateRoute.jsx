// PrivateRoute.jsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const location = useLocation();
  
  // ✅ ตรวจสอบว่าเป็น public mode หรือไม่
  const urlParams = new URLSearchParams(location.search);
  const isPublicMode = urlParams.get('public') === 'true';
  
  // ✅ ถ้าเป็น public mode → ให้ผ่านเลย ไม่ต้องเช็ค token
  if (isPublicMode) {
    console.log('🌐 Public mode detected - bypassing authentication');
    return children;
  }
  
  // ✅ ถ้าไม่ใช่ public mode → เช็ค token ตามปกติ
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.log('🔒 Private mode - no token found, redirecting to login');
    return <Navigate to="/cm/login" state={{ from: location }} replace />;
  }
  
  console.log('🔒 Private mode - token found, granting access');
  return children;
};

export default PrivateRoute;