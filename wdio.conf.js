'use strict';

exports.config = {
  runner: 'local',
  specs: ['./test/**/*.test.js'],
  maxInstances: 1,

  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: [
          '--headless',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--disable-blink-features=AutomationControlled',
          '--disable-extensions',
          '--disable-infobars',
          '--lang=tr-TR',
        ],
        excludeSwitches: ['enable-automation'],
        useAutomationExtension: false,
      },
    },
  ],

  logLevel: 'warn',
  waitforTimeout: 20000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    // Allow up to 10 minutes: 3 min OTP wait + page load + scrape
    timeout: 600000,
  },
};
