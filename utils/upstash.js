'use strict';

/**
 * Upstash Redis REST API utility.
 *
 * Relies on two environment variables (set via GitHub Actions secrets or
 * a local .env file sourced before running):
 *
 *   UPSTASH_URL   – e.g. https://usw1-<id>.upstash.io
 *   UPSTASH_TOKEN – Upstash REST token
 *
 * The mobile app writes the raw SMS string to the Redis key `findeks_otp`:
 *   SET findeks_otp "Giriş şifreniz: 123456"
 */

const UPSTASH_URL = process.env.UPSTASH_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_TOKEN;
const OTP_KEY = 'findeks_otp';
const POLL_INTERVAL_MS = 5000; // 5 seconds between polls

// -----------------------------------------------------------------------
// Internal helper: make an authenticated request to the Upstash REST API
// -----------------------------------------------------------------------
async function upstashFetch(path) {
    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        throw new Error('UPSTASH_URL and UPSTASH_TOKEN environment variables must be set.');
    }

    const response = await fetch(`${UPSTASH_URL}${path}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Upstash API error [${response.status}]: ${body}`);
    }

    return response.json();
}

// -----------------------------------------------------------------------
// clearOTP()
// Deletes the `findeks_otp` key so stale values from a previous run
// don't accidentally get used.
// -----------------------------------------------------------------------
async function clearOTP() {
    console.log(`[Upstash] Clearing existing OTP key "${OTP_KEY}"…`);
    const data = await upstashFetch(`/del/${OTP_KEY}`);
    // Upstash DEL returns { result: <number of keys deleted> }
    console.log(`[Upstash] clearOTP result: ${data.result} key(s) deleted.`);
}

// -----------------------------------------------------------------------
// waitForOTP(timeoutMs)
// Polls Upstash every 5 s until it finds a value at `findeks_otp`.
// Extracts and returns the 6-digit OTP using /\b\d{6}\b/.
// Throws if no OTP is received within timeoutMs.
// -----------------------------------------------------------------------
async function waitForOTP(timeoutMs = 180000) {
    const deadline = Date.now() + timeoutMs;
    console.log(`[Upstash] Waiting up to ${timeoutMs / 1000}s for OTP in key "${OTP_KEY}"…`);

    while (Date.now() < deadline) {
        const data = await upstashFetch(`/get/${OTP_KEY}`);
        // Upstash GET returns { result: "<value>" } or { result: null }
        const value = data.result;

        if (value && typeof value === 'string') {
            const match = value.match(/\b\d{6}\b/);
            if (match) {
                const otp = match[0];
                console.log(`[Upstash] OTP found: ${otp} (from message: "${value}")`);
                return otp;
            }

            console.warn(`[Upstash] Key has a value but no 6-digit OTP found: "${value}". Still waiting…`);
        } else {
            console.log('[Upstash] No OTP yet. Retrying in 5s…');
        }

        // Wait before the next poll
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(`[Upstash] OTP not received within ${timeoutMs / 1000} seconds. Aborting.`);
}

module.exports = { clearOTP, waitForOTP };
