import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Minimize2, 
  Maximize2, 
  GripHorizontal,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  MonitorUp
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PopupOverlay = ({ 
  isEnabled, 
  onClose, 
  initialOpacity = 0.9,
  initialPosition = { x: 20, y: 20 }
}) => {
  const webcamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const pipWindowRef = useRef(null);
  
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(initialOpacity);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('unknown');
  const [lastBadPostureTime] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCamera, setShowCamera] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const isProcessingRef = useRef(false);
  const frameCountRef = useRef(0);

  // Check if Picture-in-Picture is supported
  useEffect(() => {
    setIsPiPSupported('documentPictureInPicture' in window || 'pictureInPictureEnabled' in document);
  }, []);

  // Audio notification
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not available');
    }
  }, [soundEnabled]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const startPiP = async () => {
    try {
      if ('documentPictureInPicture' in window) {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 320,
          height: 240,
        });
        
        pipWindowRef.current = pipWindow;
        
        const style = pipWindow.document.createElement('style');
        style.textContent = `
          body {
            margin: 0;
            padding: 0;
            background: #1a1a25;
            font-family: Arial, sans-serif;
            overflow: hidden;
          }
          .container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          video, canvas {
            width: 100%;
            height: calc(100% - 50px);
            object-fit: cover;
            transform: scaleX(-1);
          }
          .status-bar {
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: bold;
            color: white;
          }
          .status-good { background: #10B981; }
          .status-bad { background: #EF4444; }
          .status-unknown { background: #666; }
        `;
        pipWindow.document.head.appendChild(style);
        
        const container = pipWindow.document.createElement('div');
        container.className = 'container';
        container.id = 'pip-container';
        
        const canvas = pipWindow.document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 190;
        canvas.id = 'pip-canvas';
        container.appendChild(canvas);
        
        const statusBar = pipWindow.document.createElement('div');
        statusBar.className = 'status-bar status-unknown';
        statusBar.id = 'pip-status';
        statusBar.textContent = 'Detecting...';
        container.appendChild(statusBar);
        
        pipWindow.document.body.appendChild(container);
        
        pipWindow.addEventListener('pagehide', () => {
          setIsPiPActive(false);
          pipWindowRef.current = null;
        });
        
        setIsPiPActive(true);
        return;
      }
      
      if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (err) {
      console.error('PiP error:', err);
      alert('Picture-in-Picture failed. Try using Chrome browser.');
    }
  };

  const stopPiP = async () => {
    try {
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
      }
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      setIsPiPActive(false);
    } catch (err) {
      console.error('Exit PiP error:', err);
    }
  };

  const updatePiPContent = useCallback((status) => {
    if (!pipWindowRef.current) return;
    
    try {
      const pipDoc = pipWindowRef.current.document;
      const canvas = pipDoc.getElementById('pip-canvas');
      const statusBar = pipDoc.getElementById('pip-status');
      const video = webcamRef.current?.video;
      
      if (canvas && video) {
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      
      if (statusBar) {
        const isGood = status === 'good';
        const isBad = status === 'bad';
        statusBar.className = `status-bar ${isGood ? 'status-good' : isBad ? 'status-bad' : 'status-unknown'}`;
        statusBar.textContent = isGood ? '✓ Good Posture' : isBad ? '⚠ Fix Your Posture!' : 'Detecting...';
      }
    } catch (e) {
    }
  }, []);

  // Posture detection loop
  useEffect(() => {
    if (!isEnabled) return;

    let animationId;
    
    const detectAndDraw = async () => {
      frameCountRef.current += 1;
      
      if (isPiPActive && pipWindowRef.current) {
        updatePiPContent(currentStatus);
      }
      
      if (frameCountRef.current % 30 === 0 && !isProcessingRef.current) {
        if (!webcamRef.current) {
          animationId = requestAnimationFrame(detectAndDraw);
          return;
        }

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
          animationId = requestAnimationFrame(detectAndDraw);
          return;
        }

        try {
          isProcessingRef.current = true;
          const response = await axios.post(`${API_URL}/detect`, {
            image: imageSrc
          }, { timeout: 30000 });

          if (response.data.success) {
            const status = response.data.overall_status;
            setCurrentStatus(status);
          }
        } catch (err) {
          console.error('Popup detection error:', err);
        } finally {
          isProcessingRef.current = false;
        }
      }
      
      animationId = requestAnimationFrame(detectAndDraw);
    };

    animationId = requestAnimationFrame(detectAndDraw);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isEnabled, isTabVisible, playNotificationSound, isPiPActive, updatePiPContent, currentStatus]);

  useEffect(() => {
    if (isEnabled && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isEnabled]);

  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
      }
    };
  }, []);

  const handleMouseDown = (e) => {
    if (e.target.closest('.popup-drag-handle')) {
      setIsDragging(true);
      const rect = overlayRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const newX = Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragOffset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  if (!isEnabled) return null;

  const getStatusConfig = () => {
    switch (currentStatus) {
      case 'good':
        return {
          bgColor: 'bg-posture-good/20',
          borderColor: 'border-posture-good/50',
          textColor: 'text-posture-good',
          icon: <CheckCircle className="w-5 h-5" />,
          label: 'Good Posture',
          glowColor: 'shadow-posture-good/30'
        };
      case 'bad':
        return {
          bgColor: 'bg-posture-bad/20',
          borderColor: 'border-posture-bad/50',
          textColor: 'text-posture-bad',
          icon: <AlertTriangle className="w-5 h-5" />,
          label: 'Fix Your Posture!',
          glowColor: 'shadow-posture-bad/30'
        };
      default:
        return {
          bgColor: 'bg-white/10',
          borderColor: 'border-white/20',
          textColor: 'text-white/70',
          icon: null,
          label: 'Detecting...',
          glowColor: ''
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div
      ref={overlayRef}
      className={`popup-overlay ${isDragging ? 'dragging' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        opacity: opacity
      }}
      onMouseDown={handleMouseDown}
    >
      <div 
        className={`
          ${isMinimized ? 'w-auto' : 'w-80'}
          rounded-2xl overflow-hidden
          backdrop-blur-xl
          ${statusConfig.bgColor}
          border ${statusConfig.borderColor}
          shadow-2xl ${statusConfig.glowColor}
          transition-all duration-300
        `}
      >
        {/* Header / Drag Handle */}
        <div className="popup-drag-handle flex items-center justify-between px-3 py-2 bg-black/30 border-b border-white/10">
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-white/40" />
            {isMinimized && (
              <div className={`flex items-center gap-2 ${statusConfig.textColor}`}>
                {statusConfig.icon}
                <span className="text-sm font-medium">{statusConfig.label}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Picture-in-Picture Button */}
            {isPiPSupported && (
              <button
                onClick={isPiPActive ? stopPiP : startPiP}
                className={`p-1.5 rounded-lg transition-colors ${isPiPActive ? 'bg-emerald-500/30 text-emerald-400' : 'hover:bg-white/10 text-white/60'}`}
                title={isPiPActive ? 'Exit Picture-in-Picture' : 'Float on other windows (PiP)'}
              >
                <MonitorUp className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowCamera(!showCamera)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title={showCamera ? 'Hide camera' : 'Show camera'}
            >
              {showCamera ? (
                <Eye className="w-4 h-4 text-white/60" />
              ) : (
                <EyeOff className="w-4 h-4 text-white/60" />
              )}
            </button>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-white/60" />
              ) : (
                <VolumeX className="w-4 h-4 text-white/60" />
              )}
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4 text-white/60" />
              ) : (
                <Minimize2 className="w-4 h-4 text-white/60" />
              )}
            </button>
            <button
              onClick={() => { stopPiP(); onClose(); }}
              className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* PiP Instructions */}
            {isPiPSupported && !isPiPActive && (
              <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
                <p className="text-xs text-emerald-400 flex items-center gap-2">
                  <MonitorUp className="w-3 h-3" />
                  Click the monitor icon to float on other windows!
                </p>
              </div>
            )}
            
            {isPiPActive && (
              <div className="px-4 py-2 bg-emerald-500/20 border-b border-emerald-500/30">
                <p className="text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Floating window active! Check your other windows.
                </p>
              </div>
            )}

            {/* Camera Preview */}
            {showCamera && (
              <div className="relative aspect-video bg-black/50">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    width: 320,
                    height: 240,
                    facingMode: "user"
                  }}
                  className="w-full h-full object-cover"
                />
                
                {/* Hidden canvas for PiP */}
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={240}
                  className="hidden"
                />
                
                {/* Status Badge Overlay */}
                <div className={`absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-lg ${statusConfig.bgColor} border ${statusConfig.borderColor} backdrop-blur-sm`}>
                  <div className={`flex items-center justify-center gap-2 ${statusConfig.textColor}`}>
                    {statusConfig.icon}
                    <span className="text-sm font-semibold">{statusConfig.label}</span>
                  </div>
                </div>
              </div>
            )}

            {!showCamera && (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 320,
                  height: 240,
                  facingMode: "user"
                }}
                className="hidden"
              />
            )}

            {/* Opacity Slider */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/50">Opacity</span>
                <span className="text-xs text-white/50">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Last Alert Time */}
            {lastBadPostureTime && (
              <div className="px-4 pb-3">
                <p className="text-xs text-white/40 text-center">
                  Last alert: {lastBadPostureTime.toLocaleTimeString()}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PopupOverlay;