/**
 * Postcode Geocoding Service
 * Supports UK and all EU member states with full valid postcode validation
 * Uses OpenStreetMap Nominatim API for geocoding
 */

// ─── Postcode Format Validators ────────────────────────────────────────────────

export interface PostcodeValidationResult {
  valid: boolean;
  country: string;
  countryCode: string;
  error?: string;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
  country: string;
  postcode: string;
}

/**
 * EU member states with their postcode formats and country codes
 */
const EU_COUNTRIES: Record<
  string,
  {
    name: string;
    countryCode: string;
    postcodeRegex: RegExp;
    example: string;
  }
> = {
  AT: {
    name: "Austria",
    countryCode: "AT",
    postcodeRegex: /^\d{4}$/,
    example: "1010",
  },
  BE: {
    name: "Belgium",
    countryCode: "BE",
    postcodeRegex: /^\d{4}$/,
    example: "1000",
  },
  BG: {
    name: "Bulgaria",
    countryCode: "BG",
    postcodeRegex: /^\d{4}$/,
    example: "1000",
  },
  HR: {
    name: "Croatia",
    countryCode: "HR",
    postcodeRegex: /^\d{5}$/,
    example: "10000",
  },
  CY: {
    name: "Cyprus",
    countryCode: "CY",
    postcodeRegex: /^\d{4}$/,
    example: "1010",
  },
  CZ: {
    name: "Czech Republic",
    countryCode: "CZ",
    postcodeRegex: /^\d{3}\s?\d{2}$/,
    example: "110 00",
  },
  DK: {
    name: "Denmark",
    countryCode: "DK",
    postcodeRegex: /^\d{4}$/,
    example: "1000",
  },
  EE: {
    name: "Estonia",
    countryCode: "EE",
    postcodeRegex: /^\d{5}$/,
    example: "10001",
  },
  FI: {
    name: "Finland",
    countryCode: "FI",
    postcodeRegex: /^\d{5}$/,
    example: "00100",
  },
  FR: {
    name: "France",
    countryCode: "FR",
    postcodeRegex: /^\d{5}$/,
    example: "75001",
  },
  DE: {
    name: "Germany",
    countryCode: "DE",
    postcodeRegex: /^\d{5}$/,
    example: "10115",
  },
  GR: {
    name: "Greece",
    countryCode: "GR",
    postcodeRegex: /^\d{3}\s?\d{2}$/,
    example: "106 71",
  },
  HU: {
    name: "Hungary",
    countryCode: "HU",
    postcodeRegex: /^\d{4}$/,
    example: "1011",
  },
  IE: {
    name: "Ireland",
    countryCode: "IE",
    postcodeRegex: /^[A-Z]\d{2}\s?[A-Z\d]{4}$/i,
    example: "D01 P5X0",
  },
  IT: {
    name: "Italy",
    countryCode: "IT",
    postcodeRegex: /^\d{5}$/,
    example: "00100",
  },
  LV: {
    name: "Latvia",
    countryCode: "LV",
    postcodeRegex: /^LV-\d{4}$/,
    example: "LV-1010",
  },
  LT: {
    name: "Lithuania",
    countryCode: "LT",
    postcodeRegex: /^LT-\d{5}$/,
    example: "LT-01100",
  },
  LU: {
    name: "Luxembourg",
    countryCode: "LU",
    postcodeRegex: /^L-\d{4}$/,
    example: "L-1010",
  },
  MT: {
    name: "Malta",
    countryCode: "MT",
    postcodeRegex: /^[A-Z]{3}\s?\d{4}$/i,
    example: "VLT 1010",
  },
  NL: {
    name: "Netherlands",
    countryCode: "NL",
    postcodeRegex: /^\d{4}\s?[A-Z]{2}$/i,
    example: "1012 AB",
  },
  PL: {
    name: "Poland",
    countryCode: "PL",
    postcodeRegex: /^\d{2}-\d{3}$/,
    example: "00-001",
  },
  PT: {
    name: "Portugal",
    countryCode: "PT",
    postcodeRegex: /^\d{4}-\d{3}$/,
    example: "1000-001",
  },
  RO: {
    name: "Romania",
    countryCode: "RO",
    postcodeRegex: /^\d{6}$/,
    example: "010001",
  },
  SK: {
    name: "Slovakia",
    countryCode: "SK",
    postcodeRegex: /^\d{3}\s?\d{2}$/,
    example: "811 01",
  },
  SI: {
    name: "Slovenia",
    countryCode: "SI",
    postcodeRegex: /^SI-\d{4}$/,
    example: "SI-1000",
  },
  ES: {
    name: "Spain",
    countryCode: "ES",
    postcodeRegex: /^\d{5}$/,
    example: "28001",
  },
  SE: {
    name: "Sweden",
    countryCode: "SE",
    postcodeRegex: /^\d{3}\s?\d{2}$/,
    example: "100 00",
  },
  GB: {
    name: "United Kingdom",
    countryCode: "GB",
    postcodeRegex: /^[A-Z]{1,2}\d{1,2}[A-Z\d]?\s?[A-Z\d]{2}$/i,
    example: "SW1A 1AA",
  },
};

/**
 * Validate postcode format for a given country
 */
export function validatePostcode(postcode: string, countryCode: string): PostcodeValidationResult {
  const normalized = postcode.trim().toUpperCase();
  const country = EU_COUNTRIES[countryCode.toUpperCase()];

  if (!country) {
    return {
      valid: false,
      country: "",
      countryCode,
      error: `Country code "${countryCode}" not supported. Supported: ${Object.keys(EU_COUNTRIES).join(", ")}`,
    };
  }

  if (!country.postcodeRegex.test(normalized)) {
    return {
      valid: false,
      country: country.name,
      countryCode,
      error: `Invalid ${country.name} postcode format. Example: ${country.example}`,
    };
  }

  return {
    valid: true,
    country: country.name,
    countryCode,
  };
}

/**
 * Geocode a postcode to lat/lon using OpenStreetMap Nominatim API
 * Returns coordinates and address
 */
export async function geocodePostcode(
  postcode: string,
  countryCode: string
): Promise<GeocodeResult> {
  // Validate first
  const validation = validatePostcode(postcode, countryCode);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid postcode");
  }

  const country = EU_COUNTRIES[countryCode.toUpperCase()];
  const normalized = postcode.trim().toUpperCase();

  try {
    // Use Nominatim API (OpenStreetMap) for geocoding
    const query = `${normalized}, ${country?.name}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "WindTurbineCalculator/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      throw new Error(`Postcode "${normalized}" not found in ${country?.name}`);
    }

    const result = results[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      address: result.display_name || `${normalized}, ${country?.name}`,
      country: country?.name || countryCode,
      postcode: normalized,
    };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Geocoding failed: ${err.message}`);
    }
    throw new Error("Geocoding failed: Unknown error");
  }
}

/**
 * Get list of all supported countries
 */
export function getSupportedCountries(): Array<{ code: string; name: string; example: string }> {
  return Object.entries(EU_COUNTRIES).map(([code, data]) => ({
    code,
    name: data.name,
    example: data.example,
  }));
}

/**
 * Detect country code from postcode format (heuristic)
 * Useful for auto-detection if user enters postcode without selecting country
 */
export function detectCountryFromPostcode(postcode: string): string | null {
  const normalized = postcode.trim().toUpperCase();

  for (const [code, data] of Object.entries(EU_COUNTRIES)) {
    if (data.postcodeRegex.test(normalized)) {
      return code;
    }
  }

  return null;
}
