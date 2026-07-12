import axios from 'axios';
import { config } from '../config.js';

export type Tier = 'Free' | 'Pro';

export interface LicenseInfo {
    valid: boolean;
    tier: Tier;
    expiresAt?: string;
    features?: string[];
}

let cachedLicense: LicenseInfo | null = null;
let lastCheckTime = 0;

export async function validateLicense(): Promise<LicenseInfo> {
    const now = Date.now();
    if (cachedLicense && (now - lastCheckTime < config.pollIntervalMs)) {
        return cachedLicense;
    }

    if (!config.licenseKey) {
        cachedLicense = { valid: true, tier: 'Free' };
        lastCheckTime = now;
        return cachedLicense;
    }

    try {
        const response = await axios.post(`${config.apiUrl}/validate`, {
            key: config.licenseKey
        }, {
            headers: {
                'x-license-key': config.licenseKey
            }
        });
        
        if (response.data && response.data.valid) {
            cachedLicense = {
                valid: true,
                tier: response.data.tier || 'Free',
                expiresAt: response.data.expires_at,
                features: response.data.features || []
            };
        } else {
            cachedLicense = { valid: false, tier: 'Free' }; // fallback to free
        }
    } catch (error) {
        console.error('Failed to validate license, falling back to Free tier:', error);
        cachedLicense = { valid: false, tier: 'Free' };
    }

    lastCheckTime = now;
    return cachedLicense;
}

export async function requireTier(minimumTier: Tier): Promise<boolean> {
    const license = await validateLicense();
    if (minimumTier === 'Free') return true;
    if (minimumTier === 'Pro' && license.tier === 'Pro') return true;
    return false;
}
