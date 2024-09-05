const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Increase default timeout
    page.setDefaultNavigationTimeout(60000); // 60 seconds

    // Navigate to the initial page
    await page.goto('https://wyobiz.wyo.gov/Business/RegistrationInstr.aspx', { waitUntil: 'networkidle0' });

    // Click the "Form or Register a New Business" button
    await page.waitForSelector('#regStartNow', { timeout: 60000 });
    await page.click('#regStartNow');
    
    // Wait for navigation with a custom timeout and multiple conditions
  
    await page.waitForSelector('#MainContent_slctBusType', { visible: true, timeout: 60000 });

    // Open the dropdown by clicking on it
    await page.click('#MainContent_slctBusType');
    await randomSleep(20000,40000)
    // Select the option based on the visible text (e.g., "Limited Liability Company (Domestic)")
    
async function randomSleep(min = 1000, max = 2000) {
  const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, sleepTime));
}

    await page.evaluate(() => {
      const dropdown = document.querySelector('#MainContent_slctBusType');
      const options = Array.from(dropdown.options);
      const optionToSelect = options.find(option => option.text.includes('Limited Liability Company (Domestic)')); // Match the text
      if (optionToSelect) {
        dropdown.value = optionToSelect.value;
        dropdown.text=optionToSelect.text; 
        dropdown.dispatchEvent(new Event('change', { bubbles: true })); // Trigger onchange event

        
      }
    });
  // Wait for navigation to the LLC form
  await Promise.race([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
    page.waitForSelector('#businessName', { visible: true, timeout: 60000 })
  ]);

// Trigger the __doPostBack manually to simulate the onchange event
await page.evaluate(() => {
    __doPostBack('ctl00$MainContent$slctBusType', '');
});

// Wait for the navigation or form submission to complete
await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });


    // Check the attestation checkbox
    await page.click('#MainContent_chkAgree');

    // Click the "NEXT" button
    await page.click('#MainContent_ContinueButton');
    
    // Wait for navigation with a custom timeout and multiple conditions
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
      page.waitForSelector('#txtName', { visible: true, timeout: 60000 })
    ]);
    await page.waitForSelector('#txtName');

    // Set the value of the input field
    await page.evaluate(() => {
        const inputElement = document.querySelector('#txtName');
        inputElement.value = 'Redberyl LLC';
        inputElement.dispatchEvent(new Event('input', { bubbles: true })); // Trigger input event
        inputElement.dispatchEvent(new Event('change', { bubbles: true })); // Trigger change event
    });

    // Optionally, verify the value
    const inputValue = await page.evaluate(() => document.querySelector('#txtName').value);
    console.log(`Input value: ${inputValue}`);

    // Fill in business information (replace with actual field IDs and information)
    await page.type('#txtName', 'My New LLC');

    await randomSleep(1000,4000)
    // await page.type('#principalAddress', '123 Main St, Cheyenne, WY 82001');
    // await page.type('#phoneNumber', '3075551234');
    // await page.type('#email', 'contact@mynewllc.com');

    // Click next (replace with actual button ID)
    await page.click('#nextButton');
    
    // Wait for navigation with a custom timeout and multiple conditions
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
      page.waitForSelector('#someElementOnNextPage', { visible: true, timeout: 60000 })
    ]);

    console.log('Form automation completed');

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();