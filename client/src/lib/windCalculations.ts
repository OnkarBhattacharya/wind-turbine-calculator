/**
 * Wind Turbine Calculator — Core Calculation Engine
 * Design: Scientific/Technical SaaS, Bauhaus-inspired minimalism
 *
 * Methodology based on:
 * - IEC 61400-2 Small Wind Turbine Standard
 * - NASA POWER climatological wind data
 * - Weibull distribution for wind speed modeling
 * - Wake loss models (Jensen/Park model)
 * - IEA Wind Task 11 loss factor guidelines
 */

// ─── 10kW Turbine Specifications ─────────────────────────────────────────────
export const TURBINE_SPECS = {
  ratedPower: 10, // kW
  rotorDiameter: 7.0, // meters (typical for 10kW class)
  hubHeight: 30, // meters (default hub height)
  cutInSpeed: 2.5, // m/s
  ratedSpeed: 11.0, // m/s
  cutOutSpeed: 25.0, // m/s
  powerCoefficient: 0.42, // Cp (Betz limit ~0.593, realistic ~0.35–0.45)
  availability: 0.97, // 97% mechanical availability
};

// ─── Terrain / Surface Roughness Classes ─────────────────────────────────────
export type TerrainType =
  | "open_sea"
  | "open_flat"
  | "agricultural"
  | "suburban"
  | "forest"
  | "urban";

export const TERRAIN_ROUGHNESS: Record<
  TerrainType,
  { z0: number; alpha: number; label: string; description: string }
> = {
  open_sea: {
    z0: 0.0001,
    alpha: 0.1,
    label: "Open Sea / Water",
    description: "Offshore or large lake — minimal surface friction",
  },
  open_flat: {
    z0: 0.01,
    alpha: 0.12,
    label: "Open Flat Land",
    description: "Flat terrain, grass, few obstacles",
  },
  agricultural: {
    z0: 0.05,
    alpha: 0.14,
    label: "Agricultural / Rural",
    description: "Farmland with scattered buildings and hedges",
  },
  suburban: {
    z0: 0.3,
    alpha: 0.22,
    label: "Suburban / Wooded",
    description: "Residential areas, dense trees, rolling hills",
  },
  forest: {
    z0: 0.5,
    alpha: 0.28,
    label: "Dense Forest",
    description: "Tall dense trees, significant turbulence",
  },
  urban: {
    z0: 1.0,
    alpha: 0.35,
    label: "Urban / Industrial",
    description: "City centres, large buildings, high roughness",
  },
};

// ─── Loss Factors ─────────────────────────────────────────────────────────────
export interface LossFactors {
  wakeEffect: number; // 0–1 (fraction of energy lost to wake)
  electricalLoss: number; // 0–1
  bladeDegradation: number; // 0–1
  icing: number; // 0–1 (climate-dependent)
  curtailment: number; // 0–1 (noise/grid constraints)
  availabilityLoss: number; // 0–1
}

export const DEFAULT_LOSSES: LossFactors = {
  wakeEffect: 0.08, // 8% typical for small arrays
  electricalLoss: 0.02, // 2%
  bladeDegradation: 0.015, // 1.5%
  icing: 0.01, // 1% default (varies by climate)
  curtailment: 0.005, // 0.5%
  availabilityLoss: 0.03, // 3%
};

// ─── Weibull Distribution ─────────────────────────────────────────────────────
/**
 * Weibull probability density function
 * f(v) = (k/c) * (v/c)^(k-1) * exp(-(v/c)^k)
 */
export function weibullPDF(v: number, k: number, c: number): number {
  if (v <= 0) return 0;
  return (k / c) * Math.pow(v / c, k - 1) * Math.exp(-Math.pow(v / c, k));
}

/**
 * Estimate Weibull scale parameter c from mean wind speed
 * Using approximation: c ≈ v_mean / Γ(1 + 1/k)
 */
export function weibullScale(meanSpeed: number, k: number): number {
  // Gamma function approximation for common k values
  const gammaApprox = (x: number): number => {
    // Stirling's approximation for Gamma(1 + 1/k)
    const n = x - 1;
    if (n <= 0) return 1;
    return Math.sqrt(2 * Math.PI * n) * Math.pow(n / Math.E, n);
  };
  const gamma1pk = gammaApprox(1 + 1 / k);
  return meanSpeed / gamma1pk;
}

