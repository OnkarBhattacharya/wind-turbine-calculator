/**
 * Postcode Input Component
 * Supports UK and EU postcodes with validation and geocoding
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  geocodePostcode,
  getSupportedCountries,
  validatePostcode,
  detectCountryFromPostcode,
  type GeocodeResult,
} from "@/lib/postcodeGeocoding";
import { AlertCircle, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface PostcodeInputProps {
  onLocationFound: (result: GeocodeResult) => void;
  onError?: (error: string) => void;
}

export function PostcodeInput({ onLocationFound, onError }: PostcodeInputProps) {
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("GB");
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [lastResult, setLastResult] = useState<GeocodeResult | null>(null);

  const countries = getSupportedCountries();

  const handlePostcodeChange = (value: string) => {
    setPostcode(value);

    // Auto-detect country if possible
    const detected = detectCountryFromPostcode(value);
    if (detected && detected !== country) {
      setCountry(detected);
    }

    // Validate as user types
    if (value.trim()) {
      const result = validatePostcode(value, country);
      setValidation(result);
    } else {
      setValidation(null);
    }
  };

  const handleGeocode = async () => {
    if (!postcode.trim()) {
      toast.error("Please enter a postcode");
      return;
    }

    const validation = validatePostcode(postcode, country);
    if (!validation.valid) {
      setValidation(validation);
      onError?.(validation.error || "Invalid postcode");
      return;
    }

    setLoading(true);
    try {
      const result = await geocodePostcode(postcode, country);
      setLastResult(result);
      setValidation({ valid: true });
      onLocationFound(result);
      toast.success(`Location found: ${result.address}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Geocoding failed";
      setValidation({ valid: false, error: errorMsg });
      onError?.(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground font-medium">
        Find by Postcode
      </Label>

      <div className="flex flex-col sm:flex-row gap-2">
        {/* Country Select */}
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-full sm:w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {countries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{c.code}</span>
                  <span className="text-sm">{c.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Postcode Input */}
        <div className="flex-1 relative">
          <Input
            value={postcode}
            onChange={(e) => handlePostcodeChange(e.target.value)}
            placeholder={`e.g. ${countries.find((c) => c.code === country)?.example || "Enter postcode"}`}
            className="text-sm font-mono"
            disabled={loading}
          />
          {validation && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {validation.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
          )}
        </div>

        {/* Geocode Button */}
        <Button
          onClick={handleGeocode}
          disabled={loading || !postcode.trim() || !validation?.valid}
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Locating…
            </>
          ) : (
            <>
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              Find
            </>
          )}
        </Button>
      </div>

      {/* Validation Error */}
      {validation && !validation.valid && (
        <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{validation.error}</span>
        </div>
      )}

      {/* Last Result Display */}
      {lastResult && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
          <div className="font-semibold mb-0.5">✓ Location Found</div>
          <div className="text-emerald-600 font-mono text-xs mb-1">
            {lastResult.latitude.toFixed(6)}°, {lastResult.longitude.toFixed(6)}°
          </div>
          <div className="text-emerald-600 text-xs line-clamp-2">{lastResult.address}</div>
        </div>
      )}
    </div>
  );
}
