import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, NotFoundError } from "./storage";
import { insertFamilyMemberSchema, insertEventSchema, insertMessageSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth user endpoint
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user || null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Family Routes (protected)
  app.get("/api/family", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const family = await storage.getUserFamily(userId);
      res.json(family || null);
    } catch (error) {
      console.error("Error fetching family:", error);
      res.status(500).json({ error: "Failed to fetch family" });
    }
  });

  app.post("/api/family/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { inviteCode } = req.body;
      
      if (!inviteCode || typeof inviteCode !== 'string') {
        return res.status(400).json({ error: "Invite code is required" });
      }
      
      const membership = await storage.joinFamily(userId, inviteCode.toUpperCase());
      const family = await storage.getUserFamily(userId);
      res.json(family);
    } catch (error: any) {
      if (error instanceof NotFoundError || error.message?.includes("not found")) {
        return res.status(404).json({ error: "Invalid invite code" });
      }
      console.error("Error joining family:", error);
      res.status(500).json({ error: "Failed to join family" });
    }
  });

  app.post("/api/family/send-invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email } = req.body;
      
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: "Valid email address is required" });
      }
      
      const family = await storage.getUserFamily(userId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }

      // Get the app URL
      const appUrl = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : req.headers.origin || 'http://localhost:5000';

      const joinUrl = `${appUrl}/#/family-settings`;
      const subject = `Join ${family.name} on Kindora Family Calendar`;
      
      // Check email service configuration
      const resendApiKey = process.env.RESEND_API_KEY;
      const sendgridApiKey = process.env.SENDGRID_API_KEY;
      
      // Validate configuration based on selected provider
      if (resendApiKey && !process.env.EMAIL_FROM_ADDRESS) {
        return res.status(400).json({ 
          error: "EMAIL_FROM_ADDRESS is required when using Resend. Set it to an email from your verified domain (e.g., 'invites@yourdomain.com'). Resend does not support Gmail or unverified domains.",
          provider: "resend",
          setup: "Go to Replit Secrets and add EMAIL_FROM_ADDRESS with a verified domain email"
        });
      }
      
      const fromEmail = process.env.EMAIL_FROM_ADDRESS || "mvicenzino@gmail.com";
      
      // HTML email template
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
              line-height: 1.6; 
              color: #1a1a1a; 
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 20px auto; 
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 30px 30px; 
              text-align: center;
            }
            .header h1 { 
              margin: 0 0 8px 0; 
              font-size: 26px; 
              font-weight: 600;
            }
            .header p { 
              margin: 0; 
              font-size: 15px; 
              opacity: 0.95;
            }
            .content { 
              padding: 30px 30px;
              background: white;
            }
            .greeting { 
              font-size: 17px; 
              color: #1a1a1a; 
              margin: 0 0 15px 0;
            }
            .message { 
              color: #4a4a4a; 
              margin: 0 0 20px 0; 
              font-size: 15px;
            }
            .invite-code { 
              background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%); 
              border: 2px solid #667eea; 
              padding: 24px; 
              text-align: center; 
              margin: 20px 0; 
              border-radius: 12px;
            }
            .code-label { 
              margin: 0 0 12px 0; 
              font-size: 13px; 
              color: #667eea; 
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .code { 
              font-size: 32px; 
              font-weight: 700; 
              letter-spacing: 6px; 
              color: #667eea; 
              font-family: 'Courier New', monospace;
              margin: 0;
            }
            .button { 
              display: inline-block; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white !important; 
              padding: 14px 36px; 
              text-decoration: none; 
              border-radius: 8px; 
              margin: 20px 0 0 0; 
              font-weight: 600;
              font-size: 15px;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }
            .button:hover { 
              box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
            }
            .steps { 
              background: #fafbff; 
              padding: 24px; 
              border-radius: 12px; 
              margin: 20px 0;
              border: 1px solid #e8ecf4;
            }
            .steps h3 { 
              margin: 0 0 16px 0; 
              color: #1a1a1a; 
              font-size: 17px;
              font-weight: 600;
            }
            .step { 
              margin: 14px 0; 
              padding-left: 35px; 
              position: relative;
              color: #4a4a4a;
              font-size: 14px;
              line-height: 1.5;
            }
            .step-number { 
              position: absolute; 
              left: 0;
              top: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              width: 24px; 
              height: 24px; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 13px; 
              font-weight: 600;
              line-height: 1;
            }
            .footer { 
              background: #fafbff; 
              padding: 20px 30px; 
              text-align: center;
              border-top: 1px solid #e8ecf4;
            }
            .footer-link { 
              color: #667eea !important; 
              text-decoration: none; 
              font-size: 14px;
              word-break: break-all;
            }
            .footer-text { 
              color: #888; 
              font-size: 13px; 
              margin: 10px 0 0 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🗓️ Kindora Family Calendar</h1>
              <p>You've been invited to join a shared family calendar!</p>
            </div>
            <div class="content">
              <p class="greeting">Hi there!</p>
              <p class="message"><strong>${family.name}</strong> has invited you to join their family calendar on Kindora. Share events, memories, and stay connected with your loved ones.</p>
              
              <div class="invite-code">
                <p class="code-label">Your Invite Code</p>
                <p class="code">${family.inviteCode}</p>
              </div>

              <div class="steps">
                <h3>How to Join:</h3>
                <div class="step">
                  <span class="step-number">1</span>
                  Click the button below to visit Kindora Family Calendar
                </div>
                <div class="step">
                  <span class="step-number">2</span>
                  Sign in or create an account
                </div>
                <div class="step">
                  <span class="step-number">3</span>
                  Go to Family Settings and enter code: <strong>${family.inviteCode}</strong>
                </div>
                <div class="step">
                  <span class="step-number">4</span>
                  Start sharing events and memories!
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${joinUrl}" class="button">Join ${family.name}'s Calendar</a>
              </div>
            </div>
            <div class="footer">
              <a href="${joinUrl}" class="footer-link">${joinUrl}</a>
              <p class="footer-text">This invitation was sent from Kindora Family Calendar</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textBody = `
You've been invited to join ${family.name} on Kindora Family Calendar!

Your Invite Code: ${family.inviteCode}

How to Join:
1. Visit: ${joinUrl}
2. Sign in or create an account
3. Go to Family Settings
4. Enter your invite code: ${family.inviteCode}
5. Start sharing events and memories!

Visit Kindora Family Calendar: ${joinUrl}
      `.trim();

      if (resendApiKey) {
        // Send with Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: email,
            subject: subject,
            html: htmlBody,
            text: textBody
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorDetails;
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = { message: errorText };
          }
          
          console.error('Resend API error:', response.status, errorDetails);
          
          // Provide helpful error messages based on Resend's response
          if (response.status === 403) {
            // Test sender restriction
            return res.status(400).json({
              error: "Test sender restriction: You can only send emails to mvicenzino@gmail.com",
              details: "The test sender (onboarding@resend.dev) only allows sending to your verified email. To send to others, verify your own domain in Resend.",
              provider: "resend",
              fix: "Either: 1) Send test emails to mvicenzino@gmail.com, OR 2) Verify your domain at resend.com/domains and update EMAIL_FROM_ADDRESS"
            });
          }
          
          if (response.status === 422) {
            return res.status(400).json({
              error: "Email sending failed: Invalid sender email or unverified domain",
              details: errorDetails.message || "The sender email must be from a domain verified in your Resend account",
              provider: "resend",
              fix: `Verify your domain in Resend, then set EMAIL_FROM_ADDRESS to an email from that domain (e.g., invites@yourdomain.com)`
            });
          }
          
          return res.status(500).json({
            error: "Failed to send email via Resend",
            details: errorDetails.message || errorText,
            provider: "resend"
          });
        }

        const result = await response.json();
        console.log('Email sent via Resend:', result);
        
        return res.json({ 
          success: true,
          message: "Invitation email sent successfully",
          provider: "resend"
        });
      } else if (sendgridApiKey) {
        // Send with SendGrid
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: fromEmail },
            subject: subject,
            content: [
              { type: 'text/plain', value: textBody },
              { type: 'text/html', value: htmlBody }
            ]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorDetails;
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = { message: errorText };
          }
          
          console.error('SendGrid API error:', response.status, errorDetails);
          
          // Provide specific error guidance based on SendGrid's response
          const errorMessage = errorDetails.errors?.[0]?.message || errorDetails.message || errorText;
          
          if (response.status === 400 || response.status === 403) {
            return res.status(400).json({
              error: "Email sending failed: Sender verification or permission issue",
              details: errorMessage,
              provider: "sendgrid",
              fix: "1. Verify your sender email (mvicenzino@gmail.com) in SendGrid dashboard. 2. Check that your API key has 'Mail Send' permissions."
            });
          }
          
          return res.status(500).json({
            error: "Failed to send email via SendGrid",
            details: errorMessage,
            provider: "sendgrid",
            fix: "Check SendGrid dashboard for sender verification and API key status"
          });
        }

        console.log('Email sent via SendGrid');
        
        return res.json({ 
          success: true,
          message: "Invitation email sent successfully",
          provider: "sendgrid"
        });
      } else {
        // No email service configured
        console.log('Email would be sent:', { to: email, from: fromEmail, subject, joinUrl, inviteCode: family.inviteCode });
        
        return res.status(501).json({ 
          error: "Email service not configured. Set RESEND_API_KEY or SENDGRID_API_KEY, and optionally EMAIL_FROM_ADDRESS (required for Resend - must be a verified domain like 'invites@yourdomain.com').",
          details: {
            to: email,
            from: fromEmail,
            inviteCode: family.inviteCode,
            joinUrl: joinUrl,
            note: "For Resend: EMAIL_FROM_ADDRESS must be from a verified domain. For SendGrid: any email works if verified in SendGrid."
          }
        });
      }
    } catch (error: any) {
      console.error("Error sending invite:", error);
      res.status(500).json({ error: error.message || "Failed to send invitation" });
    }
  });

  // Family Members Routes (protected)
  app.get("/api/family-members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const members = await storage.getFamilyMembers(userId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch family members" });
    }
  });

  app.post("/api/family-members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = insertFamilyMemberSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const member = await storage.createFamilyMember(userId, result.data);
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to create family member" });
    }
  });

  app.put("/api/family-members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = insertFamilyMemberSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const member = await storage.updateFamilyMember(req.params.id, userId, result.data);
      res.json(member);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to update family member" });
    }
  });

  app.delete("/api/family-members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteFamilyMember(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to delete family member" });
    }
  });

  // Events Routes (protected)
  app.get("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getEvents(userId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = insertEventSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const event = await storage.createEvent(userId, result.data);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event", details: String(error) });
    }
  });

  app.put("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = insertEventSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const event = await storage.updateEvent(req.params.id, userId, result.data);
      res.json(event);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      console.error("Error updating event:", error);
      res.status(500).json({ error: "Failed to update event", details: String(error) });
    }
  });

  app.delete("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteEvent(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  app.post("/api/events/:id/toggle-completion", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const event = await storage.toggleEventCompletion(req.params.id, userId);
      res.json(event);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to toggle event completion" });
    }
  });

  // Messages Routes (protected)
  app.get("/api/events/:eventId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await storage.getMessages(req.params.eventId, userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/events/:eventId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messageData = {
        ...req.body,
        eventId: req.params.eventId,
      };
      
      const result = insertMessageSchema.safeParse(messageData);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const message = await storage.createMessage(userId, result.data);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  app.delete("/api/messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteMessage(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Object Storage Routes
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/events/:id/photo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Allow null to delete photo
      if (req.body.photoURL === null) {
        const event = await storage.updateEvent(req.params.id, userId, { photoUrl: null });
        return res.json(event);
      }

      if (!req.body.photoURL) {
        return res.status(400).json({ error: "photoURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.photoURL);
      
      const event = await storage.updateEvent(req.params.id, userId, { photoUrl: objectPath });
      res.json(event);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      console.error("Error setting event photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
