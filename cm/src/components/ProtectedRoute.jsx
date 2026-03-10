//ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

const ProtectedRoute = ({ user }) => {
    const location = useLocation();
    
    // ✅ ตรวจสอบว่าเป็น public mode หรือไม่
    const urlParams = new URLSearchParams(location.search);
    const isPublicMode = urlParams.get('public') === 'true';
    
    console.log('🔍 ProtectedRoute Check:', {
        pathname: location.pathname,
        isPublicMode,
        hasUser: !!user,
        search: location.search
    });
    
    // ✅ ถ้าเป็น public mode → ให้ผ่านเลย ไม่ต้องเช็ค user
    if (isPublicMode) {
        console.log('🌐 Public mode detected - bypassing authentication');
        return <Outlet />;
    }
    
    // ✅ ถ้าไม่ใช่ public mode → เช็ค user ตามปกติ
    if (!user || !user.user_id) {
        console.log('🔒 No user found - redirecting to login');
        return <Navigate to="/login" replace />;
    }

    console.log('🔒 User authenticated - allowing access');
    return <Outlet />;
};

ProtectedRoute.propTypes = {
    user: PropTypes.shape({
        user_id: PropTypes.number,
        username: PropTypes.string,
        email: PropTypes.string,
        first_name: PropTypes.string,
        last_name: PropTypes.string,
        roles: PropTypes.arrayOf(PropTypes.number),
        isAdmin: PropTypes.bool,
    }),
};

export default ProtectedRoute;