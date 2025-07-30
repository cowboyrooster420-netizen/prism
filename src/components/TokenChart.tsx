'use client'

import { useEffect, useRef } from 'react';

interface ChartData {
  time: number;
  price: number;
  volume: number;
}

interface TokenChartProps {
  data: ChartData[];
  height?: number;
  type?: 'price' | 'volume';
}

export default function TokenChart({ data, height = 200, type = 'price' }: TokenChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.offsetWidth;
    const padding = 20;

    // Get data range
    const values = data.map(d => type === 'price' ? d.price : d.volume);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;

    // Draw grid
    ctx.strokeStyle = '#2a2a2e';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Vertical grid lines
    for (let i = 0; i <= 5; i++) {
      const x = padding + (width - 2 * padding) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (height - 2 * padding) * (i / 4);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw chart line
    if (data.length > 1) {
      ctx.strokeStyle = type === 'price' ? '#3bb0ff' : '#3bff75';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      data.forEach((point, index) => {
        const x = padding + (width - 2 * padding) * (index / (data.length - 1));
        const y = height - padding - ((point[type === 'price' ? 'price' : 'volume'] - minValue) / range) * (height - 2 * padding);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Fill area under line
      ctx.fillStyle = type === 'price' ? '#3bb0ff20' : '#3bff7520';
      ctx.lineTo(width - padding, height - padding);
      ctx.lineTo(padding, height - padding);
      ctx.closePath();
      ctx.fill();
    }

    // Draw data points
    ctx.fillStyle = type === 'price' ? '#3bb0ff' : '#3bff75';
    data.forEach((point, index) => {
      const x = padding + (width - 2 * padding) * (index / (data.length - 1));
      const y = height - padding - ((point[type === 'price' ? 'price' : 'volume'] - minValue) / range) * (height - 2 * padding);
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';

    // Y-axis labels
    for (let i = 0; i <= 4; i++) {
      const y = padding + (height - 2 * padding) * (i / 4);
      const value = maxValue - (range * i / 4);
      const label = type === 'price' 
        ? `$${value.toFixed(4)}`
        : value >= 1000000 
          ? `$${(value / 1000000).toFixed(1)}M`
          : `$${(value / 1000).toFixed(0)}K`;
      
      ctx.fillText(label, padding - 5, y + 3);
    }

    // X-axis labels (time)
    ctx.textAlign = 'center';
    const timeLabels = ['24h ago', '18h ago', '12h ago', '6h ago', 'Now'];
    timeLabels.forEach((label, i) => {
      const x = padding + (width - 2 * padding) * (i / 4);
      ctx.fillText(label, x, height - 5);
    });

  }, [data, height, type]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
} 