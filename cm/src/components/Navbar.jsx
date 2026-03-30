import { useNavigate } from 'react-router-dom';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import {
  HomeOutlined,
  ProjectOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  CloseOutlined,
  DownOutlined,
  SafetyOutlined,
  SwapOutlined,
  BankOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { Badge, Avatar } from 'antd';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

function Navbar({ user, setUser, theme, setTheme, activeCompany, setActiveCompany }) {
  const navigate = useNavigate();
  const [localCompany, setLocalCompany] = useState(null);

  // ดึงข้อมูลบริษัทจาก props หรือ localStorage
  useEffect(() => {
    if (activeCompany) {
      setLocalCompany(activeCompany);
    } else {
      try {
        const stored = localStorage.getItem('activeCompany');
        if (stored) setLocalCompany(JSON.parse(stored));
      } catch (e) { /* ignore */ }
    }
  }, [activeCompany]);

  const companyName = localCompany?.company_name || 'SPK Construction';
  const companySubtitle = localCompany?.company_subtitle || 'บริหารโครงการก่อสร้าง';
  const companyLogo = localCompany?.company_logo;
  const companyColor = localCompany?.company_color || '#dc2626';
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3050';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('activeCompanyId');
    localStorage.removeItem('activeCompany');
    localStorage.removeItem('pendingCompanies');
    setUser(null);
    if (setActiveCompany) setActiveCompany(null);
    navigate('/login');
  };

  const handleSwitchCompany = () => {
    localStorage.removeItem('activeCompanyId');
    localStorage.removeItem('activeCompany');
    if (setActiveCompany) setActiveCompany(null);
    navigate('/select-company');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isTenderMode = companyName?.toLowerCase().includes('tender');

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <HomeOutlined className="text-lg" />, color: 'text-blue-500' },
    { name: 'History', href: '/history', icon: <ClockCircleOutlined className="text-lg" />, color: 'text-purple-500' },
    { name: isTenderMode ? 'Tender' : 'Projects', href: '/projects', icon: <ProjectOutlined className="text-lg" />, color: 'text-green-500' },
  ];

  const userMenuItems = [
    { name: 'โปรไฟล์', href: '/profile', icon: <UserOutlined className="text-base" />, color: 'text-purple-500' },
    ...(user?.roles?.includes(1)
      ? [
          { name: 'ตั้งค่าระบบ', href: '/settings', icon: <SettingOutlined className="text-base" />, color: 'text-gray-500' },
          { name: 'Master Folder', href: '/permission-folder', icon: <FolderOpenOutlined className="text-base" />, color: 'text-indigo-500' }
        ]
      : []),
    { name: 'สลับบริษัท', action: handleSwitchCompany, icon: <SwapOutlined className="text-base" />, color: 'text-blue-500' },
    { name: 'ออกจากระบบ', action: handleLogout, icon: <LogoutOutlined className="text-base" />, color: 'text-red-500' },
  ];


  return (
    <Disclosure
      as="nav"
      className={clsx(
        theme === 'dark'
          ? isTenderMode 
            ? 'bg-[#0f172a] shadow-[0_4px_40px_rgba(212,175,55,0.2)] border-b border-[#d4af37]/20'
            : 'bg-[#020617] shadow-[0_4px_40px_rgba(0,0,0,0.6)] border-b border-white/5'
          : isTenderMode
            ? 'bg-amber-50 shadow-[0_4px_30px_rgba(212,175,55,0.1)] border-b border-amber-200/50'
            : 'bg-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.05)] border-b border-slate-200/70',
        'sticky top-0 z-50 transition-all duration-500'
      )}
    >
      {({ open }) => (
        <>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              {/* Left Side: Logo and Navigation */}
              <div className="flex items-center space-x-6">
                {/* Logo - ปรับใหม่ให้สวยพรีเมียม */}
               {/* Logo - ใช้ dynamic company logo */}
<div
  className="flex-shrink-0 flex items-center space-x-3 cursor-pointer group"
  onClick={() => navigate('/projects')}
>
  {/* Company Logo - dynamic */}
  <div
    className={clsx(
      'relative p-1.5 rounded-lg transition-all duration-300 group-hover:scale-110',
      theme === 'dark'
        ? 'bg-opacity-30 border border-opacity-50 shadow-[0_0_20px_rgba(220,38,38,0.15)]'
        : 'bg-opacity-10 border border-opacity-20 shadow-[0_4px_12px_rgba(220,38,38,0.1)]'
    )}
    style={{
      backgroundColor: isTenderMode ? '#d4af3720' : companyColor + '15',
      borderColor: isTenderMode ? '#d4af3750' : companyColor + '50'
    }}
  >
    <div className="relative w-9 h-9 flex items-center justify-center">
      {companyLogo ? (
        <img src={`${API_BASE}/${companyLogo}`} alt={companyName} className="w-full h-full object-contain" 
             onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      ) : null}
      <div className={clsx(
        'w-full h-full items-center justify-center text-lg font-bold rounded',
        companyLogo ? 'hidden' : 'flex'
      )} style={{ color: isTenderMode ? '#d4af37' : companyColor }}>
        {companyName?.charAt(0) || 'C'}
      </div>
    </div>
  </div>

  {/* Company Name - dynamic */}
  <div className="hidden sm:flex flex-col">
    <div className="flex items-center space-x-2">
      <span
        className={clsx(
          theme === 'dark' ? 'text-white' : 'text-gray-900',
          'text-xl font-bold tracking-tight'
        )}
      >
        {companyName}
      </span>
      {isTenderMode && (
        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-[10px] font-black text-white animate-pulse shadow-sm shadow-amber-500/50 uppercase tracking-widest leading-tight">
          Tender Mode
        </span>
      )}
    </div>
    <span
      className={clsx(
        'text-xs font-bold tracking-wider'
      )}
      style={{ color: isTenderMode ? '#b4941f' : companyColor }}
    >
      {companySubtitle}
    </span>
  </div>
</div>

                {/* Desktop Nav Items */}
                <div className="hidden lg:flex items-center space-x-2">
                  {navItems.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => navigate(item.href)}
                      className={clsx(
                        theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                        'flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                        'hover:shadow-md hover:scale-105'
                      )}
                    >
                      <span className={item.color}>{item.icon}</span>
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Side: Theme Toggle & User Menu */}
              <div className="hidden sm:flex items-center space-x-3">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={clsx(
                    theme === 'dark'
                      ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
                      : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm',
                    'p-2.5 rounded-xl transition-all duration-300 hover:scale-110 border-0'
                  )}
                  aria-label="สลับธีม"
                >
                  {theme === 'dark' ? <SunOutlined className="text-xl" /> : <MoonOutlined className="text-xl" />}
                </button>

                {/* User Menu */}
                <Menu as="div" className="relative">
                  <Menu.Button
                    className={clsx(
                      theme === 'dark'
                        ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-50',
                      'flex items-center space-x-3 px-4 py-2 rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-sm'
                    )}
                  >
                    <Badge dot status={theme === 'dark' ? 'success' : 'processing'}>
                      {user?.profile_image ? (
                        <Avatar
                          src={`${import.meta.env.VITE_API_URL}/${user.profile_image}`}
                          size={32}
                          className="border-2 border-indigo-500"
                        />
                      ) : (
                        <Avatar
                          size={32}
                          style={{
                            backgroundColor: theme === 'dark' ? '#6366f1' : '#4f46e5',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}
                          icon={<UserOutlined />}
                        >
                          {(user?.username || 'U')[0].toUpperCase()}
                        </Avatar>
                      )}
                    </Badge>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-semibold">
                        {user?.first_name || user?.username || 'ผู้ใช้'}
                      </span>
                      {user?.isAdmin && (
                        <span className="text-xs text-indigo-500 flex items-center gap-1">
                          <SafetyOutlined /> Admin
                        </span>
                      )}
                    </div>
                    <DownOutlined className="text-xs" />
                  </Menu.Button>

                  <Transition
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95 translate-y-2"
                    enterTo="transform opacity-100 scale-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="transform opacity-100 scale-100 translate-y-0"
                    leaveTo="transform opacity-0 scale-95 translate-y-2"
                  >
                    <Menu.Items
                      className={clsx(
                        theme === 'dark' ? 'bg-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)]',
                        'absolute right-0 mt-2 w-64 rounded-2xl overflow-hidden py-1'
                      )}
                    >
                      {/* User Info Header */}
                      <div
                        className={clsx(
                          theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-50/50',
                          'px-4 py-4 mb-1'
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          {user?.profile_image ? (
                            <Avatar src={`${import.meta.env.VITE_API_URL}/${user.profile_image}`} size={40} />
                          ) : (
                            <Avatar size={40} style={{ backgroundColor: '#4f46e5' }} icon={<UserOutlined />}>
                              {(user?.username || 'U')[0].toUpperCase()}
                            </Avatar>
                          )}
                          <div className="flex-1">
                            <div
                              className={clsx(
                                theme === 'dark' ? 'text-white' : 'text-gray-900',
                                'font-semibold text-sm'
                              )}
                            >
                              {user?.first_name} {user?.last_name}
                            </div>
                            <div
                              className={clsx(theme === 'dark' ? 'text-gray-400' : 'text-gray-500', 'text-xs')}
                            >
                              {user?.email}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        {userMenuItems.map((item) => (
                          <Menu.Item key={item.name}>
                            {({ active }) =>
                              item.action ? (
                                <button
                                  onClick={item.action}
                                  className={clsx(
                                    active
                                      ? theme === 'dark'
                                        ? 'bg-red-900/30 text-red-400'
                                        : 'bg-red-50 text-red-600'
                                      : theme === 'dark'
                                      ? 'text-red-400'
                                      : 'text-red-600',
                                    'flex items-center space-x-3 w-full px-4 py-2.5 text-sm font-medium transition-colors'
                                  )}
                                >
                                  <span className={item.color}>{item.icon}</span>
                                  <span>{item.name}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => navigate(item.href)}
                                  className={clsx(
                                    active
                                      ? theme === 'dark'
                                        ? 'bg-gray-700 text-white'
                                        : 'bg-gray-100 text-gray-900'
                                      : theme === 'dark'
                                      ? 'text-gray-200'
                                      : 'text-gray-700',
                                    'flex items-center space-x-3 w-full px-4 py-2.5 text-sm font-medium transition-colors'
                                  )}
                                >
                                  <span className={item.color}>{item.icon}</span>
                                  <span>{item.name}</span>
                                </button>
                              )
                            }
                          </Menu.Item>
                        ))}
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>

              {/* Mobile Menu Button */}
              <div className="flex items-center sm:hidden space-x-2">
                <button
                  onClick={toggleTheme}
                  className={clsx(
                    theme === 'dark'
                      ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
                      : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm',
                    'p-2.5 rounded-xl transition-all duration-200 border-0'
                  )}
                >
                  {theme === 'dark' ? <SunOutlined className="text-lg" /> : <MoonOutlined className="text-lg" />}
                </button>

                <Disclosure.Button
                  className={clsx(
                    theme === 'dark'
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm',
                    'p-2.5 rounded-xl transition-all duration-200 border-0'
                  )}
                >
                  {open ? <CloseOutlined className="text-xl" /> : <MenuOutlined className="text-xl" />}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {/* Mobile Menu Panel */}
          <Transition
            enter="transition duration-200 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-150 ease-in"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Disclosure.Panel className="sm:hidden">
              <div className={clsx(theme === 'dark' ? 'bg-gray-900' : 'bg-white', 'px-4 pt-4 pb-6 space-y-3')}>
                {/* User Info */}
                <div
                  className={clsx(
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-gray-800 to-gray-700'
                      : 'bg-gradient-to-r from-gray-50 to-gray-100',
                    'flex items-center space-x-3 p-4 rounded-xl shadow-md'
                  )}
                >
                  {user?.profile_image ? (
                    <Avatar src={`${import.meta.env.VITE_API_URL}/${user.profile_image}`} size={48} />
                  ) : (
                    <Avatar size={48} style={{ backgroundColor: '#4f46e5' }} icon={<UserOutlined />}>
                      {(user?.username || 'U')[0].toUpperCase()}
                    </Avatar>
                  )}
                  <div className="flex-1">
                    <div className={clsx(theme === 'dark' ? 'text-white' : 'text-gray-900', 'font-semibold')}>
                      {user?.first_name || user?.username || 'ผู้ใช้'}
                    </div>
                    <div className={clsx(theme === 'dark' ? 'text-gray-400' : 'text-gray-500', 'text-xs flex items-center gap-1')}>
                      <Badge status="success" />
                      ออนไลน์
                    </div>
                  </div>
                </div>

                {/* Navigation Items */}
                {navItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.href)}
                    className={clsx(
                      theme === 'dark'
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
                      'flex items-center space-x-3 px-4 py-3 rounded-xl font-medium w-full text-left shadow-sm hover:shadow-md transition-all'
                    )}
                  >
                    <span className={item.color}>{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                ))}

                <div className={clsx(theme === 'dark' ? 'border-gray-700' : 'border-gray-200', 'border-t my-2')} />

                {/* User Menu Items */}
                {userMenuItems.map((item) => (
                  <div key={item.name}>
                    {item.action ? (
                      <button
                        onClick={item.action}
                        className={clsx(
                          theme === 'dark'
                            ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30'
                            : 'bg-red-50 text-red-600 hover:bg-red-100',
                          'w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium shadow-sm'
                        )}
                      >
                        <span className={item.color}>{item.icon}</span>
                        <span>{item.name}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(item.href)}
                        className={clsx(
                          theme === 'dark'
                            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100',
                          'flex items-center space-x-3 px-4 py-3 rounded-xl font-medium w-full text-left shadow-sm'
                        )}
                      >
                        <span className={item.color}>{item.icon}</span>
                        <span>{item.name}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Disclosure.Panel>
          </Transition>
        </>
      )}
    </Disclosure>
  );
}

export default Navbar;