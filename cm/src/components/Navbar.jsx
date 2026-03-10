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
} from '@ant-design/icons';
import { Badge, Avatar } from 'antd';
import clsx from 'clsx';

function Navbar({ user, setUser, theme, setTheme }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <HomeOutlined className="text-lg" />, color: 'text-blue-500' },
    { name: 'History', href: '/history', icon: <ClockCircleOutlined className="text-lg" />, color: 'text-purple-500' },
    { name: 'Projects', href: '/projects', icon: <ProjectOutlined className="text-lg" />, color: 'text-green-500' },
  ];

  const userMenuItems = [
    { name: 'โปรไฟล์', href: '/profile', icon: <UserOutlined className="text-base" />, color: 'text-purple-500' },
    ...(user?.isAdmin
      ? [{ name: 'ตั้งค่า', href: '/settings', icon: <SettingOutlined className="text-base" />, color: 'text-gray-500' }]
      : []),
    { name: 'ออกจากระบบ', action: handleLogout, icon: <LogoutOutlined className="text-base" />, color: 'text-red-500' },
  ];

  return (
    <Disclosure
      as="nav"
      className={clsx(
        theme === 'dark'
          ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700'
          : 'bg-white border-b border-gray-200',
        'shadow-lg sticky top-0 z-50 backdrop-blur-sm'
      )}
    >
      {({ open }) => (
        <>
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              {/* Left Side: Logo and Navigation */}
              <div className="flex items-center space-x-6">
                {/* Logo - ปรับใหม่ให้สวยพรีเมียม */}
               {/* Logo - ปรับขนาดเล็กลง ดูสมดุล */}
<div
  className="flex-shrink-0 flex items-center space-x-3 cursor-pointer group"
  onClick={() => navigate('/dashboard')}
>
  {/* SPK Logo - ขนาดเล็กลง */}
  <div
    className={clsx(
      'relative p-1.5 rounded-lg shadow-lg transition-all duration-300 group-hover:scale-110',
      theme === 'dark'
        ? 'bg-gradient-to-br from-red-700 to-red-900 border border-red-500/30 shadow-red-900/50'
        : 'bg-gradient-to-br from-red-600 to-red-700 border border-red-400/40 shadow-red-600/40'
    )}
  >
    <div className="relative w-9 h-9 flex items-center justify-center">
      {/* Background Structure Lines */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg className="w-7 h-7 text-white/20" viewBox="0 0 28 28" fill="none">
          <path d="M6 6 H22 M6 14 H22 M6 22 H22 M14 6 V22" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </div>

      {/* SPK Text - เล็กลงแต่ยังชัด */}
      <span
        className="relative text-white font-black text-xs tracking-tighter"
        style={{
          fontFamily: '"Montserrat", "Prompt", sans-serif',
          letterSpacing: '-0.5px',
        }}
      >
        SPK
      </span>

      {/* Small Diamond Accent - เล็กลง */}
      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-500 rounded-sm rotate-45 shadow-sm"></div>
    </div>

    {/* Pulse on Hover */}
    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="absolute -inset-1 bg-red-500 rounded-full blur-xl animate-ping"></div>
    </div>
  </div>

  {/* Company Name */}
  <div className="hidden sm:flex flex-col">
    <span
      className={clsx(
        theme === 'dark' ? 'text-white' : 'text-gray-900',
        'text-xl font-bold tracking-tight'
      )}
    >
      SPK Construction
    </span>
    <span
      className={clsx(
        theme === 'dark' ? 'text-red-400' : 'text-red-600',
        'text-xs font-bold tracking-wider'
      )}
    >
      บริหารโครงการก่อสร้าง
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
                      ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700 border-gray-700'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200',
                    'p-2.5 rounded-xl transition-all duration-300 hover:scale-110 border shadow-sm'
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
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200',
                      'flex items-center space-x-3 px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 border shadow-sm'
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
                        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
                        'absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border overflow-hidden'
                      )}
                    >
                      {/* User Info Header */}
                      <div
                        className={clsx(
                          theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50',
                          'px-4 py-3 border-b',
                          theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
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
                      ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    'p-2 rounded-lg transition-all duration-200'
                  )}
                >
                  {theme === 'dark' ? <SunOutlined className="text-lg" /> : <MoonOutlined className="text-lg" />}
                </button>

                <Disclosure.Button
                  className={clsx(
                    theme === 'dark'
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    'p-2 rounded-lg transition-all duration-200'
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