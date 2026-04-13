'use strict';

const { EventEmitter } = require('events');

/**
 * Singleton EventEmitter used to communicate OTP between the Express
 * webhook server and the WebdriverIO automation script.
 *
 * Events:
 *  - 'otpReceived'  (payload: string) – fired when a valid OTP arrives via POST /api/webhook/otp
 */
class OtpEmitter extends EventEmitter { }

const otpEmitter = new OtpEmitter();

module.exports = otpEmitter;
