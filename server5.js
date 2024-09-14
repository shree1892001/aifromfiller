const puppeteer = require('puppeteer');
const jsonData = {
  "firstName": "John",
  "middleName": "A.",
  "lastName": "Doe",
  "addressLine1": "123 Main St",
  "addressLine2": "Apt 456",
  "addressLine3": "",
  "city": "Cheyenne",
  "phone": "(555) 123-4567",
  "email": "john.doe@example.com",
  "consent": true
};

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Increase default timeout
    page.setDefaultNavigationTimeout(180000); // 180 seconds

    // Log console messages from the page
    // page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // Navigate to the initial page
    await page.goto('https://wyobiz.wyo.gov/Business/RegistrationInstr.aspx', { waitUntil: 'networkidle0' });

    // Click the "Form or Register a New Business" button
    await page.waitForSelector('#regStartNow', { timeout: 60000 });
    await page.click('#regStartNow');
    
    // Wait for the dropdown to be visible
    await page.waitForSelector('#MainContent_slctBusType', { visible: true, timeout: 60000 });

    // Open the dropdownc;s'
    //  by clicking on it
    await page.click('#MainContent_slctBusType');
    await randomSleep(20000, 40000);

    // Select the option based on the visible text
    await page.evaluate(() => {
      const dropdown = document.querySelector('#MainContent_slctBusType');
      const options = Array.from(dropdown.options);
      const optionToSelect = options.find(option => option.text.includes('Limited Liability Company (Domestic)'));
      if (optionToSelect) {
        dropdown.value = optionToSelect.value;
        dropdown.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Trigger the __doPostBack manually to simulate the onchange event
    await page.evaluate(() => {
      __doPostBack('ctl00$MainContent$slctBusType', '');
    });

    // Wait for the navigation or form submission to complete
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });

    // Check the attestation checkbox
    await page.click('#MainContent_chkAgree');

    // Click the "NEXT" button
    await page.click('#MainContent_ContinueButton');
    
    // Wait for a specific element on the next page to appear
    await page.waitForSelector('#txtName', { visible: true, timeout: 180000 });

    // Set the value of the input field
    await page.evaluate(() => {
      const inputElement = document.querySelector('#txtName');
      inputElement.value = 'Redberyl LLC';
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Fill in business information
    await page.type('#txtName', 'My New LLC');
    await randomSleep(1000, 4000);
    await page.type('#txtNameConfirm', 'My New LLC');
    console.log("Entity name added");

    // Scroll to s button
    // await page.evaluate(() => {
    //   document.querySelector('#ContinueButton').scrollIntoView();
    // });

    // Ensure the button is clickable
    const clickContinueAndWait = async () => {
      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }),
          await page.click('#ContinueButton')
        ]);
       
    
      } catch (error) {
        console.error('Error clicking Continue button:', error);
        const isDelayedDateFieldPresent = await page.$('#txtDelayedDate');
        if (isDelayedDateFieldPresent) {
          await page.type('#txtDelayedDate', '09/18/2024', { delay: 100 });
        }
        // await page.type('#txtDelayedDate', '09/18/2024', { delay: 100 });

        await page.evaluate(() => {
          const continueButton = document.querySelector('#ContinueButton');
      continueButton.scrollIntoView();
      
      // Trigger a click event on the continue button
      continueButton.click();
        });
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
      }

      
    };
  
    // Click the Continue button and wait for the page to load
    await clickContinueAndWait();
  
    // Check if we've successfully moved to the next page
    const currentStep = await page.evaluate(() => {
      const activeTab = document.querySelector('.tabActive');
      return activeTab ? activeTab.textContent.trim() : null;
    });
    console.log(currentStep);
    
  
    // Wait for a specific element on the next page to appear
    await page.waitForSelector('#txtFirstName', { visible: true, timeout: 180000 });
    console.log('Navigation completed');

    await page.type('#txtFirstName', 'Sam');
    await page.evaluate(() => AgentChanged()); // Trigger the onchange event manually
  
    // Fill in Middle Name
    await page.type('#txtMiddleName', 'A');
    await page.evaluate(() => AgentChanged()); // Trigger the onchange event manually
  
    // Fill in Last Name
    await page.type('#txtLastName', 'Kureshi');
    await page.evaluate(() => AgentChanged()); // Trigger the onchange event manually
  
    // Fill in Address Line 1
    await page.type('#txtAddr1', '507-B Amnora Chambers ,Amnora mall');
    await page.evaluate(() => AgentChanged()); // Trigger the onchange event manually
  
    // Fill in City
    await page.type('#txtCity', 'Casper');
    await page.keyboard.press('Tab'); // Trigger any onchange events

    // Wait for the postal code popup to appear
    await page.waitForSelector('.ui-dialog[aria-describedby="ui-id-1"]', { visible: true });
  
    // Wait for a short moment to ensure the popup is fully loaded
  
    // Select a postal code option (e.g., the first one)
    await page.evaluate(() => {
      const postalCodeItems = document.querySelectorAll('#ui-id-1 .postalCodeListItem');
      if (postalCodeItems.length > 0) {
        postalCodeItems[0].click();
      }
    });
  
    // Wait for the popup to close
    await page.waitForSelector('.ui-dialog[aria-describedby="ui-id-1"]', { hidden: true });
  
    // Ensure the postal code field is filled (you may need to adjust the selector)
    await page.waitForFunction(() => document.querySelector('#txtPostal').value !== '');
  
    await page.evaluate(() => {
      AgentChanged();
      SetPostalCode(); // This is for the postal code to be autofilled based on city
    });
    await randomSleep(12000,20000);
  
    // Phone
    await page.type('#txtPhone', '(555) 123-4567');
    
    // Email
    await page.type('#txtEmail', 'sam.kureshi@gmail.com');
    await page.evaluate(() => AgentChanged()); // Trigger the onchange event manually
  
    // Check the consent checkbox
    await page.click('#chkRAConsent');
  

    const errorMessage = await page.evaluate(() => {
      const error = document.querySelector('#lblErrorMessage');
      return error ? error.innerText : null;
    });

    if (errorMessage) {
      console.log("Error detected:", errorMessage);

      // Ensure the error message is visible
      await page.evaluate(() => {
        const continueButton = document.getElementById('ContinueButton');
    continueButton.scrollIntoView();
    
    // Trigger a click event on the continue button
    continueButton.click();
      });
      await clickContinueAndWait();

    }




      const selectOption = async (selector, value) => {
        await page.evaluate((selector, value) => {
          const select = document.querySelector(selector);
          const option = Array.from(select.options).find(option => option.value === value);
          if (option) {
            option.selected = true;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, selector, value);
      };
  

    await page.waitForSelector("#slctCountry",{ visible: true, timeout: 180000 })    
    await selectOption('#slctCountry', 'USA');
    await page.type('#txtAddr1', '123 Main St');
    await page.type('#txtAddr2', 'Suite 100');
    await page.type('#txtAddr3', 'Building 5');
    await page.type('#txtCity', 'Casper');
    await page.type('#txtState', 'WY');
    await page.type('#txtPostal', '12345');
    await page.type('#txtPhone', '1234567890');
    await page.type('#txtFAX', '0987654321');
    await page.type('#txtEmail', 'example@example.com');

    // Interact with the Mailing Address form fields
    await page.select('#slctCountryMail', 'USA');
    await page.type('#txtAddr1Mail', '456 Elm St');
    await page.type('#txtAddr2Mail', 'Apt 2B');
    await page.type('#txtAddr3Mail', 'Floor 3');
    await page.type('#txtCityMail', 'Othertown');
    await page.type('#txtStateMail', 'NY');
    await page.type('#txtPostalMail', '67890');

    // Click the "Next >>" button
await clickContinueAndWait(); 
    // Close the browser
  
    // Optional: Add a delay before closing the browser to see the result
  

    console.log('Form automation completed');

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();

async function randomSleep(min = 1000, max = 2000) {
  const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, sleepTime));
}
