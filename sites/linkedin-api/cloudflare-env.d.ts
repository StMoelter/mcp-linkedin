declare namespace Cloudflare {
  interface Env {
    DB?:D1Database;
    BUCKET?:R2Bucket;
    SITE_ORIGIN?:string;
    LINKEDIN_CLIENT_ID?:string;
    LINKEDIN_CLIENT_SECRET?:string;
    TOKEN_ENCRYPTION_KEY?:string;
    LINKEDIN_API_VERSION?:string;
  }
}
