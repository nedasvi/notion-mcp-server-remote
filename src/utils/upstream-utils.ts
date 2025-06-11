interface NotionOAuthTokenResponse {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_id: string;
  workspace_name?: string;
  workspace_icon?: string;
  duplicated_template_id?: string;
  owner: {
    type: string;
    user?: {
      object: string;
      id: string;
      name?: string;
      avatar_url?: string;
      type?: string;
      person?: any;
    };
  };
}

/**
 * Constructs an authorization URL for an upstream service.
 *
 * @param {Object} options
 * @param {string} options.upstream_url - The base URL of the upstream service.
 * @param {string} options.client_id - The client ID of the application.
 * @param {string} options.redirect_uri - The redirect URI of the application.
 * @param {string} [options.state] - The state parameter.
 * @param {string} [options.owner] - The owner parameter (for Notion).
 *
 * @returns {string} The authorization URL.
 */
export function getUpstreamAuthorizeUrl({
  upstream_url,
  client_id,
  redirect_uri,
  state,
  owner = "user",
}: {
  upstream_url: string;
  client_id: string;
  redirect_uri: string;
  state?: string;
  owner?: string;
}) {
  const upstream = new URL(upstream_url);
  upstream.searchParams.set("client_id", client_id);
  upstream.searchParams.set("redirect_uri", redirect_uri);
  upstream.searchParams.set("response_type", "code");
  upstream.searchParams.set("owner", owner);
  if (state) upstream.searchParams.set("state", state);
  return upstream.href;
}

/**
 * Fetches an authorization token from an upstream service.
 *
 * @param {Object} options
 * @param {string} options.client_id - The client ID of the application.
 * @param {string} options.client_secret - The client secret of the application.
 * @param {string} options.code - The authorization code.
 * @param {string} options.redirect_uri - The redirect URI of the application.
 * @param {string} options.upstream_url - The token endpoint URL of the upstream service.
 *
 * @returns {Promise<[NotionOAuthTokenResponse, null] | [null, Response]>} A promise that resolves to an array containing the access token or an error response.
 */
export async function fetchUpstreamAuthToken({
  client_id,
  client_secret,
  code,
  redirect_uri,
  upstream_url,
}: {
  code: string | undefined;
  upstream_url: string;
  client_secret: string;
  redirect_uri: string;
  client_id: string;
}): Promise<[NotionOAuthTokenResponse, null] | [null, Response]> {
  if (!code) {
    return [null, new Response("Missing code", { status: 400 })];
  }
  
  // Notion uses Basic auth with base64-encoded client_id:client_secret
  const credentials = btoa(`${client_id}:${client_secret}`);
  
  const resp = await fetch(upstream_url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri,
    }),
  });
  
  if (!resp.ok) {
    console.log(await resp.text());
    return [
      null,
      new Response("Failed to fetch access token", { status: 500 }),
    ];
  }
  
  const body = (await resp.json()) as NotionOAuthTokenResponse;
  const accessToken = body.access_token;
  if (!accessToken) {
    return [null, new Response("Missing access token", { status: 400 })];
  }
  return [body, null];
}

export type Props = {
  bot_id: string; // Notion's unique bot ID
  workspace_id: string; // Workspace ID
  workspace_name?: string; // Workspace name
  owner: {
    type: string;
    user?: {
      object: string;
      id: string;
      name?: string;
      avatar_url?: string;
      type?: string;
      person?: any;
    };
  };
  accessToken: string; // Access token for API calls
}; 