import { type IStorage } from "./storage";
import { addDays, subDays, setHours, setMinutes, startOfToday } from "date-fns";

// Sample memory photos for demo events
const DEMO_PHOTOS = {
  soccerGame: "/attached_assets/stock_images/child_playing_soccer_29d1c0c9.jpg",
  movieNight: "/attached_assets/stock_images/family_watching_movi_7b39a391.jpg",
  pianoRecital: "/attached_assets/stock_images/child_playing_piano__e17f7106.jpg",
  familyDinner: "/attached_assets/stock_images/family_dinner_table__181f0ecf.jpg",
  beachDay: "/attached_assets/stock_images/family_beach_day_oce_a7a6744f.jpg",
};

/**
 * Seeds a demo account with sample family members and events
 * to give users a realistic preview of the application
 */
export async function seedDemoAccount(storage: IStorage, userId: string): Promise<void> {
  try {
    // Get the user's family ID (created automatically when user is upserted)
    const families = await storage.getUserFamilies(userId);
    if (families.length === 0) {
      throw new Error(`No families found for user ${userId}`);
    }
    const familyId = families[0].id;

    // Create sample family members
    const mom = await storage.createFamilyMember(familyId, {
      name: "Sarah",
      color: "#E879F9", // Purple
      avatar: null,
    });

    const dad = await storage.createFamilyMember(familyId, {
      name: "Michael",
      color: "#2DD4BF", // Teal
      avatar: null,
    });

    const daughter = await storage.createFamilyMember(familyId, {
      name: "Emma",
      color: "#F472B6", // Pink
      avatar: null,
    });

    const son = await storage.createFamilyMember(familyId, {
      name: "Lucas",
      color: "#60A5FA", // Blue
      avatar: null,
    });

    const today = startOfToday();

    // Create sample events - mix of past memories and upcoming events
    const sampleEvents = [
      // Past events (memories with photos)
      {
        title: "Emma's Soccer Game",
        description: "Great game! Emma scored two goals and her team won 3-1. So proud!",
        startTime: setMinutes(setHours(subDays(today, 3), 14), 0),
        endTime: setMinutes(setHours(subDays(today, 3), 16), 0),
        memberIds: [daughter.id, mom.id, dad.id],
        color: daughter.color,
        photoUrl: DEMO_PHOTOS.soccerGame,
      },
      {
        title: "Family Movie Night",
        description: "Watched the new animated movie with popcorn. Everyone loved it!",
        startTime: setMinutes(setHours(subDays(today, 5), 19), 0),
        endTime: setMinutes(setHours(subDays(today, 5), 21), 30),
        memberIds: [mom.id, dad.id, daughter.id, son.id],
        color: mom.color,
        photoUrl: DEMO_PHOTOS.movieNight,
      },
      {
        title: "Lucas's Piano Recital",
        description: "First recital! He played beautifully and didn't forget a single note.",
        startTime: setMinutes(setHours(subDays(today, 7), 15), 0),
        endTime: setMinutes(setHours(subDays(today, 7), 16), 30),
        memberIds: [son.id, mom.id, dad.id],
        color: son.color,
        photoUrl: DEMO_PHOTOS.pianoRecital,
      },

      // Today's events
      {
        title: "Grocery Shopping",
        description: "Weekly grocery run - don't forget the milk!",
        startTime: setMinutes(setHours(today, 10), 0),
        endTime: setMinutes(setHours(today, 11), 30),
        memberIds: [mom.id],
        color: mom.color,
        photoUrl: null,
      },
      {
        title: "Lunch with Dad",
        description: "Quick lunch date at the new café downtown",
        startTime: setMinutes(setHours(today, 12), 30),
        endTime: setMinutes(setHours(today, 13), 30),
        memberIds: [dad.id, mom.id],
        color: dad.color,
        photoUrl: null,
      },

      // Upcoming events
      {
        title: "Dentist Appointment",
        description: "Regular checkup for Emma",
        startTime: setMinutes(setHours(addDays(today, 1), 9), 0),
        endTime: setMinutes(setHours(addDays(today, 1), 10), 0),
        memberIds: [daughter.id, mom.id],
        color: daughter.color,
        photoUrl: null,
      },
      {
        title: "Parent-Teacher Conference",
        description: "Meeting with Lucas's teacher Ms. Johnson",
        startTime: setMinutes(setHours(addDays(today, 2), 16), 0),
        endTime: setMinutes(setHours(addDays(today, 2), 17), 0),
        memberIds: [mom.id, dad.id],
        color: son.color,
        photoUrl: null,
      },
      {
        title: "Family Dinner at Grandma's",
        description: "Sunday dinner - bringing dessert!",
        startTime: setMinutes(setHours(addDays(today, 3), 17), 0),
        endTime: setMinutes(setHours(addDays(today, 3), 20), 0),
        memberIds: [mom.id, dad.id, daughter.id, son.id],
        color: mom.color,
        photoUrl: DEMO_PHOTOS.familyDinner,
      },
      {
        title: "Emma's Dance Class",
        description: "Ballet practice - recital coming up!",
        startTime: setMinutes(setHours(addDays(today, 4), 16), 0),
        endTime: setMinutes(setHours(addDays(today, 4), 17), 30),
        memberIds: [daughter.id],
        color: daughter.color,
        photoUrl: null,
      },
      {
        title: "Date Night",
        description: "Dinner and a movie - first date night in weeks!",
        startTime: setMinutes(setHours(addDays(today, 5), 19), 0),
        endTime: setMinutes(setHours(addDays(today, 5), 23), 0),
        memberIds: [mom.id, dad.id],
        color: mom.color,
        photoUrl: null,
      },
      {
        title: "Lucas's Basketball Game",
        description: "Championship game - go team!",
        startTime: setMinutes(setHours(addDays(today, 6), 14), 0),
        endTime: setMinutes(setHours(addDays(today, 6), 16), 0),
        memberIds: [son.id, dad.id],
        color: son.color,
        photoUrl: null,
      },
      {
        title: "Beach Day",
        description: "Family outing to the beach - pack sunscreen!",
        startTime: setMinutes(setHours(addDays(today, 7), 10), 0),
        endTime: setMinutes(setHours(addDays(today, 7), 16), 0),
        memberIds: [mom.id, dad.id, daughter.id, son.id],
        color: dad.color,
        photoUrl: DEMO_PHOTOS.beachDay,
      },
    ];

    // Create all events
    for (const event of sampleEvents) {
      await storage.createEvent(familyId, event);
    }

    console.log(`✅ Demo account seeded with ${sampleEvents.length} events and 4 family members`);
  } catch (error) {
    console.error("Error seeding demo account:", error);
    throw error;
  }
}
