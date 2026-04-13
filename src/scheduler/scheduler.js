'use strict';

const cron = require('node-cron');
const { runFindeksAutomation } = require('../automation/findeksAutomation');

/**
 * Schedule descriptor: every Tuesday at 09:00 AM.
 *
 * Cron format: second(optional) minute hour day-of-month month day-of-week
 *   0 9 * * 2   →  09:00, every Tuesday (2 = Tuesday in node-cron)
 */
const CRON_SCHEDULE = '0 9 * * 2';

let isRunning = false; // guard against overlapping executions

function startScheduler() {
    console.log(`[Scheduler] Automation scheduled: Tuesdays at 09:00 AM (cron: "${CRON_SCHEDULE}")`);

    cron.schedule(CRON_SCHEDULE, async () => {
        if (isRunning) {
            console.warn('[Scheduler] Previous run is still in progress – skipping this trigger.');
            return;
        }

        isRunning = true;
        console.log('[Scheduler] Triggering Findeks automation…');

        try {
            const result = await runFindeksAutomation();
            console.log('[Scheduler] Run completed successfully:', result);
        } catch (err) {
            console.error('[Scheduler] Run failed:', err.message);
        } finally {
            isRunning = false;
        }
    });
}

module.exports = { startScheduler };
