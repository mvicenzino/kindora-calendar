import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "kindora-calendar-text-size";
const CHANGE_EVENT = "kindora-text-size-change";

export type CalendarTextSize = "normal" | "large";

function readFromStorage(): CalendarTextSize {
  try {
    return localStorage.getItem(STORAGE_KEY) === "large" ? "large" : "normal";
  } catch {
    return "normal";
  }
}

export function useCalendarTextSize() {
  const [size, setSize] = useState<CalendarTextSize>(readFromStorage);

  useEffect(() => {
    const handler = () => setSize(readFromStorage());
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const updateSize = useCallback((newSize: CalendarTextSize) => {
    try {
      localStorage.setItem(STORAGE_KEY, newSize);
    } catch {}
    setSize(newSize);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { size, updateSize };
}
