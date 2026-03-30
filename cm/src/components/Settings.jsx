import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import { ProjectOutlined, TeamOutlined, LockOutlined, FileTextOutlined, BankOutlined, RightOutlined, FolderOpenOutlined } from '@ant-design/icons';
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
            title: 'จัดการบริษัท',
            description: 'ข้อมูลบริษัท โลโก้ และเครือข่ายธุรกิจ',
            icon: <BankOutlined />,
            iconColor: theme === 'dark' ? '#FADB14' : '#FAAD14', 
            onClickTitle: 'การจัดการบริษัท',
        },
        {
            title: 'จัดการโครงการ',
            description: 'สร้างและแก้ไขโครงการทั้งหมดในระบบ',
            icon: <ProjectOutlined />,
            iconColor: theme === 'dark' ? '#69B1FF' : '#1677FF', 
            onClickTitle: 'การจัดการโครงการ',
        },
        {
            title: 'จัดการผู้ใช้',
            description: 'จัดการสมาชิก บทบาท และสิทธิ์ผู้ใช้',
            icon: <TeamOutlined />,
            iconColor: theme === 'dark' ? '#95DE64' : '#52C41A', 
            onClickTitle: 'การจัดการผู้ใช้',
        },
        {
            title: 'Master Folders',
            description: 'จัดการโครงสร้างต้นแบบและสิทธิ์โฟลเดอร์',
            icon: <FolderOpenOutlined />,
            iconColor: theme === 'dark' ? '#FFA940' : '#FA8C16', 
            onClickTitle: 'การจัดการสิทธิ์โมดูล',
        },
        {
            title: 'บันทึกการใช้งาน',
            description: 'ตรวจสอบประวัติกิจกรรมและ Log ระบบ',
            icon: <FileTextOutlined />,
            iconColor: theme === 'dark' ? '#B37FEB' : '#722ED1', 
            onClickTitle: 'ดูบันทึกการใช้งาน',
        },
    ];

    return (
        <div className={`min-h-screen w-full font-kanit ${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-slate-50'} transition-all duration-500 flex flex-col`}>
            <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
            
            <div className="flex-1 flex justify-center p-6 sm:p-10">
                <div className="w-full max-w-6xl">
                    
                    {/* Header Section */}
                    <div className="mb-10 text-center sm:text-left">
                        <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                            การตั้งค่าระบบ
                        </h1>
                        <p className={`text-sm sm:text-base ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            จัดการบัญชี สิทธิ์การเข้าถึง และส่วนประกอบต่างๆ ของแพลตฟอร์ม
                        </p>
                    </div>

                    {/* Compact Grid Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {cardData.map((card, index) => (
                            <div 
                                key={index}
                                onClick={() => handleCardClick(card.onClickTitle)}
                                className={`
                                    group relative flex flex-col p-6 cursor-pointer rounded-2xl transition-all duration-300 border
                                    ${theme === 'dark' 
                                        ? 'bg-slate-800/40 border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.2)]' 
                                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10'
                                    } hover:scale-[1.02] active:scale-[0.98]
                                `}
                                style={{ 
                                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                                }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div 
                                        className="flex items-center justify-center rounded-xl w-12 h-12 flex-shrink-0 transition-all duration-300 group-hover:shadow-lg"
                                        style={{ 
                                            backgroundColor: `${card.iconColor}15`, 
                                            color: card.iconColor,
                                            boxShadow: `0 0 20px ${card.iconColor}10`
                                        }}
                                    >
                                        <div className="text-2xl flex">{card.icon}</div>
                                    </div>
                                    <div className={`text-slate-400 group-hover:text-indigo-500 transition-all duration-300 transform group-hover:translate-x-1`}>
                                        <RightOutlined />
                                    </div>
                                </div>
                                
                                <div className="mt-auto">
                                    <h3 className={`text-base font-bold mb-1 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                                        {card.title}
                                    </h3>
                                    <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {card.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <style jsx="true">{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .font-kanit {
                    font-family: 'Kanit', sans-serif !important;
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