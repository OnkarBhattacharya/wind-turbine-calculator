/**
 * Model Comparison Grid — Side-by-side turbine model results
 * Responsive design: stacks on mobile, 2 cols on tablet, 4 cols on desktop
 */

import { ModelComparisonResult } from "@/lib/turbineModels";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, TrendingUp, Zap, Ruler } from "lucide-react";

interface ModelComparisonGridProps {
  results: ModelComparisonResult[];
  selectedModelId?: string;
  onSelectModel?: (modelId: string) => void;
}

export function ModelComparisonGrid({
  results,
  selectedModelId,
  onSelectModel,
}: ModelComparisonGridProps) {
  const getFeasibilityColor = (cf: number) => {
    if (cf >= 0.25) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (cf >= 0.15) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-500 bg-red-50 border-red-200";
  };

  const getFeasibilityLabel = (cf: number) => {
    if (cf >= 0.25) return "Excellent";
    if (cf >= 0.15) return "Good";
    if (cf >= 0.10) return "Fair";
    return "Poor";
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {results.map((result) => {
        const isSelected = selectedModelId === result.modelId;
        const feasColor = getFeasibilityColor(result.capacityFactor);
        const feasLabel = getFeasibilityLabel(result.capacityFactor);

        return (
          <div
            key={result.modelId}
            onClick={() => onSelectModel?.(result.modelId)}
            className={`relative bg-card border-2 rounded-xl p-4 transition-all cursor-pointer ${
              isSelected
                ? "border-teal-600 shadow-lg shadow-teal-600/20"
                : "border-border hover:border-teal-300"
            }`}
          >
            {/* Model Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3
                  className="font-bold text-sm text-foreground"
                  style={{ fontFamily: "Space Grotesk, sans-serif" }}
                >
                  {result.model.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {result.model.rotorDiameter}m rotor · {result.model.hubHeight}m hub
                </p>
              </div>
              {isSelected && <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />}
            </div>

            {/* Key Metrics */}
            <div className="space-y-2.5 mb-3">
              {/* Turbines Required */}
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Turbines Required
                </div>
                <div
                  className="text-2xl font-bold text-foreground tabular-nums mt-0.5"
                  style={{ fontFamily: "Space Grotesk, sans-serif" }}
                >
                  {result.turbinesRequired}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {result.totalCapacity} kW total
                </div>
              </div>

              {/* Net AEP per Turbine */}
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-xs text-muted-foreground">Net AEP/Turbine</div>
                <div className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                  {(result.netAEP / 1000).toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">MWh/year</div>
              </div>

              {/* Capacity Factor */}
              <div className={`rounded-lg p-2 border ${feasColor}`}>
                <div className="text-xs font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Capacity Factor
                </div>
                <div className="text-lg font-bold tabular-nums mt-0.5">
                  {(result.capacityFactor * 100).toFixed(1)}%
                </div>
                <Badge variant="outline" className="text-xs mt-1">
                  {feasLabel}
                </Badge>
              </div>

              {/* Land Area */}
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Ruler className="w-3 h-3" />
                  Land Required
                </div>
                <div className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                  {result.landArea}
                </div>
                <div className="text-xs text-muted-foreground">hectares</div>
              </div>

              {/* Total Net AEP */}
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-2">
                <div className="text-xs font-medium text-teal-700">Total Net AEP</div>
                <div className="text-lg font-bold text-teal-700 tabular-nums mt-0.5">
                  {(result.totalNetAEP / 1000).toFixed(0)} MWh
                </div>
                <div className="text-xs text-teal-600 mt-0.5">
                  {result.totalNetAEP.toLocaleString()} kWh/year
                </div>
              </div>
            </div>

            {/* Specs Footer */}
            <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t border-border">
              <div className="flex justify-between">
                <span>Rated Power</span>
                <span className="font-semibold">{result.model.ratedPower} kW</span>
              </div>
              <div className="flex justify-between">
                <span>Cut-in / Rated</span>
                <span className="font-semibold tabular-nums">
                  {result.model.cutInSpeed} / {result.model.ratedSpeed} m/s
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cp</span>
                <span className="font-semibold">{result.model.powerCoefficient}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
