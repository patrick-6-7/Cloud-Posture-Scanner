const logger = require('../utils/logger.js');

// Allows one request per `seconds` across all clients, measured from the start of the
// previous allowed request. Kept in memory: it resets on restart and isn't shared
// between multiple server instances.
const cooldown = (seconds) => {
    let lastStartedAt = 0;

    return (req, res, next) => {
        const now = Date.now();
        const elapsed = Math.floor((now - lastStartedAt) / 1000);
        const retryAfter = Math.ceil((lastStartedAt + seconds * 1000 - now) / 1000);

        if (retryAfter > 0) {
            logger.warn(`Cooldown: rejected ${req.method} ${req.originalUrl} (retry in ${retryAfter}s)`);
            // retryAfter is also in the body so the browser can read it without exposing the header via CORS.
            return res.set('Retry-After', String(retryAfter)).status(429).json({
                error: 'TooManyRequests',
                message: `CIS checks ran ${elapsed}s ago. Try again in ${retryAfter}s.`,
                retryAfter
            });
        }

        lastStartedAt = now;
        next();
    };
};

module.exports = cooldown;
