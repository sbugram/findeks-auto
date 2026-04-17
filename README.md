# Findeks Credit Score Automation

## 1. Project Overview
The Findeks Credit Score Automation project is an automated web scraping system designed to log into the Findeks financial platform, bypass Two-Factor Authentication (2FA) via SMS (One-Time Password - OTP), and retrieve the user's credit score. The system is designed to run completely unattended on a schedule.

The project offers two distinct execution modes:
1. Serverless Mode (GitHub Actions): Runs as a scheduled task in the cloud, polling an Upstash Redis database to retrieve the SMS OTP.
2. Local Server Mode: Runs continuously on a local machine or virtual private server, using an Express webhook server to receive the SMS OTP pushed by the user's phone, and executing the automation via a built-in cron scheduler.

## 2. Technology Stack
- Node.js: The core runtime environment.
- WebdriverIO: The browser automation framework used to interact with the Findeks portal.
- Mocha: The testing framework used to structure the automated flow in Serverless mode.
- Express: A lightweight web framework used to spin up a local webhook server for capturing incoming OTPs.
- node-cron: A task scheduler for Node.js used to trigger the local automation.
- Upstash Redis: A serverless Redis database over REST API used in the cloud mode to poll for OTP messages.
- GitHub Actions: The Continuous Integration/Continuous Deployment (CI/CD) platform used for the Serverless Mode.

## 3. Two Modes of Execution

### 3.1. Serverless Mode (GitHub Actions)
This mode is ideal for users who do not want to keep a server running continuously. It leverages GitHub Actions to run the WebDriverIO tests.

How it works:
- Trigger: A cron schedule defined in `.github/workflows/findeks.yml` triggers the workflow every Tuesday at 07:00 UTC. Tuesdays are targeted because Findeks allows users to check their credit score based on special free quota rules or personal tracking preferences.
- Execution: The workflow installs Chrome and runs `npm test`, which executes `test/findeks.test.js`.
- OTP Handling: During execution, the automation reaches the SMS verification step. At this point, the user's mobile phone must automatically forward the SMS from Findeks to an Upstash Redis database (saving it under the key "findeks_otp"). The script uses `utils/upstash.js` to poll the Upstash REST API every 5 seconds for up to 3 minutes until the OTP is found.
- Post-Execution: The script extracts the credit score and logs it. If it fails, an error screenshot is uploaded as a GitHub Artifact.

### 3.2. Local Server Mode
This mode is useful if you have a physical machine, Raspberry Pi, or a static Virtual Private Server running constantly.

How it works:
- Trigger: You run `node index.js`. This starts an Express server and registers a local scheduler using `node-cron`. The scheduler targets every Tuesday at 09:00 local time.
- OTP Handling: The Express server listens on port 3000 (or the defined webhook port). An endpoint `POST /api/webhook/otp` expects a JSON payload containing the SMS message string. When the SMS arrives on the user's phone, an automation tool on the phone must automatically forward the message to this endpoint. The server extracts the 6-digit OTP using Regular Expressions and emits an internal event.
- Execution: The scheduled task (`src/scheduler/scheduler.js`) triggers `src/automation/findeksAutomation.js`. It runs a standalone WebdriverIO session, navigates the site, and listens for the OTP event emitted by the webhook server.
- Post-Execution: Results are saved locally to the disk via `src/utils/resultSaver.js`.

## 4. Detailed Project Structure

- `index.js`: The entry point for the Local Server Mode. It initializes the webhook server and starts the cron scheduler.
- `package.json`: Contains the project metadata, dependencies (like `webdriverio`, `dotenv`, `express`), and the `test` script (`wdio run wdio.conf.js`).
- `wdio.conf.js`: The WebdriverIO configuration file. It sets up the Mocha framework, defines Chrome driver options (like running in headless mode and excluding automation signatures to bypass bot detection), and configures logging and timeouts.
- `.github/workflows/findeks.yml`: The GitHub Actions workflow file that defines the Serverless Mode execution environment and lifecycle.

### Core Directories:
- `test/`: Contains `findeks.test.js`, the main script for the Serverless Mode. It defines the step-by-step test logic for logging in and fetching the score.
- `utils/`: Contains utility scripts for the root structure. Specifically, `upstash.js` handles the Upstash Redis REST API interactions (clearing old OTPs and fetching new ones).
- `src/`: Contains the core logic for the Local Server Mode and Page Objects shared by both modes.
  - `src/pages/`: Implements the Page Object Model (POM) design pattern. This isolates web elements and user interactions into reusable, maintainable classes.
    - `LoginPage.js`: Handles entering the TC ID, password, proceeding through the security confirmation wall, and entering the OTP.
    - `DashboardPage.js`: Handles post-login activities, identifying dashboard elements.
    - `CreditScorePage.js`: Handles navigating to the credit score sub-page, accepting required service agreements, and scraping the final score elements.
  - `src/automation/`: Contains `findeksAutomation.js`, the standalone WebdriverIO automation script used specifically for Local Server Mode.
  - `src/scheduler/`: Contains `scheduler.js` which encapsulates the `node-cron` definitions and triggers the local automation process safely.
  - `src/server/`: Contains the Express webhook implementation.
    - `webhookServer.js`: Exposes endpoints for health checking and receiving OTP payloads.
    - `otpEmitter.js`: An internal Node Event Emitter used to bridge asynchronous communication between the incoming webhook POST request and the actively running browser automation script.
  - `src/utils/`: Contains `resultSaver.js`, responsible for writing the extracted score data locally when running outside of GitHub Actions.

## 5. Required Environment Variables

To run the project, environment variables must be injected either via a `.env` file (for Local Server Mode) or configured as GitHub Secrets (for Serverless Mode). A sample `.env.example` file is provided as a blueprint.

- `FINDEKS_TC` or `FINDEKS_TC_ID`: The user's 11-digit Turkish Identity Number.
- `FINDEKS_PASSWORD`: The user's Findeks account password.
- `UPSTASH_URL`: The base REST API URL provided by your Upstash Redis database (Required for Serverless Mode).
- `UPSTASH_TOKEN`: The secure REST Token provided by Upstash to authenticate API calls (Required for Serverless Mode).
- `FINDEKS_LOGIN_URL` (Optional): Overrides the default login page URL if Findeks updates their routing architecture. Defaults to `https://isube.findeks.com/ers/login.xhtml`.
- `WEBHOOK_PORT` (Optional): The local port on which the Express server listens. Defaults to 3000.
- `OTP_TIMEOUT_MS` (Optional): The maximum duration (in milliseconds) the script will wait for the OTP before timing out. Defaults to 180000 (3 minutes).

## 6. Step-by-Step System Flow
Regardless of the runtime mode, the internal browser automation executes the following linear sequence:

1. Initialization: A Chrome instance is launched in a headless framework using parameters engineered to avoid detection.
2. Navigation: The browser navigates to the specified Findeks login portal.
3. Credentials Phase: The system identifies the TC input fields and the specialized proxy password field, clears any existing data, and inputs the user credentials.
4. Security Confirmation: Findeks requires a mandatory click on an intermediate security confirmation screen. The script clicks this button, which tells Findeks to dispatch the OTP SMS.
5. Awaiting OTP: The script waits for the OTP input field to render. Simultaneously, it polls either the Upstash API or awaits an internal event from the webhook server, depending on the execution mode.
6. Submitting OTP: Once the 6-digit OTP is retrieved from the interception mechanism, it is injected into the OTP field and submitted.
7. Dashboard Entry: Upon successful login, the script waits for the dashboard to thoroughly load, then clicks the specific anchor link labeled "Kendi Kredi Notum" (My Credit Score).
8. Legal Agreements: The system bypasses informational pages and programmatically checks the mandatory terms and conditions boxes (Service Agreement and Pre-Contract Information Form) before clicking the final proceed button.
9. Data Extraction: The script waits for the numeric score element and the qualitative descriptor (e.g., "Good", "Very Good") to appear in the DOM structure, securely extracts the text content, and returns the result to standard output or a local file.
10. Session Termination: The browser session is safely and definitively closed to free computing resources.

## 7. Setup Guide for First-time Users

1. Clone Repository: Download the source code to your local machine using git.
2. Install Node.js runtime: Ensure Node.js version 20 or higher is installed on your designated environment.
3. Install Dependencies: Open a terminal at the project root and execute `npm install` to download all necessary underlying libraries (WebdriverIO, Express, Mocha, etc.).
4. Set Up Environment Variables: Duplicate the `.env.example` file, rename the copy to `.env`, and populate it with your actual Findeks credentials and related configurations.
5. Configure Mobile SMS Forwarding: You must design a macro on your mobile device (utilizing software such as Tasker, Automate, or Macrodroid) to intercept SMS messages originating from Findeks.
   - For Serverless Mode: The macro application must perform a REST API request (PUT/POST) directly to your Upstash Redis database URL, saving the comprehensive SMS message text under the key `findeks_otp`.
   - For Local Server Mode: The macro application must issue an HTTP POST request to your local server's IP address (appropriately port-forwarded) containing a JSON payload with the schema `{ "message": "<The SMS text content>" }`.
6. Final Execution:
   - For Local Server Mode: Execute `node index.js` in your terminal. Ensure the process runs continuously (consider tools like `pm2` or `tmux`).
   - For Serverless Mode: Commit your modifications to GitHub, create GitHub Secrets mapping accurately to the required `.env` variables, and allow the `.github/workflows/findeks.yml` schedule workflow to automatically trigger the process on a weekly cadence.
