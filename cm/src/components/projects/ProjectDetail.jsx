//components/projects/ProjectDetail.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Title as ChartTitle, Tooltip, Legend, Filler, BarElement } from 'chart.js';
import moment from 'moment';
import axios from 'axios';

import Navbar from '../Navbar';
import ProjectInfoCard from './cards/ProjectInfoCard';
import ProgressSummaryCard from './cards/ProgressSummaryCard';
import PaymentCard from './cards/PaymentCard';
import JobStatusCard from './cards/JobStatusCard';
import PhaseCard from './cards/PhaseCard';
import StatsCards from './cards/StatsCards';
import WeatherCard from './cards/WeatherCard';
import SCurveChart from './cards/SCurveChart';
import TeamMembersCard from './cards/TeamMembersCard';
import './ProjectDetail.css';

moment.locale('th');
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, ChartTitle, Tooltip, Legend, Filler, BarElement);

const ProjectDetail = ({ user, setUser }) => {
  const [theme, setTheme] = useState('light');
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState({
    general: false,
    progress_summary: false,
    payment: false,
    design: false,
    pre_construction: false,
    construction: false,
    cm: false,
    precast: false,
    bidding: false,
  });
  const [imageLoading, setImageLoading] = useState({
    general: true,
    progress_summary: true,
    payment: true,
    design: true,
    pre_construction: true,
    construction: true,
    cm: true,
    precast: true,
    bidding: true,
  });
  const [progressHistory, setProgressHistory] = useState([]);
  const [selectedProgressInstallment, setSelectedProgressInstallment] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [selectedPaymentInstallment, setSelectedPaymentInstallment] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [scurveActual, setScurveActual] = useState(null);
  const navigate = useNavigate();
  const { id } = useParams();

  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return '/images/fallback.jpg';
    }
    const baseUrl = import.meta.env.VITE_IMAGE_BASE_URL || 'https://app.spkconstruction.co.th/cm-api';
    const path = imagePath.startsWith('Uploads/') ? imagePath : `Uploads/${imagePath}`;
    return `${baseUrl}/${path}`;
  };

  const calculateProgressFromProject = (projectData) => {
    if (!projectData.start_date || !projectData.end_date) return null;

    const today = moment().startOf('day');
    const startDate = moment(projectData.start_date).startOf('day');
    const endDate = moment(projectData.end_date).startOf('day');
    const totalDays = endDate.diff(startDate, 'days') + 1;

    let daysWorked, remainingDays, plannedProgress;

    if (today.isBefore(startDate)) {
      daysWorked = 0;
      remainingDays = totalDays;
      plannedProgress = 0;
    } else if (today.isAfter(endDate)) {
      daysWorked = totalDays;
      remainingDays = 0;
      plannedProgress = 100;
    } else {
      daysWorked = today.diff(startDate, 'days') + 1;
      remainingDays = endDate.diff(today, 'days');
      plannedProgress = totalDays > 0 ? (daysWorked / totalDays) * 100 : 0;
    }

    const actualProgress = projectData.actual_progress || projectData.progress || 0;
    const progressDifference = actualProgress - plannedProgress;
    const progressAhead = progressDifference > 0 ? progressDifference : 0;
    const progressBehind = progressDifference < 0 ? Math.abs(progressDifference) : 0;

    return {
      summary_date: today.format('YYYY-MM-DD'),
      contract_start_date: startDate.format('YYYY-MM-DD'),
      contract_end_date: endDate.format('YYYY-MM-DD'),
      total_contract_days: totalDays,
      days_worked: daysWorked,
      remaining_days: remainingDays,
      planned_progress: parseFloat(plannedProgress.toFixed(2)),
      actual_progress: parseFloat(actualProgress),
      progress_ahead: parseFloat(progressAhead.toFixed(2)),
      progress_behind: parseFloat(progressBehind.toFixed(2)),
      installment: 1,
    };
  };

  const fetchWeatherData = async (address) => {
    if (!address) return;
    setWeatherLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const weatherResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/weather?address=${encodeURIComponent(address)}&projectId=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const weatherData = weatherResponse.data;
      setWeather({
        temp: weatherData.temp,
        feelsLike: weatherData.feelsLike,
        humidity: weatherData.humidity,
        description: weatherData.description,
        icon: weatherData.icon,
        rain: weatherData.rain,
        sunrise: weatherData.sunrise,
        sunset: weatherData.sunset,
        windSpeed: weatherData.windSpeed,
      });
    } catch (error) {
      console.error('Weather fetch error:', error);
      setWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  const canViewProgress = () => {
    if (!user || !project) return false;
    if (user.isAdmin) return true;
    if (project.current_user_role?.role_name === 'Project Manager') return true;
    return false;
  };

  useEffect(() => {
    const source = axios.CancelToken.source();

    const fetchProjectDetails = async () => {
      if (!id || id === 'undefined') {
        message.error('ไม่พบรหัสโครงการ กรุณาลองใหม่');
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        setImageLoading({
          general: true,
          progress_summary: true,
          payment: true,
          design: true,
          pre_construction: true,
          construction: true,
          cm: true,
          precast: true,
          bidding: true,
        });

        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const projectResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/project/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cancelToken: source.token,
        });

        console.log('📦 Project Response:', projectResponse.data);

        // ✅ แก้ไขส่วน Payment - ใช้ API ใหม่
        let paymentData = null;
        let detailedPaymentHistory = [];

        try {
          console.log('📥 Fetching payment data...');

          // ดึงข้อมูลการชำระล่าสุด
          const paymentResponse = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/project/${id}/payment`,
            {
              headers: { Authorization: `Bearer ${token}` },
              cancelToken: source.token,
            }
          );

          console.log('💰 Payment Response:', paymentResponse.data);
          paymentData = paymentResponse.data.data || null;

          // ✅ ดึงข้อมูลประวัติการชำระแบบละเอียด
          try {
            console.log('📥 Fetching detailed payment history...');

            const detailedResponse = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/project/${id}/payment-detailed`,
              {
                headers: { Authorization: `Bearer ${token}` },
                cancelToken: source.token,
              }
            );

            console.log('📊 Detailed Payment Response:', detailedResponse.data);
            detailedPaymentHistory = detailedResponse.data.data || [];

            // ตั้งค่าให้เลือกงวดล่าสุดที่มีข้อมูล
            if (detailedPaymentHistory.length > 0) {
              setPaymentHistory(detailedPaymentHistory);

              const latestSubmitted = detailedPaymentHistory
                .filter(p => p.submitted || p.payment_status === 'paid')
                .sort((a, b) => b.installment - a.installment)[0];

              if (latestSubmitted) {
                console.log('✅ Selected latest submitted installment:', latestSubmitted.installment);
                setSelectedPaymentInstallment(latestSubmitted.installment);
              } else {
                console.log('✅ Selected first installment:', detailedPaymentHistory[0].installment);
                setSelectedPaymentInstallment(detailedPaymentHistory[0].installment);
              }
            }
          } catch (detailedError) {
            console.warn('⚠️ Detailed payment API error:', detailedError.response?.status);

            // Fallback: ถ้า API ใหม่ยังไม่พร้อม
            if (paymentData && paymentData.total_installments > 0) {
              console.log('🔄 Using fallback method for payment history');

              const totalInst = Number(paymentData.total_installments) || 0;
              const totalAmount = Number(paymentData.total_amount) || 0;

              // ดึงข้อมูลทุก payment record
              try {
                const allPaymentsResponse = await axios.get(
                  `${import.meta.env.VITE_API_URL}/api/project/${id}/payment-history`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                    cancelToken: source.token,
                  }
                );
                const allPayments = allPaymentsResponse.data.data || [];

                // สร้าง map ของข้อมูลการชำระแต่ละงวด
                const paymentMap = new Map();
                allPayments.forEach(p => {
                  paymentMap.set(p.current_installment, p);
                });

                // สร้างข้อมูลทุกงวดพร้อมคำนวณยอดสะสม
                let cumulativeAmount = 0;
                const fallbackHistory = [];

                for (let i = 1; i <= totalInst; i++) {
                  const payment = paymentMap.get(i);
                  if (payment) {
                    const installmentAmount = Number(payment.current_installment_amount);
                    cumulativeAmount += installmentAmount;
                    fallbackHistory.push({
                      installment: i,
                      date: payment.payment_date,
                      submitted: payment.payment_status === 'paid',
                      payment_id: payment.payment_id,
                      current_installment_amount: installmentAmount,
                      submitted_amount: Number(payment.submitted_amount),
                      cumulative_submitted_amount: cumulativeAmount,
                      total_installments: payment.total_installments,
                      total_amount: Number(payment.total_amount),
                      submitted_installments: i,
                      payment_status: payment.payment_status || 'pending'
                    });
                  } else {
                    fallbackHistory.push({
                      installment: i,
                      date: null,
                      submitted: false,
                      current_installment_amount: 0,
                      submitted_amount: cumulativeAmount,
                      cumulative_submitted_amount: cumulativeAmount,
                      total_installments: totalInst,
                      total_amount: totalAmount,
                      submitted_installments: i - 1,
                      payment_status: 'pending'
                    });
                  }
                }

                detailedPaymentHistory = fallbackHistory;
                setPaymentHistory(fallbackHistory);

                // เลือกงวดล่าสุดที่ชำระแล้ว
                const latestSubmitted = fallbackHistory
                  .filter(p => p.submitted)
                  .sort((a, b) => b.installment - a.installment)[0];

                if (latestSubmitted) {
                  setSelectedPaymentInstallment(latestSubmitted.installment);
                } else if (fallbackHistory.length > 0) {
                  setSelectedPaymentInstallment(fallbackHistory[0].installment);
                }
              } catch (fallbackError) {
                console.error('❌ Fallback payment history error:', fallbackError);
              }
            }
          }
        } catch (error) {
          if (error.response?.status === 404) {
            console.warn('⚠️ No payment data found (404)');
          } else if (error.response?.status !== 403) {
            console.error('❌ Payment fetch error:', error);
          }
        }

        // ส่วน Progress Data
        let progressData = null;
        try {
          const progressResponse = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/project/${id}/progress-history`,
            {
              headers: { Authorization: `Bearer ${token}` },
              cancelToken: source.token,
            }
          );
          const progressArray = Array.isArray(progressResponse.data.data) ? progressResponse.data.data : [];

          if (progressArray.length > 0) {
            const correctedProgress = progressArray.map(prog => {
              const startDate = moment(projectResponse.data.project.start_date);
              const endDate = moment(projectResponse.data.project.end_date);
              const summaryDate = moment(prog.summary_date);

              const totalDays = endDate.diff(startDate, 'days') + 1;
              const daysWorked = summaryDate.diff(startDate, 'days') + 1;
              const remainingDays = endDate.diff(summaryDate, 'days');

              return {
                ...prog,
                contract_start_date: projectResponse.data.project.start_date,
                contract_end_date: projectResponse.data.project.end_date,
                total_contract_days: totalDays,
                days_worked: Math.max(0, daysWorked),
                remaining_days: remainingDays,
                planned_progress: Number(prog.planned_progress) || 0,
                actual_progress: Number(prog.actual_progress) || 0,
                progress_ahead: Number(prog.progress_ahead) || 0,
                progress_behind: Number(prog.progress_behind) || 0,
              };
            });

            const sortedProgress = correctedProgress.sort((a, b) => {
              const dateA = new Date(a.summary_date);
              const dateB = new Date(b.summary_date);
              return dateB - dateA || b.installment - a.installment;
            });

            setProgressHistory(sortedProgress);
            setSelectedProgressInstallment(sortedProgress[0].installment);
            progressData = sortedProgress[0];
          }
        } catch (error) {
          if (error.response?.status === 404) {
            console.warn('No progress history found');
          } else if (error.response?.status !== 403) {
            console.error('Progress fetch error:', error);
          }
        }

        if (!progressData) {
          progressData = calculateProgressFromProject(projectResponse.data.project);
          if (progressData) {
            setProgressHistory([progressData]);
            setSelectedProgressInstallment(1);
          }
        }

        const projectData = {
          ...projectResponse.data.project,
          image: getImageUrl(projectResponse.data.project.image),
          current_user_role: projectResponse.data.data?.current_user_role || projectResponse.data.project?.current_user_role,
          progress_summary_image: getImageUrl(projectResponse.data.project.progress_summary_image),
          payment_image: getImageUrl(projectResponse.data.project.payment_image || 'payment/default.jpg'),
          design_image: getImageUrl(projectResponse.data.project.design_image),
          pre_construction_image: getImageUrl(projectResponse.data.project.pre_construction_image),
          construction_image: getImageUrl(projectResponse.data.project.construction_image),
          cm_image: getImageUrl(projectResponse.data.project.cm_image),
          precast_image: getImageUrl(projectResponse.data.project.precast_image),
          bidding_image: getImageUrl(projectResponse.data.project.bidding_image),
          job_status_image: getImageUrl(projectResponse.data.project.job_status_image),

          phases: [
            {
              name: "Bidding",
              displayName: "ประมูล",
              progress: projectResponse.data.project.bidding_progress || 0,
              color: "#eb2f96",
              path: `/project/${id}/bidding`,
              image_field: "bidding_image",
              visible: !!projectResponse.data.project.show_bidding
            },
            {
              name: "Design",
              displayName: "ออกแบบ",
              progress: projectResponse.data.project.design_progress || 0,
              color: "#52c41a",
              path: `/project/${id}/design`,
              image_field: "design_image",
              visible: !!projectResponse.data.project.show_design
            },
            {
              name: "PreConstruction",
              displayName: "เตรียมงาน",
              progress: projectResponse.data.project.pre_construction_progress || 0,
              color: "#1890ff",
              path: `/project/${id}/pre-construction`,
              image_field: "pre_construction_image",
              visible: !!projectResponse.data.project.show_pre_construction
            },
            {
              name: "Construction",
              displayName: "ก่อสร้าง",
              progress: projectResponse.data.project.construction_progress || 0,
              color: "#faad14",
              path: `/project/${id}/construction`,
              image_field: "construction_image",
              visible: !!projectResponse.data.project.show_construction
            },
            {
              name: "Precast",
              displayName: "พรีคาสท์",
              progress: projectResponse.data.project.precast_progress || 0,
              color: "#722ed1",
              path: `/project/${id}/precast`,
              image_field: "precast_image",
              visible: !!projectResponse.data.project.show_precast
            },
            {
              name: "Construction Management",
              displayName: "บริหารก่อสร้าง",
              progress: projectResponse.data.project.cm_progress || 0,
              color: "#f5222d",
              path: `/project/${id}/construction-management`,
              image_field: "cm_image",
              visible: !!projectResponse.data.project.show_cm
            },
          ],

          dailyStats: {
            workers: 10,
            machinery: 12,
            completedTasks: 8,
            pendingTasks: 15,
          },
          sCurveData: [
            { date: "Jan 24", plan: 0, actual: 0 },
            { date: "Feb 24", plan: 5, actual: 3 },
            { date: "Mar 24", plan: 15, actual: 10 },
            { date: "Apr 24", plan: 30, actual: 25 },
            { date: "May 24", plan: 45, actual: 40 },
            { date: "Jun 24", plan: 55, actual: 50 },
            { date: "Jul 24", plan: 65, actual: 65 },
            { date: "Aug 24", plan: 75, actual: 70 },
            { date: "Sep 24", plan: 85, actual: 80 },
            { date: "Oct 24", plan: 90, actual: 85 },
            { date: "Nov 24", plan: 95, actual: 90 },
            { date: "Dec 24", plan: 100, actual: 95 },
          ],
          progress_summary: progressData ? {
            summary_date: progressData.summary_date,
            contract_start_date: progressData.contract_start_date,
            contract_end_date: progressData.contract_end_date,
            total_contract_days: Number(progressData.total_contract_days),
            days_worked: Number(progressData.days_worked),
            remaining_days: Number(progressData.remaining_days),
            planned_progress: Number(progressData.planned_progress),
            actual_progress: Number(progressData.actual_progress),
            progress_ahead: Number(progressData.progress_ahead || 0),
            progress_behind: Number(progressData.progress_behind || 0),
            installment: Number(progressData.installment),
          } : null,
          payment: paymentData || null,
          team_members: projectResponse.data.project.team_members || [],
        };

        console.log('✅ Final Project Data:', {
          payment: projectData.payment,
          paymentHistoryLength: detailedPaymentHistory.length
        });

        setProject(projectData);
        if (projectData.address) fetchWeatherData(projectData.address);
        setLoading(false);
      } catch (error) {
        if (axios.isCancel(error)) return;

        console.error('Fetch error:', error);
        setLoading(false);
        setImageLoading(prev => ({
          ...prev,
          general: false,
          progress_summary: false,
          payment: false,
          design: false,
          pre_construction: false,
          construction: false,
          cm: false,
          precast: false,
          bidding: false
        }));

        if (error.code === 'ERR_NETWORK') {
          message.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อเครือข่าย');
        } else if (error.response?.status === 404) {
          message.error('ไม่พบโครงการที่ระบุ');
          setTimeout(() => navigate('/'), 2000);
        } else if (error.response?.status === 401 || error.response?.status === 403) {
          message.error('คุณไม่มีสิทธิ์เข้าถึงโครงการนี้');
          setTimeout(() => navigate('/'), 2000);
        } else {
          message.error(error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลโครงการ กรุณาลองใหม่');
        }
      }
    };

    fetchProjectDetails();

    return () => source.cancel('Component unmounted');
  }, [id, navigate]);

  // ✅ Debug Payment Data
  useEffect(() => {
    console.log('📊 Payment State Changed:', {
      'project.payment': project?.payment,
      'paymentHistory length': paymentHistory.length,
      'selectedPaymentInstallment': selectedPaymentInstallment,
      'paymentHistory': paymentHistory
    });
  }, [project?.payment, paymentHistory, selectedPaymentInstallment]);

  const handleRetry = (category) => () => {
    setImageErrors(prev => ({ ...prev, [category]: false }));
    setImageLoading(prev => ({ ...prev, [category]: true }));
    setProject(prev => ({
      ...prev,
      [category === 'general' ? 'image' : `${category}_image`]: getImageUrl(prev[category === 'general' ? 'image' : `${category}_image`]),
    }));
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'In Progress': return 'blue';
      case 'Completed': return 'green';
      case 'Planning': return 'default';
      default: return 'default';
    }
  };

  const selectedProgress = useMemo(() => {
    return progressHistory.find(p => p.installment === selectedProgressInstallment) || null;
  }, [progressHistory, selectedProgressInstallment]);

  const selectedPayment = useMemo(() => {
    const found = paymentHistory.find(p => p.installment === selectedPaymentInstallment);
    console.log('🔍 Computing selectedPayment:', {
      selectedPaymentInstallment,
      paymentHistoryLength: paymentHistory.length,
      found: found || null
    });
    return found || null;
  }, [paymentHistory, selectedPaymentInstallment]);

  if (loading) {
    return (
      <div className={`h-screen w-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} flex items-center justify-center`}>
        <Spin size="large" />
      </div>
    );
  }

  if (!project) return null;

  // ✅ Prioritize S-Curve Actual progress for the dashboard circles
  const actualProgress = scurveActual !== null 
    ? scurveActual 
    : (selectedProgress ? Number(selectedProgress.actual_progress) || 0 : 0);

  return (
    <div className={`h-screen w-full ${theme === 'dark' ? 'dark bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} transition-all duration-300 font-kanit overflow-auto`}>
      <Navbar user={user} setUser={setUser} theme={theme} setTheme={setTheme} />
      <div className="w-full px-4 py-6">
        {/* Top Cards Grid - Dynamic Layout */}
        <div className={`grid grid-cols-1 gap-6 mb-6 ${
          (() => {
            const activeCards = [
              true, // ProjectInfoCard
              project.show_progress_summary !== false,
              project.show_payment !== false,
              project.show_job_status !== false
            ].filter(Boolean).length;
            
            if (activeCards >= 4) return 'lg:grid-cols-4';
            if (activeCards === 3) return 'lg:grid-cols-3';
            if (activeCards === 2) return 'lg:grid-cols-2';
            return 'lg:grid-cols-1';
          })()
        }`}>
          <ProjectInfoCard
            project={project}
            actualProgress={actualProgress}
            imageLoading={imageLoading}
            imageErrors={imageErrors}
            setImageLoading={setImageLoading}
            setImageErrors={setImageErrors}
            handleRetry={handleRetry}
            getStatusColor={getStatusColor}
            canViewProgress={canViewProgress}
            user={user}
          />

          {project.show_progress_summary !== false && (
            <ProgressSummaryCard
              project={project}
              progressSummary={selectedProgress}
              progressHistory={progressHistory}
              selectedProgressInstallment={selectedProgressInstallment}
              setSelectedProgressInstallment={setSelectedProgressInstallment}
              actualProgress={actualProgress}
              imageLoading={imageLoading}
              imageErrors={imageErrors}
              setImageLoading={setImageLoading}
              setImageErrors={setImageErrors}
              user={user}
              projectId={id}
            />
          )}

          {project.show_payment !== false && (
            <PaymentCard
              project={project}
              selectedPayment={selectedPayment}
              paymentHistory={paymentHistory}
              selectedPaymentInstallment={selectedPaymentInstallment}
              setSelectedPaymentInstallment={setSelectedPaymentInstallment}
              imageLoading={imageLoading}
              imageErrors={imageErrors}
              setImageLoading={setImageLoading}
              setImageErrors={setImageErrors}
              paymentData={project.payment}
              actualProgress={actualProgress}
            />
          )}

          {project.show_job_status !== false && (
            <JobStatusCard
              project={project}
              imageLoading={imageLoading}
              imageErrors={imageErrors}
              setImageLoading={setImageLoading}
              setImageErrors={setImageErrors}
            />
          )}
        </div>

        {/* Phase Cards Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-xl font-bold">ขั้นตอนการดำเนินงาน</div>
        </div>

        {/* Phase Cards - Improved Responsive Layout */}
        <div className="flex flex-wrap gap-6 mb-6">
          {project.phases
            .filter(phase => phase.visible !== false)
            .map((phase, index) => (
              <div
                key={index}
                className="flex-grow flex-shrink-0"
                style={{ flexBasis: 'calc(20% - 24px)', minWidth: '240px' }}
              >
                <PhaseCard
                  phase={phase}
                  project={project}
                  imageLoading={imageLoading}
                  imageErrors={imageErrors}
                  setImageLoading={setImageLoading}
                  setImageErrors={setImageErrors}
                />
              </div>
            ))
          }
        </div>

        {/* S-Curve Chart */}
        <div className="mb-6">
          <SCurveChart 
            projectId={id} 
            onActualProgressChange={(val) => setScurveActual(val)} 
          />
        </div>

        {/* Daily Stats and Weather */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <WeatherCard weather={weather} weatherLoading={weatherLoading} address={project.address} />
          <StatsCards dailyStats={project.dailyStats} />
        </div>

        {/* Team Members */}
        <TeamMembersCard teamMembers={project.team_members} />
      </div>
    </div>
  );
};

export default ProjectDetail;