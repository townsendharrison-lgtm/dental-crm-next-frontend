"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils/cn";
import {
  formatTimezoneLabel,
  formatUtcFromIso,
  formatUtcFromWallClock,
  getBrowserTimezone,
  toTime24From12,
} from "@/lib/utils/dateUtils";

type WallClockProps = {
  /** YYYY-MM-DD */
  date: string;
  /** 24h HH:MM — or pass time + ampm instead */
  time24?: string;
  time?: string;
  ampm?: "AM" | "PM";
  /** IANA zone the wall-clock is expressed in (defaults to browser). */
  timeZone?: string;
  dateIso?: never;
};

type InstantProps = {
  /** Existing ISO / meeting instant */
  dateIso: string;
  date?: never;
  time24?: never;
  time?: never;
  ampm?: never;
  timeZone?: string;
};

export type TimezoneHintProps = (WallClockProps | InstantProps) & {
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
};

function resolveUtcLabel(props: WallClockProps | InstantProps): string | null {
  if ("dateIso" in props && props.dateIso) {
    return formatUtcFromIso(props.dateIso);
  }

  const wall = props as WallClockProps;
  if (!wall.date) return null;
  const time24 =
    wall.time24 ||
    (wall.time && wall.ampm ? toTime24From12(wall.time, wall.ampm) : null);
  if (!time24) return null;
  const tz = wall.timeZone || getBrowserTimezone();
  return formatUtcFromWallClock(wall.date, time24, tz);
}

/**
 * Small "?" control. Hover shows the user's timezone and the matching UTC time
 * for a typed wall-clock or an existing meeting instant.
 */
export function TimezoneHint(props: TimezoneHintProps) {
  const { className, side = "top" } = props;
  const timeZone =
    ("timeZone" in props && props.timeZone) || getBrowserTimezone();
  const utcLabel = resolveUtcLabel(props);
  const ready = Boolean(utcLabel && utcLabel !== "—");

  const content = (
    <div className="space-y-1.5 text-left">
      <p>
        <span className="text-muted-foreground">Your timezone: </span>
        <span className="font-semibold text-foreground">
          {formatTimezoneLabel(timeZone)}
        </span>
      </p>
      <p>
        <span className="text-muted-foreground">UTC: </span>
        <span className="font-semibold text-foreground">
          {ready ? utcLabel : "Enter a time to preview"}
        </span>
      </p>
    </div>
  );

  return (
    <Tooltip content={content} side={side} className="max-w-[280px]">
      <button
        type="button"
        tabIndex={0}
        aria-label="Timezone and UTC preview"
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          "border border-slate-600/80 bg-slate-800/80 text-slate-400",
          "transition-colors hover:border-indigo-400/50 hover:text-indigo-300",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
          className,
        )}
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
        <span className="sr-only">?</span>
      </button>
    </Tooltip>
  );
}

/**
 * Meeting timestamp in the viewer's local zone, with a "?" that reveals UTC.
 */
export function MeetingTimeWithHint({
  dateIso,
  className,
  options,
}: {
  dateIso: string;
  className?: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  if (!dateIso) return <span className={className}>—</span>;

  const date = dateIso.includes("T") ? new Date(dateIso) : new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return <span className={className}>{dateIso}</span>;
  }

  const local = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    ...options,
  });

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span>{local}</span>
      <TimezoneHint dateIso={dateIso} />
    </span>
  );
}
