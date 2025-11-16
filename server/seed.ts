import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { familyMembers, events, messages } from "@shared/schema";

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log("Seeding database...");

  // Create family members
  const [member1, member2] = await db
    .insert(familyMembers)
    .values([
      {
        name: "Mike V",
        color: "#8B5CF6",
        avatar: null,
      },
      {
        name: "Carolyn V",
        color: "#EC4899",
        avatar: null,
      },
    ])
    .returning();

  console.log("Created family members:", member1.name, member2.name);

  // Create sample events
  const today = new Date();
  const sampleEvents = await db
    .insert(events)
    .values([
      // Today's events
      {
        title: "Date Night at Jockey Hollow",
        description: "Evening out",
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 30),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 0),
        memberId: member1.id,
        color: member1.color,
      },
      {
        title: "Brunch with Mom",
        description: "Family time",
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30),
        memberId: member2.id,
        color: member2.color,
      },
      // Earlier this week
      {
        title: "Dinner with Carolyn",
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 17, 30),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 19, 0),
        memberId: member1.id,
        color: member1.color,
      },
      {
        title: "Grocery Shopping",
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 11, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 12, 0),
        memberId: member1.id,
        color: member1.color,
      },
      {
        title: "Sebby's Birthday",
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 11, 0),
        memberId: member2.id,
        color: member2.color,
      },
      {
        title: "Pack for trip",
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 10, 0),
        memberId: member1.id,
        color: member1.color,
      },
      // Later this week
      {
        title: "Project Meeting",
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 13, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 14, 0),
        memberId: member2.id,
        color: member2.color,
      },
      {
        title: "Workout",
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0),
        memberId: member1.id,
        color: member1.color,
      },
      {
        title: "Pick up rental car",
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 12, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 13, 0),
        memberId: member2.id,
        color: member2.color,
      },
      {
        title: "Dr. Schwartz",
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 8, 30),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 9, 30),
        memberId: member1.id,
        color: member1.color,
      },
      {
        title: "Zoo visit",
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 14, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 16, 0),
        memberId: member2.id,
        color: member2.color,
      },
    ])
    .returning();

  console.log(`Created ${sampleEvents.length} events`);

  // Create sample messages (love notes)
  await db
    .insert(messages)
    .values([
      {
        eventId: sampleEvents[0].id, // Date Night at Jockey Hollow
        senderName: member2.name,
        recipientId: member1.id,
        content: "Can't wait for tonight! Love you ❤️",
        fontWeight: "normal",
        fontStyle: "normal",
        emoji: "💕",
      },
      {
        eventId: sampleEvents[1].id, // Brunch with Mom
        senderName: member1.name,
        recipientId: member2.id,
        content: "Enjoy brunch! Give mom a hug from me",
        fontWeight: "normal",
        fontStyle: "normal",
        emoji: "🤗",
      },
      {
        eventId: sampleEvents[6].id, // Project Meeting
        senderName: member1.name,
        recipientId: member2.id,
        content: "Good luck with your presentation!",
        fontWeight: "bold",
        fontStyle: "normal",
        emoji: "💪",
      },
    ]);

  console.log("Created sample messages");
  console.log("Seeding complete!");

  await pool.end();
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
