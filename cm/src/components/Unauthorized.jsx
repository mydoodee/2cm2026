//Unauthorized.jsx
import { useNavigate, useLocation } from 'react-router-dom'; // เพิ่ม useLocation
import PropTypes from 'prop-types';

const Unauthorized = ({ theme }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const reason = location.state?.reason || 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้';

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center ${
            theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
        }`}>
            <h1 className="text-3xl font-bold mb-4">ไม่มีสิทธิ์เข้าถึง</h1>
            <p className="text-lg mb-6">{reason}</p>
            <button
                onClick={() => navigate('/dashboard')}
                className={`px-4 py-2 rounded-lg font-medium ${
                    theme === 'dark' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-500 text-white hover:bg-indigo-600'
                }`}
            >
                กลับไปที่แดชบอร์ด
            </button>
        </div>
    );
};

Unauthorized.propTypes = {
    theme: PropTypes.string,
};

export default Unauthorized;