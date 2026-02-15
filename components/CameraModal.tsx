
import React, { useRef, useState, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string) => void;
  instruction: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture, instruction }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
          stopCamera();
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      // Fail gracefully without closing, allowing retry or flip
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreaming(false);
    }
  };

  const toggleCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        
        // Mirror image if user facing to match the preview expectation
        if (facingMode === 'user') {
            context.translate(canvasRef.current.width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(videoRef.current, 0, 0);
        
        // Reset transform
        context.setTransform(1, 0, 0, 1, 0, 0);

        const data = canvasRef.current.toDataURL('image/jpeg', 0.8);
        onCapture(data.split(',')[1]); // Send only base64 data
        stopCamera();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md"
          >
            <GlassCard className="p-4 flex flex-col items-center gap-4 bg-obsidian-900/50 border-white/5 shadow-2xl">
              <h3 className="text-xl font-serif text-white">{instruction}</h3>
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-white/10">
                <video 
                    ref={videoRef} 
                    className={`absolute inset-0 w-full h-full object-cover transition-transform ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} 
                    playsInline 
                    muted 
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Flip Camera Button */}
                <button 
                    onClick={toggleCamera}
                    className="absolute top-4 right-4 w-12 h-12 rounded-full bg-black/40 border border-white/10 text-white flex items-center justify-center backdrop-blur-md hover:bg-rose-500/20 active:scale-95 transition-all z-20 shadow-lg"
                    title="Flip Camera"
                >
                    <span className="text-xl">↻</span>
                </button>
              </div>
              <div className="flex gap-4 w-full">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                  Cancel
                </button>
                <button onClick={capture} className="flex-1 py-3 rounded-xl font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-900/40">
                  Capture
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
