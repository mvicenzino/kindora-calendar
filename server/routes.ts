import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, NotFoundError } from "./storage";
import { insertFamilyMemberSchema, insertEventSchema, insertMessageSchema, insertEventNoteSchema, insertMedicationSchema, insertMedicationLogSchema, insertFamilyMessageSchema, insertCaregiverTimeEntrySchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getUserFamilyRole, PermissionError, hasPermission } from "./permissions";
import type { FamilyRole } from "@shared/schema";
import { generateWeeklySummaryHtml, generateWeeklySummaryText, sendWeeklySummaryEmail } from "./emailService";
import { startOfWeek, endOfWeek, format } from "date-fns";

// Helper function to get familyId from request or fallback to user's first family
async function getFamilyId(req: any, userId: string): Promise<string | null> {
  // Try to get from query parameter (GET requests)
  let familyId: string | null | undefined = req.query.familyId as string | undefined;
  
  // Try to get from request body (POST/PATCH/DELETE requests)
  if (!familyId && req.body && req.body.familyId) {
    familyId = req.body.familyId as string;
  }
  
  // Fallback to user's first family if not provided
  if (!familyId) {
    const family = await storage.getUserFamily(userId);
    familyId = family?.id ?? null;
  }
  
  return familyId ?? null;
}

// Helper function to calculate next occurrence date based on recurrence rule
function getNextDate(currentDate: Date, rule: string): Date {
  const next = new Date(currentDate);
  switch (rule) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

// Helper function to create recurring events
async function createRecurringEvents(
  storageInstance: typeof storage, 
  familyId: string, 
  eventData: any
): Promise<any[]> {
  const createdEvents: any[] = [];
  const { recurrenceRule, recurrenceEndDate, recurrenceCount, ...baseEventData } = eventData;
  
  // Guard: if no valid recurrence rule, just create a single event
  if (!recurrenceRule || typeof recurrenceRule !== 'string') {
    const event = await storageInstance.createEvent(familyId, baseEventData);
    return [event];
  }
  
  // Validate count if provided
  const parsedCount = recurrenceCount ? parseInt(recurrenceCount, 10) : null;
  if (parsedCount !== null && (isNaN(parsedCount) || parsedCount < 2)) {
    throw new Error("Recurrence count must be at least 2");
  }
  
  // Determine limits based on end condition
  const hasCount = parsedCount !== null;
  const hasEndDate = recurrenceEndDate !== null && recurrenceEndDate !== undefined;
  const maxYearsAhead = 2;
  const absoluteMaxDate = new Date(new Date().setFullYear(new Date().getFullYear() + maxYearsAhead));
  const endDateLimit = hasEndDate ? new Date(recurrenceEndDate) : absoluteMaxDate;
  
  // Max occurrences: use count if specified, otherwise use a high number for date-limited or default
  const maxIterations = hasCount ? parsedCount : 500; // 500 is safety cap for date-limited
  
  // Create the first event with all recurrence metadata
  const firstEvent = await storageInstance.createEvent(familyId, {
    ...baseEventData,
    recurrenceRule,
    recurrenceEndDate: recurrenceEndDate || null,
    recurrenceCount: recurrenceCount || null,
  });
  
  // Update the first event to set its own recurringEventId while preserving all recurrence metadata
  await storageInstance.updateEvent(firstEvent.id, familyId, {
    recurringEventId: firstEvent.id,
    recurrenceRule: recurrenceRule as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly',
    recurrenceEndDate: recurrenceEndDate || null,
    recurrenceCount: recurrenceCount || null,
  });
  firstEvent.recurringEventId = firstEvent.id;
  createdEvents.push(firstEvent);
  
  // Use persisted firstEvent timestamps to ensure storage-normalized times are used
  let currentStartTime = new Date(firstEvent.startTime);
  let currentEndTime = new Date(firstEvent.endTime);
  const duration = currentEndTime.getTime() - currentStartTime.getTime();
  
  for (let i = 1; i < maxIterations; i++) {
    currentStartTime = getNextDate(currentStartTime, recurrenceRule);
    currentEndTime = new Date(currentStartTime.getTime() + duration);
    
    // Check end date limit BEFORE creating the event (use >= to honor "end on date" precisely)
    if (hasEndDate && currentStartTime >= endDateLimit) {
      break;
    }
    
    // Enforce absolute max date to prevent runaway generation
    if (currentStartTime > absoluteMaxDate) {
      break;
    }
    
    const recurringEvent = await storageInstance.createEvent(familyId, {
      ...baseEventData,
      startTime: currentStartTime,
      endTime: currentEndTime,
      recurrenceRule,
      recurrenceEndDate: recurrenceEndDate || null,
      recurrenceCount: recurrenceCount || null,
      recurringEventId: firstEvent.id, // Link to first event in series
    });
    createdEvents.push(recurringEvent);
  }
  
  return createdEvents;
}

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

  // Get all families user belongs to
  app.get("/api/families", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const families = await storage.getUserFamilies(userId);
      res.json(families);
    } catch (error) {
      console.error("Error fetching families:", error);
      res.status(500).json({ error: "Failed to fetch families" });
    }
  });

  // Get specific family by ID
  app.get("/api/family/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = req.params.id;
      
      // Verify user is a member of this family
      const userFamilies = await storage.getUserFamilies(userId);
      const isMember = userFamilies.some(f => f.id === familyId);
      
      if (!isMember) {
        return res.status(403).json({ error: "Access denied to this family" });
      }
      
      const family = await storage.getFamilyById(familyId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }
      
      res.json(family);
    } catch (error) {
      console.error("Error fetching family by ID:", error);
      res.status(500).json({ error: "Failed to fetch family" });
    }
  });

  app.post("/api/family/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { inviteCode, role } = req.body;
      
      if (!inviteCode || typeof inviteCode !== 'string') {
        return res.status(400).json({ error: "Invite code is required" });
      }
      
      let actualInviteCode = inviteCode.toUpperCase();
      let memberRole = role || 'member';
      
      // Handle caregiver codes (ending with -CG)
      if (actualInviteCode.endsWith('-CG')) {
        actualInviteCode = actualInviteCode.slice(0, -3); // Remove -CG suffix
        memberRole = 'caregiver'; // Force caregiver role for caregiver codes
      }
      
      // Validate role if provided
      const validRoles = ['member', 'caregiver'];
      if (!validRoles.includes(memberRole)) {
        memberRole = 'member';
      }
      
      const membership = await storage.joinFamily(userId, actualInviteCode, memberRole);
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

  // Leave a family
  app.post("/api/family/:familyId/leave", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = req.params.familyId;
      
      // Check if user is a member of this family
      const membership = await storage.getUserFamilyMembership(userId, familyId);
      if (!membership) {
        return res.status(404).json({ error: "You are not a member of this family" });
      }
      
      // Check if user is the owner - owners can't leave, they must delete
      if (membership.role === 'owner') {
        return res.status(400).json({ error: "Owners cannot leave their family. You can delete the family instead." });
      }
      
      await storage.leaveFamily(userId, familyId);
      res.json({ success: true, message: "Successfully left the family" });
    } catch (error) {
      console.error("Error leaving family:", error);
      res.status(500).json({ error: "Failed to leave family" });
    }
  });

  // Delete a family (owner only)
  app.delete("/api/family/:familyId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = req.params.familyId;
      
      // Check if user is the owner of this family
      const membership = await storage.getUserFamilyMembership(userId, familyId);
      if (!membership) {
        return res.status(404).json({ error: "Family not found" });
      }
      
      if (membership.role !== 'owner') {
        return res.status(403).json({ error: "Only the family owner can delete the family" });
      }
      
      await storage.deleteFamily(familyId);
      res.json({ success: true, message: "Family deleted successfully" });
    } catch (error) {
      console.error("Error deleting family:", error);
      res.status(500).json({ error: "Failed to delete family" });
    }
  });
  
  // Get user's role in a family
  app.get("/api/family/:familyId/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = req.params.familyId;
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(404).json({ error: "You are not a member of this family" });
      }
      
      res.json({ role });
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ error: "Failed to fetch user role" });
    }
  });

  // Get all members (users with roles) for a family
  app.get("/api/family/:familyId/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = req.params.familyId;
      
      // Verify user is a member of this family
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const membershipsWithUsers = await storage.getFamilyMembershipsWithUsers(familyId);
      res.json(membershipsWithUsers);
    } catch (error) {
      console.error("Error fetching family members:", error);
      res.status(500).json({ error: "Failed to fetch family members" });
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

      const joinUrl = `${appUrl}/?invite=${family.inviteCode}`;
      const subject = `Join ${family.name} on Kindora Calendar`;
      
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
      
      const fromEmail = (process.env.EMAIL_FROM_ADDRESS || "mvicenzino@gmail.com").toLowerCase();
      
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
              display: inline-block;
              text-align: center;
              line-height: 24px;
              font-size: 13px; 
              font-weight: 600;
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
              <h1>🗓️ Kindora Calendar</h1>
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
                  Click the button below to visit Kindora Calendar
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
                <a href="${joinUrl}" class="button">Join ${family.name} Calendar</a>
              </div>
            </div>
            <div class="footer">
              <a href="${joinUrl}" class="footer-link">${joinUrl}</a>
              <p class="footer-text">This invitation was sent from Kindora Calendar</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textBody = `
You've been invited to join ${family.name} on Kindora Calendar!

Your Invite Code: ${family.inviteCode}

How to Join:
1. Visit: ${joinUrl}
2. Sign in or create an account
3. Go to Family Settings
4. Enter your invite code: ${family.inviteCode}
5. Start sharing events and memories!

Visit Kindora Calendar: ${joinUrl}
      `.trim();

      // Prioritize SendGrid over Resend (SendGrid has fewer restrictions)
      if (sendgridApiKey) {
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

  // Forward any invite code to someone (e.g., caregiver, healthcare worker)
  app.post("/api/family/forward-invite", isAuthenticated, async (req: any, res) => {
    try {
      const { email, inviteCode, familyName, role } = req.body;
      
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: "Valid email address is required" });
      }
      
      if (!inviteCode || typeof inviteCode !== 'string') {
        return res.status(400).json({ error: "Invite code is required" });
      }

      // Optional family name for better email personalization
      const displayFamilyName = familyName || "a family";
      
      // Support role selection (member or caregiver)
      const selectedRole = role === 'caregiver' ? 'caregiver' : 'member';

      // Get the app URL
      const appUrl = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : req.headers.origin || 'http://localhost:5000';

      const joinUrl = `${appUrl}/?invite=${inviteCode}&role=${selectedRole}`;
      const roleLabel = selectedRole === 'caregiver' ? 'as a Caregiver' : 'as a Family Member';
      const subject = `Invitation to ${displayFamilyName}'s Calendar on Kindora ${roleLabel}`;
      
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
      
      const fromEmail = (process.env.EMAIL_FROM_ADDRESS || "mvicenzino@gmail.com").toLowerCase();
      
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
              display: inline-block;
              text-align: center;
              line-height: 24px;
              font-size: 13px; 
              font-weight: 600;
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
              <h1>🗓️ Kindora Calendar</h1>
              <p>You've been invited to join ${displayFamilyName}'s calendar!</p>
            </div>
            <div class="content">
              <p class="greeting">Hi there!</p>
              <p class="message">You've been invited to access <strong>${displayFamilyName}'s</strong> calendar on Kindora Calendar. You'll be able to view events, appointments, and stay coordinated with the family.</p>
              
              <div class="invite-code">
                <p class="code-label">Your Invite Code</p>
                <p class="code">${inviteCode}</p>
              </div>

              <div class="steps">
                <h3>How to Join:</h3>
                <div class="step">
                  <span class="step-number">1</span>
                  Click the button below to visit Kindora Calendar
                </div>
                <div class="step">
                  <span class="step-number">2</span>
                  Sign in or create your account
                </div>
                <div class="step">
                  <span class="step-number">3</span>
                  Go to Family Settings and enter code: <strong>${inviteCode}</strong>
                </div>
                <div class="step">
                  <span class="step-number">4</span>
                  Start viewing events and staying coordinated!
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${joinUrl}" class="button">Join ${displayFamilyName} Calendar</a>
              </div>
            </div>
            <div class="footer">
              <a href="${joinUrl}" class="footer-link">${joinUrl}</a>
              <p class="footer-text">This invitation was sent from Kindora Calendar</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textBody = `
You've been invited to join ${displayFamilyName} on Kindora Calendar!

Your Invite Code: ${inviteCode}

How to Join:
1. Visit: ${joinUrl}
2. Sign in or create an account
3. Go to Family Settings
4. Enter your invite code: ${inviteCode}
5. Start viewing events and staying coordinated!

Visit Kindora Calendar: ${joinUrl}
      `.trim();

      // Prioritize SendGrid over Resend (SendGrid has fewer restrictions)
      if (sendgridApiKey) {
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

        console.log('Invite forwarded via SendGrid');
        
        return res.json({ 
          success: true,
          message: "Invitation email sent successfully",
          provider: "sendgrid"
        });
      } else {
        // No email service configured
        console.log('Invite would be forwarded:', { to: email, from: fromEmail, subject, joinUrl, inviteCode });
        
        return res.status(501).json({ 
          error: "Email service not configured. Set RESEND_API_KEY or SENDGRID_API_KEY, and optionally EMAIL_FROM_ADDRESS (required for Resend - must be a verified domain like 'invites@yourdomain.com').",
          details: {
            to: email,
            from: fromEmail,
            inviteCode: inviteCode,
            joinUrl: joinUrl,
            note: "For Resend: EMAIL_FROM_ADDRESS must be from a verified domain. For SendGrid: any email works if verified in SendGrid."
          }
        });
      }
    } catch (error: any) {
      console.error("Error forwarding invite:", error);
      res.status(500).json({ error: error.message || "Failed to forward invitation" });
    }
  });

  // Family Members Routes (protected)
  app.get("/api/family-members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      const members = await storage.getFamilyMembers(familyId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch family members" });
    }
  });

  // Get family members for a specific family (used by client with familyId in URL)
  app.get("/api/family-members/:familyId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requestedFamilyId = req.params.familyId;
      
      // Verify user has access to this family
      const userFamilies = await storage.getUserFamilies(userId);
      const hasAccess = userFamilies.some(f => f.id === requestedFamilyId);
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to this family" });
      }
      
      const members = await storage.getFamilyMembers(requestedFamilyId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching family members:", error);
      res.status(500).json({ error: "Failed to fetch family members" });
    }
  });

  app.post("/api/family-members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      // Check permissions
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const context = { userId, familyId, role };
      if (!hasPermission(context, 'canCreateMembers')) {
        return res.status(403).json({ error: "You don't have permission to create family members" });
      }
      
      const result = insertFamilyMemberSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const member = await storage.createFamilyMember(familyId, result.data);
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof PermissionError) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to create family member" });
    }
  });

  app.put("/api/family-members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      // Check permissions
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const context = { userId, familyId, role };
      if (!hasPermission(context, 'canEditMembers')) {
        return res.status(403).json({ error: "You don't have permission to edit family members" });
      }
      
      const result = insertFamilyMemberSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const member = await storage.updateFamilyMember(req.params.id, familyId, result.data);
      res.json(member);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      if (error instanceof PermissionError) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to update family member" });
    }
  });

  app.delete("/api/family-members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      // Check permissions
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const context = { userId, familyId, role };
      if (!hasPermission(context, 'canDeleteMembers')) {
        return res.status(403).json({ error: "You don't have permission to delete family members" });
      }
      
      await storage.deleteFamilyMember(req.params.id, familyId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      if (error instanceof PermissionError) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to delete family member" });
    }
  });

  // Events Routes (protected)
  app.get("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      const events = await storage.getEvents(familyId);
      
      // Add note counts to each event
      const eventsWithNoteCounts = await Promise.all(
        events.map(async (event) => {
          const notes = await storage.getEventNotes(event.id, familyId);
          return { ...event, noteCount: notes.length };
        })
      );
      
      res.json(eventsWithNoteCounts);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events", details: String(error) });
    }
  });

  app.post("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      // Check permissions
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const context = { userId, familyId, role };
      if (!hasPermission(context, 'canCreateEvents')) {
        return res.status(403).json({ error: "You don't have permission to create events" });
      }
      
      const result = insertEventSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const eventData = result.data;
      
      // Handle recurring events
      if (eventData.recurrenceRule) {
        const createdEvents = await createRecurringEvents(storage, familyId, eventData);
        res.status(201).json(createdEvents[0]); // Return the first event
      } else {
        const event = await storage.createEvent(familyId, eventData);
        res.status(201).json(event);
      }
    } catch (error) {
      if (error instanceof PermissionError) {
        return res.status(403).json({ error: error.message });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event", details: String(error) });
    }
  });

  app.put("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      // Check permissions
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const context = { userId, familyId, role };
      if (!hasPermission(context, 'canEditEvents')) {
        return res.status(403).json({ error: "You don't have permission to edit events" });
      }
      
      const result = insertEventSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const event = await storage.updateEvent(req.params.id, familyId, result.data);
      res.json(event);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      if (error instanceof PermissionError) {
        return res.status(403).json({ error: error.message });
      }
      console.error("Error updating event:", error);
      res.status(500).json({ error: "Failed to update event", details: String(error) });
    }
  });

  app.delete("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      // Check permissions
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const context = { userId, familyId, role };
      if (!hasPermission(context, 'canDeleteEvents')) {
        return res.status(403).json({ error: "You don't have permission to delete events" });
      }
      
      await storage.deleteEvent(req.params.id, familyId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      if (error instanceof PermissionError) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  app.post("/api/events/:id/toggle-completion", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      const event = await storage.toggleEventCompletion(req.params.id, familyId);
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
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      const messages = await storage.getMessages(req.params.eventId, familyId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/events/:eventId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      const messageData = {
        ...req.body,
        eventId: req.params.eventId,
      };
      
      const result = insertMessageSchema.safeParse(messageData);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const message = await storage.createMessage(familyId, result.data);
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
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      await storage.deleteMessage(req.params.id, familyId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Event Notes Routes (protected) - Threaded notes for family members and caregivers
  app.get("/api/events/:eventId/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      // Verify user is a member of this family
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const notes = await storage.getEventNotes(req.params.eventId, familyId);
      
      // Enrich notes with author information
      const enrichedNotes = await Promise.all(notes.map(async (note) => {
        const author = await storage.getUser(note.authorUserId);
        return {
          ...note,
          author: author ? {
            id: author.id,
            firstName: author.firstName,
            lastName: author.lastName,
            profileImageUrl: author.profileImageUrl,
          } : null,
        };
      }));
      
      res.json(enrichedNotes);
    } catch (error) {
      console.error("Error fetching event notes:", error);
      res.status(500).json({ error: "Failed to fetch event notes" });
    }
  });

  app.post("/api/events/:eventId/notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      // Verify user is a member of this family
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const noteData = {
        ...req.body,
        eventId: req.params.eventId,
        authorUserId: userId,
      };
      
      const result = insertEventNoteSchema.safeParse(noteData);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const note = await storage.createEventNote(familyId, result.data);
      
      // Enrich with author information
      const author = await storage.getUser(note.authorUserId);
      const enrichedNote = {
        ...note,
        author: author ? {
          id: author.id,
          firstName: author.firstName,
          lastName: author.lastName,
          profileImageUrl: author.profileImageUrl,
        } : null,
      };
      
      res.status(201).json(enrichedNote);
    } catch (error) {
      console.error("Error creating event note:", error);
      res.status(500).json({ error: "Failed to create event note" });
    }
  });

  app.delete("/api/events/:eventId/notes/:noteId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      // Verify user is a member of this family
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Only allow owner/member to delete notes, or the note author
      const notes = await storage.getEventNotes(req.params.eventId, familyId);
      const noteToDelete = notes.find(n => n.id === req.params.noteId);
      
      if (!noteToDelete) {
        return res.status(404).json({ error: "Note not found" });
      }
      
      // Allow deletion if user is the author or has owner/member role
      if (noteToDelete.authorUserId !== userId && role === 'caregiver') {
        return res.status(403).json({ error: "You can only delete your own notes" });
      }
      
      await storage.deleteEventNote(req.params.noteId, familyId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      console.error("Error deleting event note:", error);
      res.status(500).json({ error: "Failed to delete event note" });
    }
  });

  // Medication Routes (protected) - Medication tracking for caregivers
  // Get all medications for a family
  app.get("/api/medications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const medications = await storage.getMedications(familyId);
      
      // Enrich with member information
      const familyMembers = await storage.getFamilyMembers(familyId);
      const enrichedMedications = medications.map(med => {
        const member = familyMembers.find(m => m.id === med.memberId);
        return {
          ...med,
          member: member ? { id: member.id, name: member.name, color: member.color } : null,
        };
      });
      
      res.json(enrichedMedications);
    } catch (error) {
      console.error("Error fetching medications:", error);
      res.status(500).json({ error: "Failed to fetch medications" });
    }
  });

  // Get medications for a specific family member
  app.get("/api/members/:memberId/medications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const medications = await storage.getMedicationsByMember(req.params.memberId, familyId);
      res.json(medications);
    } catch (error) {
      console.error("Error fetching member medications:", error);
      res.status(500).json({ error: "Failed to fetch member medications" });
    }
  });

  // Get a single medication
  app.get("/api/medications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const medication = await storage.getMedication(req.params.id, familyId);
      if (!medication) {
        return res.status(404).json({ error: "Medication not found" });
      }
      
      res.json(medication);
    } catch (error) {
      console.error("Error fetching medication:", error);
      res.status(500).json({ error: "Failed to fetch medication" });
    }
  });

  // Create a medication (owners and members only)
  app.post("/api/medications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Only owners and members can create medications
      if (role === 'caregiver') {
        return res.status(403).json({ error: "Caregivers cannot create medications" });
      }
      
      const result = insertMedicationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const medication = await storage.createMedication(familyId, result.data);
      res.status(201).json(medication);
    } catch (error) {
      console.error("Error creating medication:", error);
      res.status(500).json({ error: "Failed to create medication" });
    }
  });

  // Update a medication (owners and members only)
  app.patch("/api/medications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Only owners and members can update medications
      if (role === 'caregiver') {
        return res.status(403).json({ error: "Caregivers cannot update medications" });
      }
      
      const medication = await storage.updateMedication(req.params.id, familyId, req.body);
      res.json(medication);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      console.error("Error updating medication:", error);
      res.status(500).json({ error: "Failed to update medication" });
    }
  });

  // Delete a medication (owners and members only)
  app.delete("/api/medications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Only owners and members can delete medications
      if (role === 'caregiver') {
        return res.status(403).json({ error: "Caregivers cannot delete medications" });
      }
      
      await storage.deleteMedication(req.params.id, familyId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      console.error("Error deleting medication:", error);
      res.status(500).json({ error: "Failed to delete medication" });
    }
  });

  // Medication Logs Routes
  // Get logs for a medication
  app.get("/api/medications/:medicationId/logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const logs = await storage.getMedicationLogs(req.params.medicationId, familyId);
      
      // Enrich with administered by user info
      const enrichedLogs = await Promise.all(logs.map(async (log) => {
        const user = await storage.getUser(log.administeredBy);
        return {
          ...log,
          administeredByUser: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
          } : null,
        };
      }));
      
      res.json(enrichedLogs);
    } catch (error) {
      console.error("Error fetching medication logs:", error);
      res.status(500).json({ error: "Failed to fetch medication logs" });
    }
  });

  // Get today's medication logs for the family
  app.get("/api/medication-logs/today", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const logs = await storage.getTodaysMedicationLogs(familyId);
      
      // Enrich with medication and user info
      const medications = await storage.getMedications(familyId);
      const enrichedLogs = await Promise.all(logs.map(async (log) => {
        const medication = medications.find(m => m.id === log.medicationId);
        const user = await storage.getUser(log.administeredBy);
        return {
          ...log,
          medication: medication ? { id: medication.id, name: medication.name, dosage: medication.dosage } : null,
          administeredByUser: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
          } : null,
        };
      }));
      
      res.json(enrichedLogs);
    } catch (error) {
      console.error("Error fetching today's medication logs:", error);
      res.status(500).json({ error: "Failed to fetch today's medication logs" });
    }
  });

  // Log a medication dose (all roles can log)
  app.post("/api/medications/:medicationId/logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Verify the medication exists
      const medication = await storage.getMedication(req.params.medicationId, familyId);
      if (!medication) {
        return res.status(404).json({ error: "Medication not found" });
      }
      
      const logData = {
        ...req.body,
        medicationId: req.params.medicationId,
        administeredBy: userId,
        administeredAt: req.body.administeredAt || new Date(),
      };
      
      const result = insertMedicationLogSchema.safeParse(logData);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const log = await storage.createMedicationLog(familyId, result.data);
      
      // Enrich response
      const user = await storage.getUser(log.administeredBy);
      const enrichedLog = {
        ...log,
        medication: { id: medication.id, name: medication.name, dosage: medication.dosage },
        administeredByUser: user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        } : null,
      };
      
      res.status(201).json(enrichedLog);
    } catch (error) {
      console.error("Error logging medication:", error);
      res.status(500).json({ error: "Failed to log medication" });
    }
  });

  // Family Messages Routes (global conversation thread)
  app.get("/api/family-messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const messages = await storage.getFamilyMessages(familyId);
      
      // Enrich messages with author info
      const enrichedMessages = await Promise.all(messages.map(async (message) => {
        const author = await storage.getUser(message.authorUserId);
        const membership = await storage.getUserFamilyMembership(message.authorUserId, familyId);
        return {
          ...message,
          author: author ? {
            id: author.id,
            firstName: author.firstName,
            lastName: author.lastName,
            profileImageUrl: author.profileImageUrl,
            role: membership?.role || 'member',
          } : null,
        };
      }));
      
      res.json(enrichedMessages);
    } catch (error) {
      console.error("Error fetching family messages:", error);
      res.status(500).json({ error: "Failed to fetch family messages" });
    }
  });

  app.post("/api/family-messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // All family members (including caregivers) can send messages
      const messageData = {
        ...req.body,
        authorUserId: userId,
      };
      
      const result = insertFamilyMessageSchema.safeParse(messageData);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const message = await storage.createFamilyMessage(familyId, result.data);
      
      // Enrich with author info
      const author = await storage.getUser(userId);
      const membership = await storage.getUserFamilyMembership(userId, familyId);
      const enrichedMessage = {
        ...message,
        author: author ? {
          id: author.id,
          firstName: author.firstName,
          lastName: author.lastName,
          profileImageUrl: author.profileImageUrl,
          role: membership?.role || 'member',
        } : null,
      };
      
      res.status(201).json(enrichedMessage);
    } catch (error) {
      console.error("Error creating family message:", error);
      res.status(500).json({ error: "Failed to create family message" });
    }
  });

  app.delete("/api/family-messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Only owners and message authors can delete messages
      const messages = await storage.getFamilyMessages(familyId);
      const message = messages.find(m => m.id === req.params.id);
      
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      
      if (message.authorUserId !== userId && role !== 'owner') {
        return res.status(403).json({ error: "You can only delete your own messages" });
      }
      
      await storage.deleteFamilyMessage(req.params.id, familyId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting family message:", error);
      res.status(500).json({ error: "Failed to delete family message" });
    }
  });

  // Caregiver Time Tracking Routes
  
  // Get user's pay rate (for time tracking)
  app.get("/api/caregiver/pay-rate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // All family members can access time tracking features
      const payRate = await storage.getCaregiverPayRate(userId, familyId);
      res.json(payRate || null);
    } catch (error) {
      console.error("Error fetching pay rate:", error);
      res.status(500).json({ error: "Failed to fetch pay rate" });
    }
  });

  // Set user's pay rate (for time tracking)
  app.put("/api/caregiver/pay-rate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const { hourlyRate, currency, caregiverUserId } = req.body;
      
      if (!hourlyRate || isNaN(parseFloat(hourlyRate))) {
        return res.status(400).json({ error: "Valid hourly rate is required" });
      }
      
      // Determine target user (owners can set for others)
      let targetUserId = userId;
      if (caregiverUserId && role === 'owner') {
        targetUserId = caregiverUserId;
      }
      
      const payRate = await storage.setCaregiverPayRate(familyId, targetUserId, String(hourlyRate), currency || "USD");
      res.json(payRate);
    } catch (error) {
      console.error("Error setting pay rate:", error);
      res.status(500).json({ error: "Failed to set pay rate" });
    }
  });

  // Get user's time entries
  app.get("/api/caregiver/time-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // All family members can view their own time entries
      const entries = await storage.getCaregiverTimeEntries(userId, familyId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ error: "Failed to fetch time entries" });
    }
  });

  // Create a new time entry
  app.post("/api/caregiver/time-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Get the user's pay rate
      const payRate = await storage.getCaregiverPayRate(userId, familyId);
      if (!payRate) {
        return res.status(400).json({ error: "Please set your hourly rate before logging hours" });
      }
      
      const result = insertCaregiverTimeEntrySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }
      
      const entry = await storage.createCaregiverTimeEntry(familyId, userId, result.data, payRate.hourlyRate);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ error: "Failed to create time entry" });
    }
  });

  // Delete a time entry
  app.delete("/api/caregiver/time-entries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // All family members can delete their own entries
      await storage.deleteCaregiverTimeEntry(req.params.id, userId, familyId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: "Time entry not found" });
      }
      console.error("Error deleting time entry:", error);
      res.status(500).json({ error: "Failed to delete time entry" });
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
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      // Check if user has permission to edit events
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const context = { userId, familyId, role };
      if (!hasPermission(context, 'canEditEvents')) {
        return res.status(403).json({ error: "You don't have permission to edit event photos" });
      }
      
      // Allow null to delete photo
      if (req.body.photoURL === null) {
        const event = await storage.updateEvent(req.params.id, familyId, { photoUrl: null });
        return res.json(event);
      }

      if (!req.body.photoURL) {
        return res.status(400).json({ error: "photoURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.photoURL);
      
      const event = await storage.updateEvent(req.params.id, familyId, { photoUrl: objectPath });
      res.json(event);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      console.error("Error setting event photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Weekly Summary Email Routes
  app.post("/api/send-weekly-summary", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (!user.email) {
        return res.status(400).json({ error: "No email address on file. Please update your profile." });
      }
      
      // Get all families user belongs to
      const families = await storage.getUserFamilies(userId);
      
      if (families.length === 0) {
        return res.status(400).json({ error: "No families found for user" });
      }
      
      // Calculate week range (current week or specified week)
      const weekOffset = req.body.weekOffset || 0; // 0 = current week, 1 = next week
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + (weekOffset * 7));
      
      const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 }); // Sunday
      const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 }); // Saturday
      const weekRange = `${format(weekStart, 'MMM d')}–${format(weekEnd, 'd')}`;
      
      // Collect events from all families
      const allFamilySummaries: string[] = [];
      let totalEventCount = 0;
      
      for (const family of families) {
        const events = await storage.getEvents(family.id);
        const familyMembers = await storage.getFamilyMembers(family.id);
        
        // Filter events for the specified week
        const weekEvents = events.filter(event => {
          const eventDate = new Date(event.startTime);
          return eventDate >= weekStart && eventDate <= weekEnd;
        }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        // Map events with member names
        const eventSummaries = weekEvents.map(event => {
          const memberNames = (event.memberIds || [])
            .map(id => familyMembers.find(m => m.id === id)?.name)
            .filter(Boolean) as string[];
          
          // Check if it's an all-day event (ends at 23:58 or 23:59)
          const endTime = new Date(event.endTime);
          const isAllDay = endTime.getHours() === 23 && endTime.getMinutes() >= 58;
          
          return {
            id: event.id,
            title: event.title,
            startTime: new Date(event.startTime),
            endTime: endTime,
            description: event.description,
            memberNames,
            isAllDay
          };
        });
        
        totalEventCount += eventSummaries.length;
        
        // Generate HTML for this family
        const recipientName = user.firstName || user.email.split('@')[0];
        const htmlContent = generateWeeklySummaryHtml({
          familyName: family.name,
          weekStart,
          weekEnd,
          events: eventSummaries,
          recipientName
        });
        
        const textContent = generateWeeklySummaryText({
          familyName: family.name,
          weekStart,
          weekEnd,
          events: eventSummaries,
          recipientName
        });
        
        // Send email for this family
        const result = await sendWeeklySummaryEmail(
          user.email,
          htmlContent,
          textContent,
          weekRange
        );
        
        if (result.success) {
          allFamilySummaries.push(family.name);
        } else {
          console.error(`Failed to send summary for family ${family.name}:`, result.error);
        }
      }
      
      if (allFamilySummaries.length === 0) {
        return res.status(500).json({ error: "Failed to send any summary emails" });
      }
      
      res.json({
        success: true,
        message: `Weekly summary sent to ${user.email}`,
        families: allFamilySummaries,
        eventCount: totalEventCount,
        weekRange
      });
      
    } catch (error) {
      console.error("Error sending weekly summary:", error);
      res.status(500).json({ error: "Failed to send weekly summary", details: String(error) });
    }
  });
  
  // Preview weekly summary (returns HTML without sending email)
  app.get("/api/weekly-summary-preview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const familyId = await getFamilyId(req, userId);
      
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const family = await storage.getFamilyById(familyId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }
      
      // Calculate week range
      const weekOffset = parseInt(req.query.weekOffset as string) || 0;
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + (weekOffset * 7));
      
      const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 });
      
      const events = await storage.getEvents(familyId);
      const familyMembers = await storage.getFamilyMembers(familyId);
      
      // Filter events for the specified week
      const weekEvents = events.filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate >= weekStart && eventDate <= weekEnd;
      }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      // Map events with member names
      const eventSummaries = weekEvents.map(event => {
        const memberNames = (event.memberIds || [])
          .map(id => familyMembers.find(m => m.id === id)?.name)
          .filter(Boolean) as string[];
        
        const endTime = new Date(event.endTime);
        const isAllDay = endTime.getHours() === 23 && endTime.getMinutes() >= 58;
        
        return {
          id: event.id,
          title: event.title,
          startTime: new Date(event.startTime),
          endTime: endTime,
          description: event.description,
          memberNames,
          isAllDay
        };
      });
      
      const recipientName = user?.firstName || user?.email?.split('@')[0] || 'User';
      
      const htmlContent = generateWeeklySummaryHtml({
        familyName: family.name,
        weekStart,
        weekEnd,
        events: eventSummaries,
        recipientName
      });
      
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
      
    } catch (error) {
      console.error("Error generating preview:", error);
      res.status(500).json({ error: "Failed to generate preview" });
    }
  });

  // ========== Weekly Summary Schedule Configuration (Admin) ==========
  
  // Get weekly summary schedule for a family
  app.get("/api/weekly-summary-schedule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      
      if (!familyId) {
        return res.status(400).json({ error: "No family found" });
      }
      
      // Check if user has permission to manage this setting (owner/member)
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const schedule = await storage.getWeeklySummarySchedule(familyId);
      
      res.json({
        schedule: schedule || {
          familyId,
          isEnabled: false,
          dayOfWeek: '0',
          timeOfDay: '08:00',
          timezone: 'America/New_York',
        }
      });
    } catch (error) {
      console.error("Error fetching weekly summary schedule:", error);
      res.status(500).json({ error: "Failed to fetch schedule" });
    }
  });
  
  // Update weekly summary schedule for a family (owners/members only)
  app.put("/api/weekly-summary-schedule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { familyId, isEnabled, dayOfWeek, timeOfDay, timezone } = req.body;
      
      if (!familyId) {
        return res.status(400).json({ error: "Family ID is required" });
      }
      
      // Check if user has permission to manage this setting (owner/member only)
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role || role === 'caregiver') {
        return res.status(403).json({ error: "Only family owners and members can configure weekly summaries" });
      }
      
      const schedule = await storage.upsertWeeklySummarySchedule(familyId, {
        familyId,
        isEnabled: isEnabled ?? false,
        dayOfWeek: dayOfWeek ?? '0',
        timeOfDay: timeOfDay ?? '08:00',
        timezone: timezone ?? 'America/New_York',
      });
      
      res.json({ success: true, schedule });
    } catch (error) {
      console.error("Error updating weekly summary schedule:", error);
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });
  
  // ========== Weekly Summary User Preferences ==========
  
  // Get user's weekly summary preference for a family
  app.get("/api/weekly-summary-preference", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      
      if (!familyId) {
        return res.status(400).json({ error: "No family found" });
      }
      
      const preference = await storage.getWeeklySummaryPreference(userId, familyId);
      
      res.json({
        preference: preference || {
          userId,
          familyId,
          optedIn: true, // Default to opted in
        }
      });
    } catch (error) {
      console.error("Error fetching weekly summary preference:", error);
      res.status(500).json({ error: "Failed to fetch preference" });
    }
  });
  
  // Update user's weekly summary preference
  app.put("/api/weekly-summary-preference", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { familyId, optedIn } = req.body;
      
      if (!familyId) {
        return res.status(400).json({ error: "Family ID is required" });
      }
      
      const preference = await storage.upsertWeeklySummaryPreference(userId, familyId, optedIn ?? true);
      
      res.json({ success: true, preference });
    } catch (error) {
      console.error("Error updating weekly summary preference:", error);
      res.status(500).json({ error: "Failed to update preference" });
    }
  });
  
  // ========== Automated Weekly Summary Cron Endpoint ==========
  
  // This endpoint can be called by Replit Cron or an external scheduler
  // It sends weekly summaries to all opted-in users for families with active schedules
  app.post("/api/cron/weekly-summary", async (req: any, res) => {
    try {
      // Optional: Add a secret token for security
      const cronSecret = req.headers['x-cron-secret'];
      if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get all active weekly summary schedules
      const activeSchedules = await storage.getActiveWeeklySummarySchedules();
      
      if (activeSchedules.length === 0) {
        return res.json({ message: "No active schedules found", sent: 0 });
      }
      
      const results: { familyId: string; usersSent: number; errors: string[] }[] = [];
      
      for (const schedule of activeSchedules) {
        const familyResults = { familyId: schedule.familyId, usersSent: 0, errors: [] as string[] };
        
        try {
          // Get family info
          const family = await storage.getFamilyById(schedule.familyId);
          if (!family) {
            familyResults.errors.push("Family not found");
            results.push(familyResults);
            continue;
          }
          
          // Get all opted-in users for this family
          const optedInUsers = await storage.getOptedInUsersForFamily(schedule.familyId);
          
          // If no explicit preferences, get all family members (default opted-in)
          let usersToEmail = optedInUsers;
          if (usersToEmail.length === 0) {
            // Get all family memberships and their users
            const memberships = await storage.getFamilyMembershipsWithUsers(schedule.familyId);
            usersToEmail = memberships
              .filter(m => m.user.email)
              .map(m => ({ userId: m.userId, user: m.user }));
          }
          
          // Calculate week range
          const today = new Date();
          const weekStart = startOfWeek(today, { weekStartsOn: 0 });
          const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
          const weekRange = `${format(weekStart, 'MMM d')}–${format(weekEnd, 'd')}`;
          
          // Get events for this week
          const events = await storage.getEvents(schedule.familyId);
          const familyMembers = await storage.getFamilyMembers(schedule.familyId);
          
          const weekEvents = events.filter(event => {
            const eventDate = new Date(event.startTime);
            return eventDate >= weekStart && eventDate <= weekEnd;
          }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          
          const eventSummaries = weekEvents.map(event => {
            const memberNames = (event.memberIds || [])
              .map(id => familyMembers.find(m => m.id === id)?.name)
              .filter(Boolean) as string[];
            
            const endTime = new Date(event.endTime);
            const isAllDay = endTime.getHours() === 23 && endTime.getMinutes() >= 58;
            
            return {
              id: event.id,
              title: event.title,
              startTime: new Date(event.startTime),
              endTime: endTime,
              description: event.description,
              memberNames,
              isAllDay
            };
          });
          
          // Send to each opted-in user
          for (const { user } of usersToEmail) {
            if (!user.email) continue;
            
            const recipientName = user.firstName || user.email.split('@')[0] || 'User';
            
            const htmlContent = generateWeeklySummaryHtml({
              familyName: family.name,
              weekStart,
              weekEnd,
              events: eventSummaries,
              recipientName
            });
            
            const textContent = generateWeeklySummaryText({
              familyName: family.name,
              weekStart,
              weekEnd,
              events: eventSummaries,
              recipientName
            });
            
            const result = await sendWeeklySummaryEmail(
              user.email,
              htmlContent,
              textContent,
              weekRange
            );
            
            if (result.success) {
              familyResults.usersSent++;
            } else {
              familyResults.errors.push(`Failed to send to ${user.email}: ${result.error}`);
            }
          }
          
          // Update last sent timestamp
          await storage.updateWeeklySummaryLastSent(schedule.familyId);
          
        } catch (err) {
          familyResults.errors.push(String(err));
        }
        
        results.push(familyResults);
      }
      
      const totalSent = results.reduce((sum, r) => sum + r.usersSent, 0);
      
      res.json({
        success: true,
        schedulesProcessed: activeSchedules.length,
        totalEmailsSent: totalSent,
        details: results
      });
      
    } catch (error) {
      console.error("Error in cron weekly summary:", error);
      res.status(500).json({ error: "Failed to process weekly summaries", details: String(error) });
    }
  });

  // ========== Care Documents Routes ==========
  
  // Get all care documents for a family
  app.get("/api/care-documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Filter by member if specified
      const memberId = req.query.memberId as string | undefined;
      let documents;
      if (memberId) {
        documents = await storage.getCareDocumentsByMember(memberId, familyId);
      } else {
        documents = await storage.getCareDocuments(familyId);
      }
      
      res.json(documents);
    } catch (error) {
      console.error("Error fetching care documents:", error);
      res.status(500).json({ error: "Failed to fetch care documents" });
    }
  });
  
  // Get a specific care document
  app.get("/api/care-documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      const document = await storage.getCareDocument(req.params.id, familyId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching care document:", error);
      res.status(500).json({ error: "Failed to fetch care document" });
    }
  });
  
  // Request presigned URL for document upload
  app.post("/api/care-documents/upload-url", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Only owners and members can upload documents
      if (role !== 'owner' && role !== 'member') {
        return res.status(403).json({ error: "Only family owners and members can upload documents" });
      }
      
      const { fileName, contentType } = req.body;
      if (!fileName) {
        return res.status(400).json({ error: "fileName is required" });
      }
      
      // Check if object storage is configured
      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      if (!privateDir) {
        console.error("PRIVATE_OBJECT_DIR not configured");
        return res.status(500).json({ error: "Object storage not configured. Please contact support." });
      }
      
      const objectStorageService = new ObjectStorageService();
      
      // Generate unique path for care documents
      const timestamp = Date.now();
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const subPath = `care-documents/${familyId}/${timestamp}-${safeName}`;
      
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURLWithPath(subPath);
      
      res.json({ uploadURL, objectPath });
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      const message = error?.message || "Failed to generate upload URL";
      res.status(500).json({ error: message });
    }
  });
  
  // Create a care document record after upload
  app.post("/api/care-documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Only owners and members can upload documents
      if (role !== 'owner' && role !== 'member') {
        return res.status(403).json({ error: "Only family owners and members can upload documents" });
      }
      
      const { title, documentType, description, memberId, fileUrl, fileName, fileSize, mimeType } = req.body;
      
      if (!title || !documentType || !fileUrl || !fileName) {
        return res.status(400).json({ error: "title, documentType, fileUrl, and fileName are required" });
      }
      
      // Validate document type
      const validTypes = ['medical', 'insurance', 'legal', 'care_plan', 'other'];
      if (!validTypes.includes(documentType)) {
        return res.status(400).json({ error: `Invalid document type. Must be one of: ${validTypes.join(', ')}` });
      }
      
      console.log("Creating care document:", { familyId, title, documentType, fileName, fileUrl, memberId, uploadedBy: userId });
      
      const document = await storage.createCareDocument(familyId, {
        title,
        documentType,
        description: description || null,
        memberId: memberId || null,
        uploadedBy: userId,
        fileUrl,
        fileName,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
      });
      
      console.log("Care document created successfully:", document.id);
      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error creating care document:", error);
      console.error("Error details:", error?.message, error?.stack);
      const errorMessage = error?.message || "Failed to create care document";
      res.status(500).json({ error: `Failed to create care document: ${errorMessage}` });
    }
  });
  
  // Delete a care document
  app.delete("/api/care-documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Only owners and members can delete documents
      if (role !== 'owner' && role !== 'member') {
        return res.status(403).json({ error: "Only family owners and members can delete documents" });
      }
      
      await storage.deleteCareDocument(req.params.id, familyId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: "Document not found" });
      }
      console.error("Error deleting care document:", error);
      res.status(500).json({ error: "Failed to delete care document" });
    }
  });

  // ========================================
  // Google Drive Integration Routes
  // ========================================
  
  // Check if Google Drive is connected
  app.get("/api/google-drive/status", isAuthenticated, async (req: any, res) => {
    try {
      const { checkDriveConnection } = await import("./googleDriveService");
      const connected = await checkDriveConnection();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });
  
  // List files from Google Drive
  app.get("/api/google-drive/files", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role || (role !== 'owner' && role !== 'member')) {
        return res.status(403).json({ error: "Only family owners and members can access Google Drive" });
      }
      
      const { listDriveFiles } = await import("./googleDriveService");
      const folderId = req.query.folderId as string | undefined;
      const pageToken = req.query.pageToken as string | undefined;
      
      const result = await listDriveFiles(folderId, pageToken);
      res.json(result);
    } catch (error: any) {
      console.error("Error listing Google Drive files:", error);
      if (error.message?.includes('not connected')) {
        return res.status(401).json({ error: "Google Drive not connected" });
      }
      res.status(500).json({ error: "Failed to list Google Drive files" });
    }
  });
  
  // Import a file from Google Drive
  app.post("/api/google-drive/import", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role || (role !== 'owner' && role !== 'member')) {
        return res.status(403).json({ error: "Only family owners and members can import from Google Drive" });
      }
      
      const { fileId, title, documentType, description, memberId } = req.body;
      
      if (!fileId || !title || !documentType) {
        return res.status(400).json({ error: "fileId, title, and documentType are required" });
      }
      
      const validTypes = ['medical', 'insurance', 'legal', 'care_plan', 'other'];
      if (!validTypes.includes(documentType)) {
        return res.status(400).json({ error: `Invalid document type. Must be one of: ${validTypes.join(', ')}` });
      }
      
      const { downloadDriveFile, getDriveFile } = await import("./googleDriveService");
      
      // First check file metadata before downloading
      const fileMetadata = await getDriveFile(fileId);
      
      // Validate file size (max 25MB to prevent memory issues)
      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
      if (fileMetadata.size && parseInt(fileMetadata.size) > MAX_FILE_SIZE) {
        return res.status(400).json({ error: "File too large. Maximum size is 25MB." });
      }
      
      // Validate MIME type - allow common document types
      const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv',
        // Google Docs types (will be exported as PDF/Office)
        'application/vnd.google-apps.document',
        'application/vnd.google-apps.spreadsheet',
        'application/vnd.google-apps.presentation',
      ];
      
      const isAllowedType = allowedMimeTypes.some(type => 
        fileMetadata.mimeType === type || fileMetadata.mimeType.startsWith('image/')
      );
      
      if (!isAllowedType) {
        return res.status(400).json({ error: "File type not supported. Please upload PDFs, images, or common document formats." });
      }
      
      console.log("Importing from Google Drive:", { fileId, fileName: fileMetadata.name, mimeType: fileMetadata.mimeType });
      
      const { buffer, mimeType, name, size } = await downloadDriveFile(fileId);
      
      // Double-check downloaded file size
      if (buffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({ error: "Downloaded file too large. Maximum size is 25MB." });
      }
      
      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      if (!privateDir) {
        return res.status(500).json({ error: "Object storage not configured" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const timestamp = Date.now();
      const safeName = name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const subPath = `care-documents/${familyId}/${timestamp}-${safeName}`;
      
      console.log("Uploading to object storage:", { subPath, size: buffer.length });
      
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURLWithPath(subPath);
      
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
        body: buffer,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to storage: ${uploadResponse.status}`);
      }
      
      console.log("Creating care document record...");
      
      const document = await storage.createCareDocument(familyId, {
        title,
        documentType,
        description: description || null,
        memberId: memberId || null,
        uploadedBy: userId,
        fileUrl: objectPath,
        fileName: name,
        fileSize: size,
        mimeType,
      });
      
      console.log("Google Drive import complete:", document.id);
      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error importing from Google Drive:", error);
      if (error.message?.includes('not connected')) {
        return res.status(401).json({ error: "Google Drive not connected" });
      }
      res.status(500).json({ error: `Failed to import from Google Drive: ${error.message}` });
    }
  });

  // ========================================
  // Emergency Bridge Routes
  // ========================================
  
  // Get emergency bridge tokens for a family (authenticated)
  app.get("/api/emergency-bridge/tokens", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Only owners and members can view tokens
      if (role !== 'owner' && role !== 'member') {
        return res.status(403).json({ error: "Only family owners and members can view emergency bridge tokens" });
      }
      
      const tokens = await storage.getEmergencyBridgeTokens(familyId);
      res.json(tokens);
    } catch (error) {
      console.error("Error fetching emergency bridge tokens:", error);
      res.status(500).json({ error: "Failed to fetch emergency bridge tokens" });
    }
  });
  
  // Create an emergency bridge token (authenticated)
  app.post("/api/emergency-bridge/tokens", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Only owners and members can create tokens
      if (role !== 'owner' && role !== 'member') {
        return res.status(403).json({ error: "Only family owners and members can create emergency bridge tokens" });
      }
      
      const { label, expiresInHours } = req.body;
      
      // Default to 24 hours, max 7 days (168 hours)
      const hours = Math.min(Math.max(expiresInHours || 24, 1), 168);
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      
      // Generate a secure random token
      const crypto = await import('crypto');
      const rawToken = crypto.randomUUID() + '-' + crypto.randomBytes(16).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      
      const token = await storage.createEmergencyBridgeToken(
        familyId,
        userId,
        tokenHash,
        expiresAt,
        label
      );
      
      // Return the raw token (only shown once) along with the token record
      res.json({
        ...token,
        rawToken, // User needs this to share the link
      });
    } catch (error) {
      console.error("Error creating emergency bridge token:", error);
      res.status(500).json({ error: "Failed to create emergency bridge token" });
    }
  });
  
  // Revoke an emergency bridge token (authenticated)
  app.delete("/api/emergency-bridge/tokens/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familyId = await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (!role) {
        return res.status(403).json({ error: "You are not a member of this family" });
      }
      
      // Only owners and members can revoke tokens
      if (role !== 'owner' && role !== 'member') {
        return res.status(403).json({ error: "Only family owners and members can revoke emergency bridge tokens" });
      }
      
      await storage.revokeEmergencyBridgeToken(req.params.id, familyId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: "Token not found" });
      }
      console.error("Error revoking emergency bridge token:", error);
      res.status(500).json({ error: "Failed to revoke emergency bridge token" });
    }
  });
  
  // Send emergency bridge link via email (authenticated)
  app.post("/api/emergency-bridge/send-email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { recipientEmail, recipientName, token, familyId: reqFamilyId, expiresInHours, label } = req.body;
      
      if (!recipientEmail || !token) {
        return res.status(400).json({ error: "Recipient email and token are required" });
      }
      
      const familyId = reqFamilyId || await getFamilyId(req, userId);
      if (!familyId) {
        return res.status(400).json({ error: "No family found for user" });
      }
      
      const role = await getUserFamilyRole(storage, userId, familyId);
      if (role !== 'owner' && role !== 'member') {
        return res.status(403).json({ error: "Only family owners and members can send emergency bridge emails" });
      }
      
      const family = await storage.getFamilyById(familyId);
      const user = await storage.getUser(userId);
      
      if (!family || !user) {
        return res.status(404).json({ error: "Family or user not found" });
      }
      
      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
        : 'https://kindora.replit.app';
      const accessLink = `${baseUrl}/emergency-bridge/${token}`;
      
      const { sendEmergencyBridgeEmail } = await import('./emailService');
      const result = await sendEmergencyBridgeEmail({
        recipientEmail,
        recipientName: recipientName || '',
        familyName: family.name,
        senderName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.email || 'A family member',
        accessLink,
        expiresInHours: expiresInHours || 24,
        label: label || 'Emergency Access',
      });
      
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error sending emergency bridge email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });
  
  // Public endpoint to access emergency bridge data (no authentication required)
  app.get("/api/emergency-bridge/access/:token", async (req: any, res) => {
    try {
      const rawToken = req.params.token;
      
      // Hash the token to look it up
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      
      const tokenRecord = await storage.getEmergencyBridgeTokenByHash(tokenHash);
      
      if (!tokenRecord) {
        return res.status(404).json({ error: "Invalid or expired emergency bridge link" });
      }
      
      // Check if token is expired
      if (tokenRecord.status !== 'active' || new Date(tokenRecord.expiresAt) < new Date()) {
        return res.status(410).json({ error: "This emergency bridge link has expired" });
      }
      
      // Increment access count
      await storage.incrementEmergencyBridgeTokenAccess(tokenRecord.id);
      
      const familyId = tokenRecord.familyId;
      
      // Fetch family info
      const family = await storage.getFamilyById(familyId);
      if (!family) {
        return res.status(404).json({ error: "Family not found" });
      }
      
      // Fetch family members
      const members = await storage.getFamilyMembers(familyId);
      
      // Fetch upcoming events (next 7 days)
      const events = await storage.getEvents(familyId);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingEvents = events.filter(e => {
        const eventStart = new Date(e.startTime);
        return eventStart >= now && eventStart <= weekFromNow;
      }).slice(0, 20); // Limit to 20 events
      
      // Fetch medications
      const medications = await storage.getMedications(familyId);
      const activeMedications = medications.filter(m => m.isActive);
      
      // Fetch care documents that are marked for emergency access
      const documents = await storage.getCareDocuments(familyId);
      // Filter to important document types for emergency access
      const emergencyDocumentTypes = ['medical', 'insurance', 'legal', 'emergency'];
      const emergencyDocuments = documents.filter(d => 
        emergencyDocumentTypes.includes(d.documentType)
      ).map(d => ({
        id: d.id,
        title: d.title,
        documentType: d.documentType,
        description: d.description,
        memberId: d.memberId,
        // Don't expose file URLs in public endpoint for security
      }));
      
      res.json({
        family: {
          name: family.name,
        },
        members: members.map(m => ({
          id: m.id,
          name: m.name,
          color: m.color,
          avatar: m.avatar,
        })),
        upcomingEvents: upcomingEvents.map(e => ({
          id: e.id,
          title: e.title,
          description: e.description,
          startTime: e.startTime,
          endTime: e.endTime,
          memberIds: e.memberIds,
          color: e.color,
        })),
        medications: activeMedications.map(m => ({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          instructions: m.instructions,
          memberId: m.memberId,
          scheduledTimes: m.scheduledTimes,
        })),
        emergencyDocuments,
        accessInfo: {
          label: tokenRecord.label,
          expiresAt: tokenRecord.expiresAt,
        },
      });
    } catch (error) {
      console.error("Error accessing emergency bridge:", error);
      res.status(500).json({ error: "Failed to access emergency bridge" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
