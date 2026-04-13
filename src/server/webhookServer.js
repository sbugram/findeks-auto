'use strict';

require('dotenv').config();
const express = require('express');
const otpEmitter = require('./otpEmitter');

const PORT = process.env.WEBHOOK_PORT || 3000;

const app = express();
app.use(express.json());

// In-memory OTP cache — set by POST, consumed by GET
let lastOtp = null;

// -----------------------------------------------------------------------
// Health check
// -----------------------------------------------------------------------
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------
// POST /api/webhook/otp
// Expected body: { "message": "Giriş için şifreniz: 123456 B001" }
// The 6-digit OTP is extracted from the SMS message string via regex.
// -----------------------------------------------------------------------
app.post('/api/webhook/otp', (req, res) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Invalid payload. Expected { "message": "<SMS message string>" }',
        });
    }

    // Extract the first 6-digit sequence from the SMS message
    const match = message.match(/\b\d{6}\b/);
    if (!match) {
        return res.status(422).json({
            success: false,
            message: 'No 6-digit OTP found in the provided message string.',
        });
    }

    const otp = match[0];
    console.log(`[WebhookServer] OTP extracted: ${otp}`);
    console.log(`[WebhookServer] From message: "${message}"`);

    lastOtp = otp;               // cache for GET polling
    otpEmitter.emit('otpReceived', otp);

    return res.status(200).json({ success: true, otp, message: 'OTP extracted and forwarded.' });
});

// -----------------------------------------------------------------------
// GET /api/otp-status  — polled by the browser subagent
// Returns the last extracted OTP and clears it after one read.
// -----------------------------------------------------------------------
app.get('/api/otp-status', (_req, res) => {
    if (lastOtp) {
        const otp = lastOtp;
        lastOtp = null;   // consume once
        return res.json({ ready: true, otp });
    }
    return res.json({ ready: false, otp: null });
});

// -----------------------------------------------------------------------
// Start server and return the http.Server instance so it can be closed
// programmatically if needed.
// -----------------------------------------------------------------------
function startWebhookServer() {
    return new Promise((resolve) => {
        const server = app.listen(PORT, () => {
            console.log(`[WebhookServer] Listening on http://localhost:${PORT}`);
            console.log(`[WebhookServer] OTP endpoint: POST http://localhost:${PORT}/api/webhook/otp`);
            resolve(server);
        });
    });
}

module.exports = { startWebhookServer, app };
