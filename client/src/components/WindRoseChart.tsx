/**
 * Wind Rose Chart — SVG-based polar frequency diagram
 * Design: Scientific/Technical SaaS, teal/emerald color scheme
 */

import { WindRoseData } from "@/lib/windCalculations";
import { useMemo } from "react";

interface WindRoseChartProps {
  data: WindRoseData[];
  size?: number;
  className?: string;
}

const TEAL_COLORS = [
  "oklch(0.52 0.14 185)",
  "oklch(0.58 0.15 178)",
  "oklch(0.64 0.16 170)",
  "oklch(0.70 0.17 162)",
];

export function WindRoseChart({ data, size = 280, className = "" }: WindRoseChartProps) {
  const center = size / 2;
  const maxRadius = size * 0.38;
  const maxFreq = Math.max(...data.map((d) => d.frequency));

  const paths = useMemo(() => {
    return data.map((d, i) => {
      const angleDeg = d.degrees - 90; // rotate so N is up
      const angleRad = (angleDeg * Math.PI) / 180;
      const barWidth = (2 * Math.PI) / data.length;
      const halfWidth = barWidth * 0.4;

      const r = (d.frequency / maxFreq) * maxRadius;
      const r2 = (d.frequency / maxFreq) * maxRadius * 0.6; // speed ring

      // Bar path (wedge shape)
      const startAngle = angleRad - halfWidth;
      const endAngle = angleRad + halfWidth;

      const x1 = center + Math.cos(startAngle) * r;
      const y1 = center + Math.sin(startAngle) * r;
      const x2 = center + Math.cos(endAngle) * r;
      const y2 = center + Math.sin(endAngle) * r;

      const largeArc = halfWidth * 2 > Math.PI ? 1 : 0;

      const colorIdx = Math.min(
        Math.floor((d.avgSpeed / 12) * TEAL_COLORS.length),
        TEAL_COLORS.length - 1
      );

      return { d: `M ${center} ${center} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`, color: TEAL_COLORS[colorIdx], label: d.direction, degrees: d.degrees, freq: d.frequency, speed: d.avgSpeed, r2, i };
    });
  }, [data, center, maxRadius, maxFreq]);

  // Concentric rings
  const rings = [0.25, 0.5, 0.75, 1.0].map((f) => ({
    r: f * maxRadius,
    label: `${(f * maxFreq).toFixed(0)}%`,
  }));

  // Cardinal directions
  const cardinals = [
    { label: "N", deg: 0 },
    { label: "E", deg: 90 },
    { label: "S", deg: 180 },
    { label: "W", deg: 270 },
  ];

  return (
    <div className={`relative ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background circle */}
        <circle cx={center} cy={center} r={maxRadius + 8} fill="oklch(0.97 0.005 240)" />

        {/* Concentric rings */}
        {rings.map((ring, i) => (
          <g key={i}>
            <circle
              cx={center}
              cy={center}
              r={ring.r}
              fill="none"
              stroke="oklch(0.85 0.008 240)"
              strokeWidth="0.5"
              strokeDasharray="3,3"
            />
            <text
              x={center + 4}
              y={center - ring.r + 10}
              fontSize="8"
              fill="oklch(0.55 0.01 240)"
              fontFamily="Inter, sans-serif"
            >
              {ring.label}
            </text>
          </g>
        ))}

        {/* Cross lines */}
        {[0, 45, 90, 135].map((deg) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={center + Math.cos(rad) * (maxRadius + 8)}
              y1={center + Math.sin(rad) * (maxRadius + 8)}
              x2={center - Math.cos(rad) * (maxRadius + 8)}
              y2={center - Math.sin(rad) * (maxRadius + 8)}
              stroke="oklch(0.85 0.008 240)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Wind rose bars */}
        {paths.map((p) => (
          <path
            key={p.i}
            d={p.d}
            fill={p.color}
            fillOpacity="0.85"
            stroke="white"
            strokeWidth="0.5"
            className="transition-opacity hover:opacity-100"
          >
            <title>{`${p.label}: ${p.freq.toFixed(1)}% frequency, ${p.speed} m/s avg`}</title>
          </path>
        ))}

        {/* Center dot */}
        <circle cx={center} cy={center} r={4} fill="oklch(0.52 0.14 185)" />

        {/* Cardinal labels */}
        {cardinals.map(({ label, deg }) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const r = maxRadius + 20;
          const x = center + Math.cos(rad) * r;
          const y = center + Math.sin(rad) * r;
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="700"
              fill="oklch(0.13 0.02 240)"
              fontFamily="Space Grotesk, sans-serif"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-3 justify-center">
        <span className="text-xs text-muted-foreground font-medium">Wind Speed (m/s):</span>
        {["0–3", "3–6", "6–9", "9+"].map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: TEAL_COLORS[i] }}
            />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
