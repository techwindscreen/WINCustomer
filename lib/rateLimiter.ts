import type { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
}

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 10 * 60 * 1000);

export function rateLimit(options: RateLimitOptions) {
  return (req: NextApiRequest, res: NextApiResponse, next?: () => void) => {
    // Get client IP
    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress || 'unknown';
    
    const now = Date.now();
    const key = `${ip}:${req.url}`;
    
    // Initialize or reset if window expired
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + options.windowMs
      };
    } else {
      store[key].count++;
    }
    
    // Check if limit exceeded
    if (store[key].count > options.max) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
      });
    }
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - store[key].count));
    res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());
    
    if (next) next();
    return true;
  };
}

// Common rate limit configurations
export const strictRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }); // 5 requests per 15 minutes
export const normalRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }); // 100 requests per 15 minutes
export const uploadRateLimit = rateLimit({ windowMs: 60 * 1000, max: 5 }); // 5 uploads per minute 