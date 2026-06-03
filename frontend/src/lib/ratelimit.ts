import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Allow graceful degradation if keys are missing in local development
export const isRateLimitConfigured = () => {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
};

// Only initialize if configured, to prevent crashes on startup if env vars are missing
export const bookingRatelimit = isRateLimitConfigured() 
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(3, "60 s"),
      analytics: true,
      prefix: "pather_saathi:booking",
    })
  : null;
