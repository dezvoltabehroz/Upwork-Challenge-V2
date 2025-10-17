'use client';

import { useEffect, useRef } from 'react';

interface WaveformProps {
  audioData?: Float32Array;
  isActive: boolean;
  type: 'recording' | 'playback';
}

export default function Waveform({ audioData, isActive, type }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.fillStyle = type === 'recording' ? '#1e293b' : '#0f172a';
      ctx.fillRect(0, 0, width, height);

      if (!isActive) {
        // Draw idle state - flat line
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      // Draw waveform
      const color = type === 'recording' ? '#3b82f6' : '#10b981';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      if (audioData && audioData.length > 0) {
        // Draw actual audio data
        const sliceWidth = width / audioData.length;
        let x = 0;

        for (let i = 0; i < audioData.length; i++) {
          const v = audioData[i];
          const y = (v + 1) * height / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }
      } else {
        // Draw animated waveform when no data
        const time = Date.now() / 1000;
        const barCount = 50;
        const barWidth = width / barCount;

        for (let i = 0; i < barCount; i++) {
          const x = i * barWidth;
          const amplitude = Math.sin(time * 2 + i * 0.5) * 0.3 + 0.7;
          const y = height / 2 + Math.sin(time * 3 + i * 0.3) * amplitude * 20;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }

      ctx.stroke();

      // Continue animation if active
      if (isActive) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioData, isActive, type]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={120}
      className="w-full h-full rounded-lg"
      aria-label={`${type} waveform visualization`}
    />
  );
}