// ─── Wind Speed Height Correction (Power Law) ─────────────────────────────────
/**
 * Extrapolate wind speed from reference height to hub height
 * v2 = v1 * (h2/h1)^alpha
 */
export function correctWindSpeedHeight(
  v_ref: number,
  h_ref: number,
  h_hub: number,
  alpha: number
): number {
  return v_ref * Math.pow(h_hub / h_ref, alpha);
}

// ─── Air Density Correction ───────────────────────────────────────────────────
/**
 * Air density at elevation using barometric formula
 * ρ = ρ0 * exp(-elevation / 8500)
 * Standard sea level: ρ0 = 1.225 kg/m³
 */
export function airDensityAtElevation(elevationM: number): number {
  const rho0 = 1.225;
  return rho0 * Math.exp(-elevationM / 8500);
}

// ─── Turbine Power Curve ──────────────────────────────────────────────────────
/**
 * Simplified power curve for 10kW turbine
 * Uses cubic relationship between cut-in and rated speed
 * Returns power in kW
 */
export function turbinePowerAtSpeed(windSpeed: number, rho: number = 1.225): number {
  const { cutInSpeed, ratedSpeed, cutOutSpeed, ratedPower, rotorDiameter, powerCoefficient } =
    TURBINE_SPECS;

  if (windSpeed < cutInSpeed || windSpeed > cutOutSpeed) return 0;
  if (windSpeed >= ratedSpeed) return ratedPower;

  // P = 0.5 * rho * A * Cp * v^3 / 1000 (kW)
  const area = Math.PI * Math.pow(rotorDiameter / 2, 2);
  const rhoCorrection = rho / 1.225;
  const rawPower = (0.5 * 1.225 * area * powerCoefficient * Math.pow(windSpeed, 3)) / 1000;
  return Math.min(rawPower * rhoCorrection, ratedPower);
}

// ─── Annual Energy Production (AEP) per Turbine ───────────────────────────────
/**
 * Calculate AEP using Weibull distribution integration
 * AEP = 8760 * ∫ P(v) * f(v) dv
 */
export function calculateAEP(
  meanWindSpeed: number,
  weibullK: number,
  hubHeight: number,
  refHeight: number,
  alpha: number,
  elevationM: number
): number {
  const hubWindSpeed = correctWindSpeedHeight(meanWindSpeed, refHeight, hubHeight, alpha);
  const c = weibullScaleFromMean(hubWindSpeed, weibullK);
  const rho = airDensityAtElevation(elevationM);

  let aep = 0;
  const dv = 0.1; // integration step in m/s
  for (let v = 0; v <= 30; v += dv) {
    const power = turbinePowerAtSpeed(v, rho);
    const freq = weibullPDF(v, weibullK, c);
    aep += power * freq * dv;
  }
  return aep * 8760; // kWh/year
}

/**
 * Weibull scale from mean speed using numerical Gamma function
 */
function weibullScaleFromMean(meanSpeed: number, k: number): number {
  // Gamma(1 + 1/k) numerical approximation
  const x = 1 + 1 / k;
  const gamma = gammaFunction(x);
  return meanSpeed / gamma;
}

function gammaFunction(z: number): number {
  // Lanczos approximation
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gammaFunction(1 - z));
  }

  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// ─── Total Loss Factor ────────────────────────────────────────────────────────
export function totalLossFactor(losses: LossFactors): number {
  return (
    (1 - losses.wakeEffect) *
    (1 - losses.electricalLoss) *
    (1 - losses.bladeDegradation) *
    (1 - losses.icing) *
    (1 - losses.curtailment) *
    (1 - losses.availabilityLoss)
  );
}

// ─── Net AEP per Turbine ──────────────────────────────────────────────────────
export function netAEPPerTurbine(grossAEP: number, losses: LossFactors): number {
  return grossAEP * totalLossFactor(losses);
}

// ─── Number of Turbines Required ─────────────────────────────────────────────
export function turbinesRequired(targetAEP_kWh: number, netAEP: number): number {
  return Math.ceil(targetAEP_kWh / netAEP);
}

// ─── Capacity Factor ─────────────────────────────────────────────────────────
export function capacityFactor(aep_kWh: number, ratedPower_kW: number): number {
  return aep_kWh / (ratedPower_kW * 8760);
}

// ─── Land Area Required ───────────────────────────────────────────────────────
/**
 * Turbine spacing: 5–9 rotor diameters in prevailing wind direction
 *                  3–5 rotor diameters perpendicular
 * Returns area in hectares
 */
