import type {
  AuthRequest,
  OAuthHelpers,
} from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { Env } from "../worker-configuration";
import {
  fetchUpstreamAuthToken,
  getUpstreamAuthorizeUrl,
  Props,
} from "./utils/upstream-utils";
import {
  clientIdAlreadyApproved,
  parseRedirectApproval,
  renderApprovalDialog,
} from "./utils/workers-oauth-utils";

interface NotionUserInfo {
  object: "user";
  id: string;
  name: string;
  avatar_url?: string;
  type: "person" | "bot";
  person?: {
    email: string;
  };
  bot?: {
    owner: {
      type: "workspace";
      workspace: boolean;
    };
    workspace_name?: string;
  };
}

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

async function redirectToNotion(
  request: Request,
  oauthReqInfo: AuthRequest,
  env: Env,
  headers: Record<string, string> = {}
) {
  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      location: getUpstreamAuthorizeUrl({
        upstream_url: "https://api.notion.com/v1/oauth/authorize",
        client_id: env.NOTION_OAUTH_CLIENT_ID,
        redirect_uri: new URL("/callback", request.url).href,
        state: btoa(JSON.stringify(oauthReqInfo)), // Base64 encode the OAuth request info
        owner: "user",
      }),
    },
  });
}

app.get("/authorize", async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  const { clientId } = oauthReqInfo;
  if (!clientId) {
    return c.text("Invalid request", 400);
  }
  if (
    await clientIdAlreadyApproved(
      c.req.raw,
      oauthReqInfo.clientId,
      c.env.COOKIE_ENCRYPTION_KEY
    )
  ) {
    return redirectToNotion(c.req.raw, oauthReqInfo, c.env);
  }
  
  const client = await c.env.OAUTH_PROVIDER.lookupClient(clientId);
  if (!client) {
    return c.text("Client not found", 400);
  }
  
  return renderApprovalDialog(c.req.raw, {
    client,
    server: {
      name: "Cloudflare Notion MCP Server",
      logo: "https://www.notion.so/images/logo-ios.png",
      description:
        "This is a demo MCP Remote Server using Notion for authentication.",
    },
    state: { oauthReqInfo },
  });
});

app.post("/authorize", async (c) => {
  // Validates form submission, extracts state, and generates Set-Cookie headers to skip approval dialog next time
  const { state, headers } = await parseRedirectApproval(
    c.req.raw,
    c.env.COOKIE_ENCRYPTION_KEY
  );
  if (!state.oauthReqInfo) {
    return c.text("Invalid request", 400);
  }

  return redirectToNotion(c.req.raw, state.oauthReqInfo, c.env, headers);
});

app.get("/callback", async (c) => {
  const state = c.req.query("state");
  if (!state) {
    return c.text("Missing state", 400);
  }
  
  let oauthReqInfo: AuthRequest;
  try {
    // Parse base64-encoded OAuth request info (like Google implementation)
    oauthReqInfo = JSON.parse(atob(state)) as AuthRequest;
  } catch (error) {
    console.error("Error parsing state:", error);
    console.error("State value:", state);
    return c.text("Invalid state parameter", 400);
  }
  
  if (!oauthReqInfo.clientId) {
    return c.text("Invalid state", 400);
  }
  const code = c.req.query("code");
  if (!code) {
    return c.text("Missing code", 400);
  }

  // Exchange code for token to get user info
  const [notionAuthTokenResponse, errResponse] = await fetchUpstreamAuthToken({
    upstream_url: "https://api.notion.com/v1/oauth/token",
    client_id: c.env.NOTION_OAUTH_CLIENT_ID,
    client_secret: c.env.NOTION_OAUTH_CLIENT_SECRET,
    code,
    redirect_uri: new URL("/callback", c.req.url).href,
  });
  if (errResponse) return errResponse;

  // Get user info from the token response (Notion includes user info in token response)
  const { bot_id, workspace_id, workspace_name, owner } = notionAuthTokenResponse;
  
  // For user identification, we'll use the bot_id as the unique identifier
  const userId = bot_id;
  const userName = workspace_name || "Notion User";

  // Complete the OAuth flow with the provider
  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId,
    metadata: {
      label: userName,
    },
    scope: oauthReqInfo.scope,
    props: {
      bot_id: bot_id,
      workspace_id: workspace_id,
      workspace_name: workspace_name,
      owner,
      accessToken: notionAuthTokenResponse.access_token,
    } as Props,
  });
  
  return Response.redirect(redirectTo);
});

export { app as NotionHandler }; 