/**
 * Utility functions for DAT scores on the frontend.
 */

export const isLegacyDAT = (value: number): boolean => {
  return value >= 1 && value <= 30;
};

export const isNewIRTDAT = (value: number): boolean => {
  return value >= 200 && value <= 600;
};

export const toCanonicalDAT = (val: any): number => {
  const value = Number(val);
  if (isNaN(value) || value <= 0) return 420; // safe fallback
  if (isNewIRTDAT(value)) return value;
  if (isLegacyDAT(value)) {
    if (value >= 30) return 600;
    if (value >= 25) return 500 + (value - 25) * 20;
    if (value >= 23) return 460 + (value - 23) * 20;
    if (value >= 20) return 400 + (value - 20) * 20;
    if (value >= 18) return 360 + (value - 18) * 20;
    if (value >= 15) return 300 + (value - 15) * 20;
    return 200 + (value - 1) * Math.floor(100 / 14);
  }
  return value; 
};

export const toLegacyDATApprox = (val: any): number => {
  const canonicalValue = Number(val);
  if (isNaN(canonicalValue)) return 21;
  if (canonicalValue >= 600) return 30.0;
  if (canonicalValue >= 500) return 25.0 + (canonicalValue - 500) / 20.0;
  if (canonicalValue >= 460) return 23.0 + (canonicalValue - 460) / 20.0;
  if (canonicalValue >= 400) return 20.0 + (canonicalValue - 400) / 20.0;
  if (canonicalValue >= 360) return 18.0 + (canonicalValue - 360) / 20.0;
  if (canonicalValue >= 300) return 15.0 + (canonicalValue - 300) / 20.0;
  return 1.0 + (canonicalValue - 200) / (100 / 14);
};

export const formatDATScore = (val: any): string => {
  if (val === undefined || val === null || val === "" || val === "N/A" || Number(val) <= 0) return 'Not Stated';
  const value = Number(val);
  if (isNaN(value)) return String(val);
  
  if (isLegacyDAT(value)) {
    const canonical = toCanonicalDAT(value);
    return `${value} (≈${Math.round(canonical)} IRT)`;
  } else if (isNewIRTDAT(value)) {
    const legacy = toLegacyDATApprox(value);
    return `${value} (≈${Math.round(legacy * 10) / 10} legacy)`;
  }
  return String(val);
};
