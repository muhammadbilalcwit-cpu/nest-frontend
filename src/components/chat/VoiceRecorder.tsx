'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Send, Trash2, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { chatApi } from '@/services/api';
import type { MessageAttachment } from '@/types';

interface VoiceRecorderProps {
  onVoiceNoteReady: (attachment: MessageAttachment) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onHasPendingVoiceNote?: (hasPending: boolean) => void;
  disabled?: boolean;
}

export function VoiceRecorder({
  onVoiceNoteReady,
  onRecordingStateChange,
  onHasPendingVoiceNote,
  disabled,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false); // Use ref to avoid stale closure issues
  const recordingStartTimeRef = useRef<number>(0); // Track when recording started
  const isCanceledRef = useRef(false); // Track if recording was canceled

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup function for resources - only called on unmount
  const cleanupRecording = useCallback(() => {
    const timeSinceStart = Date.now() - recordingStartTimeRef.current;
    console.log('cleanupRecording called, isRecordingRef:', isRecordingRef.current, 'timeSinceStart:', timeSinceStart);

    // Prevent React StrictMode from interrupting a recording that just started
    // If recording started less than 500ms ago, don't cleanup (it's likely StrictMode double-mount)
    if (isRecordingRef.current && timeSinceStart < 500) {
      console.log('Skipping cleanup - recording just started (likely React StrictMode)');
      return;
    }

    // Skip cleanup if no resources to clean
    if (!mediaRecorderRef.current && !streamRef.current && !audioContextRef.current) {
      console.log('No resources to cleanup, skipping');
      return;
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
      }
    }
    mediaRecorderRef.current = null;

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.warn('Error closing audio context:', e);
      }
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    isRecordingRef.current = false;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  // Notify parent of recording state changes
  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

  // Notify parent when there's a pending voice note to review
  useEffect(() => {
    onHasPendingVoiceNote?.(!!audioBlob);
  }, [audioBlob, onHasPendingVoiceNote]);

  const captureWaveform = useCallback(() => {
    // Use ref to check recording state to avoid stale closure
    if (!analyserRef.current || !isRecordingRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Get average amplitude and normalize to 0-1
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const avg = sum / dataArray.length / 255;

    setWaveformData((prev) => {
      const newData = [...prev, Math.max(avg, 0.1)];
      // Keep last 50 samples for visualization
      return newData.slice(-50);
    });

    // Use ref to check if we should continue
    if (isRecordingRef.current) {
      animationFrameRef.current = requestAnimationFrame(captureWaveform);
    }
  }, []);

  const startRecording = async () => {
    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Voice recording is not supported in this browser. Please use Chrome, Firefox, or Edge.');
      return;
    }

    // Check if MediaRecorder is supported
    if (typeof MediaRecorder === 'undefined') {
      toast.error('Voice recording is not supported in this browser.');
      return;
    }

    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted, tracks:', stream.getAudioTracks().length);
      streamRef.current = stream;

      // Set up audio context for waveform visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Resume audio context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        console.log('Resuming suspended AudioContext...');
        await audioContext.resume();
      }
      console.log('AudioContext state:', audioContext.state);

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Create media recorder with fallback mimeType
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        '', // Default browser format
      ];

      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (type === '' || MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      console.log('Selected mimeType:', selectedMimeType || 'default');

      const mediaRecorder = new MediaRecorder(
        stream,
        selectedMimeType ? { mimeType: selectedMimeType } : undefined
      );

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        console.log('ondataavailable fired, data size:', e.data.size);
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          console.log('Audio chunk received, total chunks:', audioChunksRef.current.length);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, chunks:', audioChunksRef.current.length, 'canceled:', isCanceledRef.current);

        // If recording was canceled, don't create the blob
        if (isCanceledRef.current) {
          console.log('Recording was canceled, not creating blob');
          audioChunksRef.current = [];
          return;
        }

        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || 'audio/webm',
          });
          console.log('Audio blob created, size:', blob.size);
          setAudioBlob(blob);
        } else {
          console.warn('No audio chunks collected');
          toast.error('Recording failed - no audio data captured');
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast.error('Recording error occurred');
        stopRecording(true);
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder onstart fired, state:', mediaRecorder.state);
      };

      mediaRecorder.onpause = () => {
        console.log('MediaRecorder onpause fired');
      };

      mediaRecorder.onresume = () => {
        console.log('MediaRecorder onresume fired');
      };

      // Set recording state before starting
      isRecordingRef.current = true;
      isCanceledRef.current = false; // Reset cancel flag
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setDuration(0);
      setWaveformData([]);
      setAudioBlob(null);

      // Start the media recorder
      // Using timeslice of 1000ms for more reliable chunk collection
      // (100ms was too fast and might miss data on quick stop)
      mediaRecorder.start(1000);
      console.log('MediaRecorder started, state:', mediaRecorder.state, 'mimeType:', mediaRecorder.mimeType);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          // Max recording length: 5 minutes
          if (prev >= 300) {
            stopRecording(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Start waveform capture
      captureWaveform();
    } catch (error) {
      console.error('Failed to start recording:', error);
      // Clean up any partial resources
      cleanupRecording();

      // Provide specific error messages based on the error type
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          toast.error('Microphone access denied. Please allow microphone permission in your browser settings.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          toast.error('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          toast.error('Microphone is being used by another application.');
        } else if (error.name === 'OverconstrainedError') {
          toast.error('Microphone does not meet the required constraints.');
        } else if (error.name === 'NotSupportedError') {
          toast.error('Voice recording is not supported in this browser.');
        } else {
          toast.error(`Microphone error: ${error.name}`);
        }
      } else {
        toast.error('Could not access microphone. Please check browser permissions.');
      }
    }
  };

  const stopRecording = useCallback((cancel: boolean) => {
    console.log('stopRecording called, cancel:', cancel);

    // Update ref first to stop waveform capture
    isRecordingRef.current = false;

    // If canceling, set the flag BEFORE stopping MediaRecorder
    // This prevents the onstop callback from creating the blob
    if (cancel) {
      isCanceledRef.current = true;
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media recorder (this will trigger onstop which creates the blob)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        // Request any remaining data before stopping
        if (mediaRecorderRef.current.state === 'recording') {
          console.log('Requesting final data before stop...');
          mediaRecorderRef.current.requestData();
        }
        mediaRecorderRef.current.stop();
        console.log('MediaRecorder stop called');
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
      }
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.warn('Error closing AudioContext:', e);
      }
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsRecording(false);
    setIsPaused(false);

    if (cancel) {
      setAudioBlob(null);
      setDuration(0);
      setWaveformData([]);
      audioChunksRef.current = [];
    }
  }, []);

  const cancelRecording = () => {
    stopRecording(true);
  };

  const sendVoiceNote = async () => {
    if (!audioBlob || duration < 1) {
      toast.error('Recording too short');
      cancelRecording();
      return;
    }

    setIsUploading(true);

    try {
      // Normalize waveform to 40 points for display
      const normalizedWaveform = normalizeWaveform(waveformData, 40);

      const response = await chatApi.uploadVoiceNote(
        audioBlob,
        duration,
        normalizedWaveform
      );

      if (response.data.status_code === 200 && response.data.data) {
        const data = response.data.data;
        const attachment: MessageAttachment = {
          type: 'voice',
          url: data.url,
          filename: data.filename,
          originalFilename: data.originalFilename,
          size: data.size,
          mimeType: data.mimeType,
          duration: data.duration || duration,
          waveform: data.waveform || normalizedWaveform,
        };

        onVoiceNoteReady(attachment);
      } else {
        toast.error('Failed to upload voice note');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload voice note');
    } finally {
      setIsUploading(false);
      setAudioBlob(null);
      setDuration(0);
      setWaveformData([]);
    }
  };

  // Normalize waveform to specific number of points
  const normalizeWaveform = (data: number[], targetLength: number): number[] => {
    if (data.length === 0) return Array(targetLength).fill(0.2);
    if (data.length <= targetLength) {
      // Pad with last value
      const padded = [...data];
      while (padded.length < targetLength) {
        padded.push(data[data.length - 1] || 0.2);
      }
      return padded;
    }

    // Downsample
    const result: number[] = [];
    const ratio = data.length / targetLength;
    for (let i = 0; i < targetLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.floor((i + 1) * ratio);
      const slice = data.slice(start, end);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      result.push(avg);
    }
    return result;
  };

  // Debug logging for render state
  console.log('VoiceRecorder render - audioBlob:', !!audioBlob, 'isRecording:', isRecording, 'duration:', duration);

  // If we have a recorded blob, show the review UI
  if (audioBlob && !isRecording) {
    console.log('Showing REVIEW UI - audioBlob size:', audioBlob.size);
    return (
      <div className="w-full flex items-center gap-3 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
        {/* Cancel button */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            cancelRecording();
          }}
          disabled={isUploading}
          className="p-1.5 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Delete"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        {/* Duration */}
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">
          {formatDuration(duration)}
        </span>

        {/* Waveform preview - fills available space */}
        <div className="flex items-center justify-center gap-[3px] h-6 flex-1 min-w-0 overflow-hidden">
          {normalizeWaveform(waveformData, 50).map((height, idx) => (
            <div
              key={idx}
              className="w-[3px] bg-primary-500 rounded-full flex-shrink-0"
              style={{ height: `${Math.max(height * 100, 20)}%` }}
            />
          ))}
        </div>

        {/* Send button - at far right */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            sendVoiceNote();
          }}
          disabled={isUploading}
          className="p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Send"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    );
  }

  // Recording UI
  if (isRecording) {
    console.log('Showing RECORDING UI');
    return (
      <div className="w-full flex items-center gap-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-full">
        {/* Cancel button */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            cancelRecording();
          }}
          className="p-1.5 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex-shrink-0"
          title="Cancel"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        {/* Recording indicator */}
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />

        {/* Duration */}
        <span className="text-sm font-medium text-red-600 dark:text-red-400 flex-shrink-0">
          {formatDuration(duration)}
        </span>

        {/* Live waveform - fills available space */}
        <div className="flex items-center justify-center gap-[3px] h-6 flex-1 min-w-0 overflow-hidden">
          {waveformData.slice(-40).map((height, idx) => (
            <div
              key={idx}
              className="w-[3px] bg-red-400 rounded-full transition-all flex-shrink-0"
              style={{ height: `${Math.max(height * 100, 20)}%` }}
            />
          ))}
        </div>

        {/* Stop button - at far right */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            stopRecording(false);
          }}
          className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors flex-shrink-0"
          title="Stop"
        >
          <Square className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Default mic button
  return (
    <button
      onClick={startRecording}
      disabled={disabled}
      className={clsx(
        'p-2 rounded-full transition-colors',
        'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
        'hover:bg-slate-100 dark:hover:bg-slate-800',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      title="Record voice note"
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}
