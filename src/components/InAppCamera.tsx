import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Video, Camera, StopCircle, RefreshCcw } from 'lucide-react';

interface InAppCameraProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  mode: 'video' | 'image';
}

export const InAppCamera: React.FC<InAppCameraProps> = ({ onCapture, onClose, mode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [chunks, setChunks] = useState<Blob[]>([]);

  const startCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          // CAPTURE SETTINGS (LOCK THIS)
          // Resolution cap: 720p max
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          // FPS cap: 30fps
          frameRate: { ideal: 30, max: 30 },
        },
        audio: mode === 'video' ? {
           echoCancellation: true,
           noiseSuppression: true
        } : false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Failed to access camera. Please ensure permissions are granted. If you are in a preview mode, try opening the app in a new tab.");
      onClose();
    }
  }, [facingMode, mode, stream, onClose]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const startRecording = () => {
    if (!stream) return;
    setChunks([]);
    
    // Choose format
    let mimeType = 'video/mp4';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
           mimeType = ''; // Let browser choose
        }
      }
    }

    const options = mimeType ? { 
      mimeType, 
      videoBitsPerSecond: 1500000 // 1.5 Mbps to avoid ultra HD / high bitrate modes
    } : undefined;

    const recorder = new MediaRecorder(stream, options);
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        setChunks(prev => [...prev, e.data]);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recorder.ondataavailable ? chunks : [], { type: recorder.mimeType || 'video/mp4' }); // Fallback mimeType
      // We will create the blob from chunks state by using a small hack, 
      // MediaRecorder fires ondataavailable before onstop.
    };

    recorder.start(200); // 200ms chunks
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTime(0);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Delay slightly to ensure all chunks are processed
      setTimeout(() => {
         setChunks(currentChunks => {
            const blob = new Blob(currentChunks, { type: mediaRecorderRef.current?.mimeType || 'video/mp4' });
            const file = new File([blob], `recorded_${Date.now()}.${blob.type.includes('webm') ? 'webm' : 'mp4'}`, { type: blob.type });
            onCapture(file);
            return [];
         });
      }, 500);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !stream) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.85); // Light compression
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
        <button onClick={onClose} className="p-2 bg-black/50 rounded-full text-white backdrop-blur-sm">
          <X className="w-6 h-6" />
        </button>
        {isRecording && (
          <div className="bg-red-500 text-white px-3 py-1 rounded-full animate-pulse flex items-center font-mono text-sm font-bold">
            <span className="w-2 h-2 bg-white rounded-full mr-2" />
            {formatTime(recordingTime)}
          </div>
        )}
        <button onClick={toggleCamera} className="p-2 bg-black/50 rounded-full text-white backdrop-blur-sm">
           <RefreshCcw className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="min-w-full min-h-full object-cover" 
        />
      </div>

      <div className="pb-12 pt-6 bg-gradient-to-t from-black via-black/80 to-transparent absolute bottom-0 w-full flex justify-center items-end">
        {mode === 'video' ? (
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all ${isRecording ? 'border-red-500 bg-red-500/20' : 'border-white bg-white/20'}`}
          >
            {isRecording ? (
              <StopCircle className="w-10 h-10 text-red-500 fill-red-500" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-500" />
            )}
          </button>
        ) : (
          <button 
            onClick={takePhoto}
            className="w-20 h-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center p-1"
          >
             <div className="w-full h-full bg-white rounded-full" />
          </button>
        )}
      </div>
    </div>
  );
};
