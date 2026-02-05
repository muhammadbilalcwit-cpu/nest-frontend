'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import clsx from 'clsx';

interface VoiceNotePlayerProps {
  url: string;
  duration?: number;
  waveform?: number[];
  isOwn: boolean;
}

export function VoiceNotePlayer({ url, duration, waveform, isOwn }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Generate default waveform if not provided
  const displayWaveform = waveform?.length
    ? waveform
    : Array.from({ length: 40 }, () => Math.random() * 0.8 + 0.2);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (!duration && audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audioDuration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audio.currentTime = percentage * audioDuration;
    setCurrentTime(audio.currentTime);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 rounded-2xl min-w-[200px] max-w-[280px]',
        isOwn
          ? 'bg-primary-500/20'
          : 'bg-slate-200/50 dark:bg-slate-700/50'
      )}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
          isOwn
            ? 'bg-primary-500 hover:bg-primary-600 text-white'
            : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-700 dark:text-white'
        )}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>

      {/* Waveform visualization */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="flex items-center gap-[2px] h-8 cursor-pointer"
          onClick={handleWaveformClick}
        >
          {displayWaveform.map((height, index) => {
            const barProgress = (index / displayWaveform.length) * 100;
            const isActive = barProgress <= progress;

            return (
              <div
                key={index}
                className={clsx(
                  'w-[3px] rounded-full transition-colors',
                  isActive
                    ? isOwn
                      ? 'bg-primary-400'
                      : 'bg-slate-500 dark:bg-slate-300'
                    : isOwn
                    ? 'bg-primary-300/40'
                    : 'bg-slate-300 dark:bg-slate-500'
                )}
                style={{
                  height: `${Math.max(height * 100, 15)}%`,
                }}
              />
            );
          })}
        </div>

        {/* Duration */}
        <span
          className={clsx(
            'text-xs',
            isOwn ? 'text-primary-200' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          {isPlaying || currentTime > 0
            ? formatTime(currentTime)
            : formatTime(audioDuration)}
        </span>
      </div>
    </div>
  );
}
