const puppeteer = require('puppeteer');

async function automateLLCFiling(options) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Define the randomSleep function
  function randomSleep(min, max) {
    const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, sleepTime));
  }

  try {
    await page.goto('https://efile.sunbiz.org/llc_file.html', { waitUntil: 'networkidle0', timeout: 120000 });

    await performEventsonLandingPage(page);

    async function performEventsonLandingPage(page) {
      try {
        console.log("Attempting to interact with the landing page...");
        await page.waitForSelector('form', { visible: true, timeout: 120000 });
        console.log("Form found.");

        const checkboxSelector = 'input[name="Disclaimer"]';
        const checkboxExists = await page.evaluate(selector => {
          return !!document.querySelector(selector);
        }, checkboxSelector);

        if (!checkboxExists) {
          throw new Error("Checkbox not found.");
        }

        await page.click(checkboxSelector);
        console.log("Disclaimer checkbox checked.");

        const submitButtonSelector = 'input[name="submit"]';
        const submitButtonExists = await page.evaluate(selector => {
          return !!document.querySelector(selector);
        }, submitButtonSelector);

        if (!submitButtonExists) {
          throw new Error("Submit button not found.");
        }

        await page.click(submitButtonSelector);
        console.log("Submit button clicked.");

        await page.waitForSelector('#eff_date_mm', { visible: true, timeout: 120000 });
        console.log('Navigated to the new filing page.');

        // Fill out the new filing page form with delays
        await fillOutNewFilingPage(page);

      } catch (e) {
        console.error("Form submission failed:", e.message);
        return { status: 'error', message: e.message };
      }
    }

    async function fillOutNewFilingPage(page) {
      try {
        console.log("Filling out the new filing page...");

        if (options.effectiveDate) {
          await page.type('#eff_date_mm', options.effectiveDate.month);
          await randomSleep(1000, 3000);
          await page.type('#eff_date_dd', options.effectiveDate.day);
          await randomSleep(1000, 3000);
          await page.type('#eff_date_yyyy', options.effectiveDate.year);
          await randomSleep(1000, 3000);
        }

        if (options.certificateOfStatus) {
          await page.click('#cos_num_flag');
          await randomSleep(1000, 3000);
        }
        if (options.certifiedCopy) {
          await page.click('#cert_num_flag');
          await randomSleep(1000, 3000);
        }

        await page.type('#corp_name', options.llcName);
        await randomSleep(1000, 3000);

        await page.type('#princ_addr1', options.principalPlace.address);
        await randomSleep(1000, 3000);
        await page.type('#princ_addr2', options.principalPlace.suite);
        await randomSleep(1000, 3000);
        await page.type('#princ_city', options.principalPlace.city);
        await randomSleep(1000, 3000);
        await page.type('#princ_st', options.principalPlace.state);
        await randomSleep(1000, 3000);
        await page.type('#princ_zip', options.principalPlace.zip);
        await randomSleep(1000, 3000);
        await page.type('#princ_cntry', options.principalPlace.country);
        await randomSleep(1000, 3000);

        if (options.mailingAddressSameAsPrincipal) {
          await page.click('#same_addr_flag');
          await randomSleep(1000, 3000);
        } else {
          await page.type('#mail_addr1', options.mailingAddress.address);
          await randomSleep(1000, 3000);
          await page.type('#mail_addr2', options.mailingAddress.suite);
          await randomSleep(1000, 3000);
          await page.type('#mail_city', options.mailingAddress.city);
          await randomSleep(1000, 3000);
          await page.type('#mail_st', options.mailingAddress.state);
          await randomSleep(1000, 3000);
          await page.type('#mail_zip', options.mailingAddress.zip);
          await randomSleep(1000, 3000);
          await page.type('#mail_cntry', options.mailingAddress.country);
          await randomSleep(1000, 3000);
        }

        if (options.residentAgent) {
          await page.type('#ra_name_last_name', options.residentAgent.lastName);
          await randomSleep(1000, 3000);
          await page.type('#ra_name_first_name', options.residentAgent.firstName);
          await randomSleep(1000, 3000);
          await page.type('#ra_name_m_name', options.residentAgent.middleName);
          await randomSleep(1000, 3000);
          await page.type('#ra_name_title_name', options.residentAgent.title);
          await randomSleep(1000, 3000);
        }

        if (options.purpose) {
          await page.type('#purpose', options.purpose);
          await randomSleep(1000, 3000);
        }

        // Submit the form
        const submitButton = await page.$('input[name="menu_function"][value="ADD"]');
        if (submitButton) {
          await submitButton.click();
          console.log("Submit button clicked.");
        } else {
          throw new Error("Submit button not found.");
        }

        // Wait for specific elements or network requests to confirm submission
        await page.waitForSelector('#success-message', { timeout: 120000 });
        console.log('Form submitted successfully');

      } catch (error) {
        console.error('An error occurred while filling out the new filing page:', error);
      }
    }

  } catch (error) {
    console.error('An error occurred during the automation process:', error);
  } finally {
    await browser.close();
  }
}

// Example usage with the JSON options
const filingOptions = {
  effectiveDate: { month: '01', day: '01', year: '2025' },
  certificateOfStatus: true,
  certifiedCopy: true,
  llcName: 'My New LLC, LLC',
  principalPlace: {
    address: '123 Main St',
    suite: 'Suite 100',
    city: 'Anytown',
    state: 'FL',
    zip: '12345',
    country: 'US'
  },
  mailingAddressSameAsPrincipal: false,
  mailingAddress: {
    address: '456 Oak Ave',
    suite: 'Apt 200',
    city: 'Other City',
    state: 'FL',
    zip: '67890',
    country: 'US'
  },
  residentAgent: {
    lastName: 'Doe',
    firstName: 'John',
    middleName: 'A',
    title: 'Sr.'
  },
  purpose: 'The purpose of this LLC is to provide general consulting services.'
};

automateLLCFiling(filingOptions).catch(console.error);
