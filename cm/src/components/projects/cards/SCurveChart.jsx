import { useState, useEffect, useMemo } from 'react';
import api from '../../../axiosConfig';
import { Card, Spin, Empty, Row, Col, message, List, Collapse, Modal, Tag, Image, Divider, Space, Timeline, Button } from 'antd';
import { BarChartOutlined, DownOutlined, RightOutlined, HistoryOutlined, UserOutlined, MessageOutlined, CameraOutlined, LinkOutlined, CalendarOutlined } from '@ant-design/icons';
import { Line } from 'react-chartjs-2';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
dayjs.locale('th');

const SCurveChart = ({ projectId, onActualProgressChange }) => {
  const [loading, setLoading] = useState(true);
  const [rootCategories, setRootCategories] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [selectedRootId, setSelectedRootId] = useState(null);
  const [allCategoriesData, setAllCategoriesData] = useState([]);
  const [projectInfo, setProjectInfo] = useState(null);
  const [expandedRoots, setExpandedRoots] = useState(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [selectedSubtypeId, setSelectedSubtypeId] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [selectedPointDate, setSelectedPointDate] = useState(null);

  const copyExcelLink = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3050';
    // Use the public route for easier Excel connection (no JWT required)
    const link = `${API_URL}/api/public/project/${projectId}/scurve/excel`;
    
    navigator.clipboard.writeText(link);

    message.success({
      content: 'คัดลอกลิงก์รายการ (Excel) เรียบร้อยแล้ว!',
      style: { fontFamily: 'Kanit, sans-serif' }
    });
  };

  const copyGraphLink = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3050';
    const link = `${API_URL}/api/public/project/${projectId}/scurve/excel-summary`;
    
    navigator.clipboard.writeText(link);

    message.success({
      content: 'คัดลอกลิงก์กราฟ S-Curve (Excel) เรียบร้อยแล้ว!',
      style: { fontFamily: 'Kanit, sans-serif' }
    });
  };

  const copyGanttLink = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3050';
    const link = `${API_URL}/api/public/project/${projectId}/scurve/excel-timephased`;
    
    navigator.clipboard.writeText(link);

    message.success({
      content: 'คัดลอกลิงก์ข้อมูล Gantt (Excel) เรียบร้อยแล้ว!',
      style: { fontFamily: 'Kanit, sans-serif' }
    });
  };

  // Memoized filtered history for the timeline
  const filteredHistory = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];

    let filtered = historyData;

    if (selectedSubtypeId) {
      filtered = historyData.filter(h => h.subtype_id === selectedSubtypeId);
    } else if (selectedTypeId) {
      filtered = historyData.filter(h => h.type_id === selectedTypeId);
    } else if (selectedCategoryId) {
      filtered = historyData.filter(h => h.category_id === selectedCategoryId);
    } else {
      // If nothing specific is selected, we don't show the full project history in the timeline 
      // as it might be too long, but let's show anyway or only when filtered
      return [];
    }

    // Sort by date descending
    return [...filtered].sort((a, b) => new Date(b.update_date) - new Date(a.update_date));
  }, [historyData, selectedCategoryId, selectedTypeId, selectedSubtypeId]);

  const getWeekOfMonth = (date) => {
    const d = new Date(date);
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    const weekNumber = Math.ceil((d.getDate() + firstDay.getDay()) / 7);
    return weekNumber;
  };

  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const yearShort = (date.getFullYear() + 543).toString().slice(-2);
    const day = date.getDate();
    // Map day to week number: 1-7=W1, 8-14=W2, 15-21=W3, 22+=W4
    const weekNum = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4;
    return `${months[date.getMonth()]} ${yearShort} W${weekNum}`;
  };

  const daysBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
  };

  const addDays = (dateStr, days) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  // Fetch all data for the S-Curve chart
  useEffect(() => {
    const fetchAllChartData = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1. Fetch project info
        const projectResponse = await api.get(`/api/project/${projectId}`);
        // ✅ API returns { project: {...}, success: true } — extract the project object
        setProjectInfo(projectResponse.data.project || projectResponse.data);

        // 2. Fetch all S-Curve chart data (including roots, categories, types, and history)
        const response = await api.get(`/api/project/${projectId}/scurve/chart-data`);

        const result = response.data;
        const roots = result.data || [];
        const history = result.history || [];

        const activeRoots = roots.filter(r => r.is_active !== 0);
        setRootCategories(activeRoots);
        setHistoryData(history);

        // Extract all categories from all roots
        const allCategories = [];
        activeRoots.forEach(root => {
          if (root.categories) {
            root.categories.forEach(cat => {
              allCategories.push({ ...cat, root_id: root.root_id });
            });
          }
        });

        setAllCategoriesData(allCategories);

        if (allCategories.length > 0) {
          const generatedData = generateSCurveData(allCategories, activeRoots, history, null);
          setChartData(generatedData);
        } else {
          setChartData(null);
        }
      } catch (error) {
        console.error('Error fetching S-Curve data:', error);
        message.error('ไม่สามารถดึงข้อมูล S-Curve ได้: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllChartData();
  }, [projectId]);

  // ✅ New effect to report overall actual progress back to parent
  useEffect(() => {
    if (onActualProgressChange && chartData && chartData.datasets?.[1]?.data) {
      const actualData = chartData.datasets[1].data;
      // Get the last non-null value
      const latestActual = [...actualData].reverse().find(v => v !== null && v !== undefined);
      if (latestActual !== undefined) {
        onActualProgressChange(latestActual.toFixed(2));
      }
    }
  }, [chartData, onActualProgressChange]);



  // Handle root selection
  const handleRootClick = (rootId) => {
    // Toggle expansion
    const newExpanded = new Set(expandedRoots);
    if (newExpanded.has(rootId)) {
      newExpanded.delete(rootId);
    } else {
      newExpanded.add(rootId);
    }
    setExpandedRoots(newExpanded);
  };

  // Handle category selection
  const handleCategoryClick = (e, categoryId, rootId) => {
    e.stopPropagation(); // Prevent triggering root click

    if (selectedCategoryId === categoryId) {
      // Deselect - show all for this root
      setSelectedCategoryId(null);
      setSelectedTypeId(null);
      setSelectedSubtypeId(null);
      setSelectedRootId(rootId);
      const filteredCategories = allCategoriesData.filter(cat => cat.root_id === rootId);
      const selectedRoot = rootCategories.find(r => r.root_id === rootId);
      const generatedData = generateSCurveData(filteredCategories, [selectedRoot], historyData, rootId);
      setChartData(generatedData);
    } else {
      // Select specific category
      setSelectedCategoryId(categoryId);
      setSelectedTypeId(null);
      setSelectedSubtypeId(null);
      setSelectedRootId(rootId);
      const filteredCategories = allCategoriesData.filter(cat => cat.category_id === categoryId);
      const selectedRoot = rootCategories.find(r => r.root_id === rootId);
      const generatedData = generateSCurveData(filteredCategories, [selectedRoot], historyData, rootId);
      setChartData(generatedData);
    }
  };

  // Handle type selection
  const handleTypeClick = (e, typeId, categoryId, rootId) => {
    e.stopPropagation();

    if (selectedTypeId === typeId) {
      // Revert to category view
      setSelectedTypeId(null);
      setSelectedSubtypeId(null);
      const filteredCategories = allCategoriesData.filter(cat => cat.category_id === categoryId);
      const selectedRoot = rootCategories.find(r => r.root_id === rootId);
      const generatedData = generateSCurveData(filteredCategories, [selectedRoot], historyData, rootId);
      setChartData(generatedData);
    } else {
      setSelectedTypeId(typeId);
      setSelectedSubtypeId(null);
      const filteredCategories = allCategoriesData.filter(cat => cat.category_id === categoryId);
      const selectedRoot = rootCategories.find(r => r.root_id === rootId);
      const generatedData = generateSCurveData(filteredCategories, [selectedRoot], historyData, rootId, typeId);
      setChartData(generatedData);
    }
  };

  // Handle subtype selection
  const handleSubtypeClick = (e, subtypeId, typeId, categoryId, rootId) => {
    e.stopPropagation();

    if (selectedSubtypeId === subtypeId) {
      // Revert to type view
      setSelectedSubtypeId(null);
      const filteredCategories = allCategoriesData.filter(cat => cat.category_id === categoryId);
      const selectedRoot = rootCategories.find(r => r.root_id === rootId);
      const generatedData = generateSCurveData(filteredCategories, [selectedRoot], historyData, rootId, typeId);
      setChartData(generatedData);
    } else {
      setSelectedSubtypeId(subtypeId);
      const filteredCategories = allCategoriesData.filter(cat => cat.category_id === categoryId);
      const selectedRoot = rootCategories.find(r => r.root_id === rootId);
      const generatedData = generateSCurveData(filteredCategories, [selectedRoot], historyData, rootId, typeId, subtypeId);
      setChartData(generatedData);
    }
  };

  // Handle show all
  const handleShowAll = () => {
    setSelectedRootId(null);
    setSelectedCategoryId(null);
    setSelectedTypeId(null);
    setSelectedSubtypeId(null);
    const generatedData = generateSCurveData(allCategoriesData, rootCategories, historyData, null);
    setChartData(generatedData);
  };

  const generateSCurveData = (categories, roots, history, filterRootId = null, filterTypeId = null, filterSubtypeId = null) => {
    if (!categories || categories.length === 0) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    let minDate = null;
    let maxDate = null;

    // ✅ Find absolute min/max dates across all project layers
    if (projectInfo && projectInfo.start_date && projectInfo.end_date) {
      minDate = projectInfo.start_date.split('T')[0];
      maxDate = projectInfo.end_date.split('T')[0];
    }

    const relevantRoots = filterRootId ? roots.filter(r => r.root_id === filterRootId) : roots;
    relevantRoots.forEach(root => {
      const s = root.start_date?.split('T')[0];
      const e = root.end_date?.split('T')[0];
      if (s && (!minDate || s < minDate)) minDate = s;
      if (e && (!maxDate || e > maxDate)) maxDate = e;
    });

    categories.forEach(category => {
      const s = category.start_date?.split('T')[0];
      const e = category.end_date?.split('T')[0];
      if (s && (!minDate || s < minDate)) minDate = s;
      if (e && (!maxDate || e > maxDate)) maxDate = e;

      (category.types || []).forEach(type => {
        // Apply filter if specified
        if (filterTypeId && type.type_id !== filterTypeId) return;

        const ts = type.start_date?.split('T')[0];
        const te = type.end_date?.split('T')[0];
        if (ts && (!minDate || ts < minDate)) minDate = ts;
        if (te && (!maxDate || te > maxDate)) maxDate = te;

        (type.subtypes || []).forEach(sub => {
          // Apply filter if specified
          if (filterSubtypeId && sub.subtype_id !== filterSubtypeId) return;

          const ss = sub.start_date?.split('T')[0];
          const se = sub.end_date?.split('T')[0];
          if (ss && (!minDate || ss < minDate)) minDate = ss;
          if (se && (!maxDate || se > maxDate)) maxDate = se;
        });
      });
    });

    if (!minDate || !maxDate) return null;

    // 📅 Extend maxDate if actual progress goes beyond plan
    const historyDates = history.map(h => h.record_date?.split('T')[0]).filter(Boolean);
    const latestHistoryDate = historyDates.length > 0 ? historyDates.sort().reverse()[0] : null;
    if (latestHistoryDate && latestHistoryDate > maxDate) maxDate = latestHistoryDate;
    if (todayStr > maxDate) maxDate = todayStr;

    // ✅ Generate 4 data points per month (week 1,2,3,4 of each month)
    const allDates = new Set();
    const startD = new Date(minDate);
    const endD = new Date(maxDate);

    // Iterate month by month from start to end
    let curYear = startD.getFullYear();
    let curMonth = startD.getMonth();
    const endYear = endD.getFullYear();
    const endMonth = endD.getMonth();

    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      // 4 weekly points within the month: day 1, 8, 15, 22
      [1, 8, 15, 22].forEach(day => {
        const d = new Date(curYear, curMonth, day);
        const dStr = d.toISOString().split('T')[0];
        if (dStr >= minDate && dStr <= maxDate) {
          allDates.add(dStr);
        }
      });
      curMonth++;
      if (curMonth > 11) { curMonth = 0; curYear++; }
    }

    // Always include start and maxDate
    allDates.add(minDate);
    allDates.add(maxDate);

    // ✅ Add today to ensure the latest progress is always plotted!
    if (todayStr >= minDate && todayStr <= maxDate) {
      allDates.add(todayStr);
    }

    const sortedDates = Array.from(allDates).sort();

    // Find history records associated with these specific weekly points
    const historyAtPoints = [];

    // ✅ Calculate total weight — use type_price if available, else count types equally
    let totalProjectWeight = 0;
    const typeWeights = {};

    categories.forEach(category => {
      const types = category.types || [];
      types.forEach(type => {
        if (filterTypeId && type.type_id !== filterTypeId) return;

        const subs = type.subtypes || [];
        if (subs.length > 0) {
          subs.forEach(sub => {
            if (filterSubtypeId && sub.subtype_id !== filterSubtypeId) return;
            const weight = parseFloat(sub.subtype_price) || 0;
            totalProjectWeight += weight;
            typeWeights[`sub_${sub.subtype_id}`] = weight;
          });
        } else {
          // If no subtypes, use type price
          if (filterSubtypeId) return;
          const weight = parseFloat(type.type_price) || 0;
          totalProjectWeight += weight;
          typeWeights[`type_${type.type_id}`] = weight;
        }
      });
    });

    // ✅ If all weights are 0, count each item as 1 (equal weight)
    if (totalProjectWeight === 0) {
      categories.forEach(category => {
        const types = category.types || [];
        types.forEach(type => {
          if (filterTypeId && type.type_id !== filterTypeId) return;

          const subs = type.subtypes || [];
          if (subs.length > 0) {
            subs.forEach(sub => {
              if (filterSubtypeId && sub.subtype_id !== filterSubtypeId) return;
              typeWeights[`sub_${sub.subtype_id}`] = 1;
              totalProjectWeight += 1;
            });
          } else {
            if (filterSubtypeId) return;
            typeWeights[`type_${type.type_id}`] = 1;
            totalProjectWeight += 1;
          }
        });
      });
    }

    if (totalProjectWeight === 0) return null;

    // 📈 PLAN CALCULATION (Cumulative %)
    const planData = sortedDates.map(dateStr => {
      let completedWeight = 0;

      categories.forEach(category => {
        const types = category.types || [];
        types.forEach(type => {
          if (filterTypeId && type.type_id !== filterTypeId) return;

          const subs = type.subtypes || [];
          if (subs.length > 0) {
            subs.forEach(sub => {
              if (filterSubtypeId && sub.subtype_id !== filterSubtypeId) return;
              const weight = typeWeights[`sub_${sub.subtype_id}`] || 0;
              const startDate = sub.start_date?.split('T')[0];
              const endDate = sub.end_date?.split('T')[0];

              if (!startDate && !endDate) {
                if (dateStr >= maxDate) completedWeight += weight;
                return;
              }

              const effectiveStart = startDate || minDate;
              const effectiveEnd = endDate || maxDate;

              if (dateStr >= effectiveEnd) {
                completedWeight += weight;
              } else if (dateStr >= effectiveStart) {
                const totalDays = daysBetween(effectiveStart, effectiveEnd);
                const elapsedDays = daysBetween(effectiveStart, dateStr);
                const progress = totalDays > 0 ? elapsedDays / totalDays : 1;
                completedWeight += weight * progress;
              }
            });
          } else {
            if (filterSubtypeId) return;
            const weight = typeWeights[`type_${type.type_id}`] || 0;
            const startDate = type.start_date?.split('T')[0];
            const endDate = type.end_date?.split('T')[0];

            if (!startDate && !endDate) {
              if (dateStr >= maxDate) completedWeight += weight;
              return;
            }

            const effectiveStart = startDate || minDate;
            const effectiveEnd = endDate || maxDate;

            if (dateStr >= effectiveEnd) {
              completedWeight += weight;
            } else if (dateStr >= effectiveStart) {
              const totalDays = daysBetween(effectiveStart, effectiveEnd);
              const elapsedDays = daysBetween(effectiveStart, dateStr);
              const progress = totalDays > 0 ? elapsedDays / totalDays : 1;
              completedWeight += weight * progress;
            }
          }
        });
      });

      return (completedWeight / totalProjectWeight) * 100;
    });

    // 📉 ACTUAL CALCULATION (Cumulative % based on History)
    const filteredWeights = typeWeights;

    const actualData = sortedDates.map(dateStr => {
      // Don't show actual data for future dates
      if (dateStr > todayStr) {
        historyAtPoints.push(null);
        return null;
      }

      let actualProjectProgressWeight = 0;
      let latestHistoryForPoint = [];

      // For each item, find the latest progress recorded ON or BEFORE this date
      Object.keys(filteredWeights).forEach(key => {
        const weight = filteredWeights[key];
        const isSub = key.startsWith('sub_');
        const id = parseInt(key.replace(isSub ? 'sub_' : 'type_', ''));

        const itemHistory = history
          .filter(h => {
            const hDateStr = h.record_date ? dayjs(h.record_date).format('YYYY-MM-DD') : null;
            if (!hDateStr || hDateStr > dateStr) return false;

            const hSubId = Number(h.subtype_id || 0);
            const hTypeId = Number(h.type_id || 0);
            const hCatId = Number(h.category_id || 0);

            if (isSub) {
              return hSubId === id;
            } else {
              // If we are looking for a Type's history
              // it matches if the type_id is exact, AND either there is no subtype or we're at type level
              return hTypeId === id;
            }
          })
          .sort((a, b) => new Date(b.record_date) - new Date(a.record_date));

        if (itemHistory.length > 0) {
          const progressPercent = parseFloat(itemHistory[0].new_progress) || 0;
          actualProjectProgressWeight += (weight * progressPercent) / 100;

          const hDateExact = itemHistory[0].record_date ? dayjs(itemHistory[0].record_date).format('YYYY-MM-DD') : null;
          if (hDateExact === dateStr) {
            latestHistoryForPoint.push(itemHistory[0]);
          }
        }
      });

      historyAtPoints.push(latestHistoryForPoint.length > 0 ? latestHistoryForPoint : null);
      return (actualProjectProgressWeight / totalProjectWeight) * 100;
    });

    return {
      labels: sortedDates.map(date => formatDateLabel(date)),
      datasets: [
        {
          label: 'ความคืบหน้าตามแผน (Plan)',
          data: planData,
          borderColor: '#1890ff',
          backgroundColor: 'rgba(24, 144, 255, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          borderWidth: 3,
        },
        {
          label: 'ความคืบหน้าจริง (Actual)',
          data: actualData,
          borderColor: '#52c41a',
          backgroundColor: 'rgba(82, 196, 26, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          borderWidth: 3,
          historyAtPoints: historyAtPoints
        }
      ],
      totalAmount: totalProjectWeight
    };
  };

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onClick: (event, elements, chart) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const datasetIndex = elements[0].datasetIndex;
        const dataset = chart.data.datasets[datasetIndex];

        // Only trigger for Actual line (index 1) which has historyAtPoints
        if (datasetIndex === 1 && dataset.historyAtPoints && dataset.historyAtPoints[index]) {
          setSelectedHistory(dataset.historyAtPoints[index]);
          setSelectedPointDate(chart.data.labels[index]);
          setIsModalOpen(true);
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'center',
        labels: {
          font: { family: 'Kanit', size: 13 },
          color: '#374151',
          padding: 20,
          usePointStyle: true,
          pointStyle: 'line',
          boxWidth: 40,
          boxHeight: 3,
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => ({
              text: dataset.label,
              fillStyle: dataset.borderColor,
              strokeStyle: dataset.borderColor,
              lineWidth: dataset.borderWidth,
              lineDash: dataset.borderDash || [],
              hidden: !chart.isDatasetVisible(i),
              datasetIndex: i
            }));
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        titleFont: { family: 'Kanit', size: 14, weight: 'bold' },
        bodyFont: { family: 'Kanit', size: 13 },
        padding: 14,
        cornerRadius: 8,
        displayColors: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return ` ${label}: ${value !== null ? value.toFixed(2) : 'N/A'}%`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category',
        title: {
          display: true,
          text: 'ระยะเวลาโครงการ',
          font: { family: 'Kanit', size: 14, weight: 'bold' },
          color: '#1f2937',
        },
        grid: { display: false },
        ticks: {
          font: { family: 'Kanit', size: 11 },
          color: '#6b7280',
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        type: 'linear',
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'ความคืบหน้าสะสม (%)',
          font: { family: 'Kanit', size: 14, weight: 'bold' },
          color: '#1f2937',
        },
        ticks: {
          font: { family: 'Kanit', size: 11 },
          callback: (value) => `${value}%`
        }
      }
    }
  }), []);

  if (!projectId) {
    return (
      <Card className="bg-white shadow-lg rounded-xl">
        <Empty description={<span style={{ fontFamily: 'Kanit, sans-serif' }}>ไม่พบ Project ID</span>} />
      </Card>
    );
  }

  if (loading && rootCategories.length === 0) {
    return (
      <Card className="bg-white shadow-lg rounded-xl">
        <div className="flex items-center justify-center h-96">
          <Spin size="large" tip={<span style={{ fontFamily: 'Kanit, sans-serif' }}>กำลังโหลดข้อมูล...</span>}>
            <div style={{ padding: 50 }} />
          </Spin>
        </div>
      </Card>
    );
  }

  if (rootCategories.length === 0) {
    return (
      <Card className="bg-white shadow-lg rounded-xl">
        <Empty description={<span style={{ fontFamily: 'Kanit, sans-serif' }}>ไม่มีข้อมูลหมวดงานหลัก</span>} />
      </Card>
    );
  }

  return (
    <Card
      className="bg-white shadow-lg rounded-xl hover:shadow-xl transition-shadow duration-300"
      bordered={false}
      style={{ fontFamily: 'Kanit, sans-serif' }}
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-lg shadow-md">
            <BarChartOutlined className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1" style={{ fontFamily: 'Kanit, sans-serif' }}>
              กราฟความคืบหน้า S-Curve
            </h3>
            <p className="text-sm text-gray-500" style={{ fontFamily: 'Kanit, sans-serif' }}>
              {selectedSubtypeId
                ? `แสดงข้อมูลงานย่อย: ${allCategoriesData.flatMap(c => c.types).flatMap(t => t.subtypes || []).find(s => s.subtype_id === selectedSubtypeId)?.subtype_name}`
                : selectedTypeId
                  ? `แสดงข้อมูลประเภทงาน: ${allCategoriesData.flatMap(c => c.types).find(t => t.type_id === selectedTypeId)?.type_name}`
                  : selectedCategoryId
                    ? `แสดงข้อมูลหมวดงาน: ${allCategoriesData.find(c => c.category_id === selectedCategoryId)?.category_name}`
                    : selectedRootId
                      ? `แสดงข้อมูลหลัก: ${rootCategories.find(r => r.root_id === selectedRootId)?.root_name}`
                      : 'แสดงความคืบหน้าทั้งโครงการ (คลิกแผนงานเพื่อเจาะลึก)'}
            </p>
          </div>
        </div>

        {/* 📊 Compact Summary Cards - Moved to Top */}
        {!loading && chartData && (
          <div className="flex gap-3">
            <div className="bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-3 shadow-sm">
              <div className="w-1.5 h-8 bg-blue-500 rounded-full"></div>
              <div>
                <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">งบประมาณรวม (Plan)</div>
                <div className="text-sm font-black text-blue-700">
                  {chartData?.totalAmount ? chartData.totalAmount.toLocaleString('th-TH') : '0'} ฿
                </div>
              </div>
            </div>
            <div className="bg-green-50/50 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-3 shadow-sm">
              <div className="w-1.5 h-8 bg-green-500 rounded-full"></div>
              <div>
                <div className="text-[10px] text-green-600 font-bold uppercase tracking-wider">ความคืบหน้าจริง (Actual)</div>
                <div className="text-sm font-black text-green-700">
                  {chartData?.datasets[1]?.data ? [...chartData.datasets[1].data].reverse().find(d => d !== null && d !== undefined)?.toFixed(2) : '0.00'}%
                </div>
              </div>
            </div>
            
            <div className="ml-auto flex gap-2">
              <Button 
                type="default" 
                icon={<LinkOutlined />} 
                onClick={copyExcelLink}
                className="h-auto py-2 px-4 rounded-xl border-blue-200 text-blue-600 hover:text-blue-700 hover:border-blue-400 bg-blue-50/30 font-bold text-xs"
                style={{ fontFamily: 'Kanit, sans-serif' }}
              >
                คัดลอกลิงก์รายการ (Excel)
              </Button>

              <Button 
                type="default" 
                icon={<BarChartOutlined />} 
                onClick={copyGraphLink}
                className="h-auto py-2 px-4 rounded-xl border-blue-200 text-blue-600 hover:text-blue-700 hover:border-blue-400 bg-blue-50/30 font-bold text-xs"
                style={{ fontFamily: 'Kanit, sans-serif' }}
              >
                คัดลอกลิงก์กราฟ (Excel)
              </Button>

              <Button 
                type="primary" 
                icon={<CalendarOutlined />} 
                onClick={copyGanttLink}
                className="h-auto py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 border-none shadow-sm font-bold text-xs text-white"
                style={{ fontFamily: 'Kanit, sans-serif' }}
              >
                คัดลอกลิงก์ข้อมูล Gantt (Excel)
              </Button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Spin size="large" tip={<span style={{ fontFamily: 'Kanit, sans-serif' }}>กำลังโหลดกราฟ...</span>}>
            <div style={{ padding: 50 }} />
          </Spin>
        </div>
      ) : chartData && chartData.datasets.length > 0 ? (
        <Row gutter={24}>
          <Col xs={24} lg={6}>
            <Card
              title={
                <div className="flex items-center justify-between" style={{ fontFamily: 'Kanit, sans-serif' }}>
                  <span className="text-sm font-semibold">รายการแผนงานทั้งหมด</span>
                  {(selectedRootId || selectedCategoryId || selectedTypeId || selectedSubtypeId) && (
                    <span className="text-xs text-blue-600 cursor-pointer hover:underline"
                      onClick={handleShowAll}>
                      แสดงทั้งหมด
                    </span>
                  )}
                </div>
              }
              className="h-full"
              styles={{ body: { padding: '12px' } }}
            >
              <div className="space-y-2">
                {rootCategories.map((root, index) => {
                  const isExpanded = expandedRoots.has(root.root_id);
                  const rootCategories = allCategoriesData.filter(cat => cat.root_id === root.root_id);
                  const isRootSelected = selectedRootId === root.root_id && !selectedCategoryId;

                  return (
                    <div key={root.root_id} className="border rounded-lg overflow-hidden">
                      {/* Root Item */}
                      <div
                        className={`px-3 py-2 cursor-pointer transition-all flex items-start gap-2 ${isRootSelected
                          ? 'bg-blue-100 border-l-4 border-blue-500'
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                          }`}
                        onClick={() => handleRootClick(root.root_id)}
                        style={{ fontFamily: 'Kanit, sans-serif' }}
                      >
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs flex items-center justify-center font-semibold ${isRootSelected
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-100 text-blue-600'
                          }`}>
                          {index + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className={`text-xs font-medium ${isRootSelected ? 'text-blue-700' : 'text-gray-700'
                              }`}>
                              {root.root_name}
                            </div>
                            <div className="flex items-center gap-2">
                              {root.actual_progress !== undefined && (
                                <span className="text-[10px] font-bold text-blue-500">
                                  {parseFloat(root.actual_progress).toFixed(2)}%
                                </span>
                              )}
                              {rootCategories.length > 0 && (
                                <span className="text-gray-400">
                                  {isExpanded ? <DownOutlined className="text-xs" /> : <RightOutlined className="text-xs" />}
                                </span>
                              )}
                            </div>
                          </div>
                          {root.root_total_price > 0 && (
                            <div className={`mt-1 text-xs font-medium ${isRootSelected ? 'text-blue-700' : 'text-blue-600'
                              }`}>
                              {root.root_total_price.toLocaleString()} บาท
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Categories (Expandable) */}
                      {isExpanded && rootCategories.length > 0 && (
                        <div className="bg-gray-50 border-t">
                          {rootCategories.map((category, catIndex) => {
                            const isCategorySelected = selectedCategoryId === category.category_id;
                            const categoryTotalPrice = (category.types || []).reduce(
                              (sum, type) => {
                                const subTotal = (type.subtypes || []).reduce((s, sub) => s + (parseFloat(sub.subtype_price) || 0), 0);
                                return sum + (subTotal > 0 ? subTotal : (parseFloat(type.type_price) || 0));
                              },
                              0
                            );
                            const totalItemsCount = (category.types || []).reduce(
                              (sum, type) => sum + Math.max(1, (type.subtypes || []).length),
                              0
                            );

                            return (
                              <div
                                key={category.category_id}
                                className={`px-3 py-2 pl-12 cursor-pointer transition-all ${isCategorySelected
                                  ? 'bg-green-100 border-l-4 border-green-500'
                                  : 'hover:bg-gray-100 border-l-4 border-transparent'
                                  }`}
                                onClick={(e) => handleCategoryClick(e, category.category_id, root.root_id)}
                                style={{ fontFamily: 'Kanit, sans-serif' }}
                              >
                                <div className="flex items-start gap-2">
                                  <span className={`flex-shrink-0 w-5 h-5 rounded text-xs flex items-center justify-center font-medium ${isCategorySelected
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-300 text-gray-600'
                                    }`}>
                                    {catIndex + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className={`text-xs ${isCategorySelected ? 'text-green-700 font-medium' : 'text-gray-600'
                                        }`}>
                                        {category.category_name}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {category.actual_progress !== undefined && (
                                          <span className="text-[10px] font-bold text-green-500">
                                            {parseFloat(category.actual_progress).toFixed(2)}%
                                          </span>
                                        )}
                                        <div className="text-[10px] text-gray-400 font-medium">
                                          {totalItemsCount}
                                        </div>
                                      </div>
                                    </div>
                                    {categoryTotalPrice > 0 && (
                                      <div className={`mt-0.5 text-xs ${isCategorySelected ? 'text-green-600 font-medium' : 'text-gray-500'
                                        }`}>
                                        {categoryTotalPrice.toLocaleString()} บาท
                                      </div>
                                    )}

                                    {/* ✨ Types (Nested List) - Beautifully Redesigned */}
                                    {isCategorySelected && category.types && category.types.length > 0 && (
                                      <div className="mt-3 space-y-1.5 pt-3 border-t border-green-100">
                                        {category.types.map((type) => {
                                          const isTypeSelected = selectedTypeId === type.type_id;
                                          return (
                                            <div
                                              key={type.type_id}
                                              className={`p-2 rounded-lg border transition-all group cursor-pointer ${isTypeSelected
                                                ? 'bg-blue-50 border-blue-200 shadow-sm'
                                                : 'bg-white/60 border-white hover:border-green-200'
                                                }`}
                                              onClick={(e) => handleTypeClick(e, type.type_id, category.category_id, root.root_id)}
                                            >
                                              <div className="flex justify-between items-start gap-2 mb-1.5">
                                                <span className={`text-[10px] leading-tight font-bold transition-colors ${isTypeSelected ? 'text-blue-700' : 'text-gray-700 group-hover:text-green-700'
                                                  }`}>
                                                  {type.type_name}
                                                </span>
                                                <span className={`text-[10px] font-bold whitespace-nowrap ${isTypeSelected ? 'text-blue-600' : 'text-green-600'
                                                  }`}>
                                                  {parseFloat(type.actual_progress || 0).toFixed(2)}%
                                                </span>
                                              </div>

                                              {/* Micro Progress Bar */}
                                              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-2">
                                                <div
                                                  className={`h-full rounded-full transition-all duration-500 ${isTypeSelected
                                                    ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                                                    : 'bg-gradient-to-r from-green-400 to-green-500'
                                                    }`}
                                                  style={{ width: `${type.actual_progress || 0}%` }}
                                                ></div>
                                              </div>

                                              {/* Subtypes List (Fourth Level) */}
                                              {type.subtypes && type.subtypes.length > 0 && (
                                                <div className="space-y-1 mt-1 border-t border-dashed border-gray-100 pt-2">
                                                  {type.subtypes.map(sub => {
                                                    const isSubSelected = selectedSubtypeId === sub.subtype_id;
                                                    return (
                                                      <div
                                                        key={sub.subtype_id}
                                                        className={`flex items-center justify-between gap-2 p-1 rounded-md transition-all ${isSubSelected ? 'bg-blue-100/50' : 'hover:bg-gray-50'
                                                          }`}
                                                        onClick={(e) => handleSubtypeClick(e, sub.subtype_id, type.type_id, category.category_id, root.root_id)}
                                                      >
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                          <div className={`w-1.5 h-1.5 rounded-full ${isSubSelected ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                                          <span className={`text-[9px] truncate ${isSubSelected ? 'text-blue-700 font-bold' : 'text-gray-500'}`}>
                                                            {sub.subtype_name}
                                                          </span>
                                                        </div>
                                                        <span className={`text-[9px] font-bold ${isSubSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                                                          {parseFloat(sub.actual_progress || 0).toFixed(2)}%
                                                        </span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={18}>
            <div className="h-[500px] relative bg-gray-50 rounded-lg p-4">
              <Line data={chartData} options={chartOptions} />
            </div>

            {/* 🕒 History Timeline Section - Moved to Main Area */}
            {(selectedCategoryId || selectedTypeId || selectedSubtypeId) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mt-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-500 p-1.5 rounded-lg shadow-sm">
                      <HistoryOutlined className="text-white text-base" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-800 m-0" style={{ fontFamily: 'Kanit, sans-serif' }}>
                        ประวัติการอัปเดตงาน: {
                          selectedSubtypeId
                            ? allCategoriesData.flatMap(c => c.types).flatMap(t => t.subtypes || []).find(s => s.subtype_id === selectedSubtypeId)?.subtype_name
                            : selectedTypeId
                              ? allCategoriesData.flatMap(c => c.types).find(t => t.type_id === selectedTypeId)?.type_name
                              : allCategoriesData.find(c => c.category_id === selectedCategoryId)?.category_name
                        }
                      </h4>
                      <p className="text-[10px] text-gray-400 m-0">บันทึกความคืบหน้าและรูปภาพจริง</p>
                    </div>
                  </div>
                  <Tag color="blue" className="rounded-full border-none px-3 py-0.5 text-[10px] font-bold">
                    {filteredHistory.length} ครั้ง
                  </Tag>
                </div>

                {filteredHistory.length > 0 ? (
                  <Timeline
                    className="mt-4"
                    items={filteredHistory.map((item, index) => ({
                      color: 'green',
                      children: (
                        <div className="mb-1 bg-white p-2 rounded-lg border border-gray-100 hover:border-blue-200 transition-all duration-300 shadow-sm group" style={{ fontFamily: 'Kanit, sans-serif' }}>
                          {/* Row 1: Info & Progress */}
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">#{filteredHistory.length - index}</span>
                              <div className="flex items-center gap-1.5 text-xs text-gray-600" style={{ fontFamily: 'Kanit, sans-serif' }}>
                                <HistoryOutlined className="text-gray-400" />
                                <span>{dayjs(item.update_date).format('DD MMM')} {(dayjs(item.update_date).year() + 543).toString().slice(-2)}</span>
                                <span className="text-gray-300">|</span>
                                <span>{dayjs(item.update_date).format('HH:mm')}</span>
                              </div>
                              {item.updated_by && (
                                <div className="text-xs text-gray-500 flex items-center gap-1 italic" style={{ fontFamily: 'Kanit, sans-serif' }}>
                                  <UserOutlined className="text-[10px]" /> {item.updated_by}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                              {parseFloat(item.old_progress) !== parseFloat(item.new_progress) ? (
                                <>
                                  <span className="text-xs text-gray-400">{parseFloat(item.old_progress || 0).toFixed(0)}%</span>
                                  <RightOutlined className="text-[10px] text-gray-300" />
                                  <span className="text-xs font-bold text-green-600">{parseFloat(item.new_progress || 0).toFixed(0)}%</span>
                                </>
                              ) : (
                                <span className="text-xs font-bold text-blue-600">{parseFloat(item.new_progress || 0).toFixed(0)}%</span>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Memo & Photos */}
                          <div className="flex items-center justify-between gap-3 min-h-[32px]">
                            <div className="flex-1">
                              {item.remarks ? (
                                <div className="text-xs text-gray-600 leading-tight" style={{ fontFamily: 'Kanit, sans-serif' }}>
                                  <span className="font-bold text-blue-400 mr-2">MEMO:</span>
                                  {item.remarks}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-300 italic" style={{ fontFamily: 'Kanit, sans-serif' }}>ไม่มีบันทึก</div>
                              )}
                            </div>

                            {item.photos && item.photos.length > 0 && (
                              <div className="flex-shrink-0">
                                <Image.PreviewGroup>
                                  <Space size={4}>
                                    {item.photos.map((photo, pIdx) => (
                                      <div key={pIdx} className="overflow-hidden rounded border border-gray-100 shadow-sm leading-none">
                                        <Image
                                          width={32}
                                          height={32}
                                          className="object-cover"
                                          src={`${import.meta.env.VITE_API_URL || 'http://localhost:3050'}/${photo.startsWith('/') ? photo.substring(1) : photo}`}
                                          fallback="/placeholder-image.png"
                                        />
                                      </div>
                                    ))}
                                  </Space>
                                </Image.PreviewGroup>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }))}
                  />
                ) : (
                  <Empty description="ยังไม่มีประวัติ" className="py-6" />
                )}
              </div>
            )}
          </Col>
        </Row>
      ) : (
        <Empty
          description={<span style={{ fontFamily: 'Kanit, sans-serif' }}>ไม่มีข้อมูลสำหรับโครงการนี้</span>}
          className="py-16"
        />
      )}

      {/* Modal for History Details */}
      <Modal
        title={
          <div className="flex items-center gap-2" style={{ fontFamily: 'Kanit, sans-serif' }}>
            <HistoryOutlined className="text-blue-500" />
            <span>รายละเอียดการอัปเดตงาน ({selectedPointDate})</span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={700}
        centered
        style={{ fontFamily: 'Kanit, sans-serif' }}
      >
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {selectedHistory.length > 0 ? (
            selectedHistory.map((item, index) => (
              <div key={item.history_id || index} className="mb-6 last:mb-0 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <Tag color="blue" className="px-3 py-1 rounded-full text-xs font-semibold border-none bg-blue-100 text-blue-700">
                    รายการที่ {selectedHistory.length - index}
                  </Tag>
                  {item.updated_by && (
                    <span className="text-xs text-gray-500 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                      <UserOutlined /> ผู้บันทึก: {item.updated_by}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 font-bold">เดิม</div>
                    <div className="text-xl font-black text-gray-400">{parseFloat(item.old_progress || 0).toFixed(2)}%</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500 opacity-5 rounded-bl-full"></div>
                    <div className="text-[10px] uppercase tracking-wider text-blue-400 mb-1 font-bold">ใหม่</div>
                    <div className="text-xl font-black text-blue-600">{parseFloat(item.new_progress || 0).toFixed(2)}%</div>
                  </div>
                </div>

                {item.remarks && (
                  <div className="mb-5">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center gap-1 mb-2 font-bold">
                      <MessageOutlined /> รายละเอียดการทำงาน
                    </div>
                    <div className="bg-white p-4 rounded-xl text-sm text-gray-700 border border-gray-100 shadow-sm leading-relaxed">
                      {item.remarks}
                    </div>
                  </div>
                )}

                {item.photos && item.photos.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center gap-1 mb-2 font-bold">
                      <CameraOutlined /> ภาพถ่ายหน้างาน ({item.photos.length})
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                      <Image.PreviewGroup>
                        <Space size={12} wrap>
                          {item.photos.map((photo, pIdx) => (
                            <Image
                              key={pIdx}
                              width={120}
                              height={120}
                              className="rounded-xl object-cover shadow-sm hover:scale-105 transition-transform duration-300"
                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:3050'}/${photo.startsWith('/') ? photo.substring(1) : photo}`}
                              fallback="/placeholder-image.png"
                            />
                          ))}
                        </Space>
                      </Image.PreviewGroup>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <Empty description="ไม่พบรายละเอียดการอัปเดต" />
          )}
        </div>
      </Modal>
    </Card>
  );
};

export default SCurveChart;

