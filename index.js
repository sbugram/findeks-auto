'use strict';

require('dotenv').config();
const { startWebhookServer } = require('./src/server/webhookServer');
const { startScheduler } = require('./src/scheduler/scheduler');

async function main() {
    console.log('='.repeat(60));
    console.log(' Findeks Auto — Starting up');
    console.log('='.repeat(60));

    // 1. Start the Express webhook server (always listening)
    await startWebhookServer();

    // 2. Register the weekly cron schedule
    startScheduler();

    console.log('[Main] System is ready. Waiting for Tuesday 09:00 AM…');
    console.log('[Main] To test the OTP webhook manually, run:');
    console.log('       curl -X POST http://localhost:3000/api/webhook/otp \\');
    console.log('            -H "Content-Type: application/json" \\');
    console.log('            -d \'{"otp":"123456"}\'');
}

main().catch((err) => {
    console.error('[Main] Fatal error:', err);
    process.exit(1);
});
