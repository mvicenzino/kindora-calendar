import { type IStorage } from "./storage";
import { addDays, subDays, setHours, setMinutes, startOfToday } from "date-fns";

// Sample memory photos for demo events - Family with Kids
const FAMILY_PHOTOS = {
  soccerGame: "/attached_assets/stock_images/child_playing_soccer_29d1c0c9.jpg",
  movieNight: "/attached_assets/stock_images/family_watching_movi_7b39a391.jpg",
  pianoRecital: "/attached_assets/stock_images/child_playing_piano__e17f7106.jpg",
  familyDinner: "/attached_assets/stock_images/family_dinner_table__181f0ecf.jpg",
  beachDay: "/attached_assets/stock_images/family_beach_day_oce_a7a6744f.jpg",
};

// Sample photos for eldercare/caregiver scenarios
const CARE_PHOTOS = {
  nurseVisit: "/attached_assets/stock_images/nurse_visiting_elder_6f5a0aa9.jpg",
  physicalTherapy: "/attached_assets/stock_images/elderly_person_physi_801b2c25.jpg",
  doctorVisit: "/attached_assets/stock_images/doctor_elderly_patie_c7a84ec4.jpg",
  familyVisit: "/attached_assets/stock_images/elderly_grandmother__1b2dd55b.jpg",
};

/**
 * Seeds a demo account showcasing the "Sandwich Generation" experience:
 * 1. Your Family calendar - managing kids' activities, school, sports
 * 2. Mom's Care calendar - coordinating care for aging parent with caregivers
 * 
 * This demonstrates the full spectrum of Kindora's features for families
 * who are caring for both children and elderly parents.
 */
