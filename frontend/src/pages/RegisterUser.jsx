import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  User,
  ArrowRight,
  Eye,
  RotateCcw
} from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { userService, settingsService } from '../services/api';
import { soundEffects } from '../utils/audio';

const POSES = [
  { id: 'center', label: 'Look directly at the camera', hint: 'Keep your face centered and level' },
  { id: 'left', label: 'Turn slightly to your left', hint: 'Slight head turn (~15 degrees)' },
  { id: 'right', label: 'Turn slightly to your right', hint: 'Slight head turn (~15 degrees)' },
  { id: 'up', label: 'Tilt slightly upwards', hint: 'Gentle upward chin tilt' },
  { id: 'down', label: 'Tilt slightly downwards', hint: 'Gentle downward nod' },
];

const RegisterUser = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedUserId = searchParams.get('userId');

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(preselectedUserId || '');
  const [consentText, setConsentText] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(true);

  // Capture State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedSamples, setCapturedSamples] = useState([]); // List of base64 strings
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    videoRef,
    isStreaming,
    error: cameraError,
    captureFrame,
    startCamera,
    stopCamera
  } = useCamera({ width: 640, height: 480, autoStart: true });

  // Load available unregistered or all users
  useEffect(() => {
    const initData = async () => {
      try {
        const [usersList, publicSettings] = await Promise.all([
          userService.getUsers({ limit: 200 }),
          settingsService.getPublicSettings()
        ]);
        setUsers(usersList);
        setConsentText(publicSettings.privacy_consent_text || 'By registering, you consent to biometric processing.');
        if (preselectedUserId) {
          setSelectedUserId(preselectedUserId);
        } else if (usersList.length > 0) {
          // Preselect first user without face registered
          const unreg = usersList.find((u) => !u.is_face_registered);
          if (unreg) setSelectedUserId(String(unreg.id));
          else setSelectedUserId(String(usersList[0].id));
        }
      } catch (err) {
        console.error("Failed to load initial registration data:", err);
      }
    };
    initData();
  }, [preselectedUserId]);

  const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));

  // Capture current sample for the active pose
  const handleCaptureSample = () => {
    setErrorMessage('');
    const frame = captureFrame(0.9);
    if (!frame) {
      setErrorMessage("Could not capture frame from webcam. Please ensure camera is active.");
      return;
    }

    const updated = [...capturedSamples, frame];
    setCapturedSamples(updated);

    if (currentStepIndex < POSES.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleResetCaptures = () => {
    setCapturedSamples([]);
    setCurrentStepIndex(0);
    setErrorMessage('');
    setRegistrationSuccess(false);
  };

  // Submit all captured samples to backend
  const handleFinalizeRegistration = async () => {
    if (!selectedUserId) {
      setErrorMessage("Please select a user to register face biometrics.");
      return;
    }
    if (capturedSamples.length < 3) {
      setErrorMessage("Please capture at least 3 face samples across different angles.");
      return;
    }
    if (!consentAgreed) {
      setErrorMessage("Biometric consent agreement is required to proceed.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const resp = await userService.registerFace(selectedUserId, capturedSamples);
      setRegistrationSuccess(true);
      soundEffects.playSuccess();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      soundEffects.playWarning();
      setErrorMessage(
        err.response?.data?.detail ||
        "Biometric registration failed. Please ensure your face is well-lit, steady, and only 1 person is in frame."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Face Biometric Registration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Capture multi-angle facial representations to build a secure 128D mathematical embedding
          </p>
        </div>
        <Link
          to="/users"
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Users
        </Link>
      </div>

      {registrationSuccess ? (
        /* Success Screen */
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-8 text-center backdrop-blur-xl shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-4 border border-emerald-500/40">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-white">
            Registration Successful!
          </h3>
          <p className="mt-2 text-sm text-emerald-300/90 font-medium">
            Your face biometric template has been securely enrolled for {selectedUser?.full_name} ({selectedUser?.unique_id}).
          </p>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            Raw photographs have been discarded. The user is now eligible for automatic attendance check-in at any kiosk.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={handleResetCaptures}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Enroll Another User
            </button>
            <Link
              to="/kiosk"
              target="_blank"
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-500 transition-all shadow-lg shadow-brand-600/30"
            >
              <Camera className="h-4 w-4" />
              Test at Kiosk
            </Link>
          </div>
        </div>
      ) : (
        /* Registration Workflow */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: User Selection & Consent (5 cols) */}
          <div className="space-y-5 lg:col-span-5">
            {/* User Selection Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-brand-400" />
                Select Registrant
              </h3>

              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  handleResetCaptures();
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
              >
                <option value="" disabled>Select User...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.unique_id}) - {u.is_face_registered ? '✓ Enrolled' : '✗ Missing Face'}
                  </option>
                ))}
              </select>

              {selectedUser && (
                <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Department:</span>
                    <span className="font-medium text-slate-200">{selectedUser.department || 'General'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-medium text-slate-200">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Status:</span>
                    <span className={`font-semibold ${selectedUser.is_face_registered ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedUser.is_face_registered ? 'Already Registered (Will Overwrite)' : 'Ready to Enroll'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Guided Angles Checklist */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Multi-Sample Guidance ({capturedSamples.length}/{POSES.length})
              </h3>

              <div className="space-y-2 text-xs">
                {POSES.map((pose, idx) => {
                  const isCaptured = idx < capturedSamples.length;
                  const isCurrent = idx === currentStepIndex && !isCaptured;

                  return (
                    <div
                      key={pose.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isCaptured
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                          : isCurrent
                          ? 'border-brand-500/50 bg-brand-500/10 text-white shadow-sm'
                          : 'border-slate-800/50 bg-slate-950/20 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          isCaptured ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isCaptured ? '✓' : idx + 1}
                        </span>
                        <div>
                          <div className="font-medium">{pose.label}</div>
                          <div className="text-[10px] text-slate-400">{pose.hint}</div>
                        </div>
                      </div>
                      {isCaptured && (
                        <span className="text-[10px] font-mono text-emerald-400">Sample #{idx + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Privacy & Legal Consent Notice */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
                <ShieldCheck className="h-4 w-4 text-brand-400" />
                Biometric Privacy Consent
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                "{consentText}"
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-brand-600 focus:ring-0"
                />
                <span className="text-[11px] text-slate-300 font-medium">
                  I agree to biometric face processing
                </span>
              </label>
            </div>
          </div>

          {/* Right Column: Live Camera Guide & Capture Box (7 cols) */}
          <div className="space-y-4 lg:col-span-7">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border-2 border-slate-800 bg-black shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover transform -scale-x-100"
              />

              {/* Circular / Rectangular Face Positioning Guide */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6">
                {/* Visual Guide Reticle */}
                <div className="relative h-64 w-56 rounded-[45px] border-2 border-dashed border-brand-400/60 shadow-[0_0_50px_rgba(59,130,246,0.15)] flex items-center justify-center">
                  <div className="h-full w-full rounded-[43px] border border-white/20" />
                  {/* Subtle target reticle crosshairs */}
                  <div className="absolute top-0 bottom-0 w-px bg-white/10" />
                  <div className="absolute left-0 right-0 h-px bg-white/10" />
                </div>

                {/* Instruction Pill */}
                <div className="mt-4 rounded-full border border-slate-700/80 bg-slate-900/90 px-4 py-1.5 backdrop-blur-md shadow-lg text-center">
                  <span className="text-xs font-semibold text-brand-300">
                    {POSES[currentStepIndex]?.label || 'Complete Samples'}
                  </span>
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-6 text-center">
                  <div className="space-y-2">
                    <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
                    <p className="text-sm font-semibold text-white">Camera Access Error</p>
                    <p className="text-xs text-slate-400 max-w-sm">{cameraError}</p>
                    <button
                      onClick={() => startCamera()}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retry Camera
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-400 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Quality Validation Notice: </span>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Camera Control Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetCaptures}
                  disabled={capturedSamples.length === 0}
                  className="rounded-xl border border-slate-800 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-40"
                >
                  Clear All
                </button>
                <span className="text-xs text-slate-400">
                  {capturedSamples.length} of {POSES.length} samples captured
                </span>
              </div>

              <div className="flex items-center gap-3">
                {capturedSamples.length < POSES.length ? (
                  <button
                    type="button"
                    onClick={handleCaptureSample}
                    disabled={!isStreaming || isProcessing}
                    className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-brand-500 transition-all shadow-md shadow-brand-600/30 disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Capture Angle ({capturedSamples.length + 1})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalizeRegistration}
                    disabled={isProcessing || !consentAgreed}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Generating Embedding & Verifying...
                      </span>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Finalize Face Registration</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Registration Tips:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Remove sunglasses, heavy face masks, or strong backlighting.</li>
                <li>Hold steady for 1 second during each angle snapshot.</li>
                <li>Our neural network will fuse all samples into an invariant 128D representation.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterUser;
