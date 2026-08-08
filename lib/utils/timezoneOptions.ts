/** Shared labeled timezone options for meeting / accept-assignment UIs. */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Mountain Time - AZ (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "UTC", label: "UTC" },
];

export function timezoneSelectOptions(current?: string | null) {
  if (!current || TIMEZONE_OPTIONS.some((o) => o.value === current)) {
    return TIMEZONE_OPTIONS;
  }
  return [...TIMEZONE_OPTIONS, { value: current, label: current }];
}

export function timezoneLabel(value: string): string {
  return TIMEZONE_OPTIONS.find((o) => o.value === value)?.label || value;
}
