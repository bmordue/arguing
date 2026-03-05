import rateLimit from 'express-rate-limit';

// Standard rate limiter for general API endpoints: 100 requests per 15 minutes
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: '15 minutes'
    }
});

// Stricter rate limiter for webhook registration: 10 requests per 15 minutes
export const webhookRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        error: 'Too Many Requests',
        message: 'Webhook registration rate limit exceeded.',
        retryAfter: '15 minutes'
    }
});
