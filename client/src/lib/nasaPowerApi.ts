/**
 * NASA POWER API Integration
 * Fetches climatological wind data for a given lat/lon
 * API docs: https://power.larc.nasa.gov/docs/services/api/temporal/climatology/
 */

export interface NASAPowerWindData {
  annualMeanSpeed: number; // m/s at 10m
  annualMeanSpeed50m: number; // m/s at 50m
  prevailingDirection: number; // degrees
  monthlyMeanSpeeds: number[]; // 12 values at 10m
  monthlyMeanSpeeds50m: number[]; // 12 values at 50m
  elevation: number; // meters (from API)
  dataSource: string;
}

const NASA_POWER_BASE = "https://power.larc.nasa.gov/api/temporal/climatology/point";

/**
 * Fetch wind climatology from NASA POWER API
 * Parameters:
 *   WS10M - Wind Speed at 10 Meters (m/s)
 *   WS50M - Wind Speed at 50 Meters (m/s)
 *   WD10M - Wind Direction at 10 Meters (degrees)
 *   ELEVATION - Surface elevation (m)
 */
export async function fetchNASAPowerWindData(
  lat: number,
  lon: number
): Promise<NASAPowerWindData> {
  const params = new URLSearchParams({
    parameters: "WS10M,WS50M,WD10M",
    community: "RE",
    longitude: lon.toFixed(4),
    latitude: lat.toFixed(4),
    format: "JSON",
  });

  const url = `${NASA_POWER_BASE}?${params}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`NASA POWER API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  const props = data?.properties?.parameter;
  if (!props) {
    throw new Error("Unexpected NASA POWER API response format");
  }

  const ws10m = props.WS10M;
  const ws50m = props.WS50M;
  const wd10m = props.WD10M;

  // Monthly values (keys: "JAN" through "DEC", "ANN" = annual)
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const monthlyMeanSpeeds = months.map((m) => parseFloat((ws10m?.[m] ?? 0).toFixed(2)));
  const monthlyMeanSpeeds50m = months.map((m) => parseFloat((ws50m?.[m] ?? 0).toFixed(2)));
  const annualMeanSpeed = parseFloat((ws10m?.["ANN"] ?? 0).toFixed(2));
  const annualMeanSpeed50m = parseFloat((ws50m?.["ANN"] ?? 0).toFixed(2));

  // Prevailing direction: find month with highest wind speed and use that direction
  // Average annual wind direction
  const monthlyDirs = months.map((m) => wd10m?.[m] ?? 0);
  const prevailingDirection = estimatePrevailingDirection(monthlyDirs, monthlyMeanSpeeds);

  // Elevation from API header or default
  const elevation = data?.geometry?.coordinates?.[2] ?? estimateElevationFromCoords(lat, lon);

  return {
    annualMeanSpeed,
    annualMeanSpeed50m,
    prevailingDirection,
    monthlyMeanSpeeds,
    monthlyMeanSpeeds50m,
    elevation,
    dataSource: "NASA POWER (MERRA-2 Reanalysis, 1981–2023)",
  };
}

/**
 * Estimate prevailing wind direction from monthly data
 * Uses energy-weighted average direction
 */
function estimatePrevailingDirection(dirs: number[], speeds: number[]): number {
  // Convert to unit vectors and weight by wind speed
  let sumX = 0,
    sumY = 0,
    totalWeight = 0;
  dirs.forEach((dir, i) => {
    const rad = (dir * Math.PI) / 180;
    const weight = speeds[i];
    sumX += Math.cos(rad) * weight;
    sumY += Math.sin(rad) * weight;
    totalWeight += weight;
  });
  if (totalWeight === 0) return 270; // default westerly
  const avgRad = Math.atan2(sumY / totalWeight, sumX / totalWeight);
  const deg = ((avgRad * 180) / Math.PI + 360) % 360;
  return parseFloat(deg.toFixed(1));
}

/**
 * Rough elevation estimate based on latitude (fallback only)
 */
function estimateElevationFromCoords(lat: number, _lon: number): number {
  // Very rough: assume sea level for coastal, slight elevation inland
  return Math.abs(lat) > 60 ? 200 : 50;
}

/**
 * Fallback demo data when API is unavailable
 */
export function getDemoWindData(lat: number, lon: number): NASAPowerWindData {
  // Estimate wind speed based on latitude (higher latitudes = more wind)
  const latFactor = Math.abs(lat);
  const baseSpeed = 4.0 + (latFactor / 90) * 4.0; // 4–8 m/s range
  const coastal = Math.abs(lon) > 100 ? 1.1 : 1.0;

  const annualMeanSpeed = parseFloat((baseSpeed * coastal).toFixed(2));
  const annualMeanSpeed50m = parseFloat((annualMeanSpeed * 1.25).toFixed(2));

  const seasonalMultipliers = [1.15, 1.12, 1.08, 0.95, 0.88, 0.82, 0.80, 0.83, 0.90, 1.02, 1.10, 1.18];
  const monthlyMeanSpeeds = seasonalMultipliers.map((m) =>
    parseFloat((annualMeanSpeed * m).toFixed(2))
  );
  const monthlyMeanSpeeds50m = seasonalMultipliers.map((m) =>
    parseFloat((annualMeanSpeed50m * m).toFixed(2))
  );

  // Prevailing westerly for mid-latitudes
  const prevailingDirection = lat > 0 ? 250 : 110;

  return {
    annualMeanSpeed,
    annualMeanSpeed50m,
    prevailingDirection,
    monthlyMeanSpeeds,
    monthlyMeanSpeeds50m,
    elevation: 50,
    dataSource: "Estimated (Demo Mode — enter coordinates to fetch real NASA data)",
  };
}
