"use client";

import { useEffect, useRef, useState } from "react";

export interface CountdownSegment {
  value: number;
  unit: string;
  pad: number;
}

export interface CountdownParts {
  msRemaining: number;
  isOverdue: boolean;
  /** Ordered, leading-zero-suppressed big units (y/mo/w/d) followed by an
   * always-present, always-ticking h/m/s/ms tail. */
  segments: CountdownSegment[];
}

const MS = 1;
const SEC = 1000 * MS;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function computeParts(msRemaining: number): CountdownParts {
  const abs = Math.abs(msRemaining);

  const years = Math.floor(abs / YEAR);
  let rem = abs - years * YEAR;
  const months = Math.floor(rem / MONTH);
  rem -= months * MONTH;
  const weeks = Math.floor(rem / WEEK);
  rem -= weeks * WEEK;
  const days = Math.floor(rem / DAY);
  rem -= days * DAY;
  const hours = Math.floor(rem / HOUR);
  rem -= hours * HOUR;
  const minutes = Math.floor(rem / MIN);
  rem -= minutes * MIN;
  const seconds = Math.floor(rem / SEC);
  rem -= seconds * SEC;
  const milliseconds = Math.floor(rem);

  const segments: CountdownSegment[] = [];
  let bigUnitShown = false;

  if (years > 0) {
    segments.push({ value: years, unit: "y", pad: 1 });
    bigUnitShown = true;
  }
  if (bigUnitShown || months > 0) {
    segments.push({ value: months, unit: "mo", pad: 1 });
    bigUnitShown = true;
  }
  if (bigUnitShown || weeks > 0) {
    segments.push({ value: weeks, unit: "w", pad: 1 });
    bigUnitShown = true;
  }
  if (bigUnitShown || days > 0) {
    segments.push({ value: days, unit: "d", pad: 1 });
  }

  // Hours/minutes/seconds/milliseconds always show, so the clock is always
  // visibly live no matter how far out the deadline is.
  segments.push({ value: hours, unit: "h", pad: 2 });
  segments.push({ value: minutes, unit: "m", pad: 2 });
  segments.push({ value: seconds, unit: "s", pad: 2 });
  segments.push({ value: milliseconds, unit: "ms", pad: 3 });

  return {
    msRemaining,
    isOverdue: msRemaining <= 0,
    segments,
  };
}

/** Live countdown to `deadlineIso`, updated ~30x/sec so ms digits visibly tick. */
export function useCountdown(deadlineIso: string): CountdownParts {
  const deadlineMs = useRef(new Date(deadlineIso).getTime());
  deadlineMs.current = new Date(deadlineIso).getTime();

  const [parts, setParts] = useState<CountdownParts>(() =>
    computeParts(deadlineMs.current - Date.now())
  );

  useEffect(() => {
    let frame: number;
    let lastUpdate = 0;

    const tick = (now: number) => {
      if (now - lastUpdate >= 33) {
        lastUpdate = now;
        setParts(computeParts(deadlineMs.current - Date.now()));
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return parts;
}
