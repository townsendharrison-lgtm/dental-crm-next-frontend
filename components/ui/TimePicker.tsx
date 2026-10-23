"use client";

import { SelectMenu } from "./SelectMenu";

export interface TimePickerProps {
  /** 12-hour clock time as HH:MM (e.g. "12:30"). Empty when allowEmpty and nothing is chosen. */
  time: string;
  ampm: "AM" | "PM";
  onChange: (next: { time: string; ampm: "AM" | "PM" }) => void;
  disabled?: boolean;
  className?: string;
  /** Show empty hour/minute menus until the mentor picks a time. */
  allowEmpty?: boolean;
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

export function TimePicker({ time, ampm, onChange, disabled, className, allowEmpty = false }: TimePickerProps) {
  const blank = allowEmpty && !time.trim();
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
        value={blank ? "" : hour}
        disabled={disabled}
        options={HOURS}
        placeholder="Hour"
        onChange={(h) => onChange({ time: `${h}:${blank ? "00" : minute}`, ampm })}
      />
      <SelectMenu
        value={blank ? "" : minute}
        disabled={disabled}
        options={MINUTES}
        placeholder="Min"
        onChange={(m) => onChange({ time: `${blank ? "12" : hour}:${m}`, ampm })}
      />
      <SelectMenu
        value={blank ? "" : ampm}
        disabled={disabled}
        options={[
          { value: "AM", label: "AM" },
          { value: "PM", label: "PM" },
        ]}
        placeholder="AM/PM"
        onChange={(next) => onChange({ time: blank ? "12:00" : `${hour}:${minute}`, ampm: next as "AM" | "PM" })}
      />
    </div>
  );
}
