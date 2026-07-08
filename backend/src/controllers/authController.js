const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const { generateOtp, isOtpExpired } = require("../utils/otpHelper");
const { sendOtpEmail } = require("../utils/emailService");

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

/**
 * POST /api/auth/signup
 * Register a new user and send OTP to their email
 */
const signup = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Validate Indian phone number (optional field)
    if (phone) {
      const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
        return res.status(400).json({ message: "Please enter a valid Indian phone number" });
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }
      
      // User exists but not verified — delete old user and re-register
      await prisma.otp.deleteMany({ where: { email } });
      await prisma.user.delete({ where: { email } });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (unverified)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        isVerified: false,
      },
    });

    // Generate OTP and store it
    const otpCode = generateOtp();
    await prisma.otp.create({
      data: {
        email,
        code: otpCode,
      },
    });

    // Send OTP email
    await sendOtpEmail(email, otpCode);

    res.status(201).json({
      message: "Account created! Please check your email for the verification code.",
      email: user.email,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

/**
 * POST /api/auth/verify-otp
 * Verify the OTP and activate the user account
 */
const verifyOtp = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and OTP code are required" });
    }

    // Find the latest OTP for this email
    const otp = await prisma.otp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return res.status(400).json({ message: "No OTP found. Please request a new one." });
    }

    // Check if OTP is expired (10 minutes)
    if (isOtpExpired(otp.createdAt, 10)) {
      await prisma.otp.deleteMany({ where: { email } });
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Check if OTP matches
    if (otp.code !== code) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    // Mark user as verified
    const user = await prisma.user.update({
      where: { email },
      data: { isVerified: true },
    });

    // Delete all OTPs for this email
    await prisma.otp.deleteMany({ where: { email } });

    // Generate token (auto-login after verification)
    const token = generateToken(user.id);

    res.status(200).json({
      message: "Email verified successfully!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: "Please verify your email first",
        needsVerification: true,
        email: user.email,
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

/**
 * POST /api/auth/resend-otp
 * Generate a new OTP and send it to the user's email
 */
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Delete old OTPs
    await prisma.otp.deleteMany({ where: { email } });

    // Generate new OTP
    const otpCode = generateOtp();
    await prisma.otp.create({
      data: {
        email,
        code: otpCode,
      },
    });

    // Send OTP email
    await sendOtpEmail(email, otpCode);

    res.status(200).json({ message: "A new verification code has been sent to your email." });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
const getMe = async (req, res) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: "Something went wrong." });
  }
};

module.exports = { signup, verifyOtp, login, resendOtp, getMe };
