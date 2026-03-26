/**
 * Wind Turbine Calculator — Main Page (Multi-Model)
 * Design: Scientific/Technical SaaS, Bauhaus-inspired minimalism
 * Layout: Responsive — sticky input panel (mobile: full-width, tablet/desktop: 40%) + results (60%)
 * Features: Compare 1, 3, 5, 10 kW models side-by-side with individual power curves
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
import { WindRoseChart } from "@/components/WindRoseChart";
import { CoordinateMap } from "@/components/CoordinateMap";
import { ModelComparisonGrid } from "@/components/ModelComparisonGrid";
import { ModelDetailPanel } from "@/components/ModelDetailPanel";
import {
  compareAllModels,
  estimateMonthlyVariation,
  totalLossFactor,
  type ModelComparisonResult,
  type TurbineModelId,
} from "@/lib/turbineModels";
import {
  TERRAIN_ROUGHNESS,
  DEFAULT_LOSSES,
  weibullScale,
  airDensityAtElevation,
  correctWindSpeedHeight,
  generateWindRose,
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
  Layers,
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
  const [targetAEP, setTargetAEP] = useState(100000);
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
  const [comparisonResults, setComparisonResults] = useState<ModelComparisonResult[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<TurbineModelId>("10kw");
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"nasa" | "demo" | null>(null);
  const [latInput, setLatInput] = useState("51.5074");
  const [lonInput, setLonInput] = useState("-0.1278");

  // ── Fetch wind data ──
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

  // ── Run comparison ──
  const runComparison = useCallback(
    async (wData?: NASAPowerWindData) => {
      const wd = wData ?? windData;
      if (!wd) {
        toast.error("Please fetch wind data first");
        return;
      }

      const terrain_data = TERRAIN_ROUGHNESS[terrain];
      const hubWindSpeed = correctWindSpeedHeight(wd.annualMeanSpeed, 10, hubHeight, terrain_data.alpha);
      const weibullC = weibullScale(hubWindSpeed, weibullK);
      const lossMultiplier = totalLossFactor(losses);

      const results = compareAllModels(
        hubWindSpeed,
        weibullK,
        weibullC,
        targetAEP,
        lossMultiplier,
        spacingDownwind,
        spacingCrosswind
      );

      setComparisonResults(results);
      setSelectedModelId(results[results.length - 1].modelId); // default to 10kw
    },
    [windData, terrain, hubHeight, weibullK, losses, spacingDownwind, spacingCrosswind, targetAEP]
  );

  // ── Fetch + Compare ──
  const handleAnalyze = async () => {
    const wd = await fetchWindData(lat, lon);
    if (wd) await runComparison(wd);
  };

  // ── Re-run on param change ──
  useEffect(() => {
    if (windData) {
      runComparison();
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

  // ── Get selected model details ──
  const selectedResult = comparisonResults.find((r) => r.modelId === selectedModelId);
  const selectedModel = selectedResult?.model;

  // ── Calculate monthly AEP for selected model ──
  const monthlyWindSpeeds = windData ? estimateMonthlyVariation(windData.annualMeanSpeed) : [];
  const monthlyAEP = selectedResult
    ? monthlyWindSpeeds.map((v: number) => {
        const terrain_data = TERRAIN_ROUGHNESS[terrain];
        const monthlyHubSpeed = correctWindSpeedHeight(v, 10, hubHeight, terrain_data.alpha);
        const monthlyWeibullC = weibullScale(monthlyHubSpeed, weibullK);
        // Approximate monthly AEP as fraction of annual
        const monthlyGross = (selectedResult.grossAEP / 12) * (monthlyHubSpeed / (windData?.annualMeanSpeed || 1)) ** 3;
        return parseFloat(((monthlyGross * totalLossFactor(losses)) / 1).toFixed(0));
      })
    : [];

  // ── Wind rose for selected model ──
  const windRose = windData ? generateWindRose(windData.prevailingDirection, windData.annualMeanSpeed) : [];

  // ── Loss breakdown ──
  const lossBreakdown = [
    { label: "Wake Effect", pct: losses.wakeEffect * 100 },
    { label: "Electrical", pct: losses.electricalLoss * 100 },
    { label: "Blade Degradation", pct: losses.bladeDegradation * 100 },
    { label: "Icing/Soiling", pct: losses.icing * 100 },
    { label: "Curtailment", pct: losses.curtailment * 100 },
    { label: "Availability", pct: losses.availabilityLoss * 100 },
  ];

  // ── Export report ──
  const exportReport = () => {
    if (!selectedResult || !windData) return;
    const lines = [
      "WIND TURBINE SITE ASSESSMENT REPORT",
      "====================================",
      `Generated: ${new Date().toLocaleDateString()}`,
      `Coordinates: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`,
      `Elevation: ${windData.elevation}m`,
      "",
      "SELECTED TURBINE MODEL",
      `Model: ${selectedModel?.name}`,
      `Rated Power: ${selectedModel?.ratedPower} kW`,
      `Rotor Diameter: ${selectedModel?.rotorDiameter}m`,
      `Hub Height: ${selectedModel?.hubHeight}m`,
      "",
      "WIND RESOURCE",
      `Annual Mean Wind Speed (10m): ${windData.annualMeanSpeed} m/s`,
      `Hub Height Wind Speed: ${(windData.annualMeanSpeed * Math.pow(selectedModel?.hubHeight || 30 / 10, TERRAIN_ROUGHNESS[terrain].alpha)).toFixed(2)} m/s`,
      "",
      "ENERGY RESULTS",
      `Gross AEP per Turbine: ${selectedResult.grossAEP.toLocaleString()} kWh/year`,
      `Net AEP per Turbine: ${selectedResult.netAEP.toLocaleString()} kWh/year`,
      `Capacity Factor: ${(selectedResult.capacityFactor * 100).toFixed(1)}%`,
      "",
      "TURBINE REQUIREMENT",
      `Target Energy Output: ${targetAEP.toLocaleString()} kWh/year`,
      `Turbines Required: ${selectedResult.turbinesRequired}`,
      `Total Installed Capacity: ${selectedResult.totalCapacity} kW`,
      `Total Net AEP: ${selectedResult.totalNetAEP.toLocaleString()} kWh/year`,
      "",
      "LAND REQUIREMENTS",
      `Land Area: ${selectedResult.landArea} ha`,
      "",
      `Data Source: ${windData.dataSource}`,
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
          minHeight: 160,
        }}
      >
        <img
          src={HERO_IMG}
          alt="Wind farm"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-10 container py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Wind className="w-5 h-5 text-teal-400" />
                <span className="text-teal-400 text-sm font-semibold tracking-widest uppercase">
                  Multi-Model Calculator
                </span>
              </div>
              <h1
                className="text-2xl lg:text-3xl font-bold text-white mb-2 leading-tight"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Wind Turbine
                <br />
                <span className="text-teal-400">Requirement Estimator</span>
              </h1>
              <p className="text-slate-300 text-sm max-w-lg">
                Compare 1, 3, 5, and 10 kW models side-by-side. Enter coordinates and energy target to see which turbine configuration works best for your site.
              </p>
            </div>
            <img
              src={TURBINE_IMG}
              alt="Turbine schematic"
              className="hidden lg:block w-20 h-32 object-contain opacity-80 rounded shrink-0"
            />
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="container py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start" style={{ minHeight: "calc(100vh - 300px)" }}>
          {/* ── LEFT: Input Panel (sticky on desktop) ── */}
          <div
            className="w-full lg:w-[42%] shrink-0"
            style={{
              position: "sticky",
              top: 16,
              maxHeight: "calc(100vh - 100px)",
              overflowY: "auto",
              paddingRight: "0.5rem",
            }}
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
                      <InfoTip text="Decimal degrees. Range: -90 to 90." />
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
                      <InfoTip text="Decimal degrees. Range: -180 to 180." />
                    </Label>
                    <Input
                      value={lonInput}
                      onChange={(e) => handleLonInput(e.target.value)}
                      placeholder="e.g. -0.1278"
                      className="font-mono text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* ── Step 2: Energy Target ── */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <StepHeader num={2} title="Target Energy Output" icon={Zap} />

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Annual Energy Required (kWh/year)
                    <InfoTip text="Total energy needed per year." />
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
                    <span>≈ {(targetAEP / 8760).toFixed(1)} kW avg</span>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[
                    { label: "Home (10 MWh)", val: 10000 },
                    { label: "Farm (50 MWh)", val: 50000 },
                    { label: "SME (200 MWh)", val: 200000 },
                  ].map(({ label, val }) => (
                    <button
                      key={val}
                      onClick={() => setTargetAEP(val)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        targetAEP === val
                          ? "bg-teal-600 text-white border-teal-600"
                          : "border-border text-muted-foreground hover:border-teal-500"
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
                      <InfoTip text="Surface roughness affects wind speed at hub height." />
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
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Hub Height: <span className="font-semibold text-foreground tabular-nums">{hubHeight}m</span>
                      <InfoTip text="Height of turbine hub above ground." />
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
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-teal-600 font-medium mt-4 hover:text-teal-700">
                    {advancedOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Advanced Parameters
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Weibull k: <span className="font-semibold text-foreground tabular-nums">{weibullK.toFixed(1)}</span>
                        <InfoTip text="Wind speed distribution shape parameter." />
                      </Label>
                      <Slider
                        value={[weibullK * 10]}
                        onValueChange={([v]) => setWeibullK(v / 10)}
                        min={10}
                        max={35}
                        step={1}
                        className="mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Downwind Spacing
                          <InfoTip text="In rotor diameters. Recommended: 5–9D." />
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
                          <InfoTip text="In rotor diameters. Recommended: 3–5D." />
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
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-teal-600 font-medium mt-3 hover:text-teal-700">
                    {lossesOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Energy Loss Factors
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3">
                    {[
                      { key: "wakeEffect" as keyof LossFactors, label: "Wake Effect", tip: "Energy lost to turbine wake interference." },
                      { key: "electricalLoss" as keyof LossFactors, label: "Electrical Losses", tip: "Cable, transformer, and inverter losses." },
                      { key: "bladeDegradation" as keyof LossFactors, label: "Blade Degradation", tip: "Performance reduction from blade erosion." },
                      { key: "icing" as keyof LossFactors, label: "Icing / Soiling", tip: "Ice accretion or dirt on blades." },
                      { key: "curtailment" as keyof LossFactors, label: "Curtailment", tip: "Grid constraints or noise limits." },
                      { key: "availabilityLoss" as keyof LossFactors, label: "Availability Loss", tip: "Maintenance and unplanned downtime." },
                    ].map(({ key, label, tip }) => (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-xs text-muted-foreground">
                            {label}
                            <InfoTip text={tip} />
                          </Label>
                          <span className="text-xs font-semibold tabular-nums">{(losses[key] * 100).toFixed(1)}%</span>
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
                    Fetching Data…
                  </>
                ) : (
                  <>
                    <Wind className="w-4 h-4 mr-2" />
                    Analyse & Compare
                  </>
                )}
              </Button>

              {dataSource && (
                <div
                  className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                    dataSource === "nasa"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {dataSource === "nasa" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  <span>{dataSource === "nasa" ? "Live NASA POWER data" : "Demo mode — estimated data"}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Results Panel ── */}
          <div className="flex-1 min-w-0">
            {comparisonResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center mb-4">
                  <Wind className="w-10 h-10 text-teal-400" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                  Ready to Compare
                </h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Enter your site coordinates and energy target, then click <strong>Analyse & Compare</strong> to see all four turbine models side-by-side.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* ── Model Comparison Grid ── */}
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                    Turbine Model Comparison
                  </h2>
                  <ModelComparisonGrid
                    results={comparisonResults}
                    selectedModelId={selectedModelId}
                    onSelectModel={(id) => setSelectedModelId(id as TurbineModelId)}
                  />
                </div>

                <Separator />

                {/* ── Selected Model Details ── */}
                {selectedResult && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                        Detailed Analysis: {selectedModel?.name}
                      </h2>
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

                    {selectedModel && (
                      <ModelDetailPanel
                        result={selectedResult}
                        monthlyAEP={monthlyAEP}
                        windRose={windRose}
                        prevailingDirDeg={windData?.prevailingDirection || 270}
                        lossBreakdown={lossBreakdown}
                        spacingDownwind={spacingDownwind}
                        spacingCrosswind={spacingCrosswind}
                      />
                    )}
                  </div>
                )}
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
              Multi-Model Wind Turbine Calculator
            </span>
          </div>
          <div className="text-xs text-slate-500 text-center">
            Wind data: NASA POWER (MERRA-2) · Compare 1, 3, 5, 10 kW models · For planning estimates only
          </div>
        </div>
      </footer>
    </div>
  );
}
