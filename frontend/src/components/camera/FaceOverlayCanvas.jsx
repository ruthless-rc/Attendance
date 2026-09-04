import React, { useEffect, useRef } from 'react';

const FaceOverlayCanvas = ({
  faces = [],
  videoWidth = 640,
  videoHeight = 480,
  isScanning = true,
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / (videoWidth || 1);
    const scaleY = canvas.height / (videoHeight || 1);

    faces.forEach((face) => {
      const { bbox, recognized, name, unique_id, confidence, status } = face;
      if (!bbox) return;

      const x = bbox.x * scaleX;
      const y = bbox.y * scaleY;
      const w = bbox.w * scaleX;
      const h = bbox.h * scaleY;

      // Color scheme based on recognition status
      let primaryColor = '#3b82f6'; // Default blue
      let badgeBg = 'rgba(37, 99, 235, 0.9)';

      if (status === 'already_marked') {
        primaryColor = '#06b6d4'; // Cyan
        badgeBg = 'rgba(8, 145, 178, 0.9)';
      } else if (recognized || status === 'recognized') {
        primaryColor = '#10b981'; // Emerald Green
        badgeBg = 'rgba(5, 150, 105, 0.9)';
      } else if (status === 'liveness_required') {
        primaryColor = '#f59e0b'; // Amber
        badgeBg = 'rgba(217, 119, 6, 0.9)';
      } else if (status === 'unknown') {
        primaryColor = '#ef4444'; // Red
        badgeBg = 'rgba(220, 38, 38, 0.9)';
      }

      // Draw bounding box corners (modern AI scanner reticle)
      ctx.lineWidth = 3;
      ctx.strokeStyle = primaryColor;
      const cornerLength = Math.min(24, w * 0.2, h * 0.2);

      ctx.beginPath();
      // Top Left
      ctx.moveTo(x, y + cornerLength);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLength, y);

      // Top Right
      ctx.moveTo(x + w - cornerLength, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cornerLength);

      // Bottom Right
      ctx.moveTo(x + w, y + h - cornerLength);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w - cornerLength, y + h);

      // Bottom Left
      ctx.moveTo(x + cornerLength, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + h - cornerLength);
      ctx.stroke();

      // Semi-transparent box background fill
      ctx.fillStyle = primaryColor + '10';
      ctx.fillRect(x, y, w, h);

      // Label Tag
      const labelText = recognized && name ? name : 'Unknown Person';
      const subText = recognized && unique_id ? `${unique_id} • ${(confidence * 100).toFixed(0)}%` : 'No Match';

      ctx.font = 'bold 13px Inter, sans-serif';
      const textWidth = Math.max(ctx.measureText(labelText).width, 100);
      const tagHeight = 36;
      const tagY = y > tagHeight + 6 ? y - tagHeight - 4 : y + h + 6;

      // Tag background
      ctx.fillStyle = badgeBg;
      ctx.beginPath();
      ctx.roundRect(x, tagY, textWidth + 16, tagHeight, 6);
      ctx.fill();

      // Text inside tag
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(labelText, x + 8, tagY + 16);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(subText, x + 8, tagY + 29);
    });
  }, [faces, videoWidth, videoHeight, isScanning]);

  return (
    <canvas
      ref={canvasRef}
      width={videoWidth}
      height={videoHeight}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};

export default FaceOverlayCanvas;
