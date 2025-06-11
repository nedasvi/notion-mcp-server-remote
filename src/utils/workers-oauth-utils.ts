import type {
  ClientInfo,
  AuthRequest,
  Client,
} from "@cloudflare/workers-oauth-provider";

const COOKIE_NAME = "mcp-approved-clients";
const ONE_YEAR_IN_SECONDS = 31536000;

/**
 * Imports a secret key string for HMAC-SHA256 signing.
 */
async function importKey(secret: string): Promise<CryptoKey> {
  if (!secret) {
    throw new Error(
      "Cookie encryption key is not defined. A secret key is required for signing cookies."
    );
  }
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Signs data using HMAC-SHA256.
 */
async function signData(key: CryptoKey, data: string): Promise<string> {
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(data)
  );
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifies an HMAC-SHA256 signature.
 */
async function verifySignature(
  key: CryptoKey,
  signatureHex: string,
  data: string
): Promise<boolean> {
  const enc = new TextEncoder();
  try {
    const signatureBytes = new Uint8Array(
      signatureHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes.buffer,
      enc.encode(data)
    );
  } catch (e) {
    console.error("Error verifying signature:", e);
    return false;
  }
}

/**
 * Parses the signed cookie and verifies its integrity.
 */
async function getApprovedClientsFromCookie(
  cookieHeader: string | null,
  secret: string
): Promise<string[] | null> {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const targetCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!targetCookie) return null;

  const cookieValue = targetCookie.substring(COOKIE_NAME.length + 1);
  const parts = cookieValue.split(".");

  if (parts.length !== 2) {
    console.warn("Invalid cookie format received.");
    return null;
  }

  const [signatureHex, base64Payload] = parts;
  const payload = atob(base64Payload);

  const key = await importKey(secret);
  const isValid = await verifySignature(key, signatureHex, payload);

  if (!isValid) {
    console.warn("Cookie signature verification failed.");
    return null;
  }

  try {
    const approvedClients = JSON.parse(payload);
    if (!Array.isArray(approvedClients)) {
      console.warn("Cookie payload is not an array.");
      return null;
    }
    if (!approvedClients.every((item) => typeof item === "string")) {
      console.warn("Cookie payload contains non-string elements.");
      return null;
    }
    return approvedClients as string[];
  } catch (e) {
    console.error("Error parsing cookie payload:", e);
    return null;
  }
}

/**
 * Checks if a given client ID has already been approved by the user.
 */
export async function clientIdAlreadyApproved(
  request: Request,
  clientId: string,
  cookieSecret: string
): Promise<boolean> {
  if (!clientId) return false;
  const cookieHeader = request.headers.get("Cookie");
  const approvedClients = await getApprovedClientsFromCookie(
    cookieHeader,
    cookieSecret
  );

  return approvedClients?.includes(clientId) ?? false;
}

/**
 * Configuration for the approval dialog
 */
export interface ApprovalDialogOptions {
  client: ClientInfo;
  server: {
    name: string;
    logo?: string;
    description?: string;
  };
  state: Record<string, any>;
}

/**
 * Renders an approval dialog for the user to authorize the OAuth client.
 */
export function renderApprovalDialog(
  request: Request,
  options: ApprovalDialogOptions
): Response {
  const { client, server, state } = options;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorize ${client.name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 32px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .server-info {
            text-align: center;
            margin-bottom: 24px;
        }
        .server-logo {
            width: 64px;
            height: 64px;
            border-radius: 12px;
            margin-bottom: 16px;
        }
        .server-name {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #1a1a1a;
        }
        .server-description {
            color: #666;
            font-size: 14px;
            line-height: 1.4;
        }
        .client-info {
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .client-name {
            font-weight: 600;
            margin-bottom: 4px;
            color: #1a1a1a;
        }
        .client-description {
            color: #666;
            font-size: 14px;
        }
        .permissions {
            margin-bottom: 24px;
        }
        .permissions-title {
            font-weight: 600;
            margin-bottom: 12px;
            color: #1a1a1a;
        }
        .permission-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            color: #666;
            font-size: 14px;
        }
        .permission-icon {
            width: 16px;
            height: 16px;
            margin-right: 8px;
            color: #22c55e;
        }
        .buttons {
            display: flex;
            gap: 12px;
        }
        .button {
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .button-primary {
            background-color: #2563eb;
            color: white;
        }
        .button-primary:hover {
            background-color: #1d4ed8;
        }
        .button-secondary {
            background-color: #f3f4f6;
            color: #374151;
        }
        .button-secondary:hover {
            background-color: #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="server-info">
            <img src="${server.logo || 'https://www.notion.so/images/favicon.ico'}" alt="${server.name} Logo" class="server-logo">
            <div class="server-name">${server.name}</div>
            <div class="server-description">${server.description || "This application will be able to access and modify your data."}</div>
        </div>
        
        <div class="client-info">
            <div class="client-name">${client.name || "Application"}</div>
            <div class="client-description">wants to access your ${server.name} data</div>
        </div>
        
        <div class="permissions">
            <div class="permissions-title">This will allow the application to:</div>
            <div class="permission-item">
                <svg class="permission-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Read and write pages and databases
            </div>
            <div class="permission-item">
                <svg class="permission-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Access workspace information
            </div>
            <div class="permission-item">
                <svg class="permission-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Search content
            </div>
        </div>
        
        <form method="POST" class="buttons">
            <input type="hidden" name="state" value='${JSON.stringify(state)}'>
            <button type="button" class="button button-secondary" onclick="window.close()">Cancel</button>
            <button type="submit" name="approved" value="true" class="button button-primary">Authorize</button>
        </form>
    </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

export interface ParsedApprovalResult {
  state: any;
  headers: Record<string, string>;
}

/**
 * Parses the form submission from the approval dialog.
 */
export async function parseRedirectApproval(
  request: Request,
  cookieSecret: string
): Promise<ParsedApprovalResult> {
  const formData = await request.formData();
  const approved = formData.get("approved");
  const stateData = formData.get("state");
  
  if (approved !== "true" || !stateData) {
    throw new Error("Approval denied or invalid state");
  }
  
  const state = JSON.parse(stateData as string);
  
  // Get existing approved clients
  const cookieHeader = request.headers.get("Cookie");
  const existingApprovedClients = await getApprovedClientsFromCookie(
    cookieHeader,
    cookieSecret
  ) || [];

  // Add new client ID if not already present
  const approvedClients = existingApprovedClients.includes(state.oauthReqInfo.clientId)
    ? existingApprovedClients
    : [...existingApprovedClients, state.oauthReqInfo.clientId];

  // Create signed cookie
  const payload = JSON.stringify(approvedClients);
  const key = await importKey(cookieSecret);
  const signature = await signData(key, payload);
  const cookieValue = `${signature}.${btoa(payload)}`;

  return {
    state,
    headers: {
      "Set-Cookie": `${COOKIE_NAME}=${cookieValue}; HttpOnly; Secure; SameSite=Lax; Max-Age=${ONE_YEAR_IN_SECONDS}; Path=/`,
    },
  };
}

/**
 * Simple cookie parser
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      cookies[name] = rest.join('=');
    }
  });
  
  return cookies;
} 