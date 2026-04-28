import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarLayout, CalendarView } from "@/components/ViewSwitcherBar";

const MOBILE_BREAKPOINT = 768;

type Device = "mobile" | "desktop";

const LAYOUT_KEY = (device: Device) => `kindora_calendar_layout_${device}`;
const VIEW_KEY = (device: Device) => `kindora_calendar_view_${device}`;

function detectDevice(): Device {
  if (typeof window === "undefined") return "desktop";
  return window.innerWidth < MOBILE_BREAKPOINT ? "mobile" : "desktop";
}

function readStored<T extends string>(
  key: string,
  allowed: readonly T[],
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw && (allowed as readonly string[]).includes(raw)) return raw as T;
  } catch {
    // localStorage may be unavailable (private mode); fall through
  }
  return null;
}

function writeStored(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage may be unavailable (private mode); fail silently
  }
}

const ALLOWED_LAYOUTS: readonly CalendarLayout[] = ["grid", "tile"];
const ALLOWED_VIEWS: readonly CalendarView[] = [
  "day",
  "week",
  "month",
  "year",
  "timeline",
];

function defaultLayoutFor(device: Device): CalendarLayout {
  return device === "mobile" ? "tile" : "grid";
}

function defaultViewFor(device: Device): CalendarView {
  return device === "mobile" ? "day" : "month";
}

/**
 * Returns the initial calendar layout + view based on the user's last choice
 * for the current device, falling back to sensible defaults:
 *   - Mobile  : tile (cards/list) layout, day view
 *   - Desktop : grid (spatial calendar) layout, month view
 *
 * Preferences persist per-device, so a person can prefer different layouts on
 * phone vs laptop. When the viewport actually crosses the mobile breakpoint
 * at runtime, we load the new device's stored preference (or its default).
 */
export function useCalendarDefaults() {
  // Capture the initial device once so layout + view both initialize from the
  // same bucket (avoids the rare case of a mid-mount resize splitting them).
  const initialDeviceRef = useRef<Device>(detectDevice());

  // The ref is the source of truth that setters consult; it's updated
  // synchronously inside the resize handler so even immediate user toggles
  // after a breakpoint crossing land in the correct device bucket.
  const deviceRef = useRef<Device>(initialDeviceRef.current);
  // `device` state exists only to trigger re-renders if any consumer needs
  // it; the ref is what reads the active bucket.
  const [, setDevice] = useState<Device>(initialDeviceRef.current);

  const [layout, setLayoutState] = useState<CalendarLayout>(() => {
    const d = initialDeviceRef.current;
    return (
      readStored<CalendarLayout>(LAYOUT_KEY(d), ALLOWED_LAYOUTS) ??
      defaultLayoutFor(d)
    );
  });

  const [view, setViewState] = useState<CalendarView>(() => {
    const d = initialDeviceRef.current;
    return (
      readStored<CalendarView>(VIEW_KEY(d), ALLOWED_VIEWS) ?? defaultViewFor(d)
    );
  });

  const setLayout = useCallback((next: CalendarLayout) => {
    setLayoutState(next);
    writeStored(LAYOUT_KEY(deviceRef.current), next);
  }, []);

  const setView = useCallback((next: CalendarView) => {
    setViewState(next);
    writeStored(VIEW_KEY(deviceRef.current), next);
  }, []);

  // React only when the viewport *crosses* the mobile/desktop breakpoint.
  // On a real crossing, switch to the new device's stored preference (or its
  // default if none has been saved yet). Resizes within the same bucket are
  // ignored, so we never clobber an in-session choice.
  useEffect(() => {
    const handler = () => {
      const nextDevice = detectDevice();
      if (nextDevice === deviceRef.current) return;
      // Update the ref synchronously so any setter fired between this point
      // and React's re-render writes to the new device bucket.
      deviceRef.current = nextDevice;
      setDevice(nextDevice);
      const storedLayout = readStored<CalendarLayout>(
        LAYOUT_KEY(nextDevice),
        ALLOWED_LAYOUTS,
      );
      setLayoutState(storedLayout ?? defaultLayoutFor(nextDevice));
      const storedView = readStored<CalendarView>(
        VIEW_KEY(nextDevice),
        ALLOWED_VIEWS,
      );
      setViewState(storedView ?? defaultViewFor(nextDevice));
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return { view, setView, layout, setLayout };
}
