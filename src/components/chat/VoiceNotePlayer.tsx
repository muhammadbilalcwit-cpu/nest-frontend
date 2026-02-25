'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import clsx from 'clsx';

interface VoiceNotePlayerProps {
  url: string;
  duration?: number;
  waveform?: number[];
  isOwn: boolean;
}

/**
 * Voice note player using Web Audio API.
 *
 * MediaRecorder-produced WebM files lack proper Cues / duration in the header,
 * which causes Chrome's <audio> element to fail with
 * "FFmpegDemuxer: demuxer seek failed".
 *
 * AudioContext.decodeAudioData() is more lenient and handles these files fine.
 */
export function VoiceNotePlayer({ url, duration, waveform, isOwn }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [ready, setReady] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playStartRef = useRef(0);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Cap waveform to 28 bars max (downsample if backend provides more)
  const maxBars = 28;
  const fallbackWaveform = useMemo(
    () => Array.from({ length: maxBars }, () => Math.random() * 0.8 + 0.2),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url]
  );
  const rawWaveform = waveform?.length ? waveform : fallbackWaveform;
  const displayWaveform =
    rawWaveform.length > maxBars
      ? Array.from({ length: maxBars }, (_, i) => {
          const idx = Math.floor((i * rawWaveform.length) / maxBars);
          return rawWaveform[idx];
        })
      : rawWaveform;

  // Fetch + decode the audio into an AudioBuffer
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const arrayBuf = await resp.arrayBuffer();
        if (cancelled) return;

        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioCtxRef.current = ctx;

        const decoded = await ctx.decodeAudioData(arrayBuf);
        if (cancelled) return;

        bufferRef.current = decoded;
        if (!duration && decoded.duration && isFinite(decoded.duration)) {
          setAudioDuration(decoded.duration);
        }
        setReady(true);
      } catch (err) {
        console.error('[VoicePlayer] Failed to load/decode audio:', err);
      }
    };

    load();

    return () => {
      cancelled = true;
      try { sourceRef.current?.stop(); } catch { /* ignore */ }
      cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [url, duration]);

  // Update currentTime via requestAnimationFrame while playing
  useEffect(() => {
    if (!isPlaying) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const tick = () => {
      const elapsed = offsetRef.current + (ctx.currentTime - playStartRef.current);
      setCurrentTime(Math.min(elapsed, audioDuration));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, audioDuration]);

  const stopSource = useCallback(() => {
    try { sourceRef.current?.stop(); } catch { /* already stopped */ }
    sourceRef.current = null;
  }, []);

  const togglePlay = useCallback(() => {
    const ctx = audioCtxRef.current;
    const buffer = bufferRef.current;
    if (!ctx || !buffer) return;

    if (ctx.state === 'suspended') ctx.resume();

    if (isPlaying) {
      const elapsed = ctx.currentTime - playStartRef.current;
      offsetRef.current += elapsed;
      stopSource();
      setIsPlaying(false);
    } else {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        const elapsed = offsetRef.current + (ctx.currentTime - playStartRef.current);
        if (elapsed >= buffer.duration - 0.05) {
          offsetRef.current = 0;
          setCurrentTime(0);
          setIsPlaying(false);
        }
      };

      playStartRef.current = ctx.currentTime;
      source.start(0, offsetRef.current);
      sourceRef.current = source;
      setIsPlaying(true);
    }
  }, [isPlaying, stopSource]);

  const handleWaveformClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const ctx = audioCtxRef.current;
    const buffer = bufferRef.current;
    if (!ctx || !buffer || !audioDuration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const seekTo = percentage * audioDuration;

    if (isPlaying) {
      stopSource();
      offsetRef.current = seekTo;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        const elapsed = offsetRef.current + (ctx.currentTime - playStartRef.current);
        if (elapsed >= buffer.duration - 0.05) {
          offsetRef.current = 0;
          setCurrentTime(0);
          setIsPlaying(false);
        }
      };
      playStartRef.current = ctx.currentTime;
      source.start(0, seekTo);
      sourceRef.current = source;
    } else {
      offsetRef.current = seekTo;
    }
    setCurrentTime(seekTo);
  }, [isPlaying, audioDuration, stopSource]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div
      className={clsx(
        'flex items-center gap-3 py-3 pl-3 pr-5 rounded-2xl min-w-[200px] max-w-[280px]',
        isOwn
          ? 'bg-primary-500/20'
          : 'bg-slate-200/50 dark:bg-slate-600/30'
      )}
    >
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={!ready}
        className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
          !ready && 'opacity-50 cursor-not-allowed',
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
                  'w-[3px] flex-shrink-0 rounded-full transition-colors',
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
