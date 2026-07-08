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
  if (process.env.EMAIL_USER === 'your-gmail@gmail.com' || !process.env.EMAIL_USER) {
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

const sendRideConfirmation = async (userEmail, rideDetails, driverDetails) => {
  // Mock sending if credentials are not configured
  if (process.env.EMAIL_USER === 'your-gmail@gmail.com' || !process.env.EMAIL_USER) {
    console.log(`\n==================================================`);
    console.log(`MOCK RIDE CONFIRMATION EMAIL SENT TO: ${userEmail}`);
    console.log(`Driver: ${driverDetails.name} | Vehicle: ${rideDetails.rideType}`);
    console.log(`==================================================\n`);
    return true;
  }

  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border-radius: 10px;">
        <h2 style="color: #3b82f6; text-align: center;">Your VibePool Ride is Booked! 🚗</h2>
        <p style="font-size: 16px; color: #333;">Hi there,</p>
        <p style="font-size: 16px; color: #333;">Great news! Your <strong>${rideDetails.rideType}</strong> has been confirmed and your driver is on the way to pick you up.</p>
        
        <div style="background-color: #fff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <h3 style="margin-top: 0; color: #1f2937;">Driver Details</h3>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Name:</strong> ${driverDetails.name}</p>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Phone:</strong> ${driverDetails.mobile}</p>
          <p style="margin: 5px 0; color: #4b5563;"><strong>DL Number:</strong> ${driverDetails.dl}</p>
        </div>

        <div style="background-color: #fff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <h3 style="margin-top: 0; color: #1f2937;">Trip Summary</h3>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Pickup:</strong> ${rideDetails.pickupAddress}</p>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Destination:</strong> ${rideDetails.dropoffAddress}</p>
          <p style="margin: 5px 0; color: #4b5563;"><strong>Estimated Fare:</strong> ₹${rideDetails.price}</p>
        </div>

        <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">Thank you for riding with VibePool!</p>
      </div>
    `;

    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: `"VibePool Rides" <${process.env.EMAIL_USER}>`, // sender address
      to: userEmail, // actual receiver's registered email
      subject: "🚗 Ride Confirmed: Driver is on the way!", // Subject line
      html: htmlContent, // html body
    });

    console.log("==========================================");
    console.log("📧 E-MAIL SENT SUCCESSFULLY TO:", userEmail);
    console.log("Message ID: %s", info.messageId);
    console.log("==========================================");
    
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    console.error("Make sure EMAIL_USER and EMAIL_PASS are set in backend/.env");
    return false;
  }
};

module.exports = { sendOtpEmail, sendRideConfirmation };
