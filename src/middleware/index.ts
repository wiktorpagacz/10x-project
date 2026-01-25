import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../db/database.types.ts";

// In-memory store for rate limiting: userId -> array of request timestamps
const rateLimitStore = new Map<string, number[]>();

// Rate limit configuration: 5 requests per minute per user
const RATE_LIMIT_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Checks if a user has exceeded their rate limit for the given endpoint.
 * Returns true if the request should be allowed, false if it should be rejected.
 */
function checkRateLimit(userId: string, endpoint: string): boolean {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();

  // Get existing timestamps for this user
  let timestamps = rateLimitStore.get(key) || [];

  // Remove timestamps older than the window
  timestamps = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  // Check if we've exceeded the limit
  if (timestamps.length >= RATE_LIMIT_REQUESTS) {
    return false;
  }

  // Add the current request timestamp
  timestamps.push(now);
  rateLimitStore.set(key, timestamps);

  return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Create a Supabase client per request that can handle cookies
  const supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookies: {
      getAll() {
        // Get all cookies from Astro context
        const cookieHeader = context.request.headers.get("cookie");
        if (!cookieHeader) return [];

        return cookieHeader.split("; ").map((cookie) => {
          const [name, ...rest] = cookie.split("=");
          return {
            name,
            value: rest.join("="),
          };
        });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, options);
        });
      },
    },
  });

  context.locals.supabase = supabase;

  // Get the session from Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();
  context.locals.session = session;

  // Check rate limiting for generation endpoint
  if (context.request.method === "POST" && context.request.url.includes("/api/generations")) {
    const userId = session?.user?.id;

    if (userId && !checkRateLimit(userId, "POST:/api/generations")) {
      return new Response(
        JSON.stringify({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Maximum 5 requests per minute allowed.",
          },
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  return next();
});
