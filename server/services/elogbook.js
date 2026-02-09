const puppeteer = require('puppeteer');
const config = require('../config');
const { loadCredentials } = require('./crypto');
const { query } = require('./db');

const isRender = !!process.env.RENDER;

/**
 * Submit an operation to the eLogbook using browser automation.
 *
 * IMPORTANT: The CSS selectors below are PLACEHOLDERS. They must be updated
 * by inspecting the live eLogbook site (client.elogbook.org) to match the
 * actual form elements. The selectors are kept in config.js for easy updating.
 *
 * To find the correct selectors:
 * 1. Log into client.elogbook.org in Chrome
 * 2. Navigate to "Add Operation"
 * 3. Right-click each form field -> Inspect
 * 4. Note the element's id, name, or a unique CSS selector
 * 5. Update config.js with the correct selectors
 */
async function submitOperation(fields) {
  const credentials = await loadCredentials();
  if (!credentials) {
    throw new Error('eLogbook credentials not configured. Go to Settings to save your credentials.');
  }

  const selectors = config.elogbook.selectors;
  let browser = null;

  try {
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    };

    if (isRender) {
      launchOptions.executablePath = '/usr/bin/google-chrome-stable';
      launchOptions.args.push(
        '--disable-gpu',
        '--single-process',
        '--no-zygote'
      );
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Set a reasonable timeout
    page.setDefaultTimeout(30000);

    // ---- Step 1: Login ----
    console.log('[eLogbook] Navigating to login page...');
    await page.goto(config.elogbook.loginUrl, { waitUntil: 'networkidle2' });

    // Wait for and fill login form
    await page.waitForSelector(selectors.username, { visible: true });
    await page.type(selectors.username, credentials.username, { delay: 50 });
    await page.type(selectors.password, credentials.password, { delay: 50 });
    await page.click(selectors.loginButton);

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('[eLogbook] Logged in successfully');

    // ---- Step 2: Navigate to Add Operation ----
    console.log('[eLogbook] Navigating to Add Operation...');

    // Try clicking the "Add Operation" link/button
    try {
      await page.waitForSelector(selectors.addOperation, { visible: true, timeout: 10000 });
      await page.click(selectors.addOperation);
      await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    } catch {
      // If direct navigation fails, try going to the URL directly
      console.log('[eLogbook] Trying direct navigation to Add Operation...');
      await page.goto(config.elogbook.addOperationUrl, { waitUntil: 'networkidle2' });
    }

    // ---- Step 3: Fill in the form ----
    console.log('[eLogbook] Filling in operation details...');

    // Helper: safely fill a field
    const fillField = async (selector, value) => {
      if (!value || !selector) return;
      try {
        await page.waitForSelector(selector, { visible: true, timeout: 5000 });
        const tagName = await page.$eval(selector, el => el.tagName.toLowerCase());

        if (tagName === 'select') {
          await page.select(selector, value);
        } else {
          await page.click(selector, { clickCount: 3 }); // Select existing text
          await page.type(selector, value, { delay: 30 });
        }
      } catch (err) {
        console.warn(`[eLogbook] Could not fill ${selector}: ${err.message}`);
      }
    };

    // Fill each field
    await fillField(selectors.dateField, fields.date);
    await fillField(selectors.hospitalField, fields.hospital);
    await fillField(selectors.patientDob, fields.patientDob);
    await fillField(selectors.patientSex, fields.patientSex);
    await fillField(selectors.procedure, fields.procedure);
    await fillField(selectors.cepod, fields.cepod);
    await fillField(selectors.asaGrade, fields.asaGrade);
    await fillField(selectors.supervision, fields.supervision);
    await fillField(selectors.consultant, fields.consultant);
    await fillField(selectors.side, fields.side);
    await fillField(selectors.anaesthetic, fields.anaesthetic);
    await fillField(selectors.startTime, fields.startTime);
    await fillField(selectors.duration, fields.duration);
    await fillField(selectors.complications, fields.complications);

    // Take a screenshot before submitting (store as base64 in DB)
    const preScreenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
    await saveScreenshot(`pre-submit-${Date.now()}`, preScreenshot);
    console.log('[eLogbook] Pre-submit screenshot saved to DB');

    // ---- Step 4: Submit the form ----
    console.log('[eLogbook] Submitting operation...');
    await page.click(selectors.saveButton);

    // Wait for submission response
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

    // Take post-submit screenshot
    const postScreenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
    await saveScreenshot(`post-submit-${Date.now()}`, postScreenshot);
    console.log('[eLogbook] Post-submit screenshot saved to DB');

    // Check for success (look for error messages on page)
    const pageContent = await page.content();
    const hasError = pageContent.toLowerCase().includes('error') &&
                     !pageContent.toLowerCase().includes('no error');

    if (hasError) {
      throw new Error('eLogbook may have reported an error. Check the screenshot for details.');
    }

    console.log('[eLogbook] Operation submitted successfully');
    return { success: true };

  } catch (err) {
    // Take error screenshot
    if (browser) {
      try {
        const pages = await browser.pages();
        if (pages.length > 0) {
          const errorScreenshot = await pages[0].screenshot({ encoding: 'base64', fullPage: true });
          await saveScreenshot(`error-${Date.now()}`, errorScreenshot);
        }
      } catch {}
    }
    throw err;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function saveScreenshot(name, base64Data) {
  try {
    await query(
      `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [`screenshot:${name}`, base64Data]
    );
  } catch (err) {
    console.warn('[eLogbook] Failed to save screenshot to DB:', err.message);
  }
}

module.exports = { submitOperation };
