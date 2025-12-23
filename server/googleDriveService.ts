import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

async function getUncachableGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
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

export async function listDriveFiles(folderId?: string, pageToken?: string): Promise<{ files: DriveFile[], nextPageToken?: string }> {
  const drive = await getUncachableGoogleDriveClient();
  
  let query = "trashed = false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }
  
  const response = await drive.files.list({
    q: query,
    pageSize: 50,
    pageToken: pageToken,
    fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink, webViewLink)',
    orderBy: 'folder,name',
  });

  return {
    files: (response.data.files || []) as DriveFile[],
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

export async function getDriveFile(fileId: string): Promise<DriveFile> {
  const drive = await getUncachableGoogleDriveClient();
  
  const response = await drive.files.get({
    fileId: fileId,
    fields: 'id, name, mimeType, size, modifiedTime, iconLink, webViewLink',
  });

  return response.data as DriveFile;
}

export async function downloadDriveFile(fileId: string): Promise<{ buffer: Buffer, mimeType: string, name: string, size: string }> {
  const drive = await getUncachableGoogleDriveClient();
  
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

export async function checkDriveConnection(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
