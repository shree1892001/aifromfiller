// const express = require('express');
// const bodyParser = require('body-parser');
// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const cors = require('cors');
// const fs = require('fs');
// const path = require('path');

// // Use Puppeteer stealth plugin
// puppeteer.use(StealthPlugin());

// const app = express();
// const port = 3001;

// app.use(bodyParser.json());
// app.use(cors());

// // Logging setup
// const logFilePath = path.join(__dirname, 'server.log');

// // Importing the West Virginia and New York selectors
// const wvSelectors = require('./selectorWestViriginia');
// const nySelectors = require('./selectorNewYork'); // Assuming you have selectors for New York

// // Base FormAutomation class
// class FormAutomation {
//     constructor(formData) {
//         this.formData = formData;
//     }

//     async initialize() {
//         this.browser = await puppeteer.launch({ headless: false });
//         this.page = await this.browser.newPage();
//     }

//     async close() {
//         await this.browser.close();
//     }

//     async run() {
//         try {
//             await this.initialize();
//             await this.navigateToFormPage();
//             await this.fillForm();
//             await this.submitForm();
//         } finally {
//             await this.close();
//         }
//     }

//     async navigateToFormPage() {
//         throw new Error("Method 'navigateToFormPage' must be implemented.");
//     }

//     async fillForm() {
//         throw new Error("Method 'fillForm' must be implemented.");
//     }

//     async submitForm() {
//         await this.page.click(this.selectors.submitButton);
//         await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
//     }

//     async adjustViewport() {
//         const viewport = { width: 1280, height: 800 };
//         await this.page.setViewport(viewport);
//     }
// }

// // West Virginia LLC form automation
// class WestVirginiaLLCFormAutomation extends FormAutomation {
//     constructor(formData) {
//         super(formData);
//         this.selectors = wvSelectors;
//     }

//     async navigateToFormPage() {
//         await this.page.goto("https://onestop.wv.gov/B4WVPublic/", { waitUntil: 'networkidle0' });
//     }

//     async fillForm() {
//         await this.page.waitForSelector(this.selectors.userIdInput, { visible: true });
//         await this.page.type(this.selectors.userIdInput, this.formData.UserId);
//         await this.page.type(this.selectors.passwordInput, this.formData.Password);
//         await this.page.type(this.selectors.formField1, this.formData.Field1);
//         await this.page.type(this.selectors.formField2, this.formData.Field2);
//     }
// }

// // New York form automation
// class NewYorkFormAutomation extends FormAutomation {
//     constructor(formData) {
//         super(formData);
//         this.selectors = nySelectors; // Assuming you have a selectors file for New York
//     }

//     async navigateToFormPage() {
//         await retry(async () => {
//             try {
//                 console.log("Navigating to the login page...");
//                 await this.page.goto(this.formData.State.stateUrl, { waitUntil: 'networkidle0', timeout: 60000 });
//                 log('Login page loaded.');
//             } catch (error) {
//                 console.error("Error navigating to the login page:", error.message);
//                 throw new Error("Navigation to the login page failed.");
//             }
//         }, 5, this.page);
//         await randomSleep(3000, 5000);
//     }

//     async fillForm() {
//         await this.performLogin();
//         await this.adjustViewport();

//         console.log("Waiting for the list to appear...");
//         await this.page.waitForSelector('ul.t-LinksList', { visible: true, timeout: 60000 });

//         console.log("Opening the link Domestic Business Corporation and Domestic Limited Liability Company...");
//         let firstLinkUrl = await this.getFirstLinkUrl();
//         if (!firstLinkUrl) {
//             throw new Error("Couldn't find the Domestic Business Corporation and Domestic Limited Liability Company link.");
//         }

//         console.log("Opening the Domestic Business Corporation and Domestic Limited Liability Company...");
//         await this.page.goto(new URL(firstLinkUrl, this.page.url()).href, { waitUntil: 'networkidle0' });

//         console.log("Domestic Business Corporation and Domestic Limited Liability Company page loaded.");
//         await randomSleep(3000, 5000);

//         let secondLinkUrl = await this.getSecondLinkUrl();
//         if (!secondLinkUrl) {
//             throw new Error("Couldn't find the Articles of Organization URL.");
//         }

//         console.log("Opening the Articles of Organization...");
//         await this.page.goto(new URL(secondLinkUrl, this.page.url()).href, { waitUntil: 'networkidle0' });

//         console.log("Articles of Organization page loaded.");
//         await randomSleep(3000, 5000);

//         let entityType = this.formData.EntityType.orderShortName.trim().toUpperCase();
//         await this.addData(entityType);
        
//         console.log("Waiting for the preview page to be loaded...");
//         await this.page.waitForSelector('.page-6.app-EFILING', { visible: true, timeout: 10000 });
//         log("Next step completed and preview loaded.");
//         await randomSleep(10000000, 2200000000);
//     }

//     async performLogin() {
//         try {
//             console.log("Attempting to login...");
//             await this.page.waitForSelector(this.selectors.form, { visible: true, timeout: 120000 });
//             await this.page.evaluate((jsonData) => {
//                 const usernameField = document.querySelector(this.selectors.usernameField);
//                 const passwordField = document.querySelector(this.selectors.passwordField);
//                 const submitButton = document.querySelector(this.selectors.submitButton);
                
//                 if (!usernameField || !passwordField || !submitButton) {
//                     throw new Error("Couldn't find login elements");
//                 }

