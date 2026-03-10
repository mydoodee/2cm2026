import { Card, Progress, Typography, Select, Tag, Empty } from 'antd';
import {
  DollarOutlined, FileDoneOutlined, ThunderboltOutlined,
  RiseOutlined, CalendarOutlined, BuildOutlined, 
  CheckCircleOutlined, ClockCircleOutlined, 
  WarningOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text } = Typography;

const PaymentCard = ({
  project,
  selectedPayment,
  paymentHistory,
  selectedPaymentInstallment,
  setSelectedPaymentInstallment,
  imageErrors,
  setImageLoading,
  setImageErrors,
  paymentData
}) => {
  console.log('🎯 PaymentCard Debug:', {
    paymentData,
    paymentHistory,
    selectedPaymentInstallment,
    selectedPayment
  });

  // ✅ ตรวจสอบว่ามีข้อมูลพื้นฐานหรือไม่
  const hasNoPaymentData = !paymentData || !paymentHistory || paymentHistory.length === 0;
  
  // ข้อมูลพื้นฐาน (ถ้ามี)
  const totalInstallments = hasNoPaymentData ? 0 : Number(paymentData.total_installments) || 0;
  const totalAmount = hasNoPaymentData ? 0 : Number(paymentData.total_amount) || 0;
  
  // ✅ ตั้งค่า selectedPaymentInstallment เป็นงวดแรกถ้ายังไม่ได้เลือก
  const currentSelectedInstallment = selectedPaymentInstallment || (paymentHistory && paymentHistory.length > 0 ? paymentHistory[0].installment : null);
  
  // ค้นหางวดที่เลือกจาก paymentHistory
  const currentPaymentData = !hasNoPaymentData ? paymentHistory.find(
    p => p.installment === currentSelectedInstallment
  ) : null;
  
  // ✅ ถ้าไม่พบข้อมูลงวดที่เลือก ให้ใช้งวดแรก
  const activePaymentData = currentPaymentData || (!hasNoPaymentData ? paymentHistory[0] : null);
  const hasNoActivePaymentData = hasNoPaymentData || !activePaymentData;
  
  if (hasNoActivePaymentData) {
    return (
      <Card 
        className="bg-white shadow-md card-hover rounded-lg relative overflow-hidden h-[420px]"
        style={{ 
          borderRadius: '12px',
          backgroundImage: project.payment_image && !imageErrors.payment 
            ? `url(${project.payment_image})` 
            : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-white/80 z-0" style={{ backdropFilter: 'blur(2px)' }} />
        <div className="p-3 relative z-10 h-full flex items-center justify-center">
          {project.payment_image && !imageErrors.payment && (
            <img
              src={project.payment_image}
              alt="Payment Background"
              className="hidden"
              onLoad={() => setImageLoading((prev) => ({ ...prev, payment: false }))}
              onError={() => {
                setImageErrors((prev) => ({ ...prev, payment: true }));
                setImageLoading((prev) => ({ ...prev, payment: false }));
              }}
            />
          )}
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text className="text-sm text-gray-500 font-kanit">
                ไม่มีข้อมูลการชำระเงิน
              </Text>
            }
          />
        </div>
      </Card>
    );
  }
  
  // ใช้ข้อมูลจาก activePaymentData
  const currentInstallment = Number(activePaymentData.installment) || 0;
  const currentInstallmentAmount = Number(activePaymentData.current_installment_amount) || 0;
  const cumulativeSubmittedAmount = Number(activePaymentData.cumulative_submitted_amount) || 0;
  const paymentStatus = activePaymentData.payment_status || 'pending';
  
  // กำหนดสถานะ - ใช้ payment_status จาก database
  const isSubmitted = paymentStatus === 'paid';
  
  // คำนวณข้อมูลสำหรับแสดงผล
  const totalSubmittedInstallments = currentInstallment;
  const totalSubmittedAmount = cumulativeSubmittedAmount;
  const remainingInstallments = totalInstallments - currentInstallment;
  const remainingAmount = totalAmount - cumulativeSubmittedAmount;
  const remainingPercent = totalAmount > 0 ? ((remainingAmount / totalAmount) * 100).toFixed(2) : 0;
  const submittedPercent = totalAmount > 0 ? ((cumulativeSubmittedAmount / totalAmount) * 100).toFixed(2) : 0;

  // ฟังก์ชันแสดงสถานะการชำระเงิน
  const getStatusConfig = (status) => {
    const configs = {
      paid: {
        color: 'green',
        icon: <CheckCircleOutlined />,
        text: 'ชำระแล้ว',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      },
      pending: {
        color: 'orange',
        icon: <ClockCircleOutlined />,
        text: 'ค้างชำระ',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      },
      overdue: {
        color: 'red',
        icon: <WarningOutlined />,
        text: 'เกินกำหนด',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      },
      cancelled: {
        color: 'default',
        icon: <CloseCircleOutlined />,
        text: 'ยกเลิก',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      }
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(paymentStatus);

  return (
    <Card 
      className="bg-white shadow-md card-hover rounded-lg relative overflow-hidden h-[420px]"
      style={{ 
        borderRadius: '12px',
        backgroundImage: project.payment_image && !imageErrors.payment 
          ? `url(${project.payment_image})` 
          : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-white/80 z-0" style={{ backdropFilter: 'blur(2px)' }} />
      <div className="p-3 relative z-10 h-full overflow-y-auto">
        {project.payment_image && !imageErrors.payment && (
          <img
            src={project.payment_image}
            alt="Payment Background"
            className="hidden"
            onLoad={() => setImageLoading((prev) => ({ ...prev, payment: false }))}
            onError={() => {
              setImageErrors((prev) => ({ ...prev, payment: true }));
              setImageLoading((prev) => ({ ...prev, payment: false }));
            }}
          />
        )}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center flex-1">
              <DollarOutlined className="text-lg text-green-500 mr-2" />
              <Title level={5} className="m-0 text-gray-900 font-kanit text-sm">Payment</Title>
            </div>
            <Progress
              type="circle"
              percent={selectedPayment && isSubmitted ? 100 : 0}
              size={32}
              strokeColor={{ '0%': '#108ee9', '100%': '#52c41a' }}
              format={() => `งวดที่ ${currentInstallment}`}
            />
          </div>
          {paymentHistory.length > 0 && (
            <Select
              value={currentSelectedInstallment}
              onChange={setSelectedPaymentInstallment}
              className="w-full"
              placeholder="เลือกงวด"
              size="small"
            >
              {paymentHistory.map((pay) => {
                const status = getStatusConfig(pay.payment_status || 'pending');
                return (
                  <Select.Option key={pay.installment} value={pay.installment}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-kanit">งวดที่ {pay.installment}</span>
                      <span className="text-xs text-gray-500">
                        {pay.date ? moment(pay.date).format('DD/MM/YY') : ''}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        status.color === 'green' ? 'bg-green-100 text-green-700' :
                        status.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                        status.color === 'red' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {status.text}
                      </span>
                    </div>
                  </Select.Option>
                );
              })}
            </Select>
          )}
        </div>
        {!selectedPayment || (totalInstallments === 0 && totalAmount === 0) ? (
          <Text className="text-sm italic text-gray-600 font-kanit text-center block py-4">
            ไม่มีข้อมูลการชำระเงิน
          </Text>
        ) : (
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 shadow-sm">
              <Text className="block font-semibold text-gray-800 font-kanit mb-1 text-xs">
                <DollarOutlined className="mr-1 text-gray-500" /> สรุปเปอร์เซ็นต์การชำระเงิน
              </Text>
              <div className="flex items-center justify-between mb-1">
                <Text className="text-gray-600 font-kanit text-xs">ค่างานก่อสร้างตามสัญญา</Text>
                <Text className="text-gray-800 font-kanit font-semibold text-xs">
                  {totalInstallments} งวด / {totalAmount.toLocaleString('th-TH')} บาท
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-gray-600 font-kanit text-xs">ยอดที่ส่งงานถึงงวดนี้</Text>
                <Progress percent={Number(submittedPercent)} strokeColor="#52c41a" size="small" className="w-20" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-50 to-green-100 shadow-sm">
                <Text className="block font-semibold text-gray-800 font-kanit mb-1 text-xs">
                  <DollarOutlined className="mr-1 text-green-500" /> จำนวนเงินงวดนี้
                </Text>
                <Text className="text-gray-600 font-kanit text-xs">{currentInstallmentAmount.toLocaleString('th-TH')} บาท</Text>
              </div>
              <div className={`p-2 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 shadow-sm border-2 ${statusConfig.borderColor}`}>
                <Text className="block font-semibold text-gray-800 font-kanit mb-1 text-xs">
                  <FileDoneOutlined className="mr-1 text-blue-500" /> สถานะการชำระ
                </Text>
                <Tag color={statusConfig.color} icon={statusConfig.icon} className="text-xs">
                  {statusConfig.text}
                </Tag>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 shadow-sm">
                <Text className="block font-semibold text-gray-800 font-kanit mb-1 text-xs">
                  <ThunderboltOutlined className="mr-1 text-orange-500" /> ส่งงานครั้งนี้ (ครั้งที่ {currentInstallment})
                </Text>
                <Text className="text-gray-600 font-kanit text-xs">{currentInstallmentAmount.toLocaleString('th-TH')} บาท</Text>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-r from-teal-50 to-teal-100 shadow-sm">
                <Text className="block font-semibold text-gray-800 font-kanit mb-1 text-xs">
                  <RiseOutlined className="mr-1 text-teal-500" /> รวมส่งงานถึงครั้งนี้
                </Text>
                <Text className="text-gray-600 font-kanit text-xs">{totalSubmittedInstallments} งวด / {totalSubmittedAmount.toLocaleString('th-TH')} บาท</Text>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-red-50 to-red-100 shadow-sm">
                <Text className="block font-semibold text-gray-800 font-kanit mb-1 text-xs">
                  <CalendarOutlined className="mr-1 text-red-500" /> คงเหลือ
                </Text>
                <Text className="text-gray-600 font-kanit text-xs">{remainingInstallments} งวด / {remainingAmount.toLocaleString('th-TH')} บาท</Text>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 shadow-sm">
                <Text className="block font-semibold text-gray-800 font-kanit mb-1 text-xs">
                  <BuildOutlined className="mr-1 text-purple-500" /> ผลต่างงานกับเงิน
                </Text>
                <Text className="text-gray-600 font-kanit text-xs">
                  {remainingAmount.toLocaleString('th-TH')} บาท ({remainingPercent}%)
                </Text>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PaymentCard;