"use client";

import { SelectMenu } from "./SelectMenu";

export interface TimePickerProps {
  /** 12-hour clock time as HH:MM (e.g. "12:30") */
  time: string;
  ampm: "AM" | "PM";
  onChange: (next: { time: string; ampm: "AM" | "PM" }) => void;
  disabled?: boolean;
  className?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 1;
  return { value: String(h).padStart(2, "0"), label: String(h) };
});

const MINUTES = Array.from({ length: 12 }, (_, i) => {
  const m = i * 5;
  const v = String(m).padStart(2, "0");
  return { value: v, label: v };
});

export function TimePicker({ time, ampm, onChange, disabled, className }: TimePickerProps) {
  const [rawH = "12", rawM = "00"] = (time || "12:00").split(":");
  // Snap minute to nearest 5 for the menu
  const minuteNum = Math.round(parseInt(rawM, 10) / 5) * 5;
  const minute = String(minuteNum === 60 ? 55 : minuteNum).padStart(2, "0");
  let hour = rawH;
  const hNum = parseInt(rawH, 10);
  if (hNum === 0) hour = "12";
  else if (hNum > 12) hour = String(hNum - 12).padStart(2, "0");
  else hour = String(hNum).padStart(2, "0");

  return (
    <div className={`grid grid-cols-3 gap-2 ${className || ""}`}>
      <SelectMenu
        value={hour}
        disabled={disabled}
        options={HOURS}
        onChange={(h) => onChange({ time: `${h}:${minute}`, ampm })}
      />
      <SelectMenu
        value={minute}
        disabled={disabled}
        options={MINUTES}
        onChange={(m) => onChange({ time: `${hour}:${m}`, ampm })}
      />
      <SelectMenu
        value={ampm}
        disabled={disabled}
        options={[
          { value: "AM", label: "AM" },
          { value: "PM", label: "PM" },
        ]}
        onChange={(next) => onChange({ time: `${hour}:${minute}`, ampm: next as "AM" | "PM" })}
      />
    </div>
  );
}
