import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
    projectPath: process.env.UA_PROJECT_PATH || './',
    licenseKey: process.env.UA_LICENSE_KEY || '',
    apiUrl: process.env.UA_API_URL || 'https://ua-mcp-backend.onrender.com',
    pollIntervalMs: parseInt(process.env.UA_POLL_INTERVAL_MS || '3600000', 10),
};