export function landAreaRequired(
  numTurbines: number,
  rotorDiameter: number,
  spacingDownwind: number = 7,
  spacingCrosswind: number = 4
): { hectares: number; acreage: number; spacingDownwindM: number; spacingCrosswindM: number } {
  const spacingDownwindM = spacingDownwind * rotorDiameter;
  const spacingCrosswindM = spacingCrosswind * rotorDiameter;
  const areaPerTurbineM2 = spacingDownwindM * spacingCrosswindM;
  const totalAreaM2 = numTurbines * areaPerTurbineM2;
  return {
    hectares: totalAreaM2 / 10000,
    acreage: totalAreaM2 / 4047,
    spacingDownwindM,
    spacingCrosswindM,
  };
}

// ─── Wind Rose Data Generation (from monthly wind data) ──────────────────────
export interface WindRoseData {
  direction: string;
  degrees: number;
  frequency: number; // percentage
  avgSpeed: number; // m/s
}

export const WIND_DIRECTIONS = [
  { label: "N", deg: 0 },
  { label: "NNE", deg: 22.5 },
  { label: "NE", deg: 45 },
  { label: "ENE", deg: 67.5 },
  { label: "E", deg: 90 },
  { label: "ESE", deg: 112.5 },
  { label: "SE", deg: 135 },
  { label: "SSE", deg: 157.5 },
  { label: "S", deg: 180 },
  { label: "SSW", deg: 202.5 },
  { label: "SW", deg: 225 },
  { label: "WSW", deg: 247.5 },
  { label: "W", deg: 270 },
  { label: "WNW", deg: 292.5 },
  { label: "NW", deg: 315 },
  { label: "NNW", deg: 337.5 },
];

/**
 * Generate synthetic wind rose from prevailing direction and mean speed
 * Uses a von Mises distribution centered on prevailing direction
 */
export function generateWindRose(
  prevailingDirDeg: number,
  meanSpeed: number
): WindRoseData[] {
  const kappa = 1.5; // concentration parameter (higher = more directional)
  const total = WIND_DIRECTIONS.length;

  const rawFreqs = WIND_DIRECTIONS.map(({ deg }) => {
    const diff = ((deg - prevailingDirDeg + 180) % 360) - 180;
    const diffRad = (diff * Math.PI) / 180;
    return Math.exp(kappa * Math.cos(diffRad));
  });

  const sum = rawFreqs.reduce((a, b) => a + b, 0);
  const normalizedFreqs = rawFreqs.map((f) => (f / sum) * 100);

  return WIND_DIRECTIONS.map(({ label, deg }, i) => ({
    direction: label,
    degrees: deg,
    frequency: parseFloat(normalizedFreqs[i].toFixed(1)),
    avgSpeed: parseFloat(
      (meanSpeed * (0.7 + 0.6 * (normalizedFreqs[i] / Math.max(...normalizedFreqs)))).toFixed(1)
    ),
  }));
}

// ─── Monthly Wind Speed Variation ─────────────────────────────────────────────
export function estimateMonthlyVariation(annualMean: number): number[] {
  // Typical seasonal variation pattern (normalized multipliers)
  const seasonalMultipliers = [
    1.15, 1.12, 1.08, 0.95, 0.88, 0.82, 0.80, 0.83, 0.90, 1.02, 1.10, 1.18,
  ];
  return seasonalMultipliers.map((m) => parseFloat((annualMean * m).toFixed(2)));
}

// ─── Full Site Assessment ─────────────────────────────────────────────────────
export interface SiteInputs {
  latitude: number;
  longitude: number;
  elevation: number; // meters
  targetAEP: number; // kWh/year
  terrain: TerrainType;
  hubHeight: number; // meters
  weibullK: number; // shape parameter (typically 1.5–2.5)
  losses: LossFactors;
  spacingDownwind: number; // rotor diameters
  spacingCrosswind: number; // rotor diameters
}

export interface WindData {
  annualMeanSpeed: number; // m/s at 10m
  annualMeanSpeed50m: number; // m/s at 50m
  prevailingDirection: number; // degrees
  monthlyMeanSpeeds: number[]; // 12 months
}

