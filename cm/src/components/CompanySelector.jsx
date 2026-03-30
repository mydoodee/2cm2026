import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Spin } from 'antd';
import { BankOutlined, ProjectOutlined, TeamOutlined, PlusOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import api from '../axiosConfig';

const { Title, Text } = Typography;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3050';

function CompanySelector({ companies, user, setActiveCompany, theme }) {
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compList, setCompList] = useState(companies || []);
  const [fetching, setFetching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!companies || companies.length === 0) {
      const loadCompanies = async () => {
        setFetching(true);
        try {
          const res = await api.get('/api/companies');
          if (res.data?.companies) {
            setCompList(res.data.companies);
            localStorage.setItem('pendingCompanies', JSON.stringify(res.data.companies));
          }
        } catch (e) {
          console.error('Failed to fetch companies for selector', e);
        } finally {
          setFetching(false);
        }
      };
      loadCompanies();
    } else {
      setCompList(companies);
    }
  }, [companies]);

  const handleSelectCompany = async (company) => {
    setSelectedId(company.company_id);
    setLoading(true);

    // บันทึกบริษัทที่เลือก
    localStorage.setItem('activeCompanyId', company.company_id);
    localStorage.setItem('activeCompany', JSON.stringify(company));

    setActiveCompany(company);

    // นิดนึงให้ animation จบ
    setTimeout(() => {
      navigate('/projects');
    }, 400);
  };

  return (
    <div className={clsx(
      'min-h-screen flex items-center justify-center p-4 sm:p-6',
      theme === 'dark' ? 'bg-[#020617]' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    )}>
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className={clsx(
            'inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5',
            theme === 'dark' 
              ? 'bg-indigo-500/10 border border-indigo-500/20' 
              : 'bg-indigo-50 border border-indigo-100 shadow-lg shadow-indigo-500/10'
          )}>
            <BankOutlined className={clsx(
              'text-3xl',
              theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
            )} />
          </div>
          <Title level={2} className={clsx(
            '!mb-2 !text-2xl sm:!text-3xl font-bold',
            theme === 'dark' ? '!text-white' : '!text-gray-900'
          )}>
            เลือกบริษัท
          </Title>
          <Text className={clsx(
            'text-base',
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )}>
            สวัสดี {user?.first_name || user?.username}, กรุณาเลือกบริษัทที่ต้องการเข้าใช้งาน
          </Text>
        </div>

        {/* Company Cards */}
        {fetching ? (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" />
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-5">
            {compList.map((company, index) => (
              <button
              key={company.company_id}
              onClick={() => handleSelectCompany(company)}
              disabled={loading}
              className={clsx(
                'group relative p-6 rounded-2xl text-left transition-all duration-500 border-2',
                'w-full sm:w-[calc(50%-10px)] max-w-full sm:max-w-none',
                'hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]',
                selectedId === company.company_id
                  ? theme === 'dark'
                    ? 'bg-indigo-500/20 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.3)]'
                    : 'bg-indigo-50 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.15)]'
                  : theme === 'dark'
                    ? 'bg-slate-800/60 border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/80'
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xl',
                loading && selectedId !== company.company_id ? 'opacity-50 pointer-events-none' : ''
              )}
              style={{ 
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.5s ease-out both'
              }}
            >
              {/* Logo + Name */}
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden border-2 transition-all duration-300"
                  style={{ 
                    borderColor: company.company_color || '#dc2626',
                    backgroundColor: (company.company_color || '#dc2626') + '15'
                  }}
                >
                  {company.company_logo ? (
                    <img 
                      src={`${API_BASE_URL}/${company.company_logo}`}
                      alt={company.company_name}
                      className="w-full h-full object-contain p-1.5"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={clsx(
                    'items-center justify-center text-xl font-bold',
                    company.company_logo ? 'hidden' : 'flex'
                  )} style={{ color: company.company_color || '#dc2626' }}>
                    {company.company_name?.charAt(0) || 'C'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={clsx(
                    'font-bold text-lg truncate',
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  )}>
                    {company.company_name}
                  </h3>
                  <p className={clsx(
                    'text-sm truncate',
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    {company.company_subtitle || 'บริหารโครงการก่อสร้าง'}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <ProjectOutlined className={clsx(
                    'text-sm',
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                  )} />
                  <span className={clsx(
                    'text-sm font-medium',
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  )}>
                    {company.project_count || 0} โครงการ
                  </span>
                </div>
                {company.user_role && (
                  <div className={clsx(
                    'px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize',
                    company.user_role === 'owner'
                      ? 'bg-amber-100 text-amber-700'
                      : company.user_role === 'admin'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600'
                  )}>
                    {company.user_role === 'owner' ? 'เจ้าของ' : company.user_role === 'admin' ? 'ผู้ดูแล' : 'สมาชิก'}
                  </div>
                )}
              </div>

              {/* Loading overlay */}
              {selectedId === company.company_id && loading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20 backdrop-blur-sm">
                  <Spin size="large" />
                </div>
              )}

              {/* Selected checkmark */}
              {selectedId === company.company_id && (
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
        )}

        {/* Footer hint */}
        <div className="text-center mt-8">
          <Text className={clsx(
            'text-xs',
            theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
          )}>
            คุณสามารถสลับบริษัทได้ตลอดเวลาจากเมนูด้านบน
          </Text>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
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
      `}</style>
    </div>
  );
}

CompanySelector.propTypes = {
  companies: PropTypes.array.isRequired,
  user: PropTypes.object,
  setActiveCompany: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
};

export default CompanySelector;
