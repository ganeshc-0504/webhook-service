const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
    port: process.env.PORT || 3000,
    webhookSecret: process.env.WEBHOOK_SECRET,
    nodeEnv: process.env.NODE_ENV || 'development',
};

// Validate required configuration
if (!config.webhookSecret) {
    console.error('ERROR: WEBHOOK_SECRET environment variable is required');
    process.exit(1);
}

module.exports = config;
