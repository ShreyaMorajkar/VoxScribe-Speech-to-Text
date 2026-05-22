import React, { useState, useRef } from 'react';
import { UploadCloud, AudioLines, FileAudio, AlertCircle } from 'lucide-react';

export default function FileUploader({ onFileSelected, isTranscribing }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Define supported types
  const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.webm'];
  const maxFileSize = 25 * 1024 * 1024; // 25 MB

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateFile = (file) => {
    setError(null);
    if (!file) return false;

    // Check extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext) && !file.type.startsWith('audio/')) {
      setError(`Unsupported file format. Please upload: ${allowedExtensions.join(', ')}`);
      return false;
    }

    // Check size
    if (file.size > maxFileSize) {
      setError("File is too large. Maximum size is 25 MB.");
      return false;
    }

    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (isTranscribing) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelected(file);
      }
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelected(file);
      }
    }
  };

  const onButtonClick = () => {
    if (!isTranscribing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="glass-panel glass-panel-glow rounded-3xl p-6 transition-all duration-300">
      <div className="flex flex-col space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
            Upload Audio File
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Drag and drop or browse standard high-fidelity audio files
          </p>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={`h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group p-4 text-center ${
            isDragActive 
              ? 'border-cyan-400 bg-cyan-400/5 shadow-inner' 
              : 'border-white/10 hover:border-cyan-500/50 hover:bg-white/5'
          } ${isTranscribing ? 'pointer-events-none opacity-40' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="audio/*"
            onChange={handleFileInputChange}
          />

          {!selectedFile ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud size={28} className="text-cyan-400 group-hover:text-cyan-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200">
                  Drag & drop audio file here
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports MP3, WAV, M4A, OGG, and WebM (Max 25MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                <FileAudio size={28} />
              </div>
              <div className="max-w-[280px]">
                <p className="text-sm font-semibold text-emerald-400 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatBytes(selectedFile.size)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
