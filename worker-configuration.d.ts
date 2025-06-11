interface Env {
  // OAuth configuration
  NOTION_OAUTH_CLIENT_ID: string;
  NOTION_OAUTH_CLIENT_SECRET: string;
  COOKIE_ENCRYPTION_KEY: string;
  
  // Cloudflare bindings
  OAUTH_KV: KVNamespace;
  MCP_OBJECT: DurableObjectNamespace;

  // Optional environment variables
  ENVIRONMENT?: string;
}

// Extend the global scope to include our Env interface
declare global {
  interface CloudflareEnv extends Env {}
}

// Cloudflare Workers types
declare global {
  interface CloudflareWorkerGlobalScope {
    env: Env;
  }
}

export { Env }; 