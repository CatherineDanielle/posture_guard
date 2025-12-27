import React, { useState} from 'react';
import PostureDetector from './components/PostureDetector';
import PopupOverlay from './components/PopupOverlay';
import { 
  Zap, 
  Monitor, 
  ExternalLink, 
  Info,
  Shield
} from 'lucide-react';

function App() {
  const [isDetectionActive, setIsDetectionActive] = useState(false);
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('detector'); 

  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-emerald-900/5 to-transparent rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-white">PostureGuard</h1>
                <p className="text-xs text-white/50">AI-Powered Posture Detection</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Popup Toggle */}
              <button
                onClick={() => setPopupEnabled(!popupEnabled)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                  popupEnabled 
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' 
                    : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {popupEnabled ? 'Popup Active' : 'Enable Popup'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {[
              { id: 'detector', label: 'Detector', icon: Monitor },
              { id: 'about', label: 'About', icon: Info },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-white/60 hover:text-white/80'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'detector' && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <PostureDetector
                isActive={isDetectionActive}
                setIsActive={setIsDetectionActive}
              />
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              <div className="glass-panel p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Quick Tips
                </h3>
                <ul className="space-y-3 text-sm text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                    Keep your back straight and shoulders relaxed
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                    Position your screen at eye level
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                    Take breaks every 30 minutes
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                    Keep feet flat on the floor
                  </li>
                </ul>
              </div>

              <div className="glass-panel p-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-emerald-400" />
                  Popup Mode
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  Enable popup mode to get posture reminders while working in other tabs or applications.
                </p>
                <ul className="space-y-2 text-sm text-white/50">
                  <li>• Draggable floating window</li>
                  <li>• Adjustable transparency</li>
                  <li>• Audio alerts (toggleable)</li>
                  <li>• Browser notifications</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-2xl mx-auto">
            <div className="glass-panel p-8">
              <h2 className="text-2xl font-display font-bold text-white mb-6">
                About PostureGuard
              </h2>
              
              <div className="space-y-6 text-white/70">
                <p>
                  PostureGuard is an AI-powered posture detection system built for the Computer Vision 
                  Final Project. It uses YOLOv8 object detection to analyze sitting posture in real time 
                  through your webcam.
                </p>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Features</h3>
                  <ul className="space-y-2">
                    <li>• Real-time posture detection using YOLOv8</li>
                    <li>• Visual feedback with bounding boxes</li>
                    <li>• Floating popup overlay for continuous monitoring</li>
                    <li>• Session statistics and posture scoring</li>
                    <li>• Audio and browser notifications</li>
                    <li>• Adjustable detection sensitivity</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Technology Stack</h3>
                  <ul className="space-y-2">
                    <li><strong className="text-white">Frontend:</strong> React.js, Tailwind CSS</li>
                    <li><strong className="text-white">Backend:</strong> Flask, Python</li>
                    <li><strong className="text-white">AI Model:</strong> YOLOv8 Object Detection</li>
                    <li><strong className="text-white">Dataset:</strong> Good/Bad Posture Detection (Roboflow)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Classes Detected</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-posture-bad" />
                      <span>Bad Sitting Posture</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-posture-good" />
                      <span>Good Sitting Posture</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-white/50">
                    Computer Vision Final Project
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">
              © 2025 PostureGuard - Computer Vision Final Project
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://universe.roboflow.com/naira-sq9nj/good-or-bad-posture-v2-0ydsl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                Dataset Source
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Popup Overlay */}
      <PopupOverlay
        isEnabled={popupEnabled}
        onClose={() => setPopupEnabled(false)}
      />
    </div>
  );
}

export default App;