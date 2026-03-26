/**
 * Model Detail Panel — Detailed results for selected turbine model
 * Shows power curve, monthly AEP, and detailed specifications
 */

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { ModelComparisonResult, TurbineModel, getPowerAtSpeed } from "@/lib/turbineModels";
import { TurbineLayoutViz } from "@/components/TurbineLayoutViz";
import { WindRoseChart } from "@/components/WindRoseChart";
import { Separator } from "@/components/ui/separator";
import { Wind, Zap, Layers, Ruler, BarChart2, TrendingUp } from "lucide-react";

interface ModelDetailPanelProps {
  result: ModelComparisonResult;
  monthlyAEP: number[];
  windRose: any[];
  prevailingDirDeg: number;
  lossBreakdown: { label: string; pct: number }[];
  spacingDownwind: number;
  spacingCrosswind: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ModelDetailPanel({
  result,
  monthlyAEP,
  windRose,
  prevailingDirDeg,
  lossBreakdown,
  spacingDownwind,
  spacingCrosswind,
}: ModelDetailPanelProps) {
  const model = result.model;

  // Generate power curve chart data
  const powerCurveData = model.powerCurve.map(([v, p]) => ({
    speed: v,
    power: p,
  }));

  // Monthly AEP for this model (scaled from gross AEP)
  const monthlyData = MONTHS.map((m, i) => ({
    month: m,
    aep: monthlyAEP[i],
  }));

  return (
    <div className="space-y-5">
      {/* ── Model Header ── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              {model.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Key Results Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Rotor Ø", value: `${model.rotorDiameter}m` },
            { label: "Hub Height", value: `${model.hubHeight}m` },
            { label: "Rated Power", value: `${model.ratedPower} kW` },
            { label: "Cut-in", value: `${model.cutInSpeed} m/s` },
            { label: "Rated Speed", value: `${model.ratedSpeed} m/s` },
            { label: "Cp", value: model.powerCoefficient },
            { label: "Availability", value: `${(model.availability * 100).toFixed(0)}%` },
            { label: "Turbines Needed", value: result.turbinesRequired, highlight: true },
            { label: "Total Capacity", value: `${result.totalCapacity} kW`, highlight: true },
            { label: "Net AEP/Turbine", value: `${(result.netAEP / 1000).toFixed(1)} MWh`, highlight: true },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className={`rounded-lg p-2 ${highlight ? "bg-teal-50 border border-teal-200" : "bg-muted/50"}`}
            >
              <div className={`text-xs font-medium ${highlight ? "text-teal-700" : "text-muted-foreground"}`}>
                {label}
              </div>
              <div
                className={`font-bold tabular-nums mt-0.5 ${highlight ? "text-teal-700" : "text-foreground"}`}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Power Curve ── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          <Zap className="w-4 h-4 text-teal-600" />
          Power Curve
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={powerCurveData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.006 240)" />
            <XAxis
              dataKey="speed"
              label={{ value: "Wind Speed (m/s)", position: "insideBottomRight", offset: -5 }}
              tick={{ fontSize: 11, fill: "oklch(0.52 0.015 240)" }}
            />
            <YAxis
              label={{ value: `Power (kW)`, angle: -90, position: "insideLeft" }}
              tick={{ fontSize: 11, fill: "oklch(0.52 0.015 240)" }}
            />
            <RechartsTooltip
              formatter={(v: number) => [`${v.toFixed(2)} kW`, "Power"]}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid oklch(0.88 0.006 240)" }}
            />
            <Line
              type="monotone"
              dataKey="power"
              stroke="oklch(0.52 0.14 185)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 text-xs text-muted-foreground">
          Cut-in: {model.cutInSpeed} m/s · Rated: {model.ratedSpeed} m/s · Cut-out: {model.cutOutSpeed} m/s
        </div>
      </div>

      {/* ── Monthly AEP ── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          <BarChart2 className="w-4 h-4 text-teal-600" />
          Monthly Energy Production (per turbine, net)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.006 240)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.52 0.015 240)" }} />
            <YAxis tick={{ fontSize: 11, fill: "oklch(0.52 0.015 240)" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <RechartsTooltip
              formatter={(v: number) => [`${v.toLocaleString()} kWh`, "Net AEP"]}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid oklch(0.88 0.006 240)" }}
            />
            <Bar dataKey="aep" fill="oklch(0.60 0.16 165)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Wind Rose + Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            <Wind className="w-4 h-4 text-teal-600" />
            Wind Rose
          </h3>
          <div className="flex justify-center">
            <WindRoseChart data={windRose} size={240} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            <Layers className="w-4 h-4 text-teal-600" />
            Turbine Layout ({result.turbinesRequired} units)
          </h3>
          <TurbineLayoutViz
            numTurbines={result.turbinesRequired}
            spacingDownwindM={spacingDownwind * model.rotorDiameter}
            spacingCrosswindM={spacingCrosswind * model.rotorDiameter}
            prevailingDirDeg={prevailingDirDeg}
          />
        </div>
      </div>

      {/* ── Loss Breakdown ── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          <TrendingUp className="w-4 h-4 text-teal-600" />
          Energy Loss Factors
        </h3>
        <div className="space-y-2">
          {lossBreakdown.map((l, i) => (
            <div key={l.label} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{
                  background: [
                    "oklch(0.52 0.14 185)",
                    "oklch(0.60 0.16 165)",
                    "oklch(0.68 0.17 155)",
                    "oklch(0.45 0.12 195)",
                    "oklch(0.35 0.10 205)",
                    "oklch(0.75 0.15 145)",
                  ][i % 6],
                }}
              />
              <span className="text-xs text-muted-foreground flex-1">{l.label}</span>
              <span className="text-xs font-semibold tabular-nums">{l.pct.toFixed(1)}%</span>
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(l.pct / 20) * 100}%`,
                    background: [
                      "oklch(0.52 0.14 185)",
                      "oklch(0.60 0.16 165)",
                      "oklch(0.68 0.17 155)",
                      "oklch(0.45 0.12 195)",
                      "oklch(0.35 0.10 205)",
                      "oklch(0.75 0.15 145)",
                    ][i % 6],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
          <strong>Net AEP:</strong> {(result.grossAEP * (1 - lossBreakdown.reduce((s, l) => s + l.pct / 100, 0))).toLocaleString()} kWh/year per turbine
        </div>
      </div>
    </div>
  );
}