//                 usernameField.value = jsonData.State.filingWebsiteUsername;
//                 passwordField.value = jsonData.State.filingWebsitePassword;

//                 if (typeof apex !== 'undefined' && typeof apex.submit === 'function') {
//                     apex.submit({ request: 'LOGIN', validate: true });
//                 } else {
//                     submitButton.click();
//                 }
//             }, this.formData);

//             await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
//             const alertVisible = await this.checkForLoginError();
//             if (alertVisible) {
//                 throw new Error("Login failed: Invalid Login Credentials");
//             }

//             console.log('Login successful.');
//         } catch (error) {
//             console.error("Login failed:", error.message);
//             throw error;
//         }
//     }

//     async checkForLoginError() {
//         const alertSelector = this.selectors.alertselector;
//         return await this.page.evaluate((alertSelector) => {
//             const alert = document.querySelector(alertSelector);
//             return alert && alert.querySelector(this.selectors.alertbody)?.textContent.includes('Invalid Login Credentials');
//         }, alertSelector);
//     }

//     async getFirstLinkUrl() {
//         return await this.page.evaluate(() => {
//             const firstLink = document.querySelector('ul.t-LinksList li.t-LinksList-item:nth-child(1) a.t-LinksList-link');
//             return firstLink ? firstLink.getAttribute('href') : null;
//         });
//     }

//     async getSecondLinkUrl() {
//         if (this.formData.EntityType.orderShortName === 'LLC') {
//             return await this.page.evaluate(() => {
//                 const secondLink = document.querySelector('ul.t-LinksList li.t-LinksList-item:nth-child(2) a.t-LinksList-link');
//                 return secondLink ? secondLink.getAttribute('href') : null;
//             });
//         } else if (this.formData.EntityType.orderShortName === 'CORP') {
//             return await this.page.evaluate(() => {
//                 const secondLink = document.querySelector('ul.t-LinksList li.t-LinksList-item:nth-child(1) a.t-LinksList-link');
//                 return secondLink ? secondLink.getAttribute('href') : null;
//             });
//         }
//         return null;
//     }

//     async addData(entityType) {
//         if (entityType === 'LLC') {
//             await this.addDataLLC();
//         } else if (entityType === 'CORP') {
//             await this.addDataCorp();
//         }
//     }

//     async addDataLLC() {
//         // Logic for adding data for LLC
//     }

//     async addDataCorp() {
//         // Logic for adding data for Corporation
//     }
// }

// // Factory class to create appropriate automation instance based on state and entity type
// class FormAutomationFactory {
//     static createFormAutomation(formData) {
//         const entityType = formData.EntityType.orderShortName.trim().toUpperCase();
//         const state = formData.State.name.trim().toUpperCase();

//         if (state === 'WEST VIRGINIA' && entityType === 'LLC') {
//             return new WestVirginiaLLCFormAutomation(formData);
//         } else if (state === 'NEW YORK') {
//             return new NewYorkFormAutomation(formData);
//         }
//         // Add more states and types as needed
//         else {
//             throw new Error(`Unsupported state or entity type: ${state} ${entityType}`);
//         }
//     }
// }

// // API endpoint to run Puppeteer automation
// app.post('/run-puppeteer', async (req, res) => {
//     const jsonData = req.body;

//     if (!jsonData) {
//         res.status(400).send('Request payload is required.');
//         return;
//     }

//     try {
//         const automation = FormAutomationFactory.createFormAutomation(jsonData);
//         const result = await automation.run();
//         res.status(200).json({ status: 'success', result });
//     } catch (e) {
//         res.status(500).json({ status: 'error', message: e.message });
//     }
// });

// // Start server
// app.listen(port, () => {
//     console.log(`Server is running on http://localhost:${port}`);
// });
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // Set to true for headless mode
  const page = await browser.newPage();

  // Navigate to the page where the link is located
  await page.goto('https://www.ark.org/sos/corpfilings/index.php');


  await page.waitForSelector('a[href="javascript:showOptions(13)"]' ,{visible: true ,timeout:120000});

  // Wait for the <a> element to be available
  await page.waitForSelector('a[href="javascript:showOptions(13)"]', { visible: true });

  // Evaluate the JavaScript function directly in the page context
  await page.evaluate(() => {
    showOptions(13); // Directly call the showOptions function with parameter 13
  });

  console.log('Triggered showOptions(13) successfully.');
  await page.waitForSelector('#app_form', { visible: true });

  // Fill in the form fields and submit the form using evaluate
  await page.evaluate(() => {
    const form = document.querySelector('#app_form');
    if (form) {
      // Set hidden form values (you can set them dynamically if needed)
      document.querySelector('input[name="ina_sec_csrf"]').value = '6a140935d7c51da67b529ea29d13a886';
      document.querySelector('input[name="form_id"]').value = '13';
      document.querySelector('input[name="__ncforminfo"]').value = 'sS-qhYYSKtavxhTf2yOCKiqCwpBd9gOXChr1cDhpz3K7AboalMNfsOiQyGcXO0W1Ntx4o7NnCWAH4Du8g7sJjFHoY89Io866P-FL1v7QCwk=';
      
      // Submit the form
      form.submit();
    }
  });

  // Wait for navigation or any response after form submission
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  console.log('Form submitted successfully');

  await browser.close();

  // Perform any additional actions, like waiting for the modal or page update after the function is triggered
  await page.waitForTimeout(3000);  // Adjust the wait time as needed

  await browser.close();
})();
