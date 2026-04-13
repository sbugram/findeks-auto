'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const RESULTS_FILE = process.env.RESULTS_FILE || './data/results.json';

/**
 * Append a timestamped result record to the JSON results file.
 * The file is a JSON array; if it does not exist it will be created.
 *
 * @param {{ score: string|null, label: string|null }} data
 */
async function saveResult(data) {
    const record = {
        timestamp: new Date().toISOString(),
        score: data.score,
        label: data.label,
    };

    const absPath = path.resolve(RESULTS_FILE);
    const dir = path.dirname(absPath);

    // Ensure the output directory exists
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Also ensure a screenshots sub-directory exists
    const screenshotsDir = path.join(dir, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    let existing = [];
    if (fs.existsSync(absPath)) {
        try {
            existing = JSON.parse(fs.readFileSync(absPath, 'utf8'));
        } catch {
            existing = [];
        }
    }

    existing.push(record);
    fs.writeFileSync(absPath, JSON.stringify(existing, null, 2), 'utf8');

    console.log(`[ResultSaver] Result saved to ${absPath}`);
    console.log('[ResultSaver]', JSON.stringify(record, null, 2));
}

module.exports = { saveResult };
