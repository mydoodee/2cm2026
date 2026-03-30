import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { ProjectOutlined, TeamOutlined, LockOutlined, FileTextOutlined, BankOutlined, RightOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import Navbar from './Navbar';

function Settings({ user, setUser, theme, setTheme }) {
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'ต้องเข้าสู่ระบบ',
                text: 'กรุณาเข้าสู่ระบบเพื่อเข้าถึงหน้าการตั้งค่า',
                confirmButtonColor: '#4f46e5',
                confirmButtonText: 'ตกลง',
            }).then(() => {
                navigate('/login');
            });
        } else if (!user.roles.includes(1)) {
            Swal.fire({
                icon: 'error',
                title: 'ไม่มีสิทธิ์',
                text: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงหน้าการตั้งค่า',
                confirmButtonColor: '#4f46e5',
                confirmButtonText: 'ตกลง',
            }).then(() => {
                navigate('/projects');
            });
        }
    }, [user, navigate]);

    const handleCardClick = (title) => {
        if (title === 'การจัดการโครงการ') {
            navigate('/project-settings');
        } else if (title === 'การจัดการบริษัท') {
            navigate('/company-settings');
        } else if (title === 'การจัดการผู้ใช้') {
            navigate('/user-settings');
        } else if (title === 'การจัดการสิทธิ์โมดูล') {
            navigate('/permission-folder');
        } else if (title === 'ดูบันทึกการใช้งาน') {
            Swal.fire({
                icon: 'info',
                title: 'เร็วๆ นี้',
                text: `${title} อยู่ในระหว่างการพัฒนา`,
                confirmButtonColor: '#4f46e5',
                confirmButtonText: 'เข้าใจแล้ว',
            });
        }
    };

    if (!user || !user.roles.includes(1)) {
        return (
            <div className={`min-h-screen w-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} font-kanit`}>
                <Spin size="large" />
            </div>
        );
    }

    const cardData = [
        {
            title: 'การจัดการบริษัท',
            description: 'สร้าง แก้ไข ข้อมูลของแต่ละบริษัทในระบบ (Multi-Tenant) จัดการโลโก้ เครือข่าย',
            icon: <BankOutlined />,
            iconColor: theme === 'dark' ? '#FADB14' : '#FAAD14', // เหลือง/ทอง
            onClickTitle: 'การจัดการบริษัท',
        },
        {
            title: 'การจัดการโครงการ',
            description: 'สร้าง แก้ไข หรือลบโครงการในระบบ เช่น การก่อสร้างอาคาร ASS หรือถนน B',
            icon: <ProjectOutlined />,
            iconColor: theme === 'dark' ? '#69B1FF' : '#1677FF', // น้ำเงิน
            onClickTitle: 'การจัดการโครงการ',
        },
        {
            title: 'การจัดการผู้ใช้',
            description: 'เชิญผู้ใช้ใหม่และกำหนดบทบาท เช่น วิศวกรหรือนักบัญชีภายในโครงการ',
            icon: <TeamOutlined />,
            iconColor: theme === 'dark' ? '#95DE64' : '#52C41A', // เขียว
            onClickTitle: 'การจัดการผู้ใช้',
        },
        {
            title: 'การจัดการสิทธิ์โมดูล',
            description: 'กำหนดสิทธิ์การเข้าถึงสำหรับโมดูล เช่น การจัดการโครงการ หรือเอกสาร',
            icon: <LockOutlined />,
            iconColor: theme === 'dark' ? '#FFA940' : '#FA8C16', // ส้ม
            onClickTitle: 'การจัดการสิทธิ์โมดูล',
        },
        {
            title: 'ดูบันทึกการใช้งาน',
            description: 'ตรวจสอบบันทึกการกระทำ เช่น การล็อกอินล้มเหลวหรือการรีเซ็ตรหัสผ่าน',
            icon: <FileTextOutlined />,
            iconColor: theme === 'dark' ? '#B37FEB' : '#722ED1', // ม่วง
            onClickTitle: 'ดูบันทึกการใช้งาน',
        },
    ];

    return (
        <div className={`min-h-screen w-full font-kanit ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} transition-all duration-300 flex flex-col`}>
            <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
            
            <div className="flex-1 flex justify-center p-4 sm:p-6 lg:p-8">
                <div className={`w-full max-w-5xl rounded-2xl p-6 sm:p-8 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} shadow-sm border transition-all duration-300`}>
                    
                    <div className="mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                        <h1 className="text-2xl sm:text-3xl font-bold mb-1">การตั้งค่าผู้ดูแลระบบ</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 m-0">จัดการบัญชี สิทธิ์การเข้าถึง และส่วนต่างๆ ของระบบ</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cardData.map((card, index) => (
                            <div 
                                key={index}
                                onClick={() => handleCardClick(card.onClickTitle)}
                                className={`
                                    group flex items-center p-4 cursor-pointer rounded-xl transition-all duration-200 border
                                    ${theme === 'dark' 
                                        ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-700 hover:border-gray-500' 
                                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-indigo-300'
                                    } hover:shadow-sm
                                `}
                            >
                                <div 
                                    className="flex items-center justify-center rounded-lg w-12 h-12 flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                                    style={{ backgroundColor: `${card.iconColor}20`, color: card.iconColor }}
                                >
                                    <div className="text-2xl leading-none flex">{card.icon}</div>
                                </div>
                                
                                <div className="ml-4 flex-grow">
                                    <h3 className={`text-base font-semibold m-0 leading-tight ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                                        {card.title}
                                    </h3>
                                    <p className={`text-sm m-0 mt-1 leading-snug line-clamp-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {card.description}
                                    </p>
                                </div>
                                
                                <div className={`ml-2 text-gray-400 group-hover:text-indigo-500 transition-colors`}>
                                    <RightOutlined />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <style jsx="true">{`
                .font-kanit {
                    font-family: 'Kanit', sans-serif !important;
                }
                .ant-spin-dot-item {
                    background-color: ${theme === 'dark' ? '#4f46e5' : '#1677ff'};
                }
            `}</style>
        </div>
    );
}

Settings.propTypes = {
    user: PropTypes.shape({
        user_id: PropTypes.number,
        username: PropTypes.string,
        email: PropTypes.string,
        first_name: PropTypes.string,
        last_name: PropTypes.string,
        roles: PropTypes.arrayOf(PropTypes.number),
    }),
    setUser: PropTypes.func.isRequired,
    theme: PropTypes.string.isRequired,
    setTheme: PropTypes.func.isRequired,
};

export default Settings;