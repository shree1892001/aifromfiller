const puppeteer = require('puppeteer');

const jsonData = {
  firstName: "John",
  middleName: "A.",
  lastName: "Doe",
  addressLine1: "123 Main St",
  addressLine2: "Apt 456",
  city: "Cheyenne",
  phone: "(555) 123-4567",
  email: "john.doe@example.com",
  consent: true
};

async function randomSleep(min = 1000, max = 2000) {
  const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, sleepTime));
}

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--start-maximized']
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(180000); // 180 seconds

    // Set the viewport to full screen dimensions
    const { width, height } = await page.evaluate(() => {
      return { width: window.screen.width, height: window.screen.height };
    });
    await page.setViewport({ width, height });

    // Navigate to the Wyoming business registration page
    await page.goto('https://wyobiz.wyo.gov/Business/RegistrationInstr.aspx', { waitUntil: 'networkidle0' });

    // Click "Form or Register a New Business"
    await page.waitForSelector('#regStartNow', { timeout: 60000 });
    await page.click('#regStartNow');

    // Select LLC from dropdown
    await page.waitForSelector('#MainContent_slctBusType', { visible: true, timeout: 60000 });
    await page.select('#MainContent_slctBusType', 'Limited Liability Company (Domestic)');
    await page.evaluate(() => {
      __doPostBack('ctl00$MainContent$slctBusType', '');
    });

    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });

    // Check the agreement checkbox
    await page.click('#MainContent_chkAgree');

    // Click "NEXT" button
    await page.click('#MainContent_ContinueButton');

    // Wait for entity name input
    await page.waitForSelector('#txtName', { visible: true, timeout: 180000 });

    // Fill in LLC name
    const businessName = 'Redberyl LLC';
    await page.type('#txtName', businessName);
    await page.type('#txtNameConfirm', businessName);

    // Scroll and click "Continue"
    await page.evaluate(() => {
      document.querySelector('input[name="ctl00$MainContent$ContinueButton"]').scrollIntoView();
    });

    await page.waitForFunction(() => {
      const button = document.querySelector('input[name="ctl00$MainContent$ContinueButton"]');
      return button && !button.disabled && button.offsetParent !== null;
    });

    await page.click('input[name="ctl00$MainContent$ContinueButton"]');

    // Wait for the next page form to appear
    await page.waitForSelector('#txtFirstName', { visible: true, timeout: 180000 });

    // Fill in personal details
    await page.type('#txtFirstName', jsonData.firstName);
    await page.type('#txtMiddleName', jsonData.middleName);
    await page.type('#txtLastName', jsonData.lastName);
    await page.type('#txtAddr1', jsonData.addressLine1);
    await page.type('#txtAddr2', jsonData.addressLine2);
    await page.type('#txtCity', jsonData.city);

    // Handle the postal code popup
    await page.keyboard.press('Tab'); // Trigger postal code popup
    await page.waitForSelector('.ui-dialog[aria-describedby="ui-id-1"]', { visible: true });
    await page.evaluate(() => {
      const postalCodeItems = document.querySelectorAll('#ui-id-1 .postalCodeListItem');
      if (postalCodeItems.length > 0) {
        postalCodeItems[0].click();
      }
    });
    await page.waitForSelector('.ui-dialog[aria-describedby="ui-id-1"]', { hidden: true });

    // Ensure postal code is filled
    await page.waitForFunction(() => document.querySelector('#txtPostal').value !== '');

    // Fill phone and email
    await page.type('#txtPhone', jsonData.phone);
    await page.type('#txtEmail', jsonData.email);

    // Check consent checkbox
    await page.click('#chkRAConsent');

    // Click the "Continue" button
    await page.click('#ContinueButton');
    console.log("Continue clicked");

    // Handle potential error message
    const errorMessage = await page.evaluate(() => document.querySelector('#lblErrorMessage')?.innerText);
    if (errorMessage) {
      console.log("Error detected:", errorMessage);
      // Handle the error as needed
    }

    // Wait for the next form to appear
    await page.waitForSelector('#slctCountry', { visible: true, timeout: 180000 });

    // Fill in additional details
    await page.select('#slctCountry', 'USA');
    await page.type('#txtAddr1', '123 Main St');
    await page.type('#txtAddr2', 'Suite 100');
    await page.type('#txtAddr3', 'Building 5');
    await page.type('#txtCity', 'Anytown');
    await page.type('#txtState', 'CA');
    await page.type('#txtPostal', '12345');
    await page.type('#txtPhone', '1234567890');
    await page.type('#txtFAX', '0987654321');
    await page.type('#txtEmail', 'example@example.com');

    // Fill in mailing address
    await page.select('#slctCountryMail', 'USA');
    await page.type('#txtAddr1Mail', '456 Elm St');
    await page.type('#txtAddr2Mail', 'Apt 2B');
    await page.type('#txtAddr3Mail', 'Floor 3');
    await page.type('#txtCityMail', 'Othertown');
    await page.type('#txtStateMail', 'NY');
    await page.type('#txtPostalMail', '67890');

    // Submit the form
    await page.click('#ContinueButton');
    console.log('Form automation completed');

    // Add a delay before closing the browser (optional)
    await randomSleep(5000, 10000);

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();