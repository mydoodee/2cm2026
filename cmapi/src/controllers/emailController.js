const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // ใช้ STARTTLS สำหรับ port 587
    auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password',
    },
    tls: {
        ciphers: 'SSLv3', // รองรับ TLS 1.2 หรือสูงกว่า
        rejectUnauthorized: false, // ป้องกันปัญหาการตรวจสอบ certificate
    },
});

const sendResetPasswordEmail = async (user, resetToken) => {
    try {
        const resetLink = `${process.env.FRONTEND_URL}/confirm-password?token=${resetToken}`;
        const mailOptions = {
            from: `"ConstructPro" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'รีเซ็ตรหัสผ่าน ConstructPro',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                    <h2 style="color: #1f2937;">รีเซ็ตรหัสผ่าน</h2>
                    <p style="color: #4b5563;">สวัสดี คุณ${user.username},</p>
                    <p style="color: #4b5563;">คุณได้ร้องขอการรีเซ็ตรหัสผ่านสำหรับบัญชี ConstructPro ของคุณ คลิกปุ่มด้านล่างเพื่อดำเนินการรีเซ็ตรหัสผ่าน:</p>
                    <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                        รีเซ็ตรหัสผ่าน
                    </a>
                    <p style="color: #4b5563;">ลิงก์นี้จะหมดอายุภายใน 1 ชั่วโมง</p>
                    <p style="color: #4b5563;">หากคุณไม่ได้ร้องขอการรีเซ็ตนี้ กรุณาเพิกเฉยต่ออีเมลนี้หรือติดต่อผู้ดูแลระบบ</p>
                    <p style="color: #4b5563;">ขอบคุณ,<br>ทีม ConstructPro</p>
                    <hr style="border-top: 1px solid #e5e7eb; margin-top: 20px;">
                    <p style="color: #6b7280; font-size: 12px; text-align: center;">© 2025 SpkConstruct - Secure & Reliable</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log('Reset password email sent:', { email: user.email, user_id: user.user_id });
        return true;
    } catch (error) {
        console.error('Send reset password email error:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            errno: error.errno
        });
        throw error;
    }
};

module.exports = { sendResetPasswordEmail };