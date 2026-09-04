import { useState, useEffect, useRef, useCallback } from 'react';

export const useCamera = (options = {}) => {
  const {
    width = 640,
    height = 480,
    facingMode = 'user',
    autoStart = true
  } = options;

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // Enumerate available video inputs
  const getDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = deviceList.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn("Could not enumerate camera devices:", err);
    }
  }, [selectedDeviceId]);

  // Start video stream
  const startCamera = useCallback(async (deviceId = selectedDeviceId) => {
    setError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: width }, height: { ideal: height } }
          : { facingMode, width: { ideal: width }, height: { ideal: height } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setIsStreaming(true);
          }).catch((err) => {
            setError(`Failed to play camera video: ${err.message}`);
          });
        };
      }
      getDevices();
    } catch (err) {
      console.error("Camera access failed:", err);
      let message = "Camera access denied or unavailable.";
      if (err.name === 'NotAllowedError') {
        message = "Camera permission was denied. Please allow camera access in browser settings.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = "No camera found on this device. Please connect a webcam.";
      } else if (err.name === 'NotReadableError') {
        message = "Camera is currently in use by another application.";
      }
      setError(message);
      setIsStreaming(false);
    }
  }, [selectedDeviceId, facingMode, width, height, getDevices]);

  // Stop video stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Capture current video frame as Base64 JPEG string
  const captureFrame = useCallback((quality = 0.85) => {
    if (!videoRef.current || !isStreaming) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw mirrored or standard
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }, [isStreaming]);

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [autoStart, startCamera, stopCamera]);

  return {
    videoRef,
    isStreaming,
    error,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    startCamera,
    stopCamera,
    captureFrame,
  };
};
