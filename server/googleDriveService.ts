import { google } from 'googleapis';
import { storage } from './storage';

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// drive.file is the lightest Drive scope: the app can only touch files the user
// explicitly hands it via the Google Picker (or files it created). This avoids
// Google's restricted-scope CASA security assessment that drive.readonly requires.
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

// Resolve the Drive-specific OAuth callback URL
export function resolveDriveCallbackURL(): string {
  if (process.env.GOOGLE_DRIVE_CALLBACK_URL) return process.env.GOOGLE_DRIVE_CALLBACK_URL;
  if (process.env.NODE_ENV === "production") return "https://kindora.ai/api/google-drive/callback";
  const domain = (process.env.REPLIT_DOMAINS || "").split(",")[0].trim();
  return domain
    ? `https://${domain}/api/google-drive/callback`
    : "http://localhost:5000/api/google-drive/callback";
}

// Get a valid access token for a specific user, refreshing if needed
export async function getValidDriveAccessToken(userId: string): Promise<string> {
  const conn = await storage.getGoogleDriveConnection(userId);
  if (!conn) throw new Error("No Google Drive connection found");

  const now = new Date();
  // Use cached token if still valid (with 60s buffer)
  if (conn.accessToken && conn.accessTokenExpiresAt && conn.accessTokenExpiresAt > new Date(now.getTime() + 60_000)) {
    return conn.accessToken;
  }

  // Refresh the token
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: conn.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json() as any;
  if (!res.ok || !data.access_token) {
    throw new Error(`Drive token refresh failed: ${JSON.stringify(data)}`);
  }

  const expiresAt = new Date(now.getTime() + (data.expires_in ?? 3600) * 1000);
  await storage.updateGoogleDriveConnection(userId, {
    accessToken: data.access_token,
    accessTokenExpiresAt: expiresAt,
  });

  return data.access_token;
}

// Build an authenticated Drive client for a specific user
async function getDriveClientForUser(userId: string) {
  const accessToken = await getValidDriveAccessToken(userId);

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Fetch the connected Google account's email (for display)
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data.email ?? null;
  } catch {
    return null;
  }
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
}

export async function getDriveFileMeta(userId: string, fileId: string): Promise<{ id: string; name: string; mimeType: string; size?: string }> {
  const drive = await getDriveClientForUser(userId);
  const response = await drive.files.get({
    fileId: fileId,
    fields: 'id, name, mimeType, size',
  });
  return response.data as { id: string; name: string; mimeType: string; size?: string };
}

export async function getDriveFile(userId: string, fileId: string): Promise<DriveFile> {
  const drive = await getDriveClientForUser(userId);

  const response = await drive.files.get({
    fileId: fileId,
    fields: 'id, name, mimeType, size, modifiedTime, iconLink, webViewLink',
  });

  return response.data as DriveFile;
}

export async function downloadDriveFile(userId: string, fileId: string): Promise<{ buffer: Buffer, mimeType: string, name: string, size: string }> {
  const drive = await getDriveClientForUser(userId);

  const metadata = await drive.files.get({
    fileId: fileId,
    fields: 'id, name, mimeType, size',
  });

  const { name, mimeType, size } = metadata.data;

  if (!name || !mimeType) {
    throw new Error('Could not retrieve file metadata');
  }

  const isGoogleDoc = mimeType.startsWith('application/vnd.google-apps.');

  let buffer: Buffer;

  if (isGoogleDoc) {
    let exportMimeType = 'application/pdf';
    let exportExtension = '.pdf';

    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      exportExtension = '.xlsx';
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
      exportMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      exportExtension = '.pptx';
    }

    const response = await drive.files.export({
      fileId: fileId,
      mimeType: exportMimeType,
    }, { responseType: 'arraybuffer' });

    buffer = Buffer.from(response.data as ArrayBuffer);

    const baseName = name.replace(/\.[^/.]+$/, '');
    return {
      buffer,
      mimeType: exportMimeType,
      name: baseName + exportExtension,
      size: buffer.length.toString(),
    };
  } else {
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media',
    }, { responseType: 'arraybuffer' });

    buffer = Buffer.from(response.data as ArrayBuffer);

    return {
      buffer,
      mimeType,
      name,
      size: size || buffer.length.toString(),
    };
  }
}

export async function checkDriveConnection(userId: string): Promise<boolean> {
  try {
    await getValidDriveAccessToken(userId);
    return true;
  } catch {
    return false;
  }
}
