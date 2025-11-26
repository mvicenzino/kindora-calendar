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
    // FAMILY 1: "Your Family" - Kids & Activities
    // ============================================
    const familyId = families[0].id;

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
        description: "Need items for Sunday dinner at Grandma Dorothy's",
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
        description: "Sunday dinner with Grandma Dorothy - bringing her favorite apple pie!",
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

    // Family members in the care calendar
    const grandma = await storage.createFamilyMember(careFamilyId, {
      name: "Dorothy (Mom)",
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
      name: "Maria (Home Aide)",
      color: "#EC4899", // Pink - regular home health aide
      avatar: null,
    });

    const physicalTherapist = await storage.createFamilyMember(careFamilyId, {
      name: "James (PT)",
      color: "#8B5CF6", // Purple - physical therapist
      avatar: null,
    });

    // Eldercare events - showing caregiver coordination
    const careEvents = [
      // Past events with memories
      {
        title: "Physical Therapy Session",
        description: "Great progress today! Mom walked 50 feet with the walker. James said her strength is improving.",
        startTime: setMinutes(setHours(subDays(today, 2), 10), 0),
        endTime: setMinutes(setHours(subDays(today, 2), 11), 0),
        memberIds: [grandma.id, physicalTherapist.id],
        color: physicalTherapist.color,
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
        title: "Maria - Morning Care",
        description: "Help with bathing, breakfast prep, and light housekeeping. Check medication box is organized.",
        startTime: setMinutes(setHours(today, 9), 0),
        endTime: setMinutes(setHours(today, 12), 0),
        memberIds: [grandma.id, nurseAide.id],
        color: nurseAide.color,
        photoUrl: CARE_PHOTOS.nurseVisit,
      },
      {
        title: "Lunch + Afternoon Meds",
        description: "Light lunch, afternoon heart medication. Maria leaves at 12 - David checking in by phone at 2pm.",
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
        title: "Physical Therapy - James",
        description: "Working on balance exercises and stair climbing. Goal: independent outdoor walking",
        startTime: setMinutes(setHours(addDays(today, 1), 10), 0),
        endTime: setMinutes(setHours(addDays(today, 1), 11), 0),
        memberIds: [grandma.id, physicalTherapist.id],
        color: physicalTherapist.color,
        photoUrl: null,
      },
      {
        title: "Maria - Morning Care",
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
        title: "Physical Therapy - James",
        description: "Continuing balance work. If weather is nice, will practice outdoor walking.",
        startTime: setMinutes(setHours(addDays(today, 4), 10), 0),
        endTime: setMinutes(setHours(addDays(today, 4), 11), 0),
        memberIds: [grandma.id, physicalTherapist.id],
        color: physicalTherapist.color,
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
        title: "Maria - Extended Care Day",
        description: "Maria staying longer so you can attend Lucas's tournament. Will handle all meals and meds.",
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
    const extendedCareEvent = createdCareEvents.find(e => e.title === "Maria - Extended Care Day");

    if (ptEvent) {
      const ptNote1 = await storage.createEventNote(careFamilyId, {
        eventId: ptEvent.id,
        authorUserId: userId,
        content: "James mentioned Mom's balance has really improved! She's almost ready to try outdoor walking with supervision.",
        parentNoteId: null,
      });
      
      await storage.createEventNote(careFamilyId, {
        eventId: ptEvent.id,
        authorUserId: userId,
        content: "David, can you join the next session? James wants to show both of us the exercises we can help Mom with at home.",
        parentNoteId: ptNote1.id,
      });
    }

    if (medicationEvent) {
      await storage.createEventNote(careFamilyId, {
        eventId: medicationEvent.id,
        authorUserId: userId,
        content: "Maria, please make sure Mom takes the heart medication with food, not on an empty stomach. Dr. Patel emphasized this during the last visit.",
        parentNoteId: null,
      });
    }

    if (extendedCareEvent) {
      const careNote1 = await storage.createEventNote(careFamilyId, {
        eventId: extendedCareEvent.id,
        authorUserId: userId,
        content: "Maria, thank you so much for covering the extended hours! Lunch is prepped in the fridge. Mom likes her afternoon tea around 3pm.",
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
    
    // Create medications for Dorothy (Mom)
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
    // FAMILY MESSAGES for both calendars
    // ============================================

    // Family 1: Your Family messages - casual family coordination
    const familyMessageSeed = [
      {
        authorUserId: userId,
        content: "Don't forget - Emma has soccer practice at 3pm today! Can someone pick her up after?",
        createdAt: subDays(today, 2),
      },
      {
        authorUserId: userId,
        content: "I can pick her up! I'll be done with work by 4:30.",
        createdAt: subDays(today, 2),
        parentMessageId: null,
      },
      {
        authorUserId: userId,
        content: "Perfect, thanks! I'll handle Lucas's piano lesson then.",
        createdAt: subDays(today, 2),
      },
      {
        authorUserId: userId,
        content: "Reminder: Family movie night this Friday! Kids can each pick one movie option for voting.",
        createdAt: subDays(today, 1),
      },
      {
        authorUserId: userId,
        content: "Lucas wants to watch the new animated space movie. Emma says she wants a mystery!",
        createdAt: subDays(today, 1),
      },
      {
        authorUserId: userId,
        content: "How about we do space movie first, then mystery next week? Compromise!",
        createdAt: subDays(today, 1),
      },
    ];

    for (const msg of familyMessageSeed) {
      await storage.createFamilyMessage(familyId, msg);
    }

    // Family 2: Mom's Care Calendar messages - care coordination
    const careMessageSeed = [
      {
        authorUserId: userId,
        content: "Hi everyone! Just a heads up - Mom mentioned she's been having some trouble sleeping. Maria, could you keep an eye on her energy levels during your visit tomorrow?",
        createdAt: subDays(today, 3),
      },
      {
        authorUserId: userId,
        content: "Will do! I noticed she was a bit tired during PT yesterday. I'll check if she's been taking her Trazodone properly.",
        createdAt: subDays(today, 3),
      },
      {
        authorUserId: userId,
        content: "Thanks Maria! Dr. Johnson said we can adjust the sleep medication if needed at the next appointment.",
        createdAt: subDays(today, 2),
      },
      {
        authorUserId: userId,
        content: "Update: Mom seemed much more energetic today! She even wanted to go for a short walk in the garden. I think the new routine is helping.",
        createdAt: subDays(today, 1),
      },
      {
        authorUserId: userId,
        content: "That's wonderful news! I'll bring her favorite flowers when I visit this weekend.",
        createdAt: subDays(today, 1),
      },
      {
        authorUserId: userId,
        content: "Just a reminder - Mom has her cardiologist appointment Thursday at 2pm. Who can take her? I'm stuck at work.",
        createdAt: today,
      },
      {
        authorUserId: userId,
        content: "I can take her! I'll pick her up at 1:30 to give us plenty of time.",
        createdAt: today,
      },
    ];

    for (const msg of careMessageSeed) {
      await storage.createFamilyMessage(careFamilyId, msg);
    }

    console.log(`Demo account seeded:`);
    console.log(`   Your Family: ${familyEvents.length} events, 5 members (including babysitter)`);
    console.log(`   Mom's Care Calendar: ${careEvents.length} events, 5 members (with caregivers)`);
    console.log(`   Medications: ${medications.length} meds tracked for Dorothy`);
    console.log(`   Family Messages: ${familyMessageSeed.length + careMessageSeed.length} messages for coordination`);
    console.log(`   Total: ${familyEvents.length + careEvents.length} events showing sandwich generation life`);
    
  } catch (error) {
    console.error("Error seeding demo account:", error);
    throw error;
  }
}
