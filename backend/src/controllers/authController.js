const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'voxscribe_super_secret_session_key';
// Initialize Google Auth Client using standard environment variable
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate bottts avatar from dicebear
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

    // Create user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      avatar,
      createdAt: new Date()
    });

    // Create JWT Token
    const token = jwt.sign({ id: newUser._id || newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: newUser._id || newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        method: 'local'
      }
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

// 3. Real Google OAuth ID Token Verification & Log In
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
      // Create user if not registered
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        createdAt: new Date()
      });
      console.log(`✨ Registered new Google user: ${email}`);
    } else if (!user.googleId) {
      // If user exists locally but hasn't linked Google yet, link it now
      user.googleId = googleId;
      // We would write this to the local database file if running in local fallback
      if (typeof user.save === 'function') {
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

// 4. Expose Google Client ID dynamically for Frontend loading
exports.getGoogleClientId = (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || ''
  });
};
