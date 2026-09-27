"use client";

import { useEffect, useRef, useState } from "react";

export interface CountdownParts {
  msRemaining: number;
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  label: string; // adaptive human-readable string
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

  let label: string;
  if (abs >= YEAR) {
    label = `${years}y ${months}mo ${days}d`;
  } else if (abs >= MONTH) {
    label = `${months}mo ${weeks}w ${days % 7}d`;
  } else if (abs >= WEEK) {
    label = `${weeks}w ${days % 7}d ${hours}h`;
  } else if (abs >= DAY) {
    label = `${days}d ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  } else {
    label = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
  }

  if (msRemaining <= 0) {
    label = `OVERDUE by ${label}`;
  }

  return {
    msRemaining,
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    label,
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
