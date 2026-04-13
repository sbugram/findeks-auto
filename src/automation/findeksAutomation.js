'use strict';

require('dotenv').config();
const { remote } = require('webdriverio');
const otpEmitter = require('../server/otpEmitter');
const loginPage = require('../pages/LoginPage');
const dashboardPage = require('../pages/DashboardPage');
const { saveResult } = require('../utils/resultSaver');

const OTP_TIMEOUT_MS = parseInt(process.env.OTP_TIMEOUT_MS || '180000', 10);
const LOGIN_URL = process.env.FINDEKS_LOGIN_URL || 'https://www.findeks.com/giris';
const TC_ID = process.env.FINDEKS_TC_ID;
const PASSWORD = process.env.FINDEKS_PASSWORD;

// -----------------------------------------------------------------------
// Helper: Wait for the otpReceived event (with a timeout)
// -----------------------------------------------------------------------
function waitForOtp(timeoutMs) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            otpEmitter.removeAllListeners('otpReceived');
            reject(new Error(`OTP not received within ${timeoutMs / 1000} seconds.`));
        }, timeoutMs);

        otpEmitter.once('otpReceived', (otp) => {
            clearTimeout(timer);
            console.log('[Automation] OTP received from webhook – proceeding with login.');
            resolve(otp);
        });
    });
}

// -----------------------------------------------------------------------
// Main automation function
// -----------------------------------------------------------------------
async function runFindeksAutomation() {
    if (!TC_ID || !PASSWORD) {
        throw new Error('FINDEKS_TC_ID and FINDEKS_PASSWORD must be set in .env');
    }

    console.log('[Automation] Starting Findeks automation…');

    // --- Spin up a standalone WebdriverIO remote session ---
    const browser = await remote({
        logLevel: 'warn',
        capabilities: {
            browserName: 'chrome',
            'goog:chromeOptions': {
                args: [
                    '--headless',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                    '--incognito',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-extensions',
                    '--disable-infobars',
                    '--lang=tr-TR',
                ],
                excludeSwitches: ['enable-automation'],
                useAutomationExtension: false,
            },
        },
    });

    // Make the browser instance available to Page Objects via the global var
    global.browser = browser;

    try {
        // --- Step 1: Navigate to login page ---
        console.log('[Automation] Navigating to login page…');
        await loginPage.open(LOGIN_URL);

        // --- Step 2: Enter credentials ---
        console.log('[Automation] Entering TC ID and password…');
        await loginPage.enterTcId(TC_ID);
        await loginPage.enterPassword(PASSWORD);

        // --- Step 3: Click login ---
        console.log('[Automation] Clicking login button…');
        await loginPage.clickLogin();

        // --- Step 4: Wait for OTP via webhook ---
        console.log(`[Automation] Waiting up to ${OTP_TIMEOUT_MS / 1000}s for OTP from webhook…`);
        const otp = await waitForOtp(OTP_TIMEOUT_MS);

        // --- Step 5: Enter OTP and submit ---
        console.log(`[Automation] Entering OTP: ${otp}`);
        await loginPage.enterOtp(otp);
        await loginPage.submitOtp();

        // --- Step 6: Wait for dashboard to load ---
        console.log('[Automation] Waiting for dashboard to load…');
        await dashboardPage.waitForLoad(30000);

        // --- Step 7: Extract credit score ---
        console.log('[Automation] Extracting credit score…');
        const score = await dashboardPage.getCreditScore();
        const label = await dashboardPage.getCreditScoreLabel();

        console.log(`[Automation] ✅ Credit Score: ${score} (${label})`);

        // --- Step 8: Persist the result ---
        await saveResult({ score, label });

        // --- Step 9: Take a screenshot for audit trail ---
        await dashboardPage.takeScreenshot('success');

        return { score, label };
    } catch (err) {
        console.error('[Automation] ❌ Error during automation:', err.message);

        // Attempt to capture a screenshot for post-mortem analysis
        try {
            await browser.saveScreenshot(`./data/screenshots/error_${Date.now()}.png`);
        } catch (_) { /* ignore screenshot errors */ }

        throw err;
    } finally {
        // Always close the browser session
        console.log('[Automation] Closing browser session…');
        await browser.deleteSession();
    }
}

module.exports = { runFindeksAutomation };
