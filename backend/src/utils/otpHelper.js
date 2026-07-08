/**
 * Generate a random 6-digit numeric OTP
 * @returns {string} 6-digit OTP code
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Check if an OTP has expired
 * @param {Date} createdAt - When the OTP was created
 * @param {number} expiryMinutes - Expiry duration in minutes (default: 10)
 * @returns {boolean} True if expired
 */
const isOtpExpired = (createdAt, expiryMinutes = 10) => {
  const now = new Date();
  const expiryTime = new Date(createdAt.getTime() + expiryMinutes * 60 * 1000);
  return now > expiryTime;
};

module.exports = { generateOtp, isOtpExpired };
