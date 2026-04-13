'use strict';

/**
 * Page Object — Findeks Login Page
 *
 * URL: https://isube.findeks.com/ers/login.xhtml
 * (Redirected from https://www.findeks.com/giris)
 *
 * ALL SELECTORS VERIFIED via live DOM inspection on 2026-04-13.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Step 1 : TC ID + Password  →  button#normalGirisBtn        │
 * │  Step 2 : Security confirm  →  button#securityNextButton    │
 * │  Step 3 : Enter OTP         →  input#otpGirilen             │
 * │           Submit OTP        →  button#otpNextButton         │
 * └─────────────────────────────────────────────────────────────┘
 */
class LoginPage {
    // ── Step 1 Selectors ────────────────────────────────────────────────────

    /** TC Kimlik No — id="tckn", maxlength="11" */
    get tcInput() {
        return $('input#tckn');
    }

    /**
     * Password — id="fake_password", class="fakePasswordInput"
     * (Findeks renders a proxy field; automation targets it directly.)
     */
    get passwordInput() {
        return $('input#fake_password');
    }

    /** "Devam" primary login button — id="normalGirisBtn" */
    get loginButton() {
        return $('button#normalGirisBtn');
    }

    // ── Step 2 Selectors (Security confirmation intermediate step) ───────────

    /**
     * Security confirmation "Devam" button — id="securityNextButton"
     * Appears between Step 1 and the OTP screen. Must be clicked to
     * trigger the SMS being sent to the user's phone.
     */
    get securityNextButton() {
        return $('button#securityNextButton');
    }

    // ── Step 3 Selectors (OTP screen) ───────────────────────────────────────

    /**
     * OTP / SMS code input — id="otpGirilen"
     * Placeholder: "Tek Kullanımlık Şifre"
     * Class: ui-inputfield ui-inputtext ui-widget
     */
    get otpInput() {
        return $('input#otpGirilen');
    }

    /**
     * OTP confirm button — id="otpNextButton"
     * Text: "Devam" | Class: ui-button btn-primary
     */
    get otpSubmitButton() {
        return $('button#otpNextButton');
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    async open(url) {
        await browser.url(url);
        await browser.execute(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
        await browser.pause(1500);
    }

    async enterTcId(tc) {
        const el = await this.tcInput;
        await el.waitForDisplayed({ timeout: 15000 });
        await el.click();
        await el.clearValue();
        await el.setValue(tc);
    }

    async enterPassword(password) {
        const el = await this.passwordInput;
        await el.waitForDisplayed({ timeout: 15000 });
        await el.click();
        await el.clearValue();
        await el.setValue(password);
    }

    async clickLogin() {
        const btn = await this.loginButton;
        await btn.waitForClickable({ timeout: 10000 });
        await btn.click();
        await browser.pause(2000);
    }

    /**
     * Click the intermediate security confirmation button (Step 2).
     * This triggers the SMS to be sent to the user's registered phone.
     */
    async clickSecurityNext() {
        const btn = await this.securityNextButton;
        await btn.waitForClickable({ timeout: 15000 });
        await btn.click();
        await browser.pause(2000);
    }

    /** Wait until the OTP input (Step 3) is visible on screen. */
    async waitForOtpField(timeout = 30000) {
        const el = await this.otpInput;
        await el.waitForDisplayed({
            timeout,
            timeoutMsg: 'OTP input field (input#otpGirilen) did not appear.',
        });
    }

    async enterOtp(otp) {
        const el = await this.otpInput;
        await el.click();
        await el.clearValue();
        await el.setValue(otp);
    }

    async submitOtp() {
        const btn = await this.otpSubmitButton;
        await btn.waitForClickable({ timeout: 10000 });
        await btn.click();
        await browser.pause(2000);
    }
}

module.exports = new LoginPage();
