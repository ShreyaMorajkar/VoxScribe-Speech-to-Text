import React, { useState } from 'react';
import { History, Play, Pause, Trash2, Clock, Calendar, ChevronRight } from 'lucide-react';

export default function HistoryList({ history, onSelect, onDelete, activeId }) {
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioPlayersRef = React.useRef({});

  const toggleAudio = (e, item) => {
    e.stopPropagation(); // Avoid selecting the card when playing audio
    const id = item._id;
    const player = audioPlayersRef.current[id];

    if (!player) return;

    if (playingAudioId === id) {
      player.pause();
      setPlayingAudioId(null);
    } else {
      // Pause any other playing audios first
      if (playingAudioId && audioPlayersRef.current[playingAudioId]) {
        audioPlayersRef.current[playingAudioId].pause();
      }
      player.play();
      setPlayingAudioId(id);

      player.onended = () => {
        setPlayingAudioId(null);
      };
    }
  };

  const getAudioUrl = (audioPath) => {
    // Connect to port 5000 backend upload server
    return `http://localhost:5000/uploads/${audioPath}`;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="glass-panel glass-panel-glow rounded-3xl p-6 h-full flex flex-col space-y-4 max-h-[700px] overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <History size={18} className="text-cyan-400" />
        <h3 className="text-lg font-bold text-gray-200">
          Transcription History
        </h3>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
          {history.length}
        </span>
      </div>

      {/* History Items Scrollable Container */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {history.length === 0 ? (
          <div className="text-center py-16 text-gray-500 flex flex-col items-center justify-center space-y-2">
            <History size={28} className="text-gray-700 opacity-60" />
            <p className="text-sm font-semibold">No transcriptions yet</p>
            <p className="text-xs text-gray-600 max-w-[200px] mx-auto">
              Your audio feed recordings will show up here
            </p>
          </div>
        ) : (
          history.map((item) => {
            const isActive = activeId === item._id;
            const isPlaying = playingAudioId === item._id;

            return (
              <div
                key={item._id}
                onClick={() => onSelect(item)}
                className={`group glass-panel rounded-2xl p-4 cursor-pointer hover:border-cyan-500/30 transition-all duration-300 relative overflow-hidden flex flex-col space-y-2 ${
                  isActive 
                    ? 'border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_15px_-5px_rgba(6,182,212,0.25)]' 
                    : 'hover:bg-white/5 border-white/5'
                }`}
              >
                {/* Audio Element (Hidden) */}
                {item.audioPath && (
                  <audio
                    ref={(el) => (audioPlayersRef.current[item._id] = el)}
                    src={getAudioUrl(item.audioPath)}
                    preload="none"
                  />
                )}

                {/* Card Title & Delete */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-gray-200 group-hover:text-cyan-400 transition-colors truncate max-w-[170px]">
                    {item.filename}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item._id);
                    }}
                    title="Delete transcription"
                    className="p-1 text-gray-500 hover:text-red-400 bg-transparent hover:bg-white/5 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Sub-text snippet */}
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {item.text}
                </p>

                {/* Footer Metadata */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1 text-[10px] text-gray-500 font-semibold">
                  <div className="flex items-center gap-2">
                    {/* Embedded Audio Toggle */}
                    {item.audioPath && (
                      <button
                        onClick={(e) => toggleAudio(e, item)}
                        className={`flex items-center justify-center p-1.5 rounded-full transition-all duration-200 ${
                          isPlaying 
                            ? 'bg-cyan-500 text-white animate-pulse' 
                            : 'bg-white/5 hover:bg-white/10 text-cyan-400'
                        }`}
                      >
                        {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                      </button>
                    )}
                    
                    <span className="flex items-center gap-0.5">
                      <Clock size={9} />
                      {item.duration.toFixed(1)}s
                    </span>
                  </div>

                  <span className="flex items-center gap-0.5">
                    <Calendar size={9} />
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
