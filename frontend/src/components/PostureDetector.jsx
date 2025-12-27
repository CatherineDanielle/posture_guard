import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Camera, CameraOff, Settings, Activity, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PostureDetector = ({ onDetectionResult, isActive, setIsActive }) => {
  const webcamRef = useRef(null);
  const frameCountRef = useRef(0);
  const isProcessingRef = useRef(false);
  const animationRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detectionStats, setDetectionStats] = useState({
    totalDetections: 0,
    goodPostureCount: 0,
    badPostureCount: 0,
    currentStatus: 'unknown'
  });
  const [confidence, setConfidence] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [frameSkip, setFrameSkip] = useState(30); 
  const [currentFrame, setCurrentFrame] = useState(0);
  const [lastDetection, setLastDetection] = useState(null);

  const captureAndDetect = useCallback(async () => {
    if (!webcamRef.current || isProcessingRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      isProcessingRef.current = true;
      setIsLoading(true);
      
      const response = await axios.post(`${API_URL}/detect`, {
        image: imageSrc
      }, {
        timeout: 30000
      });

      if (response.data.success) {
        const status = response.data.overall_status;
        
        setLastDetection({
          status,
          detections: response.data.detections,
          confidence: response.data.detections?.[0]?.confidence || 0
        });
        
        setDetectionStats(prev => ({
          totalDetections: prev.totalDetections + 1,
          goodPostureCount: prev.goodPostureCount + (status === 'good' ? 1 : 0),
          badPostureCount: prev.badPostureCount + (status === 'bad' ? 1 : 0),
          currentStatus: status
        }));

        if (onDetectionResult) {
          onDetectionResult({
            status,
            detections: response.data.detections,
            timestamp: response.data.timestamp
          });
        }
      }
      setError(null);
    } catch (err) {
      console.error('Detection error:', err);
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        setError('Cannot connect to backend. Make sure Flask server is running on port 5000.');
      } else if (err.code === 'ECONNABORTED') {
        setError('Detection timeout - server is processing slowly');
      } else {
        setError(err.response?.data?.error || 'Detection failed');
      }
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  }, [onDetectionResult]);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const processFrame = () => {
      frameCountRef.current += 1;
      if (frameCountRef.current % 10 === 0) {
        setCurrentFrame(frameCountRef.current);
      }
      
      if (frameCountRef.current % frameSkip === 0 && !isProcessingRef.current) {
        captureAndDetect();
      }
      
      animationRef.current = requestAnimationFrame(processFrame);
    };

    animationRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, frameSkip, captureAndDetect]);

  const updateConfidence = async (value) => {
    setConfidence(value);
    try {
      await axios.post(`${API_URL}/config`, {
        confidence_threshold: value
      });
    } catch (err) {
      console.error('Failed to update confidence:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-posture-good';
      case 'bad': return 'text-posture-bad';
      default: return 'text-white/60';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good': return <CheckCircle className="w-6 h-6 text-posture-good" />;
      case 'bad': return <AlertTriangle className="w-6 h-6 text-posture-bad" />;
      default: return <Activity className="w-6 h-6 text-white/60" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Video */}
      <div className="relative glass-panel p-1 overflow-hidden">
        <div className="relative aspect-video bg-dark-800 rounded-xl overflow-hidden">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.6}
            videoConstraints={{
              width: 480,
              height: 360,
              facingMode: "user"
            }}
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {isActive && detectionStats.currentStatus !== 'unknown' && (
            <div className={`absolute bottom-0 left-0 right-0 py-3 px-4 backdrop-blur-md ${
              detectionStats.currentStatus === 'good' 
                ? 'bg-posture-good/80' 
                : 'bg-posture-bad/80'
            }`}>
              <div className="flex items-center justify-center gap-3">
                {detectionStats.currentStatus === 'good' ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-white" />
                )}
                <span className="text-lg font-bold text-white">
                  {detectionStats.currentStatus === 'good' ? 'Good Posture' : 'Fix Your Posture!'}
                </span>
                {lastDetection?.confidence > 0 && (
                  <span className="text-sm text-white/80">
                    ({(lastDetection.confidence * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="absolute top-4 left-4 flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md ${
              detectionStats.currentStatus === 'good' 
                ? 'bg-posture-good/20 border border-posture-good/50' 
                : detectionStats.currentStatus === 'bad'
                  ? 'bg-posture-bad/20 border border-posture-bad/50'
                  : 'bg-white/10 border border-white/20'
            }`}>
              {getStatusIcon(detectionStats.currentStatus)}
              <span className={`font-semibold ${getStatusColor(detectionStats.currentStatus)}`}>
                {detectionStats.currentStatus === 'good' && 'Good Posture'}
                {detectionStats.currentStatus === 'bad' && 'Bad Posture'}
                {detectionStats.currentStatus === 'unknown' && 'Detecting...'}
              </span>
            </div>
            
            {isLoading && (
              <div className="p-2 rounded-full bg-white/10 backdrop-blur-md">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </div>

          {isActive && (
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/50 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-400">LIVE</span>
            </div>
          )}

          {error && (
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 backdrop-blur-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
            isActive 
              ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30' 
              : 'btn-primary'
          }`}
        >
          {isActive ? (
            <>
              <CameraOff className="w-5 h-5" />
              Stop Detection
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              Start Detection
            </>
          )}
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-3 rounded-xl transition-all duration-300 ${
            showSettings 
              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' 
              : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="glass-panel p-6 space-y-6 animate-slide-up">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Detection Settings
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Confidence Threshold: {(confidence * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={confidence}
                onChange={(e) => updateConfidence(parseFloat(e.target.value))}
                className="w-full h-2 bg-dark-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>More Detections</span>
                <span>Higher Accuracy</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Process Every: {frameSkip} frames
              </label>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={frameSkip}
                onChange={(e) => setFrameSkip(parseInt(e.target.value))}
                className="w-full h-2 bg-dark-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>More Frequent</span>
                <span>Less Frequent</span>
              </div>
            </div>
          </div>
          
          {/* Frame Counter */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-white/50">
              Current Frame: {currentFrame} | Next detection at: {Math.ceil(currentFrame / frameSkip) * frameSkip}
            </p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel p-4 text-center">
          <p className="text-2xl font-bold text-white">{detectionStats.totalDetections}</p>
          <p className="text-sm text-white/60">Total Scans</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <p className="text-2xl font-bold text-posture-good">{detectionStats.goodPostureCount}</p>
          <p className="text-sm text-white/60">Good Posture</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <p className="text-2xl font-bold text-posture-bad">{detectionStats.badPostureCount}</p>
          <p className="text-sm text-white/60">Bad Posture</p>
        </div>
      </div>
    </div>
  );
};

export default PostureDetector;