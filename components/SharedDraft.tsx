
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { p2p } from '../services/p2p';

interface SharedDraftProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (val: string) => void;
}

export const SharedDraft: React.FC<SharedDraftProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number, y: number } | null>(null);
  const remoteLastPoint = useRef<{ x: number, y: number } | null>(null);

  // Initialize Canvas
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const setCanvasSize = () => {
        // Use clientWidth/Height to get dimensions BEFORE transform/scale is applied
        // This prevents the canvas from resizing/clearing during the opening animation
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (width && height && (canvas.width !== width || canvas.height !== height)) {
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                ctx.lineWidth = 40;
            }
        }
    };

    // Initial set
    setCanvasSize();

    // Handle window resize only (stable)
    const resizeObserver = new ResizeObserver(() => {
        // We only resize if the actual layout size changes, not the transform
        setCanvasSize();
    });
    
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [isOpen]);

  // "Evaporation" Effect
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && canvas.width > 0) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isOpen]);

  // P2P Listener
  useEffect(() => {
    if (!isOpen) return;
    
    // Subscribe immediately
    const unsubscribe = p2p.onData((msg) => {
        const canvas = canvasRef.current;
        if (msg.type === 'SYNC_DRAFT_STROKE' && canvas) {
            // If canvas has 0 width (rare now), skip
            if (canvas.width === 0) return;

            const { type, x, y } = msg.payload;
            const ctx = canvas.getContext('2d');
            
            if (typeof x !== 'number' || typeof y !== 'number') return;

            const pixelX = x * canvas.width;
            const pixelY = y * canvas.height;

            if (ctx) {
                if (type === 'start') {
                    remoteLastPoint.current = { x: pixelX, y: pixelY };
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.beginPath();
                    ctx.arc(pixelX, pixelY, 20, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalCompositeOperation = 'source-over';
                } else if (type === 'move' && remoteLastPoint.current) {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.beginPath();
                    ctx.moveTo(remoteLastPoint.current.x, remoteLastPoint.current.y);
                    ctx.quadraticCurveTo(
                        remoteLastPoint.current.x,
                        remoteLastPoint.current.y,
                        (remoteLastPoint.current.x + pixelX) / 2,
                        (remoteLastPoint.current.y + pixelY) / 2
                    );
                    ctx.lineTo(pixelX, pixelY);
                    ctx.stroke();
                    ctx.globalCompositeOperation = 'source-over';
                    remoteLastPoint.current = { x: pixelX, y: pixelY };
                } else if (type === 'end') {
                    remoteLastPoint.current = null;
                }
            }
        }
    });
    return () => unsubscribe();
  }, [isOpen]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Guard
    if (rect.width === 0 || rect.height === 0) return null;

    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      normalizedX: (clientX - rect.left) / rect.width,
      normalizedY: (clientY - rect.top) / rect.height
    };
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    const coords = getCoordinates(e);
    
    if (ctx && coords && lastPoint.current) {
      // Local Draw
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.quadraticCurveTo(
        lastPoint.current.x, 
        lastPoint.current.y, 
        (lastPoint.current.x + coords.x) / 2, 
        (lastPoint.current.y + coords.y) / 2
      );
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      
      lastPoint.current = coords;

      // Broadcast
      p2p.send({ 
        type: 'SYNC_DRAFT_STROKE', 
        payload: { type: 'move', x: coords.normalizedX, y: coords.normalizedY } 
      });
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const coords = getCoordinates(e);
    if (coords) {
        lastPoint.current = coords;
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
             ctx.globalCompositeOperation = 'destination-out';
             ctx.beginPath();
             ctx.arc(coords.x, coords.y, 20, 0, Math.PI * 2);
             ctx.fill();
             ctx.globalCompositeOperation = 'source-over';
             
             p2p.send({ 
                type: 'SYNC_DRAFT_STROKE', 
                payload: { type: 'start', x: coords.normalizedX, y: coords.normalizedY } 
             });
        }
    }
  };

  const handleEnd = () => {
    isDrawing.current = false;
    lastPoint.current = null;
    p2p.send({ type: 'SYNC_DRAFT_STROKE', payload: { type: 'end' } });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-3xl"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            className="relative w-full h-[80vh] max-w-lg bg-transparent rounded-[32px] overflow-hidden shadow-2xl border border-white/10"
            ref={containerRef}
          >
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517865288-978fcbf97022?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-60 blur-sm" />
            
            <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                onMouseDown={handleStart}
                onMouseMove={draw}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={draw}
                onTouchEnd={handleEnd}
            />

            <div className="absolute top-6 left-6 pointer-events-none select-none">
                <span className="text-[10px] tracking-[0.5em] text-rose-500 uppercase font-black drop-shadow-md">Steamed Glass</span>
            </div>

            <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/20 text-white/50 hover:text-white flex items-center justify-center backdrop-blur-md z-10">✕</button>

            <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none select-none">
                <p className="text-[9px] text-white/40 uppercase tracking-[0.3em] font-black">Write with your finger</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
