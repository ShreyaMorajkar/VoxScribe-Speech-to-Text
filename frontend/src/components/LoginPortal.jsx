import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mail, Lock, User, ArrowRight, Activity, AlertCircle, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

const AUTH_API_URL = 'http://localhost:5000/api/auth';

export default function LoginPortal({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Google OAuth Config State
  const [googleClientId, setGoogleClientId] = useState('');
  const googleBtnRef = useRef(null);

  // Fetch Google Client ID from backend config on mount
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

  // Initialize official Google Identity Services when Client ID is available
  useEffect(() => {
    if (!googleClientId) return;

    const initializeGoogleSignIn = () => {
      if (window.google && window.google.accounts) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });

          // Render the official native Google Sign-In button
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

          // Optional: Display One Tap Prompt for an even more integrated experience!
          window.google.accounts.id.prompt();

        } catch (err) {
          console.error('Failed to initialize Google Sign-In SDK:', err);
        }
      } else {
        // Retry in 300ms if script is still loading asynchronously
        setTimeout(initializeGoogleSignIn, 300);
      }
    };

    initializeGoogleSignIn();
  }, [googleClientId, isSignUp]); // Re-render when client ID changes or switching tabs

  // Callback triggered when user completes authenticating in the official Google Prompt
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
        setSuccess(isSignUp ? 'Account created successfully! Logging you in...' : 'Logged in successfully!');
        
        // Let user see success state for a brief moment for premium UX feel
        setTimeout(() => {
          onLoginSuccess(response.data.user, response.data.token);
        }, 1000);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Dev mode sandbox bypass if no client ID is configured yet
  const handleSandboxBypass = () => {
    onLoginSuccess({
      name: 'Sandbox Developer',
      email: 'dev@voxscribe.local',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=SandboxDev',
      method: 'sandbox_bypass'
    }, 'mock_token_123456');
  };

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
