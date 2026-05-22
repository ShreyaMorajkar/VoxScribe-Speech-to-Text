import React, { useState } from 'react';
import { Copy, Check, Download, Volume2, Sparkles, AudioLines } from 'lucide-react';

export default function TranscriptionDisplay({ transcription, isTranscribing }) {
  const [copied, setCopied] = useState(false);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);

  const handleCopy = () => {
    if (!transcription?.text) return;
    navigator.clipboard.writeText(transcription.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format) => {
    if (!transcription?.text) return;
    
    let content = '';
    let filename = '';
    let mimeType = 'text/plain';

    if (format === 'txt') {
      content = `Speech-to-Text Transcription\n`;
      content += `===========================\n`;
      content += `Date: ${new Date(transcription.createdAt || Date.now()).toLocaleString()}\n`;
      content += `Filename: ${transcription.filename}\n`;
      content += `Duration: ${transcription.duration.toFixed(1)}s\n\n`;
      content += `Transcription:\n${transcription.text}\n`;
      filename = `${transcription.filename.split('.')[0]}-transcript.txt`;
    } else if (format === 'json') {
      content = JSON.stringify(transcription, null, 2);
      filename = `${transcription.filename.split('.')[0]}-transcript.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleTextToSpeech = () => {
    if (!transcription?.text) return;

    if ('speechSynthesis' in window) {
      if (isPlayingSpeech) {
        window.speechSynthesis.cancel();
        setIsPlayingSpeech(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(transcription.text);
      utterance.onend = () => {
        setIsPlayingSpeech(false);
      };
      utterance.onerror = () => {
        setIsPlayingSpeech(false);
      };

      setIsPlayingSpeech(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in this browser.');
    }
  };

  return (
    <div className="glass-panel glass-panel-glow rounded-3xl p-6 relative overflow-hidden transition-all duration-300">
      
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col space-y-4 relative z-10 h-full justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-cyan-400" />
            <h3 className="text-lg font-bold text-gray-200">
              Transcription Panel
            </h3>
          </div>
          
          {transcription && (
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {transcription.duration.toFixed(1)}s
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 capitalize">
                {transcription.language}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="min-h-[140px] flex items-center justify-center py-2">
          {isTranscribing ? (
            /* AI Shimmer loading state */
            <div className="flex flex-col items-center justify-center space-y-4 w-full py-6">
              {/* Dynamic AI Wave lines */}
              <div className="flex items-center justify-center gap-1.5 h-10 w-full">
                <div className="w-1.5 h-6 rounded-full bg-cyan-400 ai-wave-bar" />
                <div className="w-1.5 h-8 rounded-full bg-indigo-400 ai-wave-bar" />
                <div className="w-1.5 h-10 rounded-full bg-cyan-500 ai-wave-bar" />
                <div className="w-1.5 h-8 rounded-full bg-indigo-500 ai-wave-bar" />
                <div className="w-1.5 h-6 rounded-full bg-cyan-400 ai-wave-bar" />
              </div>
              <div className="space-y-2 w-4/5 text-center">
                <p className="text-sm font-medium text-cyan-400 animate-pulse">
                  Synthesizing speech waves...
                </p>
                <p className="text-xs text-gray-500">
                  Sending payload to Speech-to-Text API
                </p>
              </div>
            </div>
          ) : transcription ? (
            /* Transcription Display */
            <div className="w-full">
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {transcription.text}
              </p>
            </div>
          ) : (
            /* Idle Placeholder */
            <div className="flex flex-col items-center justify-center space-y-2 text-center py-8">
              <AudioLines size={36} className="text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-gray-400">
                  Waiting for audio feed
                </p>
                <p className="text-xs text-gray-600 mt-1 max-w-[240px] mx-auto">
                  Record your voice or drop an audio file above to see transcription here
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {transcription && !isTranscribing && (
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            {/* Play text as speech */}
            <button
              onClick={handleTextToSpeech}
              title="Speak transcript"
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-300 ${
                isPlayingSpeech
                  ? 'bg-cyan-500 text-white animate-pulse'
                  : 'bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/20'
              }`}
            >
              <Volume2 size={14} />
              <span>{isPlayingSpeech ? 'Reading...' : 'Speak'}</span>
            </button>

            {/* General Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                title="Copy to clipboard"
                className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors border border-white/5 flex items-center justify-center"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
              
              <button
                onClick={() => handleDownload('txt')}
                title="Download TXT"
                className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors border border-white/5 flex items-center justify-center text-xs font-semibold gap-1 px-3"
              >
                <Download size={14} />
                <span>TXT</span>
              </button>

              <button
                onClick={() => handleDownload('json')}
                title="Download JSON"
                className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors border border-white/5 flex items-center justify-center text-xs font-semibold gap-1 px-3"
              >
                <Download size={14} />
                <span>JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
