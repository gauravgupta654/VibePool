const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send OTP verification email
 * @param {string} toEmail - Recipient email address
 * @param {string} otpCode - 6-digit OTP code
 */
const sendOtpEmail = async (toEmail, otpCode) => {
  const mailOptions = {
    from: `"VibePool 🚗" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your VibePool Verification Code",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0; padding:0; background-color:#0f172a; font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:480px; margin:40px auto; background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%); border-radius:20px; border:1px solid rgba(255,255,255,0.1); overflow:hidden;">
          
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%); padding:32px; text-align:center;">
            <h1 style="margin:0; color:#fff; font-size:28px; font-weight:700; letter-spacing:-0.5px;">🚗 VibePool</h1>
            <p style="margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:14px;">India's Ride Sharing Platform</p>
          </div>
          
          <!-- Body -->
          <div style="padding:40px 32px; text-align:center;">
            <h2 style="margin:0 0 12px; color:#f8fafc; font-size:22px; font-weight:600;">Verify Your Email</h2>
            <p style="margin:0 0 32px; color:#94a3b8; font-size:15px; line-height:1.5;">
              Use the code below to complete your VibePool registration. This code expires in <strong style="color:#f8fafc;">10 minutes</strong>.
            </p>
            
            <!-- OTP Code -->
            <div style="background:rgba(59,130,246,0.1); border:2px dashed #3b82f6; border-radius:16px; padding:24px; margin:0 auto 32px; max-width:280px;">
              <span style="font-size:40px; font-weight:800; letter-spacing:12px; color:#3b82f6; font-family:'Courier New',monospace;">${otpCode}</span>
            </div>
            
            <p style="margin:0; color:#64748b; font-size:13px; line-height:1.5;">
              If you didn't request this code, you can safely ignore this email.<br>
              Someone else might have typed your email address by mistake.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="padding:20px 32px; border-top:1px solid rgba(255,255,255,0.05); text-align:center;">
            <p style="margin:0; color:#475569; font-size:12px;">
              © ${new Date().getFullYear()} VibePool · Made in India 🇮🇳
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  // Mock sending if credentials are not configured
  if (process.env.EMAIL_USER === 'your-gmail@gmail.com') {
    console.log(`\n==================================================`);
    console.log(`MOCK OTP EMAIL SENT TO: ${toEmail}`);
    console.log(`OTP CODE: ${otpCode}`);
    console.log(`==================================================\n`);
    return { success: true, mock: true };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("OTP email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("Failed to send OTP email. Please try again.");
  }
};

module.exports = { sendOtpEmail };
