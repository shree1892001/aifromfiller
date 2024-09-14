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

    page.setDefaultNavigationTimeout(180000); 

    await page.goto('https://wyobiz.wyo.gov/Business/RegistrationInstr.aspx', { waitUntil: 'networkidle0' });

    await page.waitForSelector('#regStartNow', { timeout: 60000 });
    await page.click('#regStartNow');

    await page.waitForSelector('#MainContent_slctBusType', { visible: true, timeout: 60000 });

    await page.click('#MainContent_slctBusType');
    await randomSleep(2000, 4000);

    await page.evaluate(() => {
      const dropdown = document.querySelector('#MainContent_slctBusType');
      const options = Array.from(dropdown.options);
      const optionToSelect = options.find(option => option.text.includes('Profit Corporation (Domestic)'));
      if (optionToSelect) {
        dropdown.value = optionToSelect.value;
        dropdown.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await page.evaluate(() => {
      __doPostBack('ctl00$MainContent$slctBusType', '');
    });

    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });

    await page.click('#MainContent_chkAgree');

    await page.click('#MainContent_ContinueButton');

    await page.waitForSelector('#txtName', { visible: true, timeout: 180000 });

    await page.evaluate(() => {
      const inputElement = document.querySelector('#txtName');
      inputElement.value = 'Redberyl123 Corp';
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.type('#txtName', 'My New Corp.');
    await randomSleep(1000, 4000);
    await page.type('#txtNameConfirm', 'My New Corp.');
    console.log("Entity name added");

    await page.evaluate(() => {
      const continueButton = document.getElementById('ContinueButton');
      continueButton.scrollIntoView();
      continueButton.click(); 
    });

    await page.waitForSelector("#ddlDuration", { visible: true, timeout: 18000 });

    await selectOptionByText(page, '#ddlDuration', 'Perpetual');

    const durationValue = await page.evaluate(() => document.querySelector('#ddlDuration').value);
    if (durationValue !== '5') {
      throw new Error("Invalid selection for Period of Duration. Expected 'Perpetual'.");
    }

    await page.waitForSelector("#ddlShareClass", { visible: true, timeout: 18000 });

    await selectOptionByText(page, '#ddlShareClass', 'Common');
    const shareClass = 'Common';

    const shareClassValue = await page.evaluate(() => document.querySelector('#ddlShareClass').value);
    if (shareClassValue === '0') {
      throw new Error("Class of Shares is not selected.");
    }

    await page.evaluate(() => {
      ['#txtCommonShares', '#txtCommonPar', '#txtPreferredShares', '#txtPreferredPar'].forEach(selector => {
        const input = document.querySelector(selector);
        if (input) input.value = '';
      });
    });

    await randomSleep(1000, 3000);

    if (shareClass === 'Common') {
      await fillInput(page, '#txtCommonShares', '1000');
      await fillInput(page, '#txtCommonPar', '1.0000');
    } else if (shareClass === 'Preferred') {
      await page.waitForSelector('#plcPreferredStock', { visible: true });
      await fillInput(page, '#txtPreferredShares', '500');
      await fillInput(page, '#txtPreferredPar', '2.0000');
    } else if (shareClass === 'Common and Preferred') {
      await fillInput(page, '#txtCommonShares', '1000');
      await fillInput(page, '#txtCommonPar', '1.0000');
      await fillInput(page, '#txtPreferredShares', '500');
      await fillInput(page, '#txtPreferredPar', '2.0000');
    }

    const commonSharesValue = await page.evaluate(() => document.querySelector('#txtCommonShares').value);
    if (!commonSharesValue || commonSharesValue === '0') {
      throw new Error("Number of Common Shares must be greater than 0.");
    }

    const commonParValue = await page.evaluate(() => document.querySelector('#txtCommonPar').value);
    if (!commonParValue || parseFloat(commonParValue.replace(/[^0-9.-]+/g,"")) <= 0) {
      throw new Error("Common Par Value must be a positive number.");
    }

    await randomSleep(10000, 40000);

    await page.evaluate(() => {
      const continueButton = document.getElementById('ContinueButton');
      continueButton.scrollIntoView();
      continueButton.click();
    });

    // await randomSleep(100, 300000);
    console.log('Form automation completed');

   

      let parts="Alex E Englard".split(" ");


    await page.waitForSelector('#txtFirstName', { visible: true, timeout: 180000 });
    await page.type('#txtFirstName', parts[0]);
    await page.type('input[name="ctl00$MainContent$ucRA$txtMiddleName"]', parts[1], { delay: 100 });
    await page.type('input[name="ctl00$MainContent$ucRA$txtLastName"]',parts[2], { delay: 100 });
    await page.type('input[name="ctl00$MainContent$ucRA$txtAddr1"]', "507-B Amnora Chambers", { delay: 100 });
    await page.type('input[name="ctl00$MainContent$ucRA$txtAddr2"]', "Amnora Mall", { delay: 100 });
    await page.type('input[name="ctl00$MainContent$ucRA$txtCity"]',"Albany", { delay: 100 });
    await page.keyboard.press('Tab'); // Trigger any onchange events

// Wait for the postal code popup to appear
// await page.waitForSelector('.ui-dialog[aria-describedby="ui-id-1"]', { visible: true });


// await page.evaluate(() => {
// const postalCodeItems = document.querySelectorAll('#ui-id-1 .postalCodeListItem');
// if (postalCodeItems.length > 0) {
// postalCodeItems[0].click();
// }
// });

// await page.waitForSelector('.ui-dialog[aria-describedby="ui-id-1"]', { hidden: true });

// await page.waitForFunction(() => document.querySelector('#txtPostal').value !== '');

await page.evaluate(() => {
AgentChanged();
SetPostalCode(); 
});

// await randomSleep(8000,1200); 



    await page.type('input[name="ctl00$MainContent$ucRA$txtPhone"]', "+(555)123-456789", { delay: 100 });
    await page.type('input[name="ctl00$MainContent$ucRA$txtEmail"]', "info@vstate.com", { delay: 100 });

    await page.click('input[name="ctl00$MainContent$ucRA$chkRAConsent"]');
    await page.click('#ContinueButton')
await page.waitForSelector('#ContinueButton', { visible: true, timeout: 60000 });

await randomSleep(10000,30000);

await page.evaluate(() => {
const continueButton = document.querySelector('#ContinueButton');
continueButton.scrollIntoView();
continueButton.click(); 
});

const isButtonEnabled = await page.evaluate(() => {
const continueButton = document.querySelector('#ContinueButton');
return continueButton && !continueButton.disabled && continueButton.offsetParent !== null;
});

if (isButtonEnabled) {
console.log("Continue button is enabled. Attempting to click...");

await page.evaluate(() => {
const continueButton = document.querySelector('#ContinueButton');
continueButton.click();
});

}
const errorSelector = '#lblErrorMessage';
let errorOccurred = false;
try {
await page.waitForSelector(errorSelector, { visible: true, timeout: 3000 }); 
const errorMessage = await page.$eval(errorSelector, el => el.textContent);
console.log('Error detected:', errorMessage);
errorOccurred = true;




} catch (err) {
console.log('No error message detected, proceeding...');
}
if(errorOccurred){

await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
if (isButtonEnabled) {
console.log("Continue button is enabled. Attempting to click...");
await page.waitForSelector(

'#ContinueButton',{ visible: true, timeout: 3000 }) ;
await page.evaluate(() => {
const continueButton = document.getElementById('#ContinueButton');
continueButton.click();
randomSleep(80000, 1200000);

//   // Fill in phone and email details
//    page.type('input[name="ctl00$MainContent$ucRA$txtPhone"]', data.Payload.Registered_Agent.RA_Contact_No, { delay: 100 });
//  page.type('input[name="ctl00$MainContent$ucRA$txtEmail"]', data.Payload.Registered_Agent.Contact.RA_Email, { delay: 100 });

// Check the consent checkbox
page.click('input[name="ctl00$MainContent$ucRA$chkRAConsent"]');

// Scroll to and attempt to click the "Continue" button
page.evaluate(() => {
const continueButton = document.querySelector('#ContinueButton');
continueButton.scrollIntoView();
});

// Ensure the button is enabled and clickable
const isButtonEnabled =  page.evaluate(() => {
const continueButton = document.querySelector('#ContinueButton');
return continueButton && !continueButton.disabled && continueButton.offsetParent !== null;
});

if (isButtonEnabled) {
console.log("Continue button is enabled. Attempting to click...");

// Click the button using `evaluate` to ensure it’s triggered within the page context
page.evaluate(() => {
const continueButton = document.querySelector('#ContinueButton');
continueButton.click();
});

// Wait for any navigation or change after clicking the button
page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
} else {
console.log("Continue button is not enabled or not clickable.");
}

// Check if an error message is displayed after clicking the button
const errorSelector = '#lblErrorMessage';
let errorOccurred = false;
try {
page.waitForSelector(errorSelector, { visible: true, timeout: 3000 });
const errorMessage =  page.$eval(errorSelector, el => el.textContent);
console.log('Error detected:', errorMessage);
errorOccurred = true;
} catch (err) {
console.log('No error message detected, proceeding...');
}

// Handle the case where the error occurred
if (errorOccurred) {
console.log("An error occurred, trying to proceed again...");

// Try to click the "Continue" button again if error is detected
page.waitForSelector('#ContinueButton', { visible: true, timeout: 60000 });
const retryButtonEnabled =  page.evaluate(() => {
const continueButton = document.querySelector('#ContinueButton');
return continueButton && !continueButton.disabled && continueButton.offsetParent !== null;
});

if (retryButtonEnabled) {
console.log("Retrying to click the Continue button...");
page.evaluate(() => {
const continueButton = document.querySelector('#ContinueButton');
continueButton.click();
});

// Wait for the page to transition after the retry
page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
} else {
console.log("Retry failed, the Continue button is still not clickable.");
}
}


});

}

console.log("Clicked Continue after error.");

  
}

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    if (browser) await browser.close();
  }
})();

async function randomSleep(min = 1000, max = 2000) {
  const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, sleepTime));
}

async function selectOptionByText(page, selector, visibleText) {
  await page.evaluate((selector, visibleText) => {
    const select = document.querySelector(selector);
    const option = Array.from(select.options).find(opt => opt.text.trim() === visibleText); 
    if (option) {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, selector, visibleText);
}

async function fillInput(page, selector, value) {
  await page.evaluate((selector, value) => {
    const input = document.querySelector(selector);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, selector, value);
}