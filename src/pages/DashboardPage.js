'use strict';

/**
 * Page Object — Findeks Dashboard Page
 *
 * The dashboard URL after successful 2FA is typically:
 *   https://isube.findeks.com/ers/dashboard.xhtml  (or /ers/index.xhtml)
 *
 * Credit score selectors CANNOT be verified without a live authenticated
 * session. The selectors below are based on Findeks's known CSS class
 * patterns. Tune after first successful login.
 */
class DashboardPage {
    // ── Selectors ─────────────────────────────────────────────────────────────

    /**
     * Findeks Skoru (credit score number).
     * ⚠️ Inspect with DevTools after a real login and update this selector.
     * Common patterns on the site:
     *   - An element with class containing "score" and a 3-digit number
     *   - May be inside a <canvas> wrapper → may need canvas read workaround
     */
    get creditScoreValue() {
        return $(
            '.findeks-score-value, ' +
            '[class*="scoreValue"], ' +
            '[class*="score-value"], ' +
            '[class*="findeksScore"], ' +
            '.score-number, ' +
            'span[class*="score"]:not([class*="label"]):not([class*="category"])'
        );
    }

    /** Score rating label (e.g. "Çok İyi", "İyi", "Orta") */
    get creditScoreLabel() {
        return $(
            '[class*="score-label"], ' +
            '[class*="scoreLabel"], ' +
            '[class*="score-category"], ' +
            '.score-rating'
        );
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    /**
     * Wait until the post-login dashboard URL is reached.
     * Findeks redirects away from /ers/login.xhtml after successful 2FA.
     */
    async waitForLoad(timeout = 30000) {
        await browser.waitUntil(
            async () => {
                const url = await browser.getUrl();
                return !url.includes('login') && !url.includes('giris');
            },
            { timeout, timeoutMsg: 'Dashboard did not load within expected time.' }
        );
        await browser.pause(2000);
    }

    /**
     * Extract credit score text, or null if selector doesn't match.
     * @returns {Promise<string|null>}
     */
    async getCreditScore() {
        try {
            const el = await this.creditScoreValue;
            await el.waitForDisplayed({ timeout: 20000 });
            return (await el.getText()).trim() || null;
        } catch {
            console.warn('[DashboardPage] Credit score element not found — update selector after live login.');
            return null;
        }
    }

    /**
     * @returns {Promise<string|null>}
     */
    async getCreditScoreLabel() {
        try {
            const el = await this.creditScoreLabel;
            await el.waitForDisplayed({ timeout: 15000 });
            return (await el.getText()).trim() || null;
        } catch {
            return null;
        }
    }
}

module.exports = new DashboardPage();
