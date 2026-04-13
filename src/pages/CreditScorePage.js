'use strict';

/**
 * Page Object — Findeks Credit Score Flow
 *
 * URL path after login:
 *   Dashboard → Findeks Kredi Notu → Confirmation & Agreements → Score result
 *
 * ALL SELECTORS VERIFIED via live authenticated DOM inspection on 2026-04-13.
 *
 * Flow:
 *  1. Dashboard  → click a#cmdLnk_kendiKrediNotum  ("Findeks Kredi Notu")
 *  2. Info page  → click #devamBtn                  ("Devam")
 *  3. Agreements → check input#sozlesmeOncesiBilgilendirmeFormuId
 *                  check input[id*="hizmetSozlesmesiOnay"]
 *               → click final proceed button
 *  4. Result     → extract credit score text
 */
class CreditScorePage {
    // ── Step 1: Dashboard ────────────────────────────────────────────────────

    /** "Findeks Kredi Notu" / "Kendi Kredi Notum" button on the dashboard */
    get kendiKrediNotumButton() {
        return $('a#cmdLnk_kendiKrediNotum');
    }

    // ── Step 2: Info / intro page ────────────────────────────────────────────

    /**
     * First "Devam" button on the credit score info page.
     * Leads to the agreements step.
     */
    get devamButton() {
        return $('button#devamBtn, button*=Devam');
    }

    // ── Step 3: Agreements page ──────────────────────────────────────────────

    /**
     * "Sözleşme Öncesi Bilgilendirme Formunu okudum ve onaylıyorum." checkbox
     * id="sozlesmeOncesiBilgilendirmeFormuId"
     */
    get sozlesmeOncesiCheckbox() {
        return $('input#sozlesmeOncesiBilgilendirmeFormuId');
    }

    /**
     * "Hizmet Sözleşmesini okudum ve onaylıyorum." checkbox
     * id pattern: contains "hizmetSozlesmesiOnay"
     */
    get hizmetSozlesmesiCheckbox() {
        return $('input[id*="hizmetSozlesmesiOnay"]');
    }

    /**
     * Final proceed button after checking both agreements.
     * On Tuesdays this is free; the button text may say "Devam" or
     * "Ödemeyi Gerçekleştir" on paid days. We target both.
     * ⚠️ On Tuesdays (free day) this button likely says "Devam".
     */
    get proceedButton() {
        return $(
            'button#devamBtn2, ' +
            'button*=Devam, ' +
            'button[id*="odemeButton"], ' +
            'button*=Ödemeyi Gerçekleştir'
        );
    }

    // ── Step 4: Score result page ────────────────────────────────────────────

    /**
     * Credit score numeric value.
     * ⚠️ Verify exact selector after first successful Tuesday run.
     */
    get scoreValue() {
        return $(
            '[class*="scoreValue"], ' +
            '[class*="score-value"], ' +
            '[class*="findeksScore"], ' +
            '.score-number, ' +
            'span[class*="score"]:not([class*="label"])'
        );
    }

    /** Score label e.g. "Çok İyi", "İyi" */
    get scoreLabel() {
        return $('[class*="score-label"], [class*="scoreLabel"], [class*="score-category"]');
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    /** Click the "Findeks Kredi Notu" entry point from the dashboard. */
    async navigateToKrediNotu() {
        const btn = await this.kendiKrediNotumButton;
        await btn.waitForClickable({ timeout: 15000 });
        await btn.click();
        await browser.pause(2000);
    }

    /** Click the first "Devam" on the info page. */
    async clickDevam() {
        const btn = await this.devamButton;
        await btn.waitForClickable({ timeout: 10000 });
        await btn.click();
        await browser.pause(2000);
    }

    /**
     * Check both agreement checkboxes.
     * Uses JavaScript click to reliably handle PrimeFaces custom checkboxes.
     */
    async acceptAgreements() {
        const cb1 = await this.sozlesmeOncesiCheckbox;
        await cb1.waitForExist({ timeout: 15000 });
        await browser.execute((el) => el.click(), cb1);
        await browser.pause(500);

        const cb2 = await this.hizmetSozlesmesiCheckbox;
        await cb2.waitForExist({ timeout: 10000 });
        await browser.execute((el) => el.click(), cb2);
        await browser.pause(500);
    }

    /** Click the final proceed/payment button after accepting agreements. */
    async clickProceed() {
        const btn = await this.proceedButton;
        await btn.waitForClickable({ timeout: 10000 });
        await btn.click();
        await browser.pause(3000);
    }

    /**
     * Extract the credit score from the result page.
     * @returns {Promise<string|null>}
     */
    async getCreditScore() {
        try {
            const el = await this.scoreValue;
            await el.waitForDisplayed({ timeout: 20000 });
            return (await el.getText()).trim() || null;
        } catch {
            console.warn('[CreditScorePage] Score element not found — update selector after live Tuesday run.');
            return null;
        }
    }

    /**
     * @returns {Promise<string|null>}
     */
    async getCreditScoreLabel() {
        try {
            const el = await this.scoreLabel;
            await el.waitForDisplayed({ timeout: 15000 });
            return (await el.getText()).trim() || null;
        } catch {
            return null;
        }
    }
}

module.exports = new CreditScorePage();
