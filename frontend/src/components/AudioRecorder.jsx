import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, AlertCircle, RefreshCw } from 'lucide-react';

export default function AudioRecorder({ onRecordingComplete, isTranscribing }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Web Audio API refs for visualizer
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Web Speech API refs for high-fidelity fallback transcription
  const recognitionRef = useRef(null);
  const localTranscriptRef = useRef('');
  const isRecordingRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopStreamsAndVisualizer();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopStreamsAndVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (recognitionRef.current) {
      isRecordingRef.current = false;
      recognitionRef.current.stop();
    }
  };

  // Start Recording
  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    localTranscriptRef.current = '';

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Initialize Canvas Visualizer using Web Audio API
      setupVisualizer(stream);

      // 3. Initialize Web Speech API for local high-fidelity fallback transcription
      setupSpeechRecognition();

      // 4. Create MediaRecorder
      const options = { mimeType: 'audio/webm' };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback for browsers that don't support audio/webm
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = (Date.now() - startTimeRef.current) / 1000;
        
        onRecordingComplete(
          audioBlob, 
          localTranscriptRef.current.trim(), 
          duration
        );
        stopStreamsAndVisualizer();
      };

      // 5. Start everything
      recorder.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      startTimeRef.current = Date.now();
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Mic access error:', err);
      setError('Could not access microphone. Please check system permissions.');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Setup Web Audio API analysis & Canvas loop
  const setupVisualizer = (stream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    source.connect(analyser);
    analyser.fftSize = 256;

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const draw = () => {
      if (!canvasRef.current) return;
      const width = canvas.width;
      const height = canvas.height;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#080b11';
      ctx.fillRect(0, 0, width, height);

      // Draw elegant neon futuristic audio waveforms
      const barWidth = (width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height * 0.8;
        
        // Gradient color: Cyan to Indigo glow
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#6366f1'); // Indigo
        gradient.addColorStop(0.5, '#4f46e5'); // Medium Indigo
        gradient.addColorStop(1, '#06b6d4'); // Cyan

        ctx.fillStyle = gradient;
        
        // Rounded bars for high premium look
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth - 2, barHeight, [4, 4, 0, 0]);
        ctx.fill();

        x += barWidth;
      }

      // Draw a subtle horizontal line in center
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    draw();
  };

  // Setup Web Speech API for fallback transcription
  const setupSpeechRecognition = () => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.warn('SpeechRecognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      localTranscriptRef.current += finalTranscript;
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return; // Silence warning bypass
      console.error('Speech recognition error:', e.error);
    };

    recognition.onend = () => {
      // If still recording, keep the session alive bypassing browser thresholds
      if (isRecordingRef.current) {
        try {
          recognition.start();
          console.log('🔄 Web Speech engine auto-restarted to maintain stream.');
        } catch (err) {
          console.error('Failed to restart speech engine:', err);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Helper to format MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel glass-panel-glow rounded-3xl p-6 relative overflow-hidden transition-all duration-300">
      {/* Visual background gradient pulse */}
      {isRecording && (
        <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent pointer-events-none cyber-glow" />
      )}

      <div className="flex flex-col items-center justify-center space-y-6 relative z-10">
        <div className="text-center">
          <h3 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
            Record Audio
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Capture clear audio directly using your device microphone
          </p>
        </div>

        {/* Canvas for Web Audio visualizer */}
        <div className="w-full h-24 rounded-2xl overflow-hidden bg-[#080b11] border border-white/5 flex items-center justify-center relative">
          <canvas 
            ref={canvasRef} 
            width={400} 
            height={96} 
            className={`w-full h-full transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-0 absolute'}`}
          />
          {!isRecording && (
            <div className="text-gray-500 text-sm flex items-center gap-2">
              <Mic size={16} className="text-cyan-400/60 animate-pulse" />
              <span>Visualizer Ready</span>
            </div>
          )}
        </div>

        {/* Recording status details */}
        <div className="flex items-center gap-6 justify-center">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-gray-600'}`} />
            <span className="font-mono text-xl tracking-widest text-gray-200">
              {formatTime(recordingTime)}
            </span>
          </div>
          {isRecording && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Streaming Audio
            </span>
          )}
        </div>

        {/* Controller Button */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isTranscribing}
              className={`w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 flex items-center justify-center transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-400/40 hover:scale-105 group disabled:opacity-50 disabled:pointer-events-none`}
            >
              <Mic size={28} className="text-white group-hover:rotate-12 transition-transform duration-300" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all duration-300 shadow-lg shadow-red-500/25 hover:scale-105 animate-pulse"
            >
              <Square size={24} className="text-white fill-white" />
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/5 border border-red-500/10 p-3 rounded-xl w-full">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
