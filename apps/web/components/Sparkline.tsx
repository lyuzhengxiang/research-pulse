'use client';

export function Sparkline({
  points,
  width = 96,
  height = 24,
  stroke = '#00d97e',
  strokeWidth = 1.5,
  fill = true,
}: {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: boolean;
}) {
  if (!points.length) {
    return (
      <svg width={width} height={height} className="text-ink-muted">
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 2;
  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (p - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linePath = `M ${coords.join(' L ')}`;

  const last = coords[coords.length - 1].split(',').map(Number);
  const firstX = pad;
  const lastX = pad + (points.length - 1) * stepX;
  const areaPath = `${linePath} L ${lastX},${height - pad} L ${firstX},${height - pad} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {fill && (
        <path
          d={areaPath}
          fill={stroke}
          opacity={0.12}
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last && (
        <circle
          cx={last[0]}
          cy={last[1]}
          r={2}
          fill={stroke}
          className="drop-shadow-[0_0_4px_var(--spark-glow)]"
          style={{ ['--spark-glow' as string]: stroke }}
        />
      )}
    </svg>
  );
}
