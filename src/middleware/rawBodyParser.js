const MAX_BODY_SIZE = 1024 * 1024; // 1MB limit

function rawBodyParser(req, res, next) {
    // Only capture raw body for webhook endpoints
    if (!req.path.startsWith('/webhooks')) {
        return next();
    }

    let rawBody = '';
    let bodySize = 0;

    req.setEncoding('utf8');

    req.on('data', (chunk) => {
        bodySize += chunk.length;

        // Enforce size limit
        if (bodySize > MAX_BODY_SIZE) {
            res.status(413).json({ error: 'Request body too large' });
            req.connection.destroy();
            return;
        }

        rawBody += chunk;
    });

    req.on('end', () => {
        // Store raw body for signature verification
        req.rawBody = rawBody;
        next();
    });

    req.on('error', (err) => {
        next(err);
    });
}

module.exports = rawBodyParser;
