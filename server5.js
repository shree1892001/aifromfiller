const puppeteer = require('puppeteer');

async function fillBusinessFormationForm() {
  const browser = await puppeteer.launch({ headless: false }); // Set to true for headless mode
  const page = await browser.newPage();

  // Navigate to the page (replace with actual URL)
  await page.goto('https://www.njportal.com/DOR/BusinessFormation/CompanyInformation/BusinessName');

  // Wait for the form to load
  await page.waitForSelector('form[action="/DOR/BusinessFormation/CompanyInformation/BusinessName/common-form?role=form"]');

  // Select business type
  await page.select('#BusinessType', '5'); // Selecting "NJ Domestic Limited Liability Company (LLC)"

  // Fill in business name
  await page.type('#BusinessName', 'My New Business');

  // Click the Continue button
  await page.click('input[type="submit"][value="Continue"]');

  // Wait for navigation or confirmation
  await page.waitForNavigation();

  // Check if there's a modal for foreign entities
  const modalVisible = await page.evaluate(() => {
    const modal = document.querySelector('#NoteForFrNf');
    return modal && window.getComputedStyle(modal).display !== 'none';
  });

  if (modalVisible) {
    // Click the "Okay" button on the modal
    await page.click('#NoteForFrNf .btn-success');
  }

  // Optional: Wait for user input before closing
  await new Promise(resolve => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    readline.question('Press Enter to close the browser...', () => {
      readline.close();
      resolve();
    });
  });

  // Close the browser
  await browser.close();
}

fillBusinessFormationForm().catch(console.error);