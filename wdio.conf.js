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
          '--headless=new',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--disable-blink-features=AutomationControlled',
          '--disable-extensions',
          '--disable-infobars',
          '--lang=tr-TR',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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

  afterTest: async function (test, context, { error, result, duration, passed, retries }) {
    if (!passed) {
      const fs = require('fs');
      if (!fs.existsSync('./errorShots')) {
        fs.mkdirSync('./errorShots');
      }
      await browser.saveScreenshot(`./errorShots/${test.title.replace(/\s+/g, '_')}_error.png`);
      console.log(`[After Test Hook] Screenshot saved to errorShots/`);
    }
  }
};