export interface SiteAssessmentResult {
  inputs: SiteInputs;
  windData: WindData;
  hubWindSpeed: number; // m/s at hub height
  airDensity: number; // kg/m³
  grossAEP: number; // kWh/year per turbine
  netAEP: number; // kWh/year per turbine (after losses)
  capacityFactor: number; // 0–1
  turbinesRequired: number;
  totalInstalledCapacity: number; // kW
  totalGrossAEP: number; // kWh/year
  totalNetAEP: number; // kWh/year
  landArea: ReturnType<typeof landAreaRequired>;
  windRose: WindRoseData[];
  monthlyAEP: number[]; // kWh per month
  lossBreakdown: { label: string; value: number; pct: number }[];
  weibullC: number; // scale parameter
}

export function runSiteAssessment(
  inputs: SiteInputs,
  windData: WindData
): SiteAssessmentResult {
  const terrain = TERRAIN_ROUGHNESS[inputs.terrain];

  // 1. Correct wind speed to hub height
  const hubWindSpeed = correctWindSpeedHeight(
    windData.annualMeanSpeed,
    10,
    inputs.hubHeight,
    terrain.alpha
  );

  // 2. Air density
  const airDensity = airDensityAtElevation(inputs.elevation);

  // 3. Gross AEP per turbine
  const grossAEP = calculateAEP(
    windData.annualMeanSpeed,
    inputs.weibullK,
    inputs.hubHeight,
    10,
    terrain.alpha,
    inputs.elevation
  );

  // 4. Net AEP per turbine
  const netAEP = netAEPPerTurbine(grossAEP, inputs.losses);

  // 5. Capacity factor
  const cf = capacityFactor(grossAEP, TURBINE_SPECS.ratedPower);

  // 6. Number of turbines
  const numTurbines = turbinesRequired(inputs.targetAEP, netAEP);

  // 7. Land area
  const landArea = landAreaRequired(
    numTurbines,
    TURBINE_SPECS.rotorDiameter,
    inputs.spacingDownwind,
    inputs.spacingCrosswind
  );

  // 8. Wind rose
  const windRose = generateWindRose(windData.prevailingDirection, hubWindSpeed);

  // 9. Monthly AEP
  const monthlyWindSpeeds = estimateMonthlyVariation(windData.annualMeanSpeed);
  const monthlyAEP = monthlyWindSpeeds.map((v) => {
    const monthlyGross = calculateAEP(
      v,
      inputs.weibullK,
      inputs.hubHeight,
      10,
      terrain.alpha,
      inputs.elevation
    );
    return parseFloat(((monthlyGross * totalLossFactor(inputs.losses)) / 12).toFixed(0));
  });

  // 10. Loss breakdown
  const lossBreakdown = [
    { label: "Wake Effect", value: inputs.losses.wakeEffect, pct: inputs.losses.wakeEffect * 100 },
    {
      label: "Electrical Losses",
      value: inputs.losses.electricalLoss,
      pct: inputs.losses.electricalLoss * 100,
    },
    {
      label: "Blade Degradation",
      value: inputs.losses.bladeDegradation,
      pct: inputs.losses.bladeDegradation * 100,
    },
    { label: "Icing / Soiling", value: inputs.losses.icing, pct: inputs.losses.icing * 100 },
    {
      label: "Curtailment",
      value: inputs.losses.curtailment,
      pct: inputs.losses.curtailment * 100,
    },
    {
      label: "Availability",
      value: inputs.losses.availabilityLoss,
      pct: inputs.losses.availabilityLoss * 100,
    },
  ];

  // 11. Weibull C
  const weibullC = weibullScaleFromMean(hubWindSpeed, inputs.weibullK);

  return {
    inputs,
    windData,
    hubWindSpeed: parseFloat(hubWindSpeed.toFixed(2)),
    airDensity: parseFloat(airDensity.toFixed(4)),
    grossAEP: parseFloat(grossAEP.toFixed(0)),
    netAEP: parseFloat(netAEP.toFixed(0)),
    capacityFactor: parseFloat(cf.toFixed(3)),
    turbinesRequired: numTurbines,
    totalInstalledCapacity: numTurbines * TURBINE_SPECS.ratedPower,
    totalGrossAEP: parseFloat((grossAEP * numTurbines).toFixed(0)),
    totalNetAEP: parseFloat((netAEP * numTurbines).toFixed(0)),
    landArea,
    windRose,
    monthlyAEP,
    lossBreakdown,
    weibullC: parseFloat(weibullC.toFixed(2)),
  };
}
