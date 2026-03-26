/**
 * Wind Turbine Models Library
 * Industry-standard specifications for 1, 3, 5, and 10 kW small wind turbines
 * Based on IEC 61400-2 and typical manufacturer data
 */

export type TurbineModelId = "1kw" | "3kw" | "5kw" | "10kw";

export interface TurbineModel {
  id: TurbineModelId;
  name: string;
  ratedPower: number; // kW
  rotorDiameter: number; // meters
  hubHeight: number; // meters (typical)
  cutInSpeed: number; // m/s
  ratedSpeed: number; // m/s
  cutOutSpeed: number; // m/s
  powerCoefficient: number; // Cp (typical)
  availability: number; // 0–1
  description: string;
  // Power curve: array of [windSpeed, power] pairs
  powerCurve: [number, number][];
}

/**
 * Industry-standard turbine models
 * Power curves derived from typical manufacturer data and IEC standards
 */
export const TURBINE_MODELS: Record<TurbineModelId, TurbineModel> = {
  "1kw": {
    id: "1kw",
    name: "1 kW Small Wind Turbine",
    ratedPower: 1.0,
    rotorDiameter: 2.5,
    hubHeight: 18,
    cutInSpeed: 2.5,
    ratedSpeed: 10.0,
    cutOutSpeed: 25.0,
    powerCoefficient: 0.38,
    availability: 0.96,
    description: "Compact turbine for residential/small farm use",
    // Power curve: [wind speed (m/s), power (kW)]
    powerCurve: [
      [0, 0],
      [2.5, 0.01],
      [3, 0.03],
      [4, 0.08],
      [5, 0.15],
      [6, 0.25],
      [7, 0.38],
      [8, 0.52],
      [9, 0.68],
      [10, 1.0],
      [11, 1.0],
      [12, 1.0],
      [13, 1.0],
      [14, 1.0],
      [15, 1.0],
      [25, 0],
    ],
  },

  "3kw": {
    id: "3kw",
    name: "3 kW Small Wind Turbine",
    ratedPower: 3.0,
    rotorDiameter: 5.0,
    hubHeight: 24,
    cutInSpeed: 2.5,
    ratedSpeed: 11.0,
    cutOutSpeed: 25.0,
    powerCoefficient: 0.40,
    availability: 0.96,
    description: "Mid-range turbine for farms and small businesses",
    powerCurve: [
      [0, 0],
      [2.5, 0.02],
      [3, 0.08],
      [4, 0.22],
      [5, 0.42],
      [6, 0.68],
      [7, 1.0],
      [8, 1.42],
      [9, 1.88],
      [10, 2.4],
      [11, 3.0],
      [12, 3.0],
      [13, 3.0],
      [14, 3.0],
      [15, 3.0],
      [25, 0],
    ],
  },

  "5kw": {
    id: "5kw",
    name: "5 kW Small Wind Turbine",
    ratedPower: 5.0,
    rotorDiameter: 6.5,
    hubHeight: 30,
    cutInSpeed: 2.5,
    ratedSpeed: 11.5,
    cutOutSpeed: 25.0,
    powerCoefficient: 0.41,
    availability: 0.97,
    description: "Popular choice for commercial/agricultural applications",
    powerCurve: [
      [0, 0],
      [2.5, 0.03],
      [3, 0.13],
      [4, 0.38],
      [5, 0.72],
      [6, 1.18],
      [7, 1.75],
      [8, 2.42],
      [9, 3.2],
      [10, 4.0],
      [11, 4.7],
      [11.5, 5.0],
      [12, 5.0],
      [13, 5.0],
      [14, 5.0],
      [15, 5.0],
      [25, 0],
    ],
  },

  "10kw": {
    id: "10kw",
    name: "10 kW Small Wind Turbine",
    ratedPower: 10.0,
    rotorDiameter: 7.0,
    hubHeight: 30,
    cutInSpeed: 2.5,
    ratedSpeed: 11.0,
    cutOutSpeed: 25.0,
    powerCoefficient: 0.42,
    availability: 0.97,
    description: "High-capacity turbine for utility-scale small wind",
    powerCurve: [
      [0, 0],
      [2.5, 0.05],
      [3, 0.25],
      [4, 0.75],
      [5, 1.45],
      [6, 2.4],
      [7, 3.5],
      [8, 4.85],
      [9, 6.4],
      [10, 8.0],
      [11, 10.0],
      [12, 10.0],
      [13, 10.0],
      [14, 10.0],
      [15, 10.0],
      [25, 0],
    ],
  },
};

/**
 * Get all available turbine models
 */
export function getAllTurbineModels(): TurbineModel[] {
  return Object.values(TURBINE_MODELS);
}

