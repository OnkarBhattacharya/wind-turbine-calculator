/**
 * Wind Turbine Calculator — Main Page
 * Design: Scientific/Technical SaaS, Bauhaus-inspired minimalism
 * Layout: Sticky left input panel (40%) + scrollable right results panel (60%)
 * Colors: Off-white bg, deep slate headings, teal primary, emerald results
 * Fonts: Space Grotesk (headings) + Inter (body) + tabular nums for data
 */

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { WindRoseChart } from "@/components/WindRoseChart";
import { TurbineLayoutViz } from "@/components/TurbineLayoutViz";
import { CoordinateMap } from "@/components/CoordinateMap";
import {
  runSiteAssessment,
  TERRAIN_ROUGHNESS,
  DEFAULT_LOSSES,
  TURBINE_SPECS,
  type SiteAssessmentResult,
  type TerrainType,
  type LossFactors,
} from "@/lib/windCalculations";
import { fetchNASAPowerWindData, getDemoWindData, type NASAPowerWindData } from "@/lib/nasaPowerApi";
import {
  Wind,
  MapPin,
  Zap,
  ChevronDown,
  ChevronRight,
  Info,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Layers,
  Ruler,
  BarChart2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663479092994/KkvnHE3YoUhxpnE9zqFB9W/hero-wind-farm-HjMZgP5RZCJjLGf5UJG6TM.webp";
const TURBINE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663479092994/KkvnHE3YoUhxpnE9zqFB9W/turbine-schematic-nYGoP4H2eVwGNt4SB3iwm5.webp";

// ─── Helper Components ────────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function MetricCard({
  label,
  value,
  unit,
  sub,
  highlight = false,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  highlight?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className={`metric-card ${highlight ? "border-l-4 border-l-teal-600" : ""}`}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`text-2xl font-bold tabular-nums leading-none ${highlight ? "result-highlight" : "text-foreground"}`}
          style={{ fontFamily: "Space Grotesk, sans-serif" }}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground font-medium">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function StepHeader({ num, title, icon: Icon }: { num: number; title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="step-number">{num}</div>
      <Icon className="w-4 h-4 text-teal-600" />
      <h3 className="font-semibold text-sm text-foreground" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
        {title}
      </h3>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  // ── Inputs ──
  const [lat, setLat] = useState(51.5074);
  const [lon, setLon] = useState(-0.1278);
  const [targetAEP, setTargetAEP] = useState(100000); // kWh/year
  const [terrain, setTerrain] = useState<TerrainType>("agricultural");
  const [hubHeight, setHubHeight] = useState(30);
  const [weibullK, setWeibullK] = useState(2.0);
  const [spacingDownwind, setSpacingDownwind] = useState(7);
  const [spacingCrosswind, setSpacingCrosswind] = useState(4);
  const [losses, setLosses] = useState<LossFactors>(DEFAULT_LOSSES);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [lossesOpen, setLossesOpen] = useState(false);

  // ── State ──
  const [windData, setWindData] = useState<NASAPowerWindData | null>(null);
  const [result, setResult] = useState<SiteAssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"nasa" | "demo" | null>(null);
  const [latInput, setLatInput] = useState("51.5074");
  const [lonInput, setLonInput] = useState("-0.1278");

  // ── Fetch wind data from NASA POWER ──
  const fetchWindData = useCallback(async (latitude: number, longitude: number) => {
    setLoading(true);
    try {
      const data = await fetchNASAPowerWindData(latitude, longitude);
      setWindData(data);
      setDataSource("nasa");
      toast.success("Wind data fetched from NASA POWER", {
        description: `Annual mean: ${data.annualMeanSpeed} m/s at 10m`,
      });
      return data;
    } catch (err) {
      const demo = getDemoWindData(latitude, longitude);
      setWindData(demo);
      setDataSource("demo");
      toast.warning("Using estimated wind data", {
        description: "NASA POWER API unavailable — using location-based estimates",
      });
      return demo;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Run calculation ──
  const runCalculation = useCallback(
    async (wData?: NASAPowerWindData) => {
      const wd = wData ?? windData;
      if (!wd) {
        toast.error("Please fetch wind data first");
        return;
      }

      const inputs = {
        latitude: lat,
        longitude: lon,
        elevation: wd.elevation,
        targetAEP,
        terrain,
        hubHeight,
        weibullK,
        losses,
        spacingDownwind,
        spacingCrosswind,
      };

      const assessment = runSiteAssessment(inputs, {
        annualMeanSpeed: wd.annualMeanSpeed,
        annualMeanSpeed50m: wd.annualMeanSpeed50m,
        prevailingDirection: wd.prevailingDirection,
        monthlyMeanSpeeds: wd.monthlyMeanSpeeds,
      });

      setResult(assessment);
    },
    [windData, lat, lon, targetAEP, terrain, hubHeight, weibullK, losses, spacingDownwind, spacingCrosswind]
  );

  // ── Fetch + Calculate ──
  const handleAnalyze = async () => {
    const wd = await fetchWindData(lat, lon);
    if (wd) await runCalculation(wd);
  };

  // ── Re-run on param change (if wind data already loaded) ──
  useEffect(() => {
    if (windData) {
      runCalculation();
    }
  }, [terrain, hubHeight, weibullK, losses, spacingDownwind, spacingCrosswind, targetAEP]);

  const handleMapChange = (newLat: number, newLon: number) => {
    setLat(newLat);
    setLon(newLon);
    setLatInput(newLat.toFixed(6));
    setLonInput(newLon.toFixed(6));
  };

  const handleLatInput = (v: string) => {
    setLatInput(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n >= -90 && n <= 90) setLat(n);
  };

  const handleLonInput = (v: string) => {
    setLonInput(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n >= -180 && n <= 180) setLon(n);
  };

  const updateLoss = (key: keyof LossFactors, val: number) => {
    setLosses((prev) => ({ ...prev, [key]: val / 100 }));
  };

  // ── Feasibility color ──
  const feasibilityColor = result
    ? result.capacityFactor >= 0.25
      ? "text-emerald-600"
      : result.capacityFactor >= 0.15
      ? "text-amber-600"
      : "text-red-500"
    : "";

  const feasibilityLabel = result
    ? result.capacityFactor >= 0.25
      ? "Good"
      : result.capacityFactor >= 0.15
      ? "Moderate"
      : "Poor"
    : "";

  // ── Export report ──
  const exportReport = () => {
    if (!result) return;
    const lines = [
      "WIND TURBINE SITE ASSESSMENT REPORT",
      "====================================",
      `Generated: ${new Date().toLocaleDateString()}`,
      `Coordinates: ${result.inputs.latitude}°N, ${result.inputs.longitude}°E`,
      `Elevation: ${result.inputs.elevation}m`,
      "",
      "WIND RESOURCE",
      `Annual Mean Wind Speed (10m): ${result.windData.annualMeanSpeed} m/s`,
      `Annual Mean Wind Speed (50m): ${result.windData.annualMeanSpeed50m} m/s`,
      `Hub Height Wind Speed (${result.inputs.hubHeight}m): ${result.hubWindSpeed} m/s`,
      `Weibull k: ${result.inputs.weibullK}, c: ${result.weibullC} m/s`,
      `Air Density: ${result.airDensity} kg/m³`,
      "",
      "ENERGY RESULTS",
      `Gross AEP per Turbine: ${result.grossAEP.toLocaleString()} kWh/year`,
      `Net AEP per Turbine: ${result.netAEP.toLocaleString()} kWh/year`,
      `Capacity Factor: ${(result.capacityFactor * 100).toFixed(1)}%`,
      `Site Feasibility: ${feasibilityLabel}`,
      "",
      "TURBINE REQUIREMENT",
      `Target Energy Output: ${result.inputs.targetAEP.toLocaleString()} kWh/year`,
      `Turbines Required: ${result.turbinesRequired}`,
      `Total Installed Capacity: ${result.totalInstalledCapacity} kW`,
      `Total Net AEP: ${result.totalNetAEP.toLocaleString()} kWh/year`,
      "",
      "LAND REQUIREMENTS",
      `Land Area: ${result.landArea.hectares.toFixed(1)} ha (${result.landArea.acreage.toFixed(1)} acres)`,
      `Downwind Spacing: ${result.landArea.spacingDownwindM.toFixed(0)}m`,
      `Crosswind Spacing: ${result.landArea.spacingCrosswindM.toFixed(0)}m`,
      "",
      "LOSS BREAKDOWN",
      ...result.lossBreakdown.map((l) => `  ${l.label}: ${l.pct.toFixed(1)}%`),
      "",
      `Data Source: ${windData?.dataSource ?? "NASA POWER (MERRA-2 Reanalysis)"}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wind-assessment-${lat.toFixed(2)}-${lon.toFixed(2)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* ── Header ── */}
      <header
        className="relative overflow-hidden"
        style={{
          background: "oklch(0.13 0.02 240)",
          minHeight: 200,
        }}
      >
        <img
          src={HERO_IMG}
          alt="Wind farm"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-10 container py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wind className="w-5 h-5 text-teal-400" />
                <span className="text-teal-400 text-sm font-semibold tracking-widest uppercase">
                  Site Assessment Tool
                </span>
              </div>
              <h1
                className="text-3xl font-bold text-white mb-2 leading-tight"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                10kW Wind Turbine
                <br />
                <span className="text-teal-400">Requirement Calculator</span>
              </h1>
              <p className="text-slate-300 text-sm max-w-lg">
                Enter GPS coordinates and your target energy output to receive a detailed site
                assessment — wind resource, energy yield, turbine count, spacing, and loss analysis.
              </p>
            </div>
            <img
              src={TURBINE_IMG}
              alt="Turbine schematic"
              className="hidden lg:block w-24 h-36 object-contain opacity-80 rounded"
            />
          </div>

          {/* Turbine specs badge row */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              `Rated Power: ${TURBINE_SPECS.ratedPower} kW`,
              `Rotor Ø: ${TURBINE_SPECS.rotorDiameter}m`,
              `Cut-in: ${TURBINE_SPECS.cutInSpeed} m/s`,
              `Rated: ${TURBINE_SPECS.ratedSpeed} m/s`,
              `Cp: ${TURBINE_SPECS.powerCoefficient}`,
            ].map((spec) => (
              <Badge
                key={spec}
                variant="outline"
                className="text-slate-300 border-slate-600 bg-slate-800/50 text-xs"
              >
                {spec}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="container py-6">
        <div className="flex gap-6 items-start">
          {/* ── LEFT: Input Panel (sticky) ── */}
          <div
            className="w-full lg:w-[42%] shrink-0"
            style={{ position: "sticky", top: 16, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}
          >
            <div className="space-y-4">
              {/* ── Step 1: Location ── */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <StepHeader num={1} title="Site Location" icon={MapPin} />

                <CoordinateMap lat={lat} lon={lon} onChange={handleMapChange} />

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Latitude
                      <InfoTip text="Decimal degrees. Positive = North, Negative = South. Range: -90 to 90." />
                    </Label>
                    <Input
                      value={latInput}
                      onChange={(e) => handleLatInput(e.target.value)}
                      placeholder="e.g. 51.5074"
                      className="font-mono text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Longitude
                      <InfoTip text="Decimal degrees. Positive = East, Negative = West. Range: -180 to 180." />
                    </Label>
                    <Input
                      value={lonInput}
                      onChange={(e) => handleLonInput(e.target.value)}
                      placeholder="e.g. -0.1278"
                      className="font-mono text-sm tabular-nums"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Click on the map to set coordinates, or type them above
                </p>
              </div>

              {/* ── Step 2: Energy Target ── */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <StepHeader num={2} title="Target Energy Output" icon={Zap} />

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Annual Energy Required (kWh/year)
                    <InfoTip text="Total energy your client needs to generate per year. E.g. 100,000 kWh = ~11.4 kW average continuous load." />
                  </Label>
                  <Input
                    type="number"
                    value={targetAEP}
                    onChange={(e) => setTargetAEP(Math.max(1000, parseInt(e.target.value) || 0))}
                    className="font-mono text-sm tabular-nums"
                    step={1000}
                    min={1000}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{(targetAEP / 1000).toFixed(0)} MWh/year</span>
                    <span>≈ {(targetAEP / 8760).toFixed(1)} kW avg load</span>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[
                    { label: "Home (10 MWh)", val: 10000 },
                    { label: "Farm (50 MWh)", val: 50000 },
                    { label: "SME (200 MWh)", val: 200000 },
                    { label: "Factory (1 GWh)", val: 1000000 },
                  ].map(({ label, val }) => (
                    <button
                      key={val}
                      onClick={() => setTargetAEP(val)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        targetAEP === val
                          ? "bg-teal-600 text-white border-teal-600"
                          : "border-border text-muted-foreground hover:border-teal-500 hover:text-teal-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Step 3: Site Parameters ── */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <StepHeader num={3} title="Site Parameters" icon={Layers} />

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Terrain Type
                      <InfoTip text="Surface roughness affects wind speed at hub height. Open terrain = higher wind speeds. Urban = significant reduction." />
                    </Label>
                    <Select value={terrain} onValueChange={(v) => setTerrain(v as TerrainType)}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TERRAIN_ROUGHNESS).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            <div>
                              <div className="font-medium text-sm">{val.label}</div>
                              <div className="text-xs text-muted-foreground">{val.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Roughness length z₀ = {TERRAIN_ROUGHNESS[terrain].z0}m · α = {TERRAIN_ROUGHNESS[terrain].alpha}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Hub Height: <span className="font-semibold text-foreground tabular-nums">{hubHeight}m</span>
                      <InfoTip text="Height of turbine hub above ground. Higher hubs capture faster, less turbulent wind. Typical 10kW: 20–40m." />
                    </Label>
                    <Slider
                      value={[hubHeight]}
                      onValueChange={([v]) => setHubHeight(v)}
                      min={15}
                      max={60}
                      step={1}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>15m</span>
                      <span>60m</span>
                    </div>
                  </div>
                </div>

                {/* Advanced Parameters */}
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-teal-600 font-medium mt-4 hover:text-teal-700 transition-colors">
                    {advancedOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Advanced Wind Parameters
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Weibull k (Shape): <span className="font-semibold text-foreground tabular-nums">{weibullK.toFixed(1)}</span>
                        <InfoTip text="Weibull shape parameter. k=2 (Rayleigh) is typical for most sites. k<2 = more variable wind. k>2 = more consistent." />
                      </Label>
                      <Slider
                        value={[weibullK * 10]}
                        onValueChange={([v]) => setWeibullK(v / 10)}
                        min={10}
                        max={35}
                        step={1}
                        className="mt-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>k=1.0 (variable)</span>
                        <span>k=3.5 (consistent)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Downwind Spacing
                          <InfoTip text="Turbine spacing in the prevailing wind direction, in rotor diameters. Recommended: 5–9D." />
                        </Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[spacingDownwind]}
                            onValueChange={([v]) => setSpacingDownwind(v)}
                            min={4}
                            max={12}
                            step={0.5}
                            className="flex-1"
                          />
                          <span className="text-xs font-semibold tabular-nums w-8">{spacingDownwind}D</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Crosswind Spacing
                          <InfoTip text="Turbine spacing perpendicular to prevailing wind, in rotor diameters. Recommended: 3–5D." />
                        </Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[spacingCrosswind]}
                            onValueChange={([v]) => setSpacingCrosswind(v)}
                            min={2}
                            max={8}
                            step={0.5}
                            className="flex-1"
                          />
                          <span className="text-xs font-semibold tabular-nums w-8">{spacingCrosswind}D</span>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Loss Factors */}
                <Collapsible open={lossesOpen} onOpenChange={setLossesOpen}>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-teal-600 font-medium mt-3 hover:text-teal-700 transition-colors">
                    {lossesOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Energy Loss Factors
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3">
                    {[
                      { key: "wakeEffect" as keyof LossFactors, label: "Wake Effect", tip: "Energy lost due to turbine wake interference. Increases with array density." },
                      { key: "electricalLoss" as keyof LossFactors, label: "Electrical Losses", tip: "Cable, transformer, and inverter losses." },
                      { key: "bladeDegradation" as keyof LossFactors, label: "Blade Degradation", tip: "Performance reduction from blade surface erosion over time." },
                      { key: "icing" as keyof LossFactors, label: "Icing / Soiling", tip: "Energy lost due to ice accretion or dirt on blades. Higher in cold/humid climates." },
                      { key: "curtailment" as keyof LossFactors, label: "Curtailment", tip: "Grid constraints, noise limits, or shadow flicker restrictions." },
                      { key: "availabilityLoss" as keyof LossFactors, label: "Availability Loss", tip: "Downtime for maintenance and unplanned outages." },
                    ].map(({ key, label, tip }) => (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-xs text-muted-foreground">
                            {label}
                            <InfoTip text={tip} />
                          </Label>
                          <span className="text-xs font-semibold tabular-nums text-foreground">
                            {(losses[key] * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Slider
                          value={[losses[key] * 100]}
                          onValueChange={([v]) => updateLoss(key, v)}
                          min={0}
                          max={20}
                          step={0.5}
                        />
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* ── Analyze Button ── */}
              <Button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700 text-white"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Fetching Wind Data…
                  </>
                ) : (
                  <>
                    <Wind className="w-4 h-4 mr-2" />
                    Analyse Site & Calculate
                  </>
                )}
              </Button>

              {dataSource && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${dataSource === "nasa" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                  {dataSource === "nasa" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  <span>{dataSource === "nasa" ? "Live NASA POWER data (MERRA-2 Reanalysis)" : "Demo mode — estimated wind data"}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Results Panel ── */}
          <div className="flex-1 min-w-0">
            {!result ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center mb-4">
                  <Wind className="w-10 h-10 text-teal-400" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                  Ready to Analyse
                </h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Enter your site coordinates and target energy output, then click{" "}
                  <strong>Analyse Site & Calculate</strong> to receive a full wind resource assessment.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4 max-w-md w-full text-left">
                  {[
                    { icon: Wind, title: "Wind Resource", desc: "NASA POWER climatological data" },
                    { icon: Zap, title: "Energy Yield", desc: "Weibull distribution + power curve" },
                    { icon: Layers, title: "Loss Analysis", desc: "6-factor energy loss model" },
                    { icon: Ruler, title: "Land Sizing", desc: "Turbine spacing & area estimate" },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="bg-card border border-border rounded-lg p-3">
                      <Icon className="w-4 h-4 text-teal-600 mb-1.5" />
                      <div className="text-sm font-semibold text-foreground">{title}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* ── Results Header ── */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                      Site Assessment Results
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result.inputs.latitude.toFixed(4)}°, {result.inputs.longitude.toFixed(4)}° ·{" "}
                      {windData?.dataSource ?? "NASA POWER"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportReport}
                      className="text-xs"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Export
                    </Button>
                  </div>
                </div>

                {/* ── Key Metrics ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard
                    label="Turbines Required"
                    value={result.turbinesRequired}
                    unit="units"
                    sub={`${result.totalInstalledCapacity} kW total`}
                    highlight
                    icon={Wind}
                  />
                  <MetricCard
                    label="Net AEP / Turbine"
                    value={(result.netAEP / 1000).toFixed(1)}
                    unit="MWh/yr"
                    sub={`Gross: ${(result.grossAEP / 1000).toFixed(1)} MWh`}
                    icon={Zap}
                  />
                  <MetricCard
                    label="Capacity Factor"
                    value={(result.capacityFactor * 100).toFixed(1)}
                    unit="%"
                    sub={`Site: ${feasibilityLabel}`}
                    icon={TrendingUp}
                  />
                  <MetricCard
                    label="Land Required"
                    value={result.landArea.hectares.toFixed(1)}
                    unit="ha"
                    sub={`${result.landArea.acreage.toFixed(1)} acres`}
                    icon={Ruler}
                  />
                </div>

                {/* ── Wind Resource Summary ── */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                    <Wind className="w-4 h-4 text-teal-600" />
                    Wind Resource Summary
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {[
                      { label: "Mean Speed (10m)", value: `${result.windData.annualMeanSpeed} m/s` },
                      { label: "Mean Speed (50m)", value: `${result.windData.annualMeanSpeed50m} m/s` },
                      { label: `Hub Speed (${result.inputs.hubHeight}m)`, value: `${result.hubWindSpeed} m/s` },
                      { label: "Air Density", value: `${result.airDensity} kg/m³` },
                      { label: "Weibull k / c", value: `${result.inputs.weibullK} / ${result.weibullC} m/s` },
                      { label: "Terrain", value: TERRAIN_ROUGHNESS[result.inputs.terrain].label },
                      { label: "Elevation", value: `${result.inputs.elevation}m` },
                      { label: "Prevailing Wind", value: `${result.windData.prevailingDirection.toFixed(0)}°` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div className="font-semibold tabular-nums text-foreground">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Wind Rose + Layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                    <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                      <BarChart2 className="w-4 h-4 text-teal-600" />
                      Wind Rose
                    </h3>
                    <div className="flex justify-center">
                      <WindRoseChart data={result.windRose} size={260} />
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                    <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                      <Layers className="w-4 h-4 text-teal-600" />
                      Turbine Layout ({result.turbinesRequired} units)
                    </h3>
                    <TurbineLayoutViz
                      numTurbines={result.turbinesRequired}
                      spacingDownwindM={result.landArea.spacingDownwindM}
                      spacingCrosswindM={result.landArea.spacingCrosswindM}
                      prevailingDirDeg={result.windData.prevailingDirection}
                    />
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground">Total Area</div>
                        <div className="font-semibold tabular-nums">{result.landArea.hectares.toFixed(1)} ha</div>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground">Per Turbine</div>
                        <div className="font-semibold tabular-nums">{(result.landArea.hectares / result.turbinesRequired).toFixed(2)} ha</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Monthly AEP Chart ── */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                    <BarChart2 className="w-4 h-4 text-teal-600" />
                    Monthly Energy Production (per turbine, net)
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={MONTHS.map((m, i) => ({
                        month: m,
                        aep: result.monthlyAEP[i],
                      }))}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.006 240)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.52 0.015 240)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "oklch(0.52 0.015 240)" }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                      <RechartsTooltip
                        formatter={(v: number) => [`${v.toLocaleString()} kWh`, "Net AEP"]}
                        contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid oklch(0.88 0.006 240)" }}
                      />
                      <Bar dataKey="aep" fill="oklch(0.52 0.14 185)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* ── Monthly Wind Speed Chart ── */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                    Monthly Mean Wind Speed (10m)
                  </h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart
                      data={MONTHS.map((m, i) => ({
                        month: m,
                        speed: result.windData.monthlyMeanSpeeds[i],
                      }))}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.006 240)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.52 0.015 240)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "oklch(0.52 0.015 240)" }} tickFormatter={(v) => `${v}m/s`} />
                      <RechartsTooltip
                        formatter={(v: number) => [`${v} m/s`, "Wind Speed"]}
                        contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid oklch(0.88 0.006 240)" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="speed"
                        stroke="oklch(0.60 0.16 165)"
                        strokeWidth={2}
                        dot={{ fill: "oklch(0.60 0.16 165)", r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* ── Loss Breakdown ── */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                    <Layers className="w-4 h-4 text-teal-600" />
                    Energy Loss Breakdown
                  </h3>
                  <div className="flex gap-6 items-center">
                    <div className="shrink-0">
                      <PieChart width={160} height={160}>
                        <Pie
                          data={result.lossBreakdown}
                          cx={75}
                          cy={75}
                          innerRadius={45}
                          outerRadius={70}
                          dataKey="pct"
                          nameKey="label"
                        >
                          {result.lossBreakdown.map((_, i) => (
                            <Cell
                              key={i}
                              fill={[
                                "oklch(0.52 0.14 185)",
                                "oklch(0.60 0.16 165)",
                                "oklch(0.68 0.17 155)",
                                "oklch(0.45 0.12 195)",
                                "oklch(0.35 0.10 205)",
                                "oklch(0.75 0.15 145)",
                              ][i % 6]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(v: number) => [`${v.toFixed(1)}%`, ""]}
                          contentStyle={{ fontSize: 11, borderRadius: 6 }}
                        />
                      </PieChart>
                      <div className="text-center -mt-2">
                        <div className="text-xs text-muted-foreground">Total Loss</div>
                        <div className="text-lg font-bold result-highlight tabular-nums" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                          {(result.lossBreakdown.reduce((s, l) => s + l.pct, 0)).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {result.lossBreakdown.map((l, i) => (
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
                  </div>
                </div>

                {/* ── Methodology Guide ── */}
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                    <Info className="w-4 h-4 text-teal-600" />
                    Calculation Methodology
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        step: 1,
                        title: "Wind Resource (NASA POWER)",
                        desc: `Climatological mean wind speed fetched from NASA POWER MERRA-2 reanalysis at 10m and 50m height for coordinates (${result.inputs.latitude.toFixed(4)}°, ${result.inputs.longitude.toFixed(4)}°).`,
                      },
                      {
                        step: 2,
                        title: "Height Extrapolation (Power Law)",
                        desc: `Wind speed corrected to hub height (${result.inputs.hubHeight}m) using the power law: v₂ = v₁ × (h₂/h₁)^α, where α = ${TERRAIN_ROUGHNESS[result.inputs.terrain].alpha} for ${TERRAIN_ROUGHNESS[result.inputs.terrain].label}. Result: ${result.hubWindSpeed} m/s.`,
                      },
                      {
                        step: 3,
                        title: "Weibull Distribution",
                        desc: `Wind speed variability modelled using Weibull distribution with k = ${result.inputs.weibullK} (shape) and c = ${result.weibullC} m/s (scale). Integrates power curve over all wind speeds.`,
                      },
                      {
                        step: 4,
                        title: "Air Density Correction",
                        desc: `Air density adjusted for site elevation (${result.inputs.elevation}m): ρ = ${result.airDensity} kg/m³ (sea level = 1.225 kg/m³). Affects available power in the wind.`,
                      },
                      {
                        step: 5,
                        title: "Gross AEP Calculation",
                        desc: `Annual Energy Production = 8760h × ∫ P(v) × f(v) dv. Gross AEP = ${result.grossAEP.toLocaleString()} kWh/turbine/year using the 10kW power curve (Cp = ${TURBINE_SPECS.powerCoefficient}).`,
                      },
                      {
                        step: 6,
                        title: "Energy Loss Deductions",
                        desc: `Total loss factor = ${(result.lossBreakdown.reduce((s, l) => s + l.pct, 0)).toFixed(1)}% applied to gross AEP. Net AEP = ${result.netAEP.toLocaleString()} kWh/turbine/year.`,
                      },
                      {
                        step: 7,
                        title: "Turbine Count",
                        desc: `N = ⌈Target AEP / Net AEP per turbine⌉ = ⌈${result.inputs.targetAEP.toLocaleString()} / ${result.netAEP.toLocaleString()}⌉ = ${result.turbinesRequired} turbines.`,
                      },
                      {
                        step: 8,
                        title: "Land Area & Spacing",
                        desc: `Turbines spaced ${result.inputs.spacingDownwind}D × ${result.inputs.spacingCrosswind}D (${result.landArea.spacingDownwindM.toFixed(0)}m × ${result.landArea.spacingCrosswindM.toFixed(0)}m). Total area: ${result.landArea.hectares.toFixed(1)} ha.`,
                      },
                    ].map(({ step, title, desc }) => (
                      <div key={step} className="flex gap-3">
                        <div className="step-number shrink-0 mt-0.5">{step}</div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Data source:</strong> {windData?.dataSource ?? "NASA POWER (MERRA-2 Reanalysis)"}</p>
                    <p><strong>Standard:</strong> IEC 61400-2 Small Wind Turbine Assessment</p>
                    <p><strong>Disclaimer:</strong> This tool provides planning estimates only. A full bankable wind resource assessment requires on-site anemometry data and professional engineering review.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border mt-12 py-6" style={{ background: "oklch(0.13 0.02 240)" }}>
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-teal-400" />
            <span className="text-slate-400 text-sm font-medium" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              10kW Wind Turbine Calculator
            </span>
          </div>
          <div className="text-xs text-slate-500 text-center">
            Wind data: NASA POWER (MERRA-2) · Methodology: IEC 61400-2 · For planning estimates only
          </div>
        </div>
      </footer>
    </div>
  );
}
