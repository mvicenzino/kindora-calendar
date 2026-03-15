import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "kindora-calendar-text-size";
const CHANGE_EVENT = "kindora-text-size-change";

export type CalendarTextScale = 1 | 2 | 3 | 4 | 5;

export const TEXT_SCALE_LABELS: Record<CalendarTextScale, string> = {
  1: "Small",
  2: "Default",
  3: "Medium",
  4: "Large",
  5: "Extra Large",
};

export interface TextSizes {
  title: string;   // font-size for event title
  meta: string;    // font-size for time / date / description
}

export const TEXT_SCALE_SIZES: Record<CalendarTextScale, TextSizes> = {
  1: { title: "10px", meta: "8px" },
  2: { title: "12px", meta: "10px" },   // default
  3: { title: "14px", meta: "11px" },
  4: { title: "16px", meta: "12px" },
  5: { title: "18px", meta: "13px" },
};

// Multiplier relative to default (scale 2 = 1.0x).
// Used by grid views with small cells to scale their own base sizes.
export const TEXT_SCALE_MULTIPLIER: Record<CalendarTextScale, number> = {
  1: 0.85,
  2: 1.0,
  3: 1.17,
  4: 1.33,
  5: 1.5,
};

function readFromStorage(): CalendarTextScale {
  try {
    const v = parseInt(localStorage.getItem(STORAGE_KEY) ?? "2", 10);
    if (v >= 1 && v <= 5) return v as CalendarTextScale;
  } catch {}
  return 2;
}

export function useCalendarTextSize() {
  const [scale, setScale] = useState<CalendarTextScale>(readFromStorage);

  useEffect(() => {
    const handler = () => setScale(readFromStorage());
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const updateScale = useCallback((newScale: CalendarTextScale) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(newScale));
    } catch {}
    setScale(newScale);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const sizes = TEXT_SCALE_SIZES[scale];
  const multiplier = TEXT_SCALE_MULTIPLIER[scale];

  return { scale, sizes, multiplier, updateScale };
}
