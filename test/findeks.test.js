'use strict';

const loginPage = require('../src/pages/LoginPage');
const creditScorePage = require('../src/pages/CreditScorePage');
const { clearOTP, waitForOTP } = require('../utils/upstash');

const LOGIN_URL = process.env.FINDEKS_LOGIN_URL || 'https://www.findeks.com/giris';
const TC = process.env.FINDEKS_TC;
const PASSWORD = process.env.FINDEKS_PASSWORD;

describe('Findeks Credit Score Automation', () => {
    it('should log in, retrieve OTP, navigate the credit score flow, and extract the score', async () => {

        // ── Step 1: Clear any stale OTP from a previous run ──────────────────
        await clearOTP();

        // ── Step 2: Navigate to the login page ───────────────────────────────
        console.log('[Test] Navigating to login page…');
        await loginPage.open(LOGIN_URL);

        // ── Step 3: Enter credentials ─────────────────────────────────────────
        if (!TC || !PASSWORD) {
            throw new Error('FINDEKS_TC and FINDEKS_PASSWORD environment variables must be set.');
        }
        console.log('[Test] Entering credentials…');
        await loginPage.enterTcId(TC);
        await loginPage.enterPassword(PASSWORD);

        // ── Step 4: Submit login form (Step 1) ───────────────────────────────
        console.log('[Test] Clicking login button…');
        await loginPage.clickLogin();

        // ── Step 4b: Security confirmation (Step 2 — triggers SMS) ───────────
        // "Güvenlik Teyidi" screen shows login history + security image.
        // Clicking this button sends the OTP SMS to the user's registered phone.
        console.log('[Test] Clicking security confirmation (triggers SMS send)…');
        await loginPage.clickSecurityNext();

        // ── Step 5: Wait for the OTP input field (Step 3) ────────────────────
        console.log('[Test] Waiting for OTP field (input#otpGirilen) to appear…');
        await loginPage.waitForOtpField(30000);

        // ── Step 6: Poll Upstash Redis for the OTP (up to 3 minutes) ─────────
        // The mobile app must write the incoming SMS to Redis key "findeks_otp".
        console.log('[Test] Polling Upstash for OTP…');
        const otp = await waitForOTP(180000);
        console.log(`[Test] OTP received: ${otp}`);

        // ── Step 7: Enter OTP and submit ──────────────────────────────────────
        await loginPage.enterOtp(otp);
        await loginPage.submitOtp();

        // ── Step 8: Navigate to Findeks Kredi Notu ────────────────────────────
        // After OTP the user lands on the dashboard. Click the credit score entry.
        console.log('[Test] Navigating to Findeks Kredi Notu…');
        await creditScorePage.navigateToKrediNotu();

        // ── Step 9: Click "Devam" on the info/intro page ─────────────────────
        console.log('[Test] Clicking Devam on info page…');
        await creditScorePage.clickDevam();

        // ── Step 10: Accept both agreement checkboxes ─────────────────────────
        // 1. Sözleşme Öncesi Bilgilendirme Formunu okudum ve onaylıyorum.
        // 2. Hizmet Sözleşmesini okudum ve onaylıyorum.
        console.log('[Test] Accepting agreements…');
        await creditScorePage.acceptAgreements();

        // ── Step 11: Click the final proceed button ───────────────────────────
        // On Tuesdays (free day) this triggers the score calculation at no cost.
        console.log('[Test] Clicking proceed to calculate credit score…');
        await creditScorePage.clickProceed();

        // ── Step 12: Extract and log the credit score ─────────────────────────
        const score = await creditScorePage.getCreditScore();
        const label = await creditScorePage.getCreditScoreLabel();

        console.log('─'.repeat(50));
        console.log(`✅  Findeks Credit Score : ${score}`);
        console.log(`    Rating               : ${label}`);
        console.log(`    Timestamp            : ${new Date().toISOString()}`);
        console.log('─'.repeat(50));

        // Fail loudly if score is missing (selector needs updating)
        expect(score).not.toBeNull();
        expect(score).not.toBe('');
    });
});