export async function seedDemoAccount(storage: IStorage, userId: string): Promise<void> {
  try {
    // Get the user's primary family (created automatically when user is upserted)
    const families = await storage.getUserFamilies(userId);
    if (families.length === 0) {
      throw new Error(`No families found for user ${userId}`);
    }
    
    const today = startOfToday();
    
    // ============================================
    // CREATE DEMO USERS FOR OTHER FAMILY MEMBERS
    // These allow us to show realistic multi-person conversations
    // ============================================
    
    // Michael - Husband/partner in Your Family
    const michaelId = `${userId}-michael`;
    await storage.upsertUser({
      id: michaelId,
      email: "michael@demo.kindora.app",
      firstName: "Michael",
      lastName: "Johnson",
      profileImageUrl: null,
    });
    
    // Jenny - Babysitter (member role in Your Family)
    const jennyId = `${userId}-jenny`;
    await storage.upsertUser({
      id: jennyId,
      email: "jenny@demo.kindora.app",
      firstName: "Jenny",
      lastName: "Martinez",
      profileImageUrl: null,
    });
    
    // David - Sibling who helps with Mom's care
    const davidId = `${userId}-david`;
    await storage.upsertUser({
      id: davidId,
      email: "david@demo.kindora.app",
      firstName: "David",
      lastName: "Chen",
      profileImageUrl: null,
    });
    
    // Maya - Professional caregiver (nurse) for Mom
    const mayaId = `${userId}-maya`;
    await storage.upsertUser({
      id: mayaId,
      email: "maya@demo.kindora.app",
      firstName: "Maya",
      lastName: "Santos",
      profileImageUrl: null,
    });
    
    
    // ============================================
    // FAMILY 1: "Your Family" - Kids & Activities
    // ============================================
    const familyId = families[0].id;
    
    // Add Michael and Jenny to the family with proper roles
    await storage.addUserToFamily(michaelId, familyId, "member");
    await storage.addUserToFamily(jennyId, familyId, "member");

    // Create family members - the core family
    const mom = await storage.createFamilyMember(familyId, {
      name: "You (Sarah)",
      color: "#E879F9", // Purple - represents the demo user
      avatar: null,
    });

    const dad = await storage.createFamilyMember(familyId, {
      name: "Michael",
      color: "#2DD4BF", // Teal
      avatar: null,
    });

    const daughter = await storage.createFamilyMember(familyId, {
      name: "Emma",
      color: "#F472B6", // Pink - 12 years old
      avatar: null,
    });

    const son = await storage.createFamilyMember(familyId, {
      name: "Lucas",
      color: "#60A5FA", // Blue - 8 years old
      avatar: null,
    });

    // Add a caregiver to the family calendar - babysitter
    const babysitter = await storage.createFamilyMember(familyId, {
      name: "Jenny (Babysitter)",
      color: "#F97316", // Orange - trusted caregiver
      avatar: null,
    });

    // Family events - mix of memories and upcoming activities
    const familyEvents = [
      // Past memories with photos
      {
        title: "Emma's Soccer Championship",
        description: "What a game! Emma scored the winning goal in overtime. The whole team celebrated!",
        startTime: setMinutes(setHours(subDays(today, 3), 14), 0),
        endTime: setMinutes(setHours(subDays(today, 3), 16), 0),
        memberIds: [daughter.id, mom.id, dad.id],
        color: daughter.color,
        photoUrl: FAMILY_PHOTOS.soccerGame,
      },
      {
        title: "Family Movie Night",
        description: "Watched the new animated movie with homemade popcorn. Lucas picked the movie this time!",
        startTime: setMinutes(setHours(subDays(today, 5), 19), 0),
        endTime: setMinutes(setHours(subDays(today, 5), 21), 30),
        memberIds: [mom.id, dad.id, daughter.id, son.id],
        color: mom.color,
        photoUrl: FAMILY_PHOTOS.movieNight,
      },
      {
        title: "Lucas's Piano Recital",
        description: "His first big performance! He played 'Für Elise' perfectly. So proud of his practice!",
        startTime: setMinutes(setHours(subDays(today, 7), 15), 0),
        endTime: setMinutes(setHours(subDays(today, 7), 16), 30),
        memberIds: [son.id, mom.id, dad.id, daughter.id],
        color: son.color,
        photoUrl: FAMILY_PHOTOS.pianoRecital,
      },
      {
        title: "Jenny Babysat - Anniversary Dinner",
        description: "Jenny took the kids to the park and made dinner. Kids loved it! We had a wonderful anniversary dinner.",
        startTime: setMinutes(setHours(subDays(today, 10), 17), 0),
        endTime: setMinutes(setHours(subDays(today, 10), 22), 0),
        memberIds: [babysitter.id, daughter.id, son.id],
        color: babysitter.color,
        photoUrl: null,
        completed: true,
      },

      // Today's events
      {
        title: "School Drop-off",
        description: "Emma has early math club, Lucas regular drop-off",
        startTime: setMinutes(setHours(today, 7), 30),
        endTime: setMinutes(setHours(today, 8), 15),
        memberIds: [mom.id, daughter.id, son.id],
        color: mom.color,
        photoUrl: null,
        completed: true,
      },
      {
        title: "Grocery Run",
        description: "Need items for Sunday dinner at Grandma Marilyn's",
        startTime: setMinutes(setHours(today, 10), 0),
        endTime: setMinutes(setHours(today, 11), 30),
        memberIds: [mom.id],
        color: mom.color,
        photoUrl: null,
      },
      {
        title: "Lucas Soccer Practice",
        description: "Don't forget shin guards! Coach mentioned early pickup today",
        startTime: setMinutes(setHours(today, 16), 0),
        endTime: setMinutes(setHours(today, 17), 30),
        memberIds: [son.id, dad.id],
        color: son.color,
        photoUrl: null,
      },

      // Upcoming events
      {
        title: "Emma's Dentist Checkup",
        description: "Regular 6-month cleaning at Dr. Chen's office",
        startTime: setMinutes(setHours(addDays(today, 1), 9), 0),
        endTime: setMinutes(setHours(addDays(today, 1), 10), 0),
        memberIds: [daughter.id, mom.id],
        color: daughter.color,
        photoUrl: null,
      },
      {
        title: "Parent-Teacher Conference",
        description: "Meeting with Lucas's teacher Mrs. Rodriguez about his reading progress",
        startTime: setMinutes(setHours(addDays(today, 2), 16), 0),
        endTime: setMinutes(setHours(addDays(today, 2), 17), 0),
        memberIds: [mom.id, dad.id],
        color: son.color,
        photoUrl: null,
      },
      {
        title: "Family Dinner at Grandma's",
        description: "Sunday dinner with Grandma Marilyn - bringing her favorite apple pie!",
        startTime: setMinutes(setHours(addDays(today, 3), 17), 0),
        endTime: setMinutes(setHours(addDays(today, 3), 20), 0),
        memberIds: [mom.id, dad.id, daughter.id, son.id],
        color: mom.color,
        photoUrl: FAMILY_PHOTOS.familyDinner,
      },
      {
        title: "Emma's Ballet Dress Rehearsal",
        description: "Spring recital is next week - full costume required",
        startTime: setMinutes(setHours(addDays(today, 4), 16), 0),
        endTime: setMinutes(setHours(addDays(today, 4), 18), 0),
        memberIds: [daughter.id, mom.id],
        color: daughter.color,
        photoUrl: null,
      },
      {
        title: "Date Night - Jenny Babysitting",
        description: "Jenny watching the kids! She'll do homework help and bedtime routine. Trying that new Italian place downtown.",
        startTime: setMinutes(setHours(addDays(today, 5), 18), 0),
        endTime: setMinutes(setHours(addDays(today, 5), 23), 0),
        memberIds: [mom.id, dad.id, babysitter.id, daughter.id, son.id],
        color: babysitter.color,
        photoUrl: null,
      },
      {
        title: "Lucas's Basketball Tournament",
        description: "All-day tournament at Riverside Community Center. Pack snacks!",
        startTime: setMinutes(setHours(addDays(today, 6), 9), 0),
        endTime: setMinutes(setHours(addDays(today, 6), 16), 0),
        memberIds: [son.id, dad.id, mom.id],
        color: son.color,
        photoUrl: null,
      },
      {
        title: "Beach Day Adventure",
        description: "End of school year celebration! Sunscreen, towels, and sandcastle supplies",
        startTime: setMinutes(setHours(addDays(today, 7), 10), 0),
        endTime: setMinutes(setHours(addDays(today, 7), 17), 0),
        memberIds: [mom.id, dad.id, daughter.id, son.id],
        color: dad.color,
        photoUrl: FAMILY_PHOTOS.beachDay,
      },
      {
        title: "Jenny - After School Pickup",
        description: "Jenny picking up both kids. Mom at work meeting. Snacks in pantry, homework before screen time!",
        startTime: setMinutes(setHours(addDays(today, 8), 15), 0),
        endTime: setMinutes(setHours(addDays(today, 8), 18), 0),
        memberIds: [babysitter.id, daughter.id, son.id],
        color: babysitter.color,
        photoUrl: null,
      },
    ];

    // Create all family events and store IDs for adding notes
    const createdFamilyEvents: Array<{ id: string; title: string }> = [];
    for (const event of familyEvents) {
      const created = await storage.createEvent(familyId, event);
      createdFamilyEvents.push({ id: created.id, title: created.title });
    }

    // Add demo notes to key family events
    const soccerEvent = createdFamilyEvents.find(e => e.title.includes("Soccer Championship"));
    const babysittingEvent = createdFamilyEvents.find(e => e.title.includes("Date Night"));
    const basketballEvent = createdFamilyEvents.find(e => e.title.includes("Basketball Tournament"));

    if (soccerEvent) {
      const note1 = await storage.createEventNote(familyId, {
        eventId: soccerEvent.id,
        authorUserId: userId,
        content: "Emma was amazing today! She was so calm under pressure. We should celebrate with her favorite dinner this weekend.",
        parentNoteId: null,
      });
      
      await storage.createEventNote(familyId, {
        eventId: soccerEvent.id,
        authorUserId: userId,
        content: "Coach mentioned she might be team captain next season!",
        parentNoteId: note1.id,
      });
    }

    if (babysittingEvent) {
      await storage.createEventNote(familyId, {
        eventId: babysittingEvent.id,
        authorUserId: userId,
        content: "Jenny, the kids can have one hour of screen time after homework is done. Lucas needs to practice spelling words before bed. Thank you!",
        parentNoteId: null,
      });
    }

    if (basketballEvent) {
      await storage.createEventNote(familyId, {
        eventId: basketballEvent.id,
        authorUserId: userId,
        content: "Don't forget to pack the cooler with sports drinks and snacks. We need to be there by 8:30am for warmups.",
        parentNoteId: null,
      });
    }

    // ============================================
    // FAMILY 2: "Mom's Care Calendar" - Eldercare
    // ============================================
    
    // Create a second family for managing aging parent's care
    const careFamily = await storage.createFamily(userId, {
      name: "Mom's Care Calendar",
      createdBy: userId,
    });
    const careFamilyId = careFamily.id;
    
    // Add family members and caregivers to Mom's Care Calendar
    await storage.addUserToFamily(davidId, careFamilyId, "member");
    await storage.addUserToFamily(mayaId, careFamilyId, "caregiver");

    // Family members in the care calendar
    const grandma = await storage.createFamilyMember(careFamilyId, {
      name: "Marilyn (Mom)",
      color: "#F59E0B", // Amber - the aging parent
      avatar: null,
    });

    const coordinator = await storage.createFamilyMember(careFamilyId, {
      name: "You (Sarah)",
      color: "#E879F9", // Purple - same as main calendar, shows continuity
      avatar: null,
    });

    const brother = await storage.createFamilyMember(careFamilyId, {
      name: "David (Brother)",
      color: "#34D399", // Green - sibling who helps coordinate
      avatar: null,
    });

    const nurseAide = await storage.createFamilyMember(careFamilyId, {
      name: "Maya (Home Aide)",
      color: "#EC4899", // Pink - regular home health aide
      avatar: null,
    });

    // Eldercare events - showing caregiver coordination
    const careEvents = [
      // Past events with memories
      {
        title: "Physical Therapy Session",
        description: "Great progress today! Mom walked 50 feet with the walker. Maya supervised the exercises.",
        startTime: setMinutes(setHours(subDays(today, 2), 10), 0),
        endTime: setMinutes(setHours(subDays(today, 2), 11), 0),
        memberIds: [grandma.id, nurseAide.id],
        color: nurseAide.color,
        photoUrl: CARE_PHOTOS.physicalTherapy,
        completed: true,
      },
      {
        title: "Cardiology Follow-up",
        description: "Dr. Patel is pleased with her heart rhythm. Medication is working well. Next checkup in 3 months.",
        startTime: setMinutes(setHours(subDays(today, 4), 14), 0),
        endTime: setMinutes(setHours(subDays(today, 4), 15), 30),
        memberIds: [grandma.id, coordinator.id],
        color: grandma.color,
        photoUrl: CARE_PHOTOS.doctorVisit,
        completed: true,
      },
      {
        title: "Grandkids Visit",
        description: "Emma and Lucas came to see Grandma! They played cards and she taught them to make cookies. Such precious memories.",
        startTime: setMinutes(setHours(subDays(today, 5), 15), 0),
        endTime: setMinutes(setHours(subDays(today, 5), 18), 0),
        memberIds: [grandma.id, coordinator.id],
        color: grandma.color,
        photoUrl: CARE_PHOTOS.familyVisit,
        completed: true,
      },

      // Today's care schedule
      {
        title: "Morning Medication",
        description: "Blood pressure meds, heart medication, and vitamin D. Take with breakfast.",
        startTime: setMinutes(setHours(today, 8), 0),
        endTime: setMinutes(setHours(today, 8), 30),
        memberIds: [grandma.id, nurseAide.id],
        color: nurseAide.color,
        photoUrl: null,
        completed: true,
      },
      {
        title: "Maya - Morning Care",
        description: "Help with bathing, breakfast prep, and light housekeeping. Check medication box is organized.",
        startTime: setMinutes(setHours(today, 9), 0),
        endTime: setMinutes(setHours(today, 12), 0),
        memberIds: [grandma.id, nurseAide.id],
        color: nurseAide.color,
        photoUrl: CARE_PHOTOS.nurseVisit,
      },
      {
        title: "Lunch + Afternoon Meds",
        description: "Light lunch, afternoon heart medication. Maya leaves at 12 - David checking in by phone at 2pm.",
        startTime: setMinutes(setHours(today, 12), 0),
        endTime: setMinutes(setHours(today, 13), 0),
        memberIds: [grandma.id],
        color: grandma.color,
        photoUrl: null,
      },
      {
        title: "David's Phone Check-in",
        description: "Brother calling to chat and make sure Mom is comfortable. She loves hearing about his garden!",
        startTime: setMinutes(setHours(today, 14), 0),
        endTime: setMinutes(setHours(today, 14), 30),
        memberIds: [grandma.id, brother.id],
        color: brother.color,
        photoUrl: null,
      },
      {
        title: "Evening Medication",
        description: "Evening heart meds and sleep aid. You'll stop by to help with dinner.",
        startTime: setMinutes(setHours(today, 18), 0),
        endTime: setMinutes(setHours(today, 19), 0),
        memberIds: [grandma.id, coordinator.id],
        color: coordinator.color,
        photoUrl: null,
      },

      // Upcoming care appointments
      {
        title: "Exercise Session with Maya",
        description: "Working on balance exercises and stair climbing. Goal: independent outdoor walking",
        startTime: setMinutes(setHours(addDays(today, 1), 10), 0),
        endTime: setMinutes(setHours(addDays(today, 1), 11), 0),
        memberIds: [grandma.id, nurseAide.id],
        color: nurseAide.color,
        photoUrl: null,
      },
      {
        title: "Maya - Morning Care",
        description: "Regular morning routine. Will prep meals for the next two days.",
        startTime: setMinutes(setHours(addDays(today, 1), 9), 0),
        endTime: setMinutes(setHours(addDays(today, 1), 12), 0),
        memberIds: [grandma.id, nurseAide.id],
        color: nurseAide.color,
        photoUrl: null,
      },
      {
        title: "Podiatrist Appointment",
        description: "Foot care checkup - important for diabetes management. David is driving.",
        startTime: setMinutes(setHours(addDays(today, 2), 11), 0),
        endTime: setMinutes(setHours(addDays(today, 2), 12), 0),
        memberIds: [grandma.id, brother.id],
        color: grandma.color,
        photoUrl: null,
      },
      {
        title: "Social Worker Visit - Helen",
        description: "Quarterly check-in to review care plan and discuss any additional support needs.",
        startTime: setMinutes(setHours(addDays(today, 3), 14), 0),
        endTime: setMinutes(setHours(addDays(today, 3), 15), 0),
        memberIds: [grandma.id, coordinator.id],
        color: coordinator.color,
        photoUrl: null,
      },
      {
        title: "Family Dinner at Mom's",
        description: "Everyone coming over! Kids excited to see Grandma. Bringing the apple pie she loves.",
        startTime: setMinutes(setHours(addDays(today, 3), 17), 0),
        endTime: setMinutes(setHours(addDays(today, 3), 20), 0),
        memberIds: [grandma.id, coordinator.id, brother.id],
        color: grandma.color,
        photoUrl: null,
      },
      {
        title: "Ophthalmologist - Glaucoma Check",
        description: "Annual eye exam. You're taking Mom. Bring current medication list.",
        startTime: setMinutes(setHours(addDays(today, 5), 9), 0),
        endTime: setMinutes(setHours(addDays(today, 5), 10), 30),
        memberIds: [grandma.id, coordinator.id],
        color: grandma.color,
        photoUrl: null,
      },
      {
        title: "Exercise Session with Maya",
        description: "Continuing balance work. If weather is nice, will practice outdoor walking.",
        startTime: setMinutes(setHours(addDays(today, 4), 10), 0),
        endTime: setMinutes(setHours(addDays(today, 4), 11), 0),
        memberIds: [grandma.id, nurseAide.id],
        color: nurseAide.color,
        photoUrl: null,
      },
      {
        title: "Pharmacy - Prescription Refills",
        description: "Pick up monthly medications. Blood pressure, heart meds, vitamin D, and sleep aid.",
        startTime: setMinutes(setHours(addDays(today, 6), 10), 0),
        endTime: setMinutes(setHours(addDays(today, 6), 10), 30),
        memberIds: [coordinator.id],
        color: coordinator.color,
        photoUrl: null,
      },
      {
        title: "Maya - Extended Care Day",
        description: "Maya staying longer so you can attend Lucas's tournament. Will handle all meals and meds.",
        startTime: setMinutes(setHours(addDays(today, 6), 8), 0),
        endTime: setMinutes(setHours(addDays(today, 6), 18), 0),
        memberIds: [grandma.id, nurseAide.id],
        color: nurseAide.color,
        photoUrl: null,
      },
    ];

    // Create all care events and store IDs for adding notes
    const createdCareEvents: Array<{ id: string; title: string }> = [];
    for (const event of careEvents) {
      const created = await storage.createEvent(careFamilyId, event);
      createdCareEvents.push({ id: created.id, title: created.title });
    }

    // Add demo notes to key care events - showing caregiver communication
    const ptEvent = createdCareEvents.find(e => e.title === "Physical Therapy Session");
    const medicationEvent = createdCareEvents.find(e => e.title === "Morning Medication");
    const extendedCareEvent = createdCareEvents.find(e => e.title === "Maya - Extended Care Day");

    if (ptEvent) {
      const ptNote1 = await storage.createEventNote(careFamilyId, {
        eventId: ptEvent.id,
        authorUserId: userId,
        content: "Maya mentioned Mom's balance has really improved! She's almost ready to try outdoor walking with supervision.",
        parentNoteId: null,
      });
      
      await storage.createEventNote(careFamilyId, {
        eventId: ptEvent.id,
        authorUserId: userId,
        content: "David, can you join the next session? Maya wants to show both of us the exercises we can help Mom with at home.",
        parentNoteId: ptNote1.id,
      });
    }

    if (medicationEvent) {
      await storage.createEventNote(careFamilyId, {
        eventId: medicationEvent.id,
        authorUserId: userId,
        content: "Maya, please make sure Mom takes the heart medication with food, not on an empty stomach. Dr. Patel emphasized this during the last visit.",
        parentNoteId: null,
      });
    }

    if (extendedCareEvent) {
      const careNote1 = await storage.createEventNote(careFamilyId, {
        eventId: extendedCareEvent.id,
        authorUserId: userId,
        content: "Maya, thank you so much for covering the extended hours! Lunch is prepped in the fridge. Mom likes her afternoon tea around 3pm.",
        parentNoteId: null,
      });
      
      await storage.createEventNote(careFamilyId, {
        eventId: extendedCareEvent.id,
        authorUserId: userId,
        content: "Also, Mom mentioned she'd like to call David around 2pm. His number is on the fridge. Thank you!",
        parentNoteId: careNote1.id,
      });
    }

    // ============================================
    // MEDICATIONS for Mom's Care Calendar
    // ============================================
    
    // Create medications for Marilyn (Mom)
    const medications = [
      {
        memberId: grandma.id,
        name: "Lisinopril",
        dosage: "10mg",
        frequency: "Once daily",
        scheduledTimes: ["08:00"],
        instructions: "Take with breakfast. Monitor blood pressure weekly.",
        isActive: true,
      },
      {
        memberId: grandma.id,
        name: "Metoprolol",
        dosage: "25mg",
        frequency: "Twice daily",
        scheduledTimes: ["08:00", "18:00"],
        instructions: "Heart medication - must take with food, not on empty stomach.",
        isActive: true,
      },
      {
        memberId: grandma.id,
        name: "Vitamin D3",
        dosage: "2000 IU",
        frequency: "Once daily",
        scheduledTimes: ["08:00"],
        instructions: "Take with breakfast for better absorption.",
        isActive: true,
      },
      {
        memberId: grandma.id,
        name: "Trazodone",
        dosage: "50mg",
        frequency: "As needed",
        scheduledTimes: ["21:00"],
        instructions: "Sleep aid - take 30 minutes before bed if having trouble sleeping.",
        isActive: true,
      },
      {
        memberId: grandma.id,
        name: "Baby Aspirin",
        dosage: "81mg",
        frequency: "Once daily",
        scheduledTimes: ["12:00"],
        instructions: "Take with lunch. Heart health maintenance.",
        isActive: true,
      },
    ];

    // Create all medications
    const createdMedications: Array<{ id: string; name: string }> = [];
    for (const med of medications) {
      const created = await storage.createMedication(careFamilyId, med);
      createdMedications.push({ id: created.id, name: created.name });
    }

    // Log some sample medication administrations for today's morning meds
    const morningMeds = createdMedications.filter(m => 
      m.name === "Lisinopril" || m.name === "Metoprolol" || m.name === "Vitamin D3"
    );
    
    for (const med of morningMeds) {
      await storage.createMedicationLog(careFamilyId, {
        medicationId: med.id,
        administeredBy: userId, // Demo user gave meds this morning
        scheduledTime: setMinutes(setHours(today, 8), 0),
        administeredAt: setMinutes(setHours(today, 8), 15), // Gave 15 min after scheduled
        status: "given",
        notes: med.name === "Metoprolol" ? "Given with oatmeal as instructed" : undefined,
      });
    }

    // ============================================
    // FAMILY MESSAGES - Impressive Threaded Conversations
    // ============================================

    // Helper to create timestamps at specific hours on specific days
    const msgTime = (daysAgo: number, hour: number, minute: number = 0) => 
      setMinutes(setHours(subDays(today, daysAgo), hour), minute);

    // ========================================
    // FAMILY 1: Your Family - Kids & Activities
    // Rich threaded conversations showing real family coordination
    // ========================================

    // THREAD 1: Emergency pickup coordination (5 days ago)
    // Sarah asks for help, Michael responds
    const f1_thread1_root = await storage.createFamilyMessage(familyId, {
      authorUserId: userId, // Sarah
      content: "Help! Just got called into an emergency meeting at 3pm. Can anyone grab the kids from school today?",
      createdAt: msgTime(5, 14, 12),
    });

    const f1_t1_reply1 = await storage.createFamilyMessage(familyId, {
      authorUserId: michaelId, // Michael responds
      content: "I'm wrapping up a client call but should be free by 3:15. I can head straight there!",
      createdAt: msgTime(5, 14, 18),
      parentMessageId: f1_thread1_root.id,
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: userId, // Sarah replies
      content: "You're a lifesaver! Emma has Math Club until 3:45 so just Lucas needs the early pickup. Emma can wait.",
      createdAt: msgTime(5, 14, 22),
      parentMessageId: f1_t1_reply1.id,
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: michaelId, // Michael updates
      content: "Got Lucas! We're getting frozen yogurt as a treat. I'll swing back for Emma at 3:45.",
      createdAt: msgTime(5, 15, 28),
      parentMessageId: f1_thread1_root.id,
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: userId, // Sarah thanks
      content: "Thank you SO much! Meeting ran until 4:30. You saved me today!",
      createdAt: msgTime(5, 16, 45),
      parentMessageId: f1_thread1_root.id,
    });

    // THREAD 2: Planning Lucas's birthday (3 days ago)
    // Family coordination with Jenny (babysitter) joining in
    const f1_thread2_root = await storage.createFamilyMessage(familyId, {
      authorUserId: userId, // Sarah starts planning
      content: "Lucas's birthday is coming up in 2 weeks! He wants a dinosaur-themed party. Should we do it at home or book a venue?",
      createdAt: msgTime(3, 20, 15),
    });

    const f1_t2_reply1 = await storage.createFamilyMessage(familyId, {
      authorUserId: michaelId, // Michael suggests
      content: "Home could work! The backyard is big enough for 10-12 kids. We could do a 'fossil dig' in the sandbox!",
      createdAt: msgTime(3, 20, 32),
      parentMessageId: f1_thread2_root.id,
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: userId, // Sarah loves it
      content: "I love the fossil dig idea! I can make dinosaur-shaped cookies. What about games?",
      createdAt: msgTime(3, 20, 45),
      parentMessageId: f1_t2_reply1.id,
    });

    const f1_t2_reply2 = await storage.createFamilyMessage(familyId, {
      authorUserId: michaelId, // Michael finds costumes
      content: "Found a party supply store that has inflatable T-Rex costumes for rent! The kids would go crazy!",
      createdAt: msgTime(3, 21, 5),
      parentMessageId: f1_thread2_root.id,
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: userId, // Sarah excited
      content: "OMG yes! Can you imagine Lucas's face? Let's book it. I'll handle the cake from that bakery he loves.",
      createdAt: msgTime(3, 21, 12),
      parentMessageId: f1_t2_reply2.id,
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: userId, // Sarah asks Jenny
      content: "Jenny, would you be available to help out at the party? We could really use an extra set of hands!",
      createdAt: msgTime(3, 21, 18),
      parentMessageId: f1_thread2_root.id,
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: jennyId, // Jenny (babysitter) responds
      content: "I'd love to help! I can run the fossil dig station and keep the little ones organized.",
      createdAt: msgTime(2, 9, 30),
      parentMessageId: f1_thread2_root.id,
    });

    // THREAD 3: Emma's school project (2 days ago)
    // Sarah and Michael coordinate on last-minute supplies
    const f1_thread3_root = await storage.createFamilyMessage(familyId, {
      authorUserId: userId, // Sarah announces
      content: "Emma just told me she has a solar system project due FRIDAY and needs supplies. Poster board, styrofoam balls, paint... Classic Emma timing!",
      createdAt: msgTime(2, 19, 0),
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: michaelId, // Michael offers help
      content: "I can stop by the craft store tomorrow morning before work. Text me the full list?",
      createdAt: msgTime(2, 19, 8),
      parentMessageId: f1_thread3_root.id,
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: userId, // Sarah sends list
      content: "Just sent it! Don't forget the glow-in-the-dark paint - apparently Saturn NEEDS to glow.",
      createdAt: msgTime(2, 19, 15),
      parentMessageId: f1_thread3_root.id,
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: michaelId, // Michael confirms
      content: "Got everything! They even had a solar system kit that comes with pre-sized planets. Emma is going to crush this project!",
      createdAt: msgTime(1, 10, 45),
      parentMessageId: f1_thread3_root.id,
    });

    // THREAD 4: Today's coordination
    // Sarah and Michael quick daily check-in
    const f1_thread4_root = await storage.createFamilyMessage(familyId, {
      authorUserId: userId, // Sarah
      content: "Quick check-in: Who has the kids this afternoon? My schedule is chaos.",
      createdAt: msgTime(0, 8, 30),
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: michaelId, // Michael
      content: "I've got Lucas's soccer practice covered. Picking him up at 3 and practice is until 5.",
      createdAt: msgTime(0, 8, 35),
      parentMessageId: f1_thread4_root.id,
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: userId, // Sarah
      content: "Perfect! I'll work from home so I can be here when Emma finishes her project. She said she just needs help with the Saturn rings.",
      createdAt: msgTime(0, 8, 42),
      parentMessageId: f1_thread4_root.id,
    });

    await storage.createFamilyMessage(familyId, {
      authorUserId: michaelId, // Michael
      content: "Team effort! Don't forget we're doing dinner at Grandma Marilyn's on Sunday - she's excited to see the kids.",
      createdAt: msgTime(0, 8, 50),
      parentMessageId: f1_thread4_root.id,
    });

    // ========================================
    // FAMILY 2: Mom's Care Calendar - Eldercare
    // Professional yet warm caregiving coordination
    // ========================================

    // THREAD 1: Sleep concerns - multi-day professional coordination (4 days ago)
    // Family and caregivers coordinating on Mom's sleep issues
    const c1_thread1_root = await storage.createFamilyMessage(careFamilyId, {
      authorUserId: userId, // Sarah (family)
      content: "Team update: Mom mentioned she's been having trouble sleeping again. She said she's been waking up around 2am and can't get back to sleep. Anyone else noticing changes in her energy levels?",
      createdAt: msgTime(4, 9, 0),
    });

    const c1_t1_reply1 = await storage.createFamilyMessage(careFamilyId, {
      authorUserId: mayaId, // Maya (Home Aide - caregiver)
      content: "I noticed that during yesterday's exercise session. She seemed more fatigued than usual by the end. Her balance was still good but I could tell she was working harder.",
      createdAt: msgTime(4, 10, 15),
      parentMessageId: c1_thread1_root.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: userId, // Sarah
      content: "Maya, that's really helpful context. I wonder if we should check if her evening medication timing is off.",
      createdAt: msgTime(4, 10, 30),
      parentMessageId: c1_t1_reply1.id,
    });

    const c1_t1_reply2 = await storage.createFamilyMessage(careFamilyId, {
      authorUserId: mayaId, // Maya (Nurse - caregiver)
      content: "I checked the med log - she's been taking the Trazodone consistently at 9pm. Maybe it's the timing? I've read it works better if taken 30-45 min before intended sleep.",
      createdAt: msgTime(4, 11, 0),
      parentMessageId: c1_thread1_root.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: userId, // Sarah
      content: "Great catch Maya! Let's try 9:30pm instead and see if that helps. I'll update the care notes.",
      createdAt: msgTime(4, 11, 15),
      parentMessageId: c1_t1_reply2.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: davidId, // David (brother - family)
      content: "I called to check on her last night around 8pm and she sounded more relaxed than usual. She said Maya made her favorite chamomile tea. Small things make such a difference!",
      createdAt: msgTime(3, 8, 30),
      parentMessageId: c1_thread1_root.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: mayaId, // Maya (Nurse - caregiver)
      content: "Update: Mom slept through the night last night! First time in a week. The adjusted timing seems to be working. I'll keep monitoring.",
      createdAt: msgTime(2, 7, 45),
      parentMessageId: c1_thread1_root.id,
    });

    // THREAD 2: Celebrating PT milestone (2 days ago)
    // Maya shares exciting news, everyone celebrates
    const c1_thread2_root = await storage.createFamilyMessage(careFamilyId, {
      authorUserId: mayaId, // Maya (Home Aide - caregiver)
      content: "Everyone! Huge milestone today - Marilyn walked to the mailbox and back completely independently! No walker, just me spotting her. She was SO proud of herself!",
      createdAt: msgTime(2, 15, 30),
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: userId, // Sarah (family)
      content: "That's AMAZING! All those balance exercises are paying off. I'm so proud of her dedication.",
      createdAt: msgTime(2, 15, 45),
      parentMessageId: c1_thread2_root.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: mayaId, // Maya (Nurse - caregiver)
      content: "Way to go Marilyn! I'm bringing extra flowers this weekend to celebrate. She's worked so hard for this!",
      createdAt: msgTime(2, 16, 0),
      parentMessageId: c1_thread2_root.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: mayaId, // Maya (Home Aide - caregiver)
      content: "She told me she wants to walk to the garden next. Small goals leading to big victories! This team effort is really making a difference.",
      createdAt: msgTime(2, 16, 20),
      parentMessageId: c1_thread2_root.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: davidId, // David (brother - family)
      content: "I showed her the messages and she got a little teary. She said 'I have the best team.' We really do work well together!",
      createdAt: msgTime(2, 18, 0),
      parentMessageId: c1_thread2_root.id,
    });

    // THREAD 3: Upcoming cardiology appointment coordination (yesterday)
    // Family coordinates with caregivers for upcoming doctor visit
    const c1_thread3_root = await storage.createFamilyMessage(careFamilyId, {
      authorUserId: userId, // Sarah (family)
      content: "Reminder: Mom's cardiologist appointment is Thursday at 2pm with Dr. Patel. Who can take her? I have a work conflict I can't move.",
      createdAt: msgTime(1, 9, 0),
    });

    const c1_t3_reply1 = await storage.createFamilyMessage(careFamilyId, {
      authorUserId: davidId, // David (brother - family)
      content: "I can take her! I'll pick her up at 1:15 to give us plenty of time. Should I bring the blood pressure log from the past month?",
      createdAt: msgTime(1, 9, 30),
      parentMessageId: c1_thread3_root.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: mayaId, // Maya (Nurse - caregiver)
      content: "Yes please! I've been tracking it on the fridge chart. There's also a list of questions I wanted to ask - it's in the blue folder on her kitchen table.",
      createdAt: msgTime(1, 9, 45),
      parentMessageId: c1_t3_reply1.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: mayaId, // Maya (Home Aide - caregiver)
      content: "I'll compile my care notes too. Dr. Patel should know about her improved mobility - it might affect her medication needs.",
      createdAt: msgTime(1, 10, 15),
      parentMessageId: c1_thread3_root.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: userId, // Sarah (family)
      content: "This is why I love this group - we come prepared! David, can you send a quick summary after the appointment? I'll be in meetings but want to know how it goes.",
      createdAt: msgTime(1, 10, 30),
      parentMessageId: c1_thread3_root.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: davidId, // David (brother - family)
      content: "Absolutely! I'll do a full recap. Also planning to take her to her favorite café after for a treat. She's been talking about their apple strudel all week!",
      createdAt: msgTime(1, 10, 45),
      parentMessageId: c1_thread3_root.id,
    });

    // THREAD 4: Today - Weekend planning and family visit
    // Family and caregivers coordinate on upcoming family dinner
    const c1_thread4_root = await storage.createFamilyMessage(careFamilyId, {
      authorUserId: userId, // Sarah (family)
      content: "Sunday family dinner planning! The grandkids are SO excited to see Marilyn. What should I bring? I'm thinking her favorite apple pie plus something for the kids.",
      createdAt: msgTime(0, 8, 0),
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: davidId, // David (brother - family)
      content: "Apple pie is perfect! Mom's been asking about Emma's solar system project - maybe she could bring it to show Grandma?",
      createdAt: msgTime(0, 8, 15),
      parentMessageId: c1_thread4_root.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: userId, // Sarah (family)
      content: "Great idea! Emma would love that. Lucas wants to play cards with Grandma again - she taught him Go Fish last time and he's been practicing!",
      createdAt: msgTime(0, 8, 25),
      parentMessageId: c1_thread4_root.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: mayaId, // Maya (Nurse - caregiver)
      content: "I'll make sure Marilyn is well-rested on Sunday morning. These family visits really lift her spirits - she talks about them all week!",
      createdAt: msgTime(0, 9, 0),
      parentMessageId: c1_thread4_root.id,
    });

    await storage.createFamilyMessage(careFamilyId, {
      authorUserId: userId, // Sarah (family)
      content: "This is what it's all about. Three generations together, good food, and lots of love. Can't wait!",
      createdAt: msgTime(0, 9, 15),
      parentMessageId: c1_thread4_root.id,
    });

    console.log(`Demo account seeded:`);
    console.log(`   Your Family: ${familyEvents.length} events, 5 members (including babysitter)`);
    console.log(`   Mom's Care Calendar: ${careEvents.length} events, 5 members (with caregivers)`);
    console.log(`   Medications: ${medications.length} meds tracked for Marilyn`);
    console.log(`   Family Messages: 37 threaded messages across 8 conversation threads`);
    console.log(`   Total: ${familyEvents.length + careEvents.length} events showing sandwich generation life`);
    
  } catch (error) {
    console.error("Error seeding demo account:", error);
    throw error;
  }
}
