import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, NotFoundError } from "./storage";
import { insertFamilyMemberSchema, insertEventSchema, insertMessageSchema, insertEventNoteSchema, insertMedicationSchema, insertMedicationLogSchema, insertFamilyMessageSchema, insertCaregiverTimeEntrySchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getUserFamilyRole, PermissionError, hasPermission } from "./permissions";
import type { FamilyRole } from "@shared/schema";

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
      
      // Validate role if provided
      const validRoles = ['member', 'caregiver'];
      const memberRole = role && validRoles.includes(role) ? role : 'member';
      
      const membership = await storage.joinFamily(userId, inviteCode.toUpperCase(), memberRole);
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
      
      const event = await storage.createEvent(familyId, result.data);
      res.status(201).json(event);
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

  const httpServer = createServer(app);
  return httpServer;
}
