/**
 * Turbine Layout Visualization
 * Shows a grid of turbine positions with spacing annotations
 */

interface TurbineLayoutVizProps {
  numTurbines: number;
  spacingDownwindM: number;
  spacingCrosswindM: number;
  prevailingDirDeg: number;
}

export function TurbineLayoutViz({
  numTurbines,
  spacingDownwindM,
  spacingCrosswindM,
  prevailingDirDeg,
}: TurbineLayoutVizProps) {
  const maxDisplay = Math.min(numTurbines, 25);
  const cols = Math.ceil(Math.sqrt(maxDisplay));
  const rows = Math.ceil(maxDisplay / cols);

  const svgW = 280;
  const svgH = 200;
  const padding = 30;
  const cellW = (svgW - padding * 2) / Math.max(cols, 1);
  const cellH = (svgH - padding * 2) / Math.max(rows, 1);

  const turbines: { x: number; y: number; idx: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= maxDisplay) break;
      turbines.push({
        x: padding + c * cellW + cellW / 2,
        y: padding + r * cellH + cellH / 2,
        idx,
      });
    }
  }

  // Wind direction arrow
  const windRad = ((prevailingDirDeg - 90) * Math.PI) / 180;
  const arrowLen = 30;
  const arrowX = svgW - 25;
  const arrowY = 20;
  const ax2 = arrowX + Math.cos(windRad) * arrowLen;
  const ay2 = arrowY + Math.sin(windRad) * arrowLen;

  return (
    <div>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {/* Background */}
        <rect width={svgW} height={svgH} rx="6" fill="oklch(0.97 0.005 240)" />

        {/* Spacing lines */}
        {turbines.length > 1 && (
          <>
            <line
              x1={turbines[0].x}
              y1={turbines[0].y}
              x2={turbines[1]?.x ?? turbines[0].x + cellW}
              y2={turbines[0].y}
              stroke="oklch(0.52 0.14 185)"
              strokeWidth="1"
              strokeDasharray="4,3"
              opacity="0.5"
            />
            {rows > 1 && (
              <line
                x1={turbines[0].x}
                y1={turbines[0].y}
                x2={turbines[0].x}
                y2={turbines[cols]?.y ?? turbines[0].y + cellH}
                stroke="oklch(0.68 0.17 155)"
                strokeWidth="1"
                strokeDasharray="4,3"
                opacity="0.5"
              />
            )}
          </>
        )}

        {/* Turbine icons */}
        {turbines.map(({ x, y, idx }) => (
          <g key={idx} transform={`translate(${x}, ${y})`}>
            {/* Tower */}
            <line x1="0" y1="0" x2="0" y2="8" stroke="oklch(0.45 0.12 195)" strokeWidth="1.5" />
            {/* Rotor */}
            <circle cx="0" cy="0" r="5" fill="none" stroke="oklch(0.52 0.14 185)" strokeWidth="1.5" />
            <line x1="0" y1="-5" x2="0" y2="5" stroke="oklch(0.52 0.14 185)" strokeWidth="1" />
            <line x1="-5" y1="0" x2="5" y2="0" stroke="oklch(0.52 0.14 185)" strokeWidth="1" />
            <circle cx="0" cy="0" r="1.5" fill="oklch(0.52 0.14 185)" />
          </g>
        ))}

        {numTurbines > maxDisplay && (
          <text x={svgW / 2} y={svgH - 8} textAnchor="middle" fontSize="9" fill="oklch(0.55 0.01 240)" fontFamily="Inter, sans-serif">
            Showing {maxDisplay} of {numTurbines} turbines
          </text>
        )}

        {/* Wind direction indicator */}
        <g>
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="oklch(0.52 0.14 185)" />
            </marker>
          </defs>
          <line
            x1={arrowX - Math.cos(windRad) * 15}
            y1={arrowY - Math.sin(windRad) * 15}
            x2={ax2 - Math.cos(windRad) * 6}
            y2={ay2 - Math.sin(windRad) * 6}
            stroke="oklch(0.52 0.14 185)"
            strokeWidth="1.5"
            markerEnd="url(#arrowhead)"
          />
          <text x={arrowX - Math.cos(windRad) * 15} y={arrowY - Math.sin(windRad) * 15 - 5} textAnchor="middle" fontSize="8" fill="oklch(0.52 0.14 185)" fontFamily="Inter, sans-serif" fontWeight="600">
            Wind
          </text>
        </g>
      </svg>

      {/* Spacing annotations */}
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-teal-600 opacity-60" style={{ borderTop: "1px dashed" }} />
          <span className="text-muted-foreground">Downwind: <span className="font-semibold text-foreground tabular-nums">{spacingDownwindM.toFixed(0)}m</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-emerald-600 opacity-60" style={{ borderTop: "1px dashed" }} />
          <span className="text-muted-foreground">Crosswind: <span className="font-semibold text-foreground tabular-nums">{spacingCrosswindM.toFixed(0)}m</span></span>
        </div>
      </div>
    </div>
  );
}
