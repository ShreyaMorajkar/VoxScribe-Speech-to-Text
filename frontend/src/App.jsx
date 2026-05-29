import React, { useState, useEffect } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Mic, 
  Upload, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  X,
  Volume2,
  LogOut
} from 'lucide-react';
import AudioRecorder from './components/AudioRecorder';
import FileUploader from './components/FileUploader';
import TranscriptionDisplay from './components/TranscriptionDisplay';
import HistoryList from './components/HistoryList';
import LoginPortal from './components/LoginPortal';

const API_BASE_URL = 'http://localhost:5000/api/transcriptions';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('voxscribe_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [history, setHistory] = useState([]);
  const [activeTranscription, setActiveTranscription] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState('record'); // 'record' | 'upload'
  
  // Custom Toast Notifications
  const [notification, setNotification] = useState(null);

  // Fetch history on initial load
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('voxscribe_user');
    setUser(null);
    showToast('Successfully signed out.', 'info');
  };

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('voxscribe_user', JSON.stringify(userData));
    setUser(userData);
    showToast(`Welcome to VoxScribe, ${userData.name}!`, 'success');
  };

  if (!user) {
    return <LoginPortal onLoginSuccess={handleLoginSuccess} />;
  }

  const fetchHistory = async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      if (response.data?.success) {
        setHistory(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      showToast('Unable to load history. Using local cache.', 'warning');
    }
  };

  // Main transcription uploader pipeline
  const processAudio = async (audioBlob, localTranscript = '', duration = 0, customFilename = null) => {
    setIsTranscribing(true);
    showToast('Uploading audio package and invoking Speech-to-Text...', 'info');

    try {
      const formData = new FormData();
      
      // Determine file extension and name
      const fileExt = audioBlob.type.includes('webm') ? 'webm' : 'wav';
      const filename = customFilename || `vox-feed-${Date.now()}.${fileExt}`;
      const audioFile = new File([audioBlob], filename, { type: audioBlob.type });

      formData.append('audio', audioFile);
      formData.append('language', selectedLanguage);
      formData.append('duration', duration.toString());
      
      // In case we used Web Speech API on frontend, pass it to backend for high fidelity mock bypass
      if (localTranscript) {
        formData.append('localTranscript', localTranscript);
      }

      const response = await axios.post(`${API_BASE_URL}/transcribe`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data?.success) {
        const result = response.data.data;
        
        // Success celebration confetti
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#6366f1', '#10b981']
        });

        // Set as active transcription display
        setActiveTranscription(result);
        
        // Refresh history from DB
        await fetchHistory();
        showToast(
          response.data.message || 'Speech transcribed successfully!', 
          'success'
        );
      }
    } catch (err) {
      console.error('Transcription error:', err);
      const errMsg = err.response?.data?.message || 'Network error connecting to API server.';
      showToast(errMsg, 'error');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle local microphone recordings
  const handleRecordingComplete = (blob, localTranscript, duration) => {
    const filename = `recording-${Date.now()}.webm`;
    processAudio(blob, localTranscript, duration, filename);
  };

  // Handle local drag-drop file uploads
  const handleFileSelected = (file) => {
    // Read local duration if possible using Web Audio context (nice UX detail)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = function(e) {
      audioContext.decodeAudioData(e.target.result, function(buffer) {
        const duration = buffer.duration;
        processAudio(file, '', duration, file.name);
      }, function() {
        // Fallback duration
        processAudio(file, '', 0, file.name);
      });
    };
    reader.readAsArrayBuffer(file);
  };

  // Delete transcription from database & disk
  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${id}`);
      if (response.data?.success) {
        showToast('Transcription erased successfully', 'success');
        if (activeTranscription?._id === id) {
          setActiveTranscription(null);
        }
        fetchHistory();
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to erase transcription history.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#080b11] relative overflow-hidden pb-12">
      
      {/* Cinematic Glowing Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Interactive Toast System */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3.5 rounded-2xl border glass-panel shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 ${
          notification.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' :
          notification.type === 'error' ? 'border-red-500/30 bg-red-500/5 text-red-400' :
          notification.type === 'warning' ? 'border-amber-500/30 bg-amber-500/5 text-amber-400' :
          'border-cyan-500/30 bg-cyan-500/5 text-cyan-400'
        }`}>
          {notification.type === 'success' && <CheckCircle2 size={18} className="shrink-0 animate-bounce" />}
          {notification.type === 'error' && <AlertTriangle size={18} className="shrink-0 animate-pulse" />}
          {notification.type === 'warning' && <AlertTriangle size={18} className="shrink-0" />}
          {notification.type === 'info' && <Activity size={18} className="shrink-0 animate-spin" />}
          
          <div className="flex flex-col">
            <span className="text-xs font-bold leading-tight capitalize">
              {notification.type}
            </span>
            <span className="text-xs text-gray-300 font-semibold mt-0.5">
              {notification.message}
            </span>
          </div>

          <button 
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all duration-200 ml-4"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Navigation / Header Brand */}
        <header className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-6 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 shadow-lg shadow-cyan-500/20">
              <Activity size={22} className="text-white" />
              <div className="absolute inset-0 rounded-2xl border border-white/20 animate-ping opacity-25" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 flex items-center gap-1.5 font-['Outfit']">
                VOX <span className="text-cyan-400 font-light">SCRIBE</span>
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                High-Fidelity AI Speech-to-Text sandbox
              </p>
            </div>
          </div>

          {/* Language Selector & Tech badge */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-1.5">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-xs font-semibold text-cyan-400 border-none focus:outline-none cursor-pointer"
              >
                <option value="en" className="bg-[#080b11] text-gray-300">English (US)</option>
                <option value="es" className="bg-[#080b11] text-gray-300">Spanish (ES)</option>
                <option value="fr" className="bg-[#080b11] text-gray-300">French (FR)</option>
                <option value="de" className="bg-[#080b11] text-gray-300">German (DE)</option>
              </select>
            </div>

            {user && (
              <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-3 py-1.5">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-6 h-6 rounded-full border border-white/10 bg-white/5"
                />
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-[10px] font-bold text-gray-200 leading-tight truncate max-w-[100px]">
                    {user.name}
                  </span>
                  <span className="text-[8px] text-gray-400 font-semibold leading-none">
                    {user.method === 'google' ? 'Google Account' : 'Standard Session'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-red-400 transition-all duration-200 cursor-pointer ml-1"
                  title="Sign Out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles size={12} />
              <span>MERN Stack</span>
            </div>
          </div>
        </header>

        {/* Dashboard Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Control Panel (Uploader / Recorder) - Left Column */}
          <div className="lg:col-span-8 flex flex-col space-y-8">
            
            {/* Navigation Tabs */}
            <div className="flex bg-white/5 border border-white/5 rounded-2xl p-1.5 w-max">
              <button
                onClick={() => setActiveTab('record')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  activeTab === 'record'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Mic size={14} />
                <span>Live Recording</span>
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  activeTab === 'upload'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/15'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Upload size={14} />
                <span>Audio Upload</span>
              </button>
            </div>

            {/* Render selected active Tab */}
            {activeTab === 'record' ? (
              <AudioRecorder 
                onRecordingComplete={handleRecordingComplete}
                isTranscribing={isTranscribing}
              />
            ) : (
              <FileUploader 
                onFileSelected={handleFileSelected}
                isTranscribing={isTranscribing}
              />
            )}

            {/* Active Transcription Display Panel */}
            <TranscriptionDisplay 
              transcription={activeTranscription}
              isTranscribing={isTranscribing}
            />
          </div>

          {/* History Panel - Right Column */}
          <div className="lg:col-span-4 h-full">
            <HistoryList 
              history={history}
              onSelect={setActiveTranscription}
              onDelete={handleDelete}
              activeId={activeTranscription?._id}
            />
          </div>

        </div>

      </div>
    </div>
  );
}
