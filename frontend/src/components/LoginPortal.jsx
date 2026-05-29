import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mail, Lock, User, ArrowRight, Activity, AlertCircle, ShieldAlert, Sparkles, CheckCircle2, ArrowLeft, KeyRound, RefreshCw } from 'lucide-react';

const AUTH_API_URL = 'http://localhost:5000/api/auth';

export default function LoginPortal({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Verification States
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputRefs = useRef([]);

  // Google OAuth Config State
  const [googleClientId, setGoogleClientId] = useState('');
  const googleBtnRef = useRef(null);

  // Fetch Google Client ID on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get(`${AUTH_API_URL}/config`);
        if (response.data?.googleClientId) {
          setGoogleClientId(response.data.googleClientId);
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch Google Auth config from server:', err.message);
      }
    };
    fetchConfig();
  }, []);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!googleClientId || showOtpScreen) return;

    const initializeGoogleSignIn = () => {
      if (window.google && window.google.accounts) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });

          if (googleBtnRef.current) {
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: 'standard',
              theme: 'filled_blue',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              width: 320
            });
          }
        } catch (err) {
          console.error('Failed to initialize Google Sign-In:', err);
        }
      } else {
        setTimeout(initializeGoogleSignIn, 300);
      }
    };

    initializeGoogleSignIn();
  }, [googleClientId, isSignUp, showOtpScreen]);

  // Resend Timer Countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleGoogleCredentialResponse = async (googleResponse) => {
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(`${AUTH_API_URL}/google`, {
        idToken: googleResponse.credential
      });

      if (response.data?.success) {
        setSuccess('Successfully authenticated with Google!');
        setTimeout(() => {
          onLoginSuccess(response.data.user, response.data.token);
        }, 800);
      }
    } catch (err) {
      console.error('Google auth callback error:', err);
      setError(err.response?.data?.message || 'Google account authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Submit standard local Email/Password registration or login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || (isSignUp && !name)) {
      setError('Please fill in all standard credentials.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isSignUp ? `${AUTH_API_URL}/register` : `${AUTH_API_URL}/login`;
      const payload = isSignUp ? { name, email, password } : { email, password };
      
      const response = await axios.post(endpoint, payload);

      if (response.data?.success) {
        if (response.data.needsVerification) {
          // Switch to OTP Code entry view
          setOtpEmail(response.data.email);
          setSuccess(response.data.message);
          setOtpValues(['', '', '', '', '', '']);
          setTimeout(() => {
            setShowOtpScreen(true);
            setSuccess('');
          }, 1500);
        } else {
          setSuccess('Logged in successfully!');
          setTimeout(() => {
            onLoginSuccess(response.data.user, response.data.token);
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (err.response?.data?.needsVerification) {
        // Handle unverified user trying to sign in
        setOtpEmail(err.response.data.email);
        setError(err.response.data.message);
        setOtpValues(['', '', '', '', '', '']);
        setTimeout(() => {
          setShowOtpScreen(true);
          setError('');
        }, 2000);
      } else {
        setError(err.response?.data?.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle individual OTP box inputs with caret auto-shifting
  const handleOtpChange = (index, val) => {
    if (isNaN(val) && val !== '') return; // Accept only numbers

    const newValues = [...otpValues];
    newValues[index] = val.slice(-1); // Only keep last character typed
    setOtpValues(newValues);

    // Auto focus next box if typed
    if (val !== '' && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  // Handle keyboard backspaces to reverse caret focus
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otpValues[index] === '' && index > 0 && otpInputRefs.current[index - 1]) {
      otpInputRefs.current[index - 1].focus();
    }
  };

  // Support direct copy paste of the complete 6-digit code!
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return; // Valid only if 6 numeric digits

    const chars = pastedData.split('');
    setOtpValues(chars);
    // Focus the final box
    if (otpInputRefs.current[5]) {
      otpInputRefs.current[5].focus();
    }
  };

  // Submit OTP Verification Code
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const otpCode = otpValues.join('');
    if (otpCode.length < 6) {
      setError('Please fill in the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${AUTH_API_URL}/verify-otp`, {
        email: otpEmail,
        otpCode
      });

      if (response.data?.success) {
        setSuccess('Verification successful! Access granted.');
        setTimeout(() => {
          onLoginSuccess(response.data.user, response.data.token);
        }, 1000);
      }
    } catch (err) {
      console.error('OTP verify error:', err);
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend fresh OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await axios.post(`${AUTH_API_URL}/resend-otp`, {
        email: otpEmail
      });

      if (response.data?.success) {
        setSuccess(response.data.message);
        setResendTimer(60); // Block resend for 60 seconds
        setOtpValues(['', '', '', '', '', '']);
        if (otpInputRefs.current[0]) {
          otpInputRefs.current[0].focus();
        }
      }
    } catch (err) {
      console.error('OTP resend error:', err);
      setError(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Dev mode sandbox bypass
  const handleSandboxBypass = () => {
    onLoginSuccess({
      name: 'Sandbox Developer',
      email: 'dev@voxscribe.local',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=SandboxDev',
      method: 'sandbox_bypass'
    }, 'mock_token_123456');
  };

  // RENDER OTP SCREEN
  if (showOtpScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080b11] relative overflow-hidden px-4 py-12">
        {/* Cinematic Glowing Background Blobs */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

        <div className="w-full max-w-md relative z-10">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 shadow-lg shadow-cyan-500/20 mb-4">
              <KeyRound size={22} className="text-white animate-pulse" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white font-['Outfit']">
              Verify Your Email
            </h1>
            <p className="text-xs text-gray-400 mt-2 font-medium leading-relaxed max-w-[280px]">
              We sent a 6-digit OTP code to: <br/>
              <span className="text-cyan-400 font-bold">{otpEmail}</span>
            </p>
          </div>

          <div className="glass-panel glass-panel-glow rounded-3xl p-8 relative overflow-hidden text-center">
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              {error && (
                <div className="flex items-start text-left gap-2.5 text-xs text-red-400 bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl w-full">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-start text-left gap-2.5 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl w-full">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              {/* 6 Individual Code Inputs */}
              <div className="flex items-center justify-between gap-2.5 my-6">
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    ref={el => otpInputRefs.current[idx] = el}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                    className="w-12 h-12 bg-[#0d121f]/50 border border-white/5 rounded-xl text-center font-mono text-lg font-black text-cyan-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300"
                    placeholder="-"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Verifying Code...' : 'Activate Workspace'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="flex flex-col items-center mt-6 space-y-4">
              <div className="text-xs">
                {resendTimer > 0 ? (
                  <span className="text-gray-500">Resend code in {resendTimer}s</span>
                ) : (
                  <button
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    <span>Resend OTP Code</span>
                  </button>
                )}
              </div>

              <div className="w-full border-t border-white/5 pt-4">
                <button
                  onClick={() => { setShowOtpScreen(false); setError(''); setSuccess(''); }}
                  className="text-xs font-semibold text-gray-400 hover:text-white transition-all duration-200 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Return to login page</span>
                </button>
              </div>
            </div>
            
            {/* Sandbox Ethereal instructions */}
            {!googleClientId && (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-left space-y-2 mt-4">
                <div className="flex items-start gap-2 text-amber-400">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Dev Sandbox Notice</span>
                </div>
                <p className="text-[10.5px] text-gray-400 leading-normal">
                  OTP emails are generated using Ethereal sandbox. Copy the 6-digit code by **clicking the secure Ethereal preview link** printed in your **Node.js terminal logs**!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // STANDARD LOGIN / SIGN UP RENDER
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080b11] relative overflow-hidden px-4 py-12">
      {/* Cinematic Glowing Background Blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 shadow-lg shadow-cyan-500/20 mb-4">
            <Activity size={24} className="text-white" />
            <div className="absolute inset-0 rounded-2xl border border-white/20 animate-ping opacity-25" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white font-['Outfit']">
            VOX <span className="text-cyan-400 font-light">SCRIBE</span>
          </h1>
          <p className="text-sm text-gray-400 mt-2 font-medium">
            Enter the premium Speech-to-Text workspace
          </p>
        </div>

        {/* Main Authentication Card */}
        <div className="glass-panel glass-panel-glow rounded-3xl p-8 relative overflow-hidden">
          {/* Tabs */}
          <div className="flex bg-white/5 border border-white/5 rounded-2xl p-1 mb-6">
            <button
              onClick={() => { setIsSignUp(false); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                !isSignUp ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                isSignUp ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 text-xs text-red-400 bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl w-full">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2.5 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl w-full">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-[#0d121f]/50 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all duration-300"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#0d121f]/50 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0d121f]/50 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all duration-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="border-t border-white/5 w-full absolute" />
            <span className="bg-[#0b0f19] px-3 text-xs font-bold text-gray-500 relative z-10 uppercase tracking-wider">Or Connect With</span>
          </div>

          {/* Dynamic Google Login Section */}
          {googleClientId ? (
            <div className="flex flex-col items-center justify-center w-full">
              {/* Native Google Sign-In Container */}
              <div 
                ref={googleBtnRef} 
                className="w-full flex justify-center hover:scale-[1.01] transition-transform duration-200" 
              />
              <p className="text-[10px] text-gray-500 mt-2 text-center">
                Signs you in securely using Google accounts active on this device
              </p>
            </div>
          ) : (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-left space-y-3">
              <div className="flex items-start gap-2 text-amber-400">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span className="text-xs font-bold uppercase tracking-wider">Google OAuth Config Needed</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-normal">
                To connect real device accounts, configure your <code className="text-cyan-400 font-semibold font-mono">GOOGLE_CLIENT_ID</code> inside the backend <code className="text-cyan-400 font-mono">.env</code> file.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSandboxBypass}
                  className="flex-1 text-center bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-xl py-2 text-xs font-bold cursor-pointer transition-colors"
                >
                  Quick Dev Sandbox
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
