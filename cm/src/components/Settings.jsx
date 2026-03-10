import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Spin, Space } from 'antd';
import { ProjectOutlined, TeamOutlined, LockOutlined, FileTextOutlined } from '@ant-design/icons';
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
            <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 font-kanit">
                <Spin size="large" />
            </div>
        );
    }

    const cardData = [
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
            description: 'กำหนดสิทธิ์การเข้าถึงสำหรับโมดูล เช่น การจัดการโครงการ การเงิน หรือเอกสาร',
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
            <div className="flex-1 flex flex-col p-6">
                <div className={`rounded-2xl p-8 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} shadow-xl transition-all duration-300`}>
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">การตั้งค่าผู้ดูแลระบบ</h1>
                        <p className="text-md text-gray-500">จัดการด้านต่างๆ ของระบบและผู้ใช้</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {cardData.map((card, index) => (
                            <Card
                                key={index}
                                variant="borderless"
                                className={`
                                    font-kanit
                                    ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'}
                                    shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer rounded-2xl
                                    flex flex-col
                                `}
                                onClick={() => handleCardClick(card.onClickTitle)}
                            >
                                <Space direction="vertical" size="middle" className="w-full h-full flex flex-col">
                                    <div style={{ color: card.iconColor }} className="text-4xl mb-2">
                                        {card.icon}
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                                    <p className="text-sm text-gray-500 mb-4 flex-grow">{card.description}</p>
                                    <Button
                                        type="primary"
                                        className={`
                                            bg-indigo-600 hover:bg-indigo-700 border-0 rounded-lg w-full mt-auto
                                            ${theme === 'dark' ? '!bg-indigo-600 hover:!bg-indigo-700' : '!bg-indigo-500 hover:!bg-indigo-600'}
                                        `}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCardClick(card.onClickTitle);
                                        }}
                                    >
                                        จัดการ
                                    </Button>
                                </Space>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
            <style jsx="true">{`
                .font-kanit {
                    font-family: 'Kanit', sans-serif !important;
                }
                .ant-btn {
                    border-radius: 10px;
                    font-size: 15px;
                    height: auto;
                    font-family: 'Kanit', sans-serif !important;
                }
                .ant-card {
                    border-radius: 16px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    font-family: 'Kanit', sans-serif !important;
                }
                .ant-card:hover {
                    transform: translateY(-6px) scale(1.02);
                    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.25);
                }
                .ant-card-body {
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    flex-grow: 1;
                    justify-content: space-between;
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