import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFamilyMemberSchema, insertEventSchema, insertMessageSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Family Members Routes
  app.get("/api/family-members", async (_req, res) => {
    try {
      const members = await storage.getFamilyMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching family members:", error);
      res.status(500).json({ error: "Failed to fetch family members" });
    }
  });

  app.post("/api/family-members", async (req, res) => {
    try {
      const result = insertFamilyMemberSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const member = await storage.createFamilyMember(result.data);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error creating family member:", error);
      res.status(500).json({ error: "Failed to create family member" });
    }
  });

  app.delete("/api/family-members/:id", async (req, res) => {
    try {
      await storage.deleteFamilyMember(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting family member:", error);
      res.status(500).json({ error: "Failed to delete family member" });
    }
  });

  // Events Routes
  app.get("/api/events", async (_req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const result = insertEventSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      let eventData = result.data;
      if (eventData.photoUrl) {
        const objectStorageService = new ObjectStorageService();
        eventData = {
          ...eventData,
          photoUrl: objectStorageService.normalizeObjectEntityPath(eventData.photoUrl),
        };
      }
      
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.put("/api/events/:id", async (req, res) => {
    try {
      const result = insertEventSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      let eventData = result.data;
      if (eventData.photoUrl) {
        const objectStorageService = new ObjectStorageService();
        eventData = {
          ...eventData,
          photoUrl: objectStorageService.normalizeObjectEntityPath(eventData.photoUrl),
        };
      }
      
      const event = await storage.updateEvent(req.params.id, eventData);
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  app.put("/api/events/:id/complete", async (req, res) => {
    try {
      const events = await storage.getEvents();
      const event = events.find(e => e.id === req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const updatedEvent = await storage.updateEvent(req.params.id, { 
        completed: !event.completed 
      });
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error toggling event completion:", error);
      res.status(500).json({ error: "Failed to toggle event completion" });
    }
  });

  // Messages Routes
  app.get("/api/messages", async (_req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const result = insertMessageSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const message = await storage.createMessage(result.data);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Object Storage Routes - Public file uploading
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/event-photos", async (req, res) => {
    if (!req.body.eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    try {
      let objectPath = null;
      
      if (req.body.photoUrl) {
        const objectStorageService = new ObjectStorageService();
        objectPath = objectStorageService.normalizeObjectEntityPath(
          req.body.photoUrl,
        );
      }

      const event = await storage.updateEvent(req.body.eventId, { photoUrl: objectPath });
      res.status(200).json(event);
    } catch (error) {
      console.error("Error setting event photo:", error);
      res.status(500).json({ error: "Failed to set event photo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
