import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
    projectPath: process.env.UA_PROJECT_PATH || './',
    licenseKey: process.env.UA_LICENSE_KEY || '',
    apiUrl: process.env.UA_API_URL || 'https://ua-mcp-backend.onrender.com',
    pollIntervalMs: parseInt(process.env.UA_POLL_INTERVAL_MS || '3600000', 10),
};

if (config.apiUrl !== 'https://ua-mcp-backend.onrender.com') {
    console.error(`\x1b[33mWARNING: You are using a custom backend API URL (${config.apiUrl}). This backend will receive your knowledge graph and source file paths. Ensure you trust this endpoint.\x1b[0m`);
}
