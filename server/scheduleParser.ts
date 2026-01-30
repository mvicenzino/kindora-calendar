import { GoogleGenAI } from "@google/genai";

// This uses Replit's AI Integrations service for Gemini access
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export interface ParsedScheduleEvent {
  title: string;
  description?: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  isAllDay: boolean;
  recurring?: boolean;
  cost?: number;
}

export interface ParseScheduleResult {
  success: boolean;
  events: ParsedScheduleEvent[];
  rawText?: string;
  error?: string;
}

/**
 * Parse schedule text using Gemini AI
 */
export async function parseScheduleFromText(text: string): Promise<ParseScheduleResult> {
  try {
    const prompt = `You are a schedule extraction assistant. Parse the following text and extract calendar events.

For each event, provide:
- title: The event name/title
- description: Additional details (optional)
- startDate: The start date in YYYY-MM-DD format
- endDate: The end date in YYYY-MM-DD format (same as startDate for single-day events)
- startTime: The start time in HH:mm format (24-hour) if specified, otherwise null
- endTime: The end time in HH:mm format (24-hour) if specified, otherwise null
- isAllDay: true if no specific times, false otherwise
- recurring: true if this is a recurring event pattern
- cost: numeric cost if mentioned (e.g., $380 becomes 380)

Current year context: ${new Date().getFullYear()}

Text to parse:
"""
${text}
"""

Respond with a JSON array of events only, no explanation. Example:
[
  {
    "title": "Summer Camp Week 1",
    "description": "Full day camp session",
    "startDate": "2026-06-22",
    "endDate": "2026-06-26",
    "startTime": "09:00",
    "endTime": "16:00",
    "isAllDay": false,
    "recurring": false,
    "cost": 380
  }
]

If you cannot extract any events, return an empty array: []`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const responseText = response.text || "";
    
    // Extract JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        success: false,
        events: [],
        rawText: responseText,
        error: "Could not find valid JSON in response",
      };
    }

    const events = JSON.parse(jsonMatch[0]) as ParsedScheduleEvent[];
    
    return {
      success: true,
      events,
      rawText: text,
    };
  } catch (error: any) {
    console.error("Error parsing schedule:", error);
    
    // Handle rate limiting errors with a user-friendly message
    if (error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED") || 
        error?.code === 429 || error?.status === "RESOURCE_EXHAUSTED") {
      return {
        success: false,
        events: [],
        error: "The AI service is temporarily busy. Please wait a moment and try again.",
      };
    }
    
    return {
      success: false,
      events: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Parse schedule from an image (base64 encoded)
 */
export async function parseScheduleFromImage(
  base64Data: string,
  mimeType: string
): Promise<ParseScheduleResult> {
  try {
    const prompt = `You are a schedule extraction assistant. Analyze this image and extract any calendar events, schedules, or appointments you can identify.

For each event found, provide:
- title: The event name/title
- description: Additional details (optional)
- startDate: The start date in YYYY-MM-DD format
- endDate: The end date in YYYY-MM-DD format
- startTime: The start time in HH:mm format (24-hour) if visible, otherwise null
- endTime: The end time in HH:mm format (24-hour) if visible, otherwise null
- isAllDay: true if no specific times are shown
- recurring: true if this appears to be a recurring event
- cost: numeric cost if shown (e.g., $380 becomes 380)

Current year context: ${new Date().getFullYear()}

Respond with a JSON array of events only. If you cannot extract any events, return an empty array: []`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    });

    const responseText = response.text || "";
    
    // Extract JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        success: false,
        events: [],
        rawText: responseText,
        error: "Could not find valid JSON in response",
      };
    }

    const events = JSON.parse(jsonMatch[0]) as ParsedScheduleEvent[];
    
    return {
      success: true,
      events,
    };
  } catch (error: any) {
    console.error("Error parsing image schedule:", error);
    
    // Handle rate limiting errors with a user-friendly message
    if (error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED") || 
        error?.code === 429 || error?.status === "RESOURCE_EXHAUSTED") {
      return {
        success: false,
        events: [],
        error: "The AI service is temporarily busy. Please wait a moment and try again.",
      };
    }
    
    return {
      success: false,
      events: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Parse schedule from a PDF (base64 encoded)
 * Note: Gemini can process PDFs as images
 */
export async function parseScheduleFromPdf(base64Data: string): Promise<ParseScheduleResult> {
  return parseScheduleFromImage(base64Data, "application/pdf");
}
