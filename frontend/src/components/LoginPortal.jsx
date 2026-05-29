import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Activity, AlertCircle, ShieldAlert } from 'lucide-react';

export default function LoginPortal({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showGoogleMock, setShowGoogleMock] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (isSignUp && !name)) {
      setError('Please fill in all standard credentials.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // Mock successful authentication
    const userSession = {
      name: isSignUp ? name : email.split('@')[0],
      email: email,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      method: 'local'
    };

    onLoginSuccess(userSession);
  };

  const handleGoogleLogin = () => {
    setShowGoogleMock(true);
  };

  const selectGoogleAccount = (googleUser) => {
    setShowGoogleMock(false);
    onLoginSuccess({
      name: googleUser.name,
      email: googleUser.email,
      avatar: googleUser.avatar,
      method: 'google'
    });
  };

  // Mock list of Google Accounts to choose from
  const mockGoogleAccounts = [
    {
      name: 'Shreya Morajkar',
      email: 'shreya.morajkar@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Shreya'
    },
    {
      name: 'Alex Developer',
      email: 'alex.dev@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080b11] relative overflow-hidden px-4 py-12">
      {/* Cinematic Glowing Background Blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
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

        {/* main Form Card */}
        <div className="glass-panel glass-panel-glow rounded-3xl p-8 relative overflow-hidden">
          {/* Tabs */}
          <div className="flex bg-white/5 border border-white/5 rounded-2xl p-1 mb-8">
            <button
              onClick={() => { setIsSignUp(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                !isSignUp ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(''); }}
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

            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
                  <input
                    type="text"
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
                {!isSignUp && (
                  <a href="#" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">Forgot?</a>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0d121f]/50 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all duration-300"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 cursor-pointer mt-2"
            >
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="border-t border-white/5 w-full absolute" />
            <span className="bg-[#0b0f19] px-3 text-xs font-bold text-gray-500 relative z-10 uppercase tracking-wider">Or Connect With</span>
          </div>

          {/* Google SSO Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            {/* SVG Official Google Icon G Logo */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.98 0 12 0 7.35 0 3.37 2.67 1.48 6.56l3.88 3c.92-2.75 3.5-4.52 6.64-4.52z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.275c0-.825-.075-1.62-.21-2.385H12v4.515h6.48c-.28 1.485-1.11 2.745-2.37 3.585l3.69 2.865c2.16-1.995 3.39-4.935 3.39-8.58z"
              />
              <path
                fill="#FBBC05"
                d="M5.36 14.44c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.48 6.56C.54 8.2.01 10.04.01 12c0 1.96.53 3.8 1.47 5.44l3.88-3z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.69-2.865c-1.02.69-2.33 1.1-4.27 1.1-3.14 0-5.72-1.77-6.64-4.52l-3.88 3C3.37 21.33 7.35 24 12 24z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>

      {/* Google Mock Account Chooser Modal Overlay */}
      {showGoogleMock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 transform scale-100 flex flex-col text-gray-800">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-gray-100 flex flex-col items-center text-center">
              <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <h3 className="text-lg font-bold text-gray-900 font-sans">Sign in with Google</h3>
              <p className="text-xs text-gray-500 mt-1">to continue to voxscribe-sandbox.local</p>
            </div>

            {/* Account List */}
            <div className="p-4 space-y-2 max-h-72 overflow-y-auto bg-gray-50/50">
              {mockGoogleAccounts.map((account, idx) => (
                <button
                  key={idx}
                  onClick={() => selectGoogleAccount(account)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all duration-200 text-left cursor-pointer"
                >
                  <img
                    src={account.avatar}
                    alt={account.name}
                    className="w-10 h-10 rounded-full border border-gray-100 bg-gray-50"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{account.name}</p>
                    <p className="text-xs text-gray-500 truncate">{account.email}</p>
                  </div>
                </button>
              ))}

              {/* Add Custom User Option */}
              <button
                onClick={() => selectGoogleAccount({
                  name: 'Custom Guest',
                  email: 'guest.voxscribe@gmail.com',
                  avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Guest',
                })}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all duration-200 text-left text-blue-600 hover:text-blue-700 font-bold text-sm cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full border border-dashed border-blue-300 bg-blue-50 flex items-center justify-center shrink-0">
                  <User size={18} />
                </div>
                <span>Use another account</span>
              </button>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-medium">
              <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                <ShieldAlert size={12} />
                <span>Simulated Sandbox Environment</span>
              </div>
              <button
                onClick={() => setShowGoogleMock(false)}
                className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
