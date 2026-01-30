import ICAL from "ical.js";
import type { ParsedScheduleEvent, ParseScheduleResult } from "./scheduleParser";

export function parseICalData(icsContent: string): ParseScheduleResult {
  try {
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents("vevent");

    if (vevents.length === 0) {
      return {
        success: false,
        events: [],
        error: "No events found in the calendar file",
      };
    }

    const events: ParsedScheduleEvent[] = vevents.map((vevent: any) => {
      const event = new ICAL.Event(vevent);
      
      const startDate = event.startDate;
      const endDate = event.endDate || startDate;
      
      const isAllDay = startDate.isDate;
      
      let startTime: string | undefined;
      let endTime: string | undefined;
      
      if (!isAllDay) {
        const startJs = startDate.toJSDate();
        const endJs = endDate.toJSDate();
        startTime = `${String(startJs.getHours()).padStart(2, '0')}:${String(startJs.getMinutes()).padStart(2, '0')}`;
        endTime = `${String(endJs.getHours()).padStart(2, '0')}:${String(endJs.getMinutes()).padStart(2, '0')}`;
      }

      const startDateStr = formatDate(startDate.toJSDate());
      const endDateStr = formatDate(endDate.toJSDate());

      return {
        title: event.summary || "Untitled Event",
        description: event.description || undefined,
        startDate: startDateStr,
        endDate: endDateStr,
        startTime,
        endTime,
        isAllDay,
        recurring: !!vevent.getFirstProperty("rrule"),
        location: event.location || undefined,
      };
    });

    return {
      success: true,
      events,
      rawText: icsContent,
    };
  } catch (error: any) {
    console.error("Error parsing iCal data:", error);
    return {
      success: false,
      events: [],
      error: error instanceof Error ? error.message : "Failed to parse calendar file",
    };
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