/**
 * Get a specific turbine model by ID
 */
export function getTurbineModel(id: TurbineModelId): TurbineModel {
  return TURBINE_MODELS[id];
}

/**
 * Get power output at a given wind speed using the power curve
 * Linear interpolation between curve points
 */
export function getPowerAtSpeed(model: TurbineModel, windSpeed: number): number {
  const curve = model.powerCurve;

  // Below cut-in or above cut-out
  if (windSpeed < curve[0][0] || windSpeed > curve[curve.length - 1][0]) {
    return 0;
  }

  // Find the two points to interpolate between
  for (let i = 0; i < curve.length - 1; i++) {
    const [v1, p1] = curve[i];
    const [v2, p2] = curve[i + 1];

    if (windSpeed >= v1 && windSpeed <= v2) {
      // Linear interpolation
      if (v2 === v1) return p1; // avoid division by zero
      const t = (windSpeed - v1) / (v2 - v1);
      return p1 + t * (p2 - p1);
    }
  }

  return 0;
}

/**
 * Calculate annual energy production for a specific turbine model
 * using Weibull distribution
 */
export function calculateModelAEP(
  model: TurbineModel,
  hubWindSpeed: number,
  weibullK: number,
  weibullC: number
): number {
  // Numerical integration of power curve over Weibull distribution
  let aep = 0;
  const dv = 0.1; // integration step in m/s

  for (let v = 0; v <= 30; v += dv) {
    const power = getPowerAtSpeed(model, v);
    // Weibull PDF: f(v) = (k/c) * (v/c)^(k-1) * exp(-(v/c)^k)
    const freq =
      (weibullK / weibullC) *
      Math.pow(v / weibullC, weibullK - 1) *
      Math.exp(-Math.pow(v / weibullC, weibullK));
    aep += power * freq * dv;
  }

  return aep * 8760; // kWh/year
}

/**
 * Get model comparison data for all turbines at a site
 */
export interface ModelComparisonResult {
  modelId: TurbineModelId;
  model: TurbineModel;
  grossAEP: number;
  netAEP: number;
  capacityFactor: number;
  turbinesRequired: number;
  totalCapacity: number;
  totalGrossAEP: number;
  totalNetAEP: number;
  landArea: number; // hectares
}

/**
 * Estimate monthly wind speed variation from annual mean
 */
export function estimateMonthlyVariation(annualMean: number): number[] {
  // Typical seasonal pattern: winter stronger, summer weaker
  const pattern = [1.15, 1.12, 1.08, 0.95, 0.88, 0.82, 0.85, 0.90, 0.98, 1.05, 1.12, 1.18];
  return pattern.map((factor) => annualMean * factor);
}

/**
 * Calculate total loss factor (multiplier) from individual loss factors
 */
export function totalLossFactor(losses: any): number {
  return (1 - losses.wakeEffect) *
    (1 - losses.electricalLoss) *
    (1 - losses.bladeDegradation) *
    (1 - losses.icing) *
    (1 - losses.curtailment) *
    (1 - losses.availabilityLoss);
}

export function compareAllModels(
  hubWindSpeed: number,
  weibullK: number,
  weibullC: number,
  targetAEP: number,
  lossFactorMultiplier: number,
  spacingDownwind: number,
  spacingCrosswind: number
): ModelComparisonResult[] {
  return getAllTurbineModels().map((model) => {
    const grossAEP = calculateModelAEP(model, hubWindSpeed, weibullK, weibullC);
    const netAEP = grossAEP * lossFactorMultiplier;
    const cf = grossAEP / (model.ratedPower * 8760);
    const numTurbines = Math.ceil(targetAEP / netAEP);

    // Land area calculation
    const spacingDownwindM = spacingDownwind * model.rotorDiameter;
    const spacingCrosswindM = spacingCrosswind * model.rotorDiameter;
    const areaPerTurbineM2 = spacingDownwindM * spacingCrosswindM;
    const totalAreaM2 = numTurbines * areaPerTurbineM2;
    const landAreaHa = totalAreaM2 / 10000;

    return {
      modelId: model.id,
      model,
      grossAEP: parseFloat(grossAEP.toFixed(0)),
      netAEP: parseFloat(netAEP.toFixed(0)),
      capacityFactor: parseFloat(cf.toFixed(3)),
      turbinesRequired: numTurbines,
      totalCapacity: numTurbines * model.ratedPower,
      totalGrossAEP: parseFloat((grossAEP * numTurbines).toFixed(0)),
      totalNetAEP: parseFloat((netAEP * numTurbines).toFixed(0)),
      landArea: parseFloat(landAreaHa.toFixed(2)),
    };
  });
}
