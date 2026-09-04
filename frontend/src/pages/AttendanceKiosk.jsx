import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Camera,
  Maximize2,
  Minimize2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Eye,
  Sparkles,
  ArrowLeft,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import FaceOverlayCanvas from '../components/camera/FaceOverlayCanvas';
import { recognitionService, settingsService } from '../services/api';
import { soundEffects } from '../utils/audio';

const AttendanceKiosk = () => {
  const [faces, setFaces] = useState([]);
  const [activeBanner, setActiveBanner] = useState({
    type: 'idle', // 'idle', 'detected', 'success', 'already_marked', 'unknown', 'liveness'
    title: 'Waiting for face...',
    subtitle: 'Position your face in front of the camera',
    person: null
  });
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);

  // Active Liveness state
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [livenessMode, setLivenessMode] = useState('passive');

  // Camera hook
  const {
    videoRef,
    isStreaming,
    error: cameraError,
    captureFrame,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    startCamera
  } = useCamera({ width: 640, height: 480, autoStart: true });

  const bannerTimeoutRef = useRef(null);

  // Fetch initial public settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await settingsService.getPublicSettings();
        setLivenessMode(data.liveness_mode || 'passive');
      } catch (e) {
        console.warn("Could not load kiosk settings:", e);
      }
    };
    fetchSettings();
  }, []);

  // Set transient banner
  const triggerBanner = useCallback((type, title, subtitle, person = null, duration = 4000) => {
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);

    setActiveBanner({ type, title, subtitle, person });

    bannerTimeoutRef.current = setTimeout(() => {
      setActiveBanner({
        type: 'idle',
        title: 'Waiting for face...',
        subtitle: 'Position your face in front of the camera',
        person: null
      });
    }, duration);
  }, []);

  // Main Recognition Loop (~2.5 FPS)
  useEffect(() => {
    let timer = null;
    let isCancelled = false;

    const runRecognitionCycle = async () => {
      if (!isStreaming || isProcessingFrame || isCancelled) return;

      const frame = captureFrame(0.8);
      if (!frame) return;

      setIsProcessingFrame(true);

      try {
        const resp = await recognitionService.verify(frame, true);
        if (isCancelled) return;

        setFaces(resp.results || []);

        if (resp.faces_detected > 0) {
          const firstPerson = resp.results[0];

          if (firstPerson.status === 'recognized' && firstPerson.attendance_marked) {
            // New Attendance Marked Successfully!
            if (soundEnabled) soundEffects.playSuccess();
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.7 }
            });

            triggerBanner(
              'success',
              'Attendance Marked Successfully ✓',
              `${firstPerson.name} (${firstPerson.unique_id}) • ${firstPerson.attendance_time}`,
              firstPerson,
              4500
            );

            // Add to live check-ins feed
            setRecentCheckIns((prev) => [
              {
                id: Date.now(),
                name: firstPerson.name,
                unique_id: firstPerson.unique_id,
                department: firstPerson.department,
                time: firstPerson.attendance_time,
                confidence: firstPerson.confidence
              },
              ...prev.slice(0, 7)
            ]);
          } else if (firstPerson.status === 'already_marked') {
            triggerBanner(
              'already_marked',
              'Already Checked In Today',
              `${firstPerson.name} (${firstPerson.unique_id}) marked at ${firstPerson.attendance_time}`,
              firstPerson,
              3000
            );
          } else if (firstPerson.status === 'unknown') {
            triggerBanner(
              'unknown',
              'Face Not Recognized',
              'Please step closer, face the camera, or contact an administrator to register.',
              null,
              2500
            );
          }
        } else {
          setFaces([]);
        }
      } catch (err) {
        console.error("Continuous recognition error:", err);
      } finally {
        setIsProcessingFrame(false);
      }
    };

    timer = setInterval(runRecognitionCycle, 450);

    return () => {
      isCancelled = true;
      clearInterval(timer);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, [isStreaming, isProcessingFrame, captureFrame, triggerBanner, soundEnabled]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 kiosk-grid-bg selection:bg-brand-500 overflow-x-hidden">
      {/* Kiosk Top Bar */}
      <header className="flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-6 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
              Attendance Kiosk Live
            </span>
          </div>
        </div>

        {/* Camera Selector & Audio Toggle */}
        <div className="flex items-center gap-3">
          {devices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                startCamera(e.target.value);
              }}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 focus:border-brand-500 focus:outline-none"
            >
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title={soundEnabled ? "Mute audio" : "Enable audio"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-brand-400" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Kiosk Area */}
      <main className="flex flex-1 flex-col p-4 md:p-6 lg:flex-row gap-6 max-w-[1600px] mx-auto w-full">
        {/* Left / Center: Camera Screen & Overlay (8 or 9 cols) */}
        <div className="flex flex-1 flex-col space-y-4">
          {/* Dynamic Status Alert Banner */}
          <div
            className={`rounded-2xl border p-4 transition-all shadow-xl backdrop-blur-md flex items-center justify-between ${
              activeBanner.type === 'success'
                ? 'border-emerald-500/50 bg-emerald-950/70 text-emerald-300'
                : activeBanner.type === 'already_marked'
                ? 'border-cyan-500/50 bg-cyan-950/70 text-cyan-300'
                : activeBanner.type === 'unknown'
                ? 'border-rose-500/50 bg-rose-950/70 text-rose-300'
                : activeBanner.type === 'detected'
                ? 'border-amber-500/50 bg-amber-950/70 text-amber-300'
                : 'border-slate-800 bg-slate-900/70 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                activeBanner.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                activeBanner.type === 'already_marked' ? 'bg-cyan-500/20 text-cyan-400' :
                activeBanner.type === 'unknown' ? 'bg-rose-500/20 text-rose-400' :
                'bg-brand-500/20 text-brand-400'
              }`}>
                {activeBanner.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> :
                 activeBanner.type === 'already_marked' ? <Clock className="h-6 w-6" /> :
                 activeBanner.type === 'unknown' ? <AlertTriangle className="h-6 w-6" /> :
                 <Camera className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {activeBanner.title}
                </h3>
                <p className="text-xs opacity-90 mt-0.5">
                  {activeBanner.subtitle}
                </p>
              </div>
            </div>

            {activeBanner.person && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-bold text-white">{activeBanner.person.name}</span>
                <span className="text-xs opacity-80 font-mono">{activeBanner.person.unique_id}</span>
              </div>
            )}
          </div>

          {/* Video Container with HTML5 Canvas Overlay */}
          <div className="relative aspect-[4/3] w-full flex-1 overflow-hidden rounded-3xl border-2 border-slate-800 bg-black shadow-2xl flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover transform -scale-x-100"
            />

            {/* AI Bounding Box Overlay */}
            <FaceOverlayCanvas
              faces={faces}
              videoWidth={videoRef.current?.videoWidth || 640}
              videoHeight={videoRef.current?.videoHeight || 480}
              isScanning={true}
            />

            {/* Scanning Laser Line Animation */}
            {isStreaming && (
              <div className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-400 to-transparent opacity-50 animate-scan z-10" />
            )}

            {/* Edge Target Reticles */}
            <div className="pointer-events-none absolute inset-6 border border-white/5 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="h-6 w-6 border-t-2 border-l-2 border-brand-500" />
                <div className="h-6 w-6 border-t-2 border-r-2 border-brand-500" />
              </div>
              <div className="flex justify-between">
                <div className="h-6 w-6 border-b-2 border-l-2 border-brand-500" />
                <div className="h-6 w-6 border-b-2 border-r-2 border-brand-500" />
              </div>
            </div>

            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 p-6 text-center z-30">
                <div className="space-y-3">
                  <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
                  <p className="text-base font-bold text-white">Camera Offline</p>
                  <p className="text-xs text-slate-400 max-w-sm">{cameraError}</p>
                  <button
                    onClick={() => startCamera()}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg"
                  >
                    <RefreshCw className="h-4 w-4" /> Start Camera
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Real-time Check-In Ticker & Instructions (3 or 4 cols) */}
        <div className="w-full lg:w-96 flex flex-col space-y-4">
          {/* Live Check-In Activity */}
          <div className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Live Attendance Feed
                </h4>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">Real-time</span>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[480px] pr-1">
              {recentCheckIns.length > 0 ? (
                recentCheckIns.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-800/80 bg-slate-950/50 text-xs hover:border-brand-500/40 transition-all"
                  >
                    <div>
                      <div className="font-semibold text-slate-100">{item.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {item.unique_id} • {item.department || 'General'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-emerald-400">{item.time}</div>
                      <div className="text-[10px] text-slate-400">
                        {(item.confidence * 100).toFixed(0)}% match
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center text-xs text-slate-400">
                  <Camera className="h-8 w-8 text-slate-700 mb-2" />
                  <p>Awaiting check-ins...</p>
                  <p className="text-[10px] text-slate-400 mt-1">Recognized faces will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Kiosk Instructions & Biometric Policy Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-brand-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Kiosk Instructions</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
              <li>Look toward camera at normal walking distance.</li>
              <li>Multiple people can check in concurrently.</li>
              <li>Duplicate scans within the day are protected automatically.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AttendanceKiosk;
