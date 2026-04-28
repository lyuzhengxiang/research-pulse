'use client';

export function Sparkline({
  points,
  width = 120,
  height = 24,
  stroke = '#b1342a',
  strokeWidth = 1.5,
  fill = true,
  fillOpacity = 0.16,
}: {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: boolean;
  fillOpacity?: number;
}) {
  if (!points.length) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#bdb29b"
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
    return [x, y] as const;
  });
  const linePath = `M ${coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')}`;
  const lastX = coords[coords.length - 1][0];
  const firstX = coords[0][0];
  const areaPath = `${linePath} L ${lastX.toFixed(1)},${height - pad} L ${firstX.toFixed(1)},${height - pad} Z`;

  return (
    <svg width={width} height={height} className="block">
      {fill && <path d={areaPath} fill={stroke} fillOpacity={fillOpacity} />}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
