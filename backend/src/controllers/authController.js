const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { sendOTPEmail } = require('../config/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'voxscribe_super_secret_session_key';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to generate a 6-digit OTP code
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 1. Local Email/Password Registration
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All registration fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // If user exists but is not verified, we can let them proceed to verify
      if (!existingUser.isVerified) {
        // Regenerate OTP and send
        const otpCode = generateOTP();
        existingUser.otpCode = otpCode;
        existingUser.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiration
        await existingUser.save();
        
        await sendOTPEmail(existingUser.email, existingUser.name, otpCode);

        return res.status(200).json({
          success: true,
          message: 'An unverified account already exists. A new verification OTP has been emailed.',
          needsVerification: true,
          email: existingUser.email
        });
      }
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

    // Generate 6-digit OTP code
    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Create non-verified user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      avatar,
      isVerified: false,
      otpCode,
      otpExpires,
      createdAt: new Date()
    });

    // Send OTP Email
    await sendOTPEmail(email, name, otpCode);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully. Please verify your email using the 6-digit code sent to your inbox.',
      needsVerification: true,
      email: newUser.email
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during account registration.', error: error.message });
  }
};

// 2. Local Email/Password Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter email and password.' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User does not exist.' });
    }

    // Check if user has password (might be Google-only sign-in)
    if (!user.password) {
      return res.status(400).json({ 
        success: false, 
        message: 'This account was created via Google Sign-In. Please click "Continue with Google" to log in.' 
      });
    }

    // Match password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Safeguard: Check if email is verified
    if (!user.isVerified) {
      // Regenerate OTP and send so they can complete sign in
      const otpCode = generateOTP();
      user.otpCode = otpCode;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
      await user.save();

      await sendOTPEmail(user.email, user.name, otpCode);

      return res.status(403).json({
        success: false,
        message: 'Your email address is not verified yet. A verification OTP has been sent to your email.',
        needsVerification: true,
        email: user.email
      });
    }

    // Create JWT Token
    const token = jwt.sign({ id: user._id || user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        method: 'local'
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during sign in.', error: error.message });
  }
};

// 3. Verify OTP Code
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({ success: false, message: 'Please enter your email and the 6-digit OTP code.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email address is already verified.' });
    }

    // Match OTP
    if (!user.otpCode || user.otpCode !== otpCode.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
    }

    // Match Expiration
    if (new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    // Mark as Verified
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Create JWT Session Token
    const token = jwt.sign({ id: user._id || user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Email verified and account activated successfully!',
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        method: 'local'
      }
    });

  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during OTP verification.', error: error.message });
  }
};

// 4. Resend OTP Code
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide email address.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    // Generate fresh OTP
    const otpCode = generateOTP();
    user.otpCode = otpCode;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    // Send email
    await sendOTPEmail(email, user.name, otpCode);

    res.json({
      success: true,
      message: 'A new 6-digit verification code has been dispatched to your email.'
    });

  } catch (error) {
    console.error('❌ OTP resend error:', error);
    res.status(500).json({ success: false, message: 'Server error during OTP dispatch.', error: error.message });
  }
};

// 5. Real Google OAuth ID Token Verification & Log In
exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Google authentication token is missing.' });
    }

    // Verify Google ID Token
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('⚠️ Google ID Token verification failed:', verifyError.message);
      return res.status(401).json({ 
        success: false, 
        message: 'Google Sign-In session verification failed. Token expired or invalid.' 
      });
    }

    const { sub: googleId, email, name, picture } = payload;

    // Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create user as verified instantly (since identity is verified by Google)
      user = await User.create({
        name,
        email,
        googleId,
        isVerified: true, // Instantly verified via Google
        avatar: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        createdAt: new Date()
      });
      console.log(`✨ Registered new Google user: ${email}`);
    } else {
      let changed = false;
      if (!user.googleId) {
        user.googleId = googleId;
        changed = true;
      }
      if (!user.isVerified) {
        user.isVerified = true; // Auto-verify email
        changed = true;
      }
      
      if (changed && typeof user.save === 'function') {
        await user.save();
      }
    }

    // Create local JWT Session Token
    const token = jwt.sign({ id: user._id || user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Authenticated with Google successfully.',
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        method: 'google'
      }
    });

  } catch (error) {
    console.error('❌ Google auth server error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during Google Sign-In.', error: error.message });
  }
};

// 6. Expose Google Client ID dynamically for Frontend loading
exports.getGoogleClientId = (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || ''
  });
};
