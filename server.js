const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const fs = require('fs');
const websock = require('ws'); 
const cors = require('cors');

const path = require('path');



puppeteer.use(StealthPlugin());

const app = express();
const port = 3001;
const apiEndpoint = 'http://localhost:3001/run-puppeteer'; // Adjust this if needed

app.use(bodyParser.json());
app.use(cors({
    origin: ['chrome-extension://kpmpcomcmochjklgamghkddpaenjojhl','http://192.168.1.108:3000','http://192.168.1.108:3001','http://localhost:3000','http://192.168.1.108:3000','http://192.168.1.108:3000','http://192.168.1.108:3001','http://192.168.1.108:3001'],
    methods: ['GET','POST']
}));
let shouldTriggerAutomation = false;


// Set up logging
const logFilePath = path.join(__dirname, 'server.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });


const log = (message) => {
    const timestamp = new Date().toISOString();
    logStream.write(`[${timestamp}] ${message}\n`);
};
const wss = new websock.Server({ port: 8080 });

let wsClient;

wss.on('connection', (ws) => {
    console.log('Client connected');
    wsClient = ws;

    ws.on('close', () => {
        console.log('Client disconnected');
        wsClient = null;
    });
});

function sendWebSocketMessage(message) {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({ message }));
    }
}
let clients = [];




app.use(bodyParser.json());
function cleanData(data) {
    return JSON.parse(JSON.stringify(data, (key, value) => {
        // Remove properties with undefined values
        return value === undefined ? null : value;
    }));
}

async function runPuppeteerScript(apiEndpoint, requestPayload, retryCount = 0) {
    let browser;

    try {
        const jsonData = cleanData(requestPayload.data);
        console.log(jsonData);
        log('Data fetched from API successfully.');

        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list',
                '--disable-blink-features=AutomationControlled',
                '--disable-notifications'
            ],
            ignoreHTTPSErrors: true,
            slowMo: 50
        });

        const page = await browser.newPage();
        await setupPage(page);
        await adjustViewport(page);

        await retry(async () => {
            try {
                sendWebSocketMessage('Navigating to the login page...');
                console.log("Navigating to the login page...");
                const response = await page.goto("https://filings.dos.ny.gov/ords/corpanc/r/ecorp/login_desktop", {
                    waitUntil: 'networkidle0',
                    timeout: 60000
                });
                log('Login page loaded.');
            } catch (error) {
                console.error("Error navigating to the login page:", error.message);
                throw new Error("Navigation to the login page failed.");
            }
        });

        await randomSleep(3000, 5000);
        try {
            await performLogin(page, jsonData);
        } catch (error) {
            console.error("Error waiting for the preview page:", error.message);
            throw new Error("Invalid Login Credentials");
        }

        await adjustViewport(page);

        console.log("Waiting for the list to appear...");
        try {
            await page.waitForSelector('ul.t-LinksList', { visible: true, timeout: 60000 });
        } catch (error) {
            console.error("Error waiting for the list to appear:", error.message);
            throw new Error("List not found.");
        }

        console.log("Opening the link Domestic Business Corporation and Domestic Limited Liability Company...");
        let firstLinkUrl;
        try {
            firstLinkUrl = await page.evaluate(() => {
                const firstLink = document.querySelector('ul.t-LinksList li.t-LinksList-item:nth-child(1) a.t-LinksList-link');
                firstLink.scrollIntoView();
                return firstLink ? firstLink.getAttribute('href') : null;
            });
        } catch (error) {
            console.error("Error getting the first link URL:", error.message);
            throw new Error("Failed to get the first link URL.");
        }

        if (!firstLinkUrl) {
            throw new Error("Couldn't find the Domestic Business Corporation and Domestic Limited Liability Company link.");
        }

        console.log("Opening the Domestic Business Corporation and Domestic Limited Liability Company...");
        try {
            await page.goto(new URL(firstLinkUrl, page.url()).href, { waitUntil: 'networkidle0' });
        } catch (error) {
            console.error("Error navigating to the Domestic Business Corporation page:", error.message);
            throw new Error("Failed to navigate to the Domestic Business Corporation page.");
        }

        console.log("Domestic Business Corporation and Domestic Limited Liability Company page loaded.");
        await randomSleep(3000, 5000);

        let secondLinkUrl;
        if (jsonData.EntityType.orderShortName === 'LLC') {
            console.log("Getting the URL for Articles of Organization for a Domestic Limited Liability Company...");
            try {
                secondLinkUrl = await page.evaluate(() => {
                    const secondLink = document.querySelector('ul.t-LinksList li.t-LinksList-item:nth-child(2) a.t-LinksList-link');
                    secondLink.scrollIntoView();
                    return secondLink ? secondLink.getAttribute('href') : null;
                });
            } catch (error) {
                console.error("Error getting the second link URL:", error.message);
                throw new Error("Failed to get the second link URL for LLC.");
            }
        } else if (jsonData.EntityType.orderShortName === 'Corp') {
            console.log("Getting the URL for Articles of Organization for a Domestic Corporation...");
            try {
                secondLinkUrl = await page.evaluate(() => {
                    const secondLink = document.querySelector('ul.t-LinksList li.t-LinksList-item:nth-child(1) a.t-LinksList-link');
                    secondLink.scrollIntoView();
                    return secondLink ? secondLink.getAttribute('href') : null;
                });
            } catch (error) {
                console.error("Error getting the second link URL:", error.message);
                throw new Error("Failed to get the second link URL for Corp.");
            }
        }

        await randomSleep(3000, 5000);

        if (!secondLinkUrl) {
            throw new Error("Couldn't find the Articles of Organization URL.");
        }

        console.log("Opening the Articles of Organization...");
        try {
            await page.goto(new URL(secondLinkUrl, page.url()).href, { waitUntil: 'networkidle0' });
        } catch (error) {
            console.error("Error navigating to the Articles of Organization page:", error.message);
            throw new Error("Failed to navigate to the Articles of Organization page.");
        }

        console.log("Articles of Organization page loaded.");
        await randomSleep(3000, 5000);

        let entityType = jsonData.EntityType.orderShortName.trim().toUpperCase();
        if (entityType === 'LLC') {
            await addDataLLC(page, jsonData);
        } else if (entityType === 'CORP') {
            await addDataCorp(page, jsonData);
        }
        console.log("Waiting for the preview page to be loaded...");
        try {
            await page.waitForSelector('.page-6.app-EFILING', { visible: true, timeout: 10000 });
        } catch (error) {
            console.error("Error waiting for the preview page:", error.message);
            throw new Error("Entity is in invalid format it should be contain LLC/ Limited Liability Company / LL.C. for the LLC and ");
        }

        await adjustViewport(page);

        log("Next step completed and preview loaded.");
        await randomSleep(10000000, 2200000000);

    } catch (e) {
        console.error("Error running Puppeteer:", e);
    
        // Pass a more specific error message to your API response
        return { status: 'error', message: e.message || "An unexpected error occurred" };

    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

app.post('/run-puppeteer', async (req, res) => {
    shouldTriggerAutomation = true; 

    const jsonData = req.body;

    if (!jsonData) {
        res.status(400).send('API endpoint and request payload are required.');
        return;
    }

    try {
        const result = await runPuppeteerScript(apiEndpoint, jsonData);
        res.status(200).json(result);
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});


async function setupPage(page) {
    await page.setJavaScriptEnabled(true);
    await page.setDefaultNavigationTimeout(120000);
    await adjustViewport(page);


    await page.evaluate(() => {
        Object.defineProperty(navigator, 'platform', { get: () => ['Win32', 'MacIntel', 'Linux x86_64'][Math.floor(Math.random() * 3)] });
        Object.defineProperty(navigator, 'productSub', { get: () => '20100101' });
    });
}

async function randomSleep(min = 1000, max = 2000) {
    const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, sleepTime));
}

async function performLogin(page, jsonData) {
    try {
        console.log("Attempting to login...");

        // Wait for the form to be visible
        await page.waitForSelector('form', { visible: true, timeout: 120000 });

        // Fill in the login form and handle the submit
        await page.evaluate((jsonData) => {
            const usernameField = document.querySelector('input[name="P101_USERNAME"]');
            const passwordField = document.querySelector('input[name="P101_PASSWORD"]');
            const submitButton = document.querySelector('button#P101_LOGIN'); // Use the ID of the submit button

            if (!usernameField || !passwordField || !submitButton) {
                throw new Error("Couldn't find login elements");
            }

            // Set the username and password
            usernameField.value = jsonData.State.filingWebsiteUsername;
            passwordField.value = jsonData.State.filingWebsitePassword;

            // Check if `apex` object is available
            if (typeof apex !== 'undefined' && typeof apex.submit === 'function') {
                // Use apex.submit if available
                apex.submit({ request: 'LOGIN', validate: true });
            } else if (submitButton) {
                // Fallback to clicking the button if `apex.submit` is not available
                submitButton.click();
            } else {
                throw new Error("Submit method or button not found");
            }

        }, jsonData);

        // Wait for navigation or some indication that login succeeded
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });

        // Check for error messages after navigation
        const alertSelector = '#t_Alert_Notification';
        const errorMessage = 'Invalid Login Credentials';
        
        const alertVisible = await page.evaluate((alertSelector) => {
            const alert = document.querySelector(alertSelector);
            return alert && alert.querySelector('.t-Alert-body')?.textContent.includes('Invalid Login Credentials');
        }, alertSelector);

        if (alertVisible) {
            console.error("Login failed: Invalid Login Credentials");
            throw new Error("Login failed: Invalid Login Credentials");
        }

        console.log('Login successful.');

    } catch (error) {
        console.error("Login failed:", error.message);
        throw error; // Re-throw the error for higher-level handling
    }
}


// async function fillForm(page, data) {
//     try {
//         console.log("Filling out the form");

//         // Wait for the form to be visible
//         await page.waitForSelector('input[name="P2_ENTITY_NAME"]', { visible: true, timeout: 120000 });
//         await page.waitForSelector('button.t-Button--hot', { visible: true, timeout: 120000 });

//         // Fill out the form fields
//         await page.type('input[name="P2_ENTITY_NAME"]', data.Payload.Name.Legal_Name);

//         console.log('Form filled out.');
//     } catch (err) {
//         console.error("Error during form filling:", err.message);
//         throw err;
//     }
// }

// async function submitForm(page) {
//     try {
//         console.log("Submitting the form");

//         // Trigger the onclick event of the submit button using the id
//         await page.evaluate(() => {
//             const submitButton = document.getElementById('B78886587564901765');
//             if (submitButton) {
//                 submitButton.click(); // Trigger the button's click event
//             } else {
//                 throw new Error('Submit button not found');
//             }
//         });

//         console.log('Submit button clicked via onclick event.');

//         // Wait for navigation after form submission
//         await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 });

//         console.log('Navigation after submission complete.');
//     } catch (err) {
//         console.error("Error during form submission or navigation:", err.message);
//         throw err;
//     }
// }


// async function addDataLLC(page, data) {
//     try {
//         // Fill out the form
//         await fillForm(page, data);

//         // Submit the form and handle navigation
//         await submitForm(page);

//         // Proceed to the next page or action
//         await fillNextPage(page, data);

//     } catch (e) {
//         // Specific handling for errors
//         if (e.message.includes('Execution context was destroyed')) {
//             console.error("Error: Execution context was destroyed, possibly due to page navigation.");
//         } else {
//             console.error("Adding name failed:", e.message);
//         }

//         // Return a specific error message as required
//         throw new Error(`${data.Payload.Name.Legal_Name} Name is Invalid`);
//     }
// }


async function addDataLLC(page, data) {
    try {
        console.log("Attempting to add the name");

        // Wait for the form to be available
        await page.waitForSelector('form', { visible: true, timeout: 120000 });

        // Fill out the form and submit
        await page.evaluate((data) => {
            const nameField = document.querySelector('input[name="P2_ENTITY_NAME"]');
            const checkbox = document.querySelector('input[name="P2_CHECKBOX"]');
            const submitButton = document.querySelector('button.t-Button--hot');

            if (!nameField || !submitButton) {
                throw new Error("Couldn't find name field or submit button");
            }

            // Set the name and checkbox values
            nameField.value = data.Payload.Name.Legal_Name;
            if (checkbox) {
                checkbox.checked = data.checked;
            }

            // Trigger form submission
            submitButton.click();
        }, data);

        try {
            // Wait for navigation after form submission
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 });
        } catch (err) {
            console.log("Page did not navigate, likely staying on the same page due to an error.");
        }

        // Check if the error message about the unacceptable name appears
        // await page.waitForSelector('p[style="color:red;text-align:left"]', { visible: true, timeout: 120000 });

        const isDuplicate =await page.evaluate(()=>{

            const table=document.querySelector('table[id$="_orig"');
            if(table){
                const r=table.querySelectorAll('tbody tr'); 
                return r.length > 0;
              }

            return false; 
        }); 
        if (isDuplicate) {
            const entityDetails = await page.evaluate(() => {
                const table = document.querySelector('table[id$="_orig"]');
                const row = table.querySelector('tbody tr');
                const cells = row.querySelectorAll('td');
                return {
                    name: cells[0].textContent.trim(),
                    dosid: cells[1].textContent.trim(),
                    formationDate: cells[2].textContent.trim(),
                    county: cells[3].textContent.trim()
                };
            });
            throw new Error(`DuplicateEntityError: ${JSON.stringify(entityDetails)} exists enter the new entity name`);
        }
        const nameInvalid = await page.evaluate(() => {
            const errorMessage = document.querySelector('p[style="color:red;text-align:left"]');
            return errorMessage !== null;  // Returns true if any error message is present
        });

        if (nameInvalid) {
            await page.waitForSelector('p[style="color:red;text-align:left"]', { timeout: 10000 });

            const errorText = await page.evaluate(() => {
                const errorMessage = document.querySelector('p[style="color:red;text-align:left"]');
                return errorMessage ? errorMessage.innerText : '';
            });
            throw new Error(`Entity name "${data.Payload.Name.Legal_Name}" is invalid. Error: ${errorText}`);
        }

        console.log("Entity name is valid.");
        // If the error message exists, throw an error
       

        console.log("Name added successfully!");
        await fillNextPage(page, data)

    } catch (e) {
        // Specific error handling
        if (e.message.includes('Execution context was destroyed')) {
            console.error("Error: Execution context was destroyed, possibly due to page navigation.");
        } else if (e.message.includes('Name is Invalid')) {
            console.error(e.message);
        }else if (e.message.startsWith('DuplicateEntityError:')) {
            console.error("Duplicate entity found:", e.message);
        } else {
            console.error("An error occurred:", e.message);
        }

        // Re-throw the error if necessary
        throw e;
    }
}

async function addDataCorp(page, data) {
    try {
        console.log("Attempting to add the name");

        // Wait for the form to be available
        await page.waitForSelector('form', { visible: true, timeout: 120000 });

        // Fill out the form and submit
        await page.evaluate((data) => {
            const nameField = document.querySelector('input[name="P2_ENTITY_NAME"]');
            const checkbox = document.querySelector('input[name="P2_CHECKBOX"]');
            const submitButton = document.querySelector('button.t-Button--hot');

            if (!nameField || !submitButton) {
                throw new Error("Couldn't find name field or submit button");
            }

            // Set the name and checkbox values
            nameField.value = data.Payload.Name.Legal_Name;
            if (checkbox) {
                checkbox.checked = data.checked;
            }

            // Trigger form submission
            submitButton.click();
        }, data);

        try {
            // Wait for navigation after form submission
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 });
        } catch (err) {
            console.log("Page did not navigate, likely staying on the same page due to an error.");
        }

        // Check if the error message about the unacceptable name appears
        // await page.waitForSelector('p[style="color:red;text-align:left"]', { visible: true, timeout: 120000 });

        const isDuplicate =await page.evaluate(()=>{

            const table=document.querySelector('table[id$="_orig"');
            if(table){
                const r=table.querySelectorAll('tbody tr'); 
                return r.length > 0;
              }

            return false; 
        }); 
        if (isDuplicate) {
            const entityDetails = await page.evaluate(() => {
                const table = document.querySelector('table[id$="_orig"]');
                const row = table.querySelector('tbody tr');
                const cells = row.querySelectorAll('td');
                return {
                    name: cells[0].textContent.trim(),
                    dosid: cells[1].textContent.trim(),
                    formationDate: cells[2].textContent.trim(),
                    county: cells[3].textContent.trim()
                };
            });
            throw new Error(`DuplicateEntityError: ${JSON.stringify(entityDetails)} exists enter the new entity name`);
        }
        const nameInvalid = await page.evaluate(() => {
            const errorMessage = document.querySelector('p[style="color:red;text-align:left"]');
            return errorMessage !== null;  // Returns true if any error message is present
        });

        if (nameInvalid) {
            await page.waitForSelector('p[style="color:red;text-align:left"]', { timeout: 10000 });

            const errorText = await page.evaluate(() => {
                const errorMessage = document.querySelector('p[style="color:red;text-align:left"]');
                return errorMessage ? errorMessage.innerText : '';
            });
            throw new Error(`Entity name "${data.Payload.Name.Legal_Name}" is invalid. Error: ${errorText}`);
        }

        console.log("Entity name is valid.");
        // If the error message exists, throw an error
       

        console.log("Name added successfully!");
        await fillNextPageCorp(page, data)

    } catch (e) {
        // Specific error handling
        if (e.message.includes('Execution context was destroyed')) {
            console.error("Error: Execution context was destroyed, possibly due to page navigation.");
        } else if (e.message.startsWith('DuplicateEntityError:')) {
            console.error("Duplicate entity found:", e.message);
        } else if (e.message.includes('Name is Invalid')) {
            console.error(e.message);
        } else {
            console.error("An error occurred:", e.message);
        }

        // Re-throw the error if necessary
        throw e;
    }
}




// async function addDataCorp(page, data) {
//     try {
//         console.log("Attempting to add the name");

//         // Wait for the form to be available
//         await page.waitForSelector('form', { visible: true, timeout: 120000 });

//         // Fill out the form and submit
//         await page.evaluate((data) => {
//             const nameField = document.querySelector('input[name="P2_ENTITY_NAME"]');
//             const checkbox = document.querySelector('input[name="P2_CHECKBOX"]');
//             const submitButton = document.querySelector('button.t-Button--hot');

//             if (!nameField || !submitButton) {
//                 throw new Error("Couldn't find name field or submit button");
//             }

//             // Set the name and checkbox values
//             nameField.value = data.Payload.Name.Legal_Name;
//             if (checkbox) {
//                 checkbox.checked = data.checked;
//             }

//             // Trigger form submission
//             submitButton.click();
//         }, data);

//         // Wait for either navigation or an error message to appear
//         try {
//             // Wait for navigation after form submission
//             await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 });
//         } catch (err) {
//             console.log("Page did not navigate, likely staying on the same page due to an error.");
//         }

//         // Check if the error message about the unacceptable name appears
//         await page.waitForSelector('p[style="color:red;text-align:left"]', { visible: true, timeout: 120000 });

//         const nameInvalid = await page.evaluate(() => {
//             const errorMessage = document.querySelector('p[style="color:red;text-align:left"]');
//             return errorMessage && errorMessage.innerText.includes('The proposed entity name is unacceptable');
//         });

//         // If the error message exists, throw an error
//         if (nameInvalid) {
//             throw new Error(`${data.Payload.Name.Legal_Name} Name is Invalid`);
//         }

//         console.log("Name added successfully!");
//         await fillNextPageCorp(page, data)

//     } catch (e) {
//         // Specific error handling
//         if (e.message.includes('Execution context was destroyed')) {
//             console.error("Error: Execution context was destroyed, possibly due to page navigation.");
//         } else if (e.message.includes('Name is Invalid')) {
//             console.error(e.message);
//         } else {
//             console.error("An error occurred:", e.message);
//         }

//         // Re-throw the error if necessary
//         throw e;
//     }
// }

// async function addDataCorp(page, data) {
//     try {
//         console.log("Attempting to add the name");
//         await page.waitForSelector('form', { visible: true, timeout: 120000 });

//         await page.evaluate((data) => {
//             const nameField = document.querySelector('input[name="P2_ENTITY_NAME"]');
//             const checkbox = document.querySelector('input[name="P2_CHECKBOX"]');
//             const submitButton = document.querySelector('button.t-Button--hot');


//             if (!nameField || !submitButton) {
//                 throw new Error("Couldn't find name field or submit button");
//             }
//             // //Corporation, Corp., Limited, Ltd., Incorporated, Inc.
//             // if(data.Payload.Name.Legal_Name.includes("Corporation") || data.Payload.Name.Legal_Name.includes("Corp.") || data.Payload.Name.Legal_Name.includes("Limited") ||data.Payload.Name.Legal_Name.includes("Ltd") ||data.Payload.Name.Legal_Name.includes("Incorporated") || data.Payload.Name.Legal_Name.includes("Inc.") || data.Payload.Name.Legal_Name.includes("Inc") ){
//             //     nameField.value = data.Payload.Name.Legal_Name;

//             // }
//             // else if(!((data.Payload.Name.Legal_Name.includes("Corporation") || data.Payload.Name.Legal_Name.includes("Corp.") || data.Payload.Name.Legal_Name.includes("Limited") ||data.Payload.Name.Legal_Name.includes("Ltd") ||data.Payload.Name.Legal_Name.includes("Incorporated") || data.Payload.Name.Legal_Name.includes("Inc.") || data.Payload.Name.Legal_Name.includes("Inc")) && data.Payload.Name.Legal_Name.includes(" "))){
//             //     const error = new Error("Company name does not contain any allowed terms such as 'Corporation, Corp., Limited, Ltd., Incorporated, Inc.'");
//             //     error.statusCode = 400 ; 
//             //     throw error;
//             // } 
//             // else if(!((data.Payload.Name.Legal_Name.includes("Corporation") || data.Payload.Name.Legal_Name.includes("Corp.") || data.Payload.Name.Legal_Name.includes("Limited") ||data.Payload.Name.Legal_Name.includes("Ltd") ||data.Payload.Name.Legal_Name.includes("Incorporated") || data.Payload.Name.Legal_Name.includes("Inc.") || data.Payload.Name.Legal_Name.includes("Inc"))) && !(data.Payload.Name.Legal_Name.includes(" ")) ) {
//             //     nameField.value = data.Payload.Name.Legal_Name;
//             //     nameField.value=nameField.value+" Corp."
//             //     // const error = new Error("Company name does not contain any allowed terms such as 'LLC', 'Limited Liability Company', or 'LL.C.'");
//             //     // error.statusCode = 400 ; 
//             //     // throw error;


//             // } 
//             const entityDesignations = [
//                 "L.L.C.", "Limited Liability Co.", "Limited Liability Corporation",
//                "LLC","Limited Liability Company","L.L.C.",
//                "PLC", "Public Limited Company", "LLP", "Limited Liability Partnership",
//                "LP", "Limited Partnership", "L.P.", "General Partnership", "GP",
//                "Sole Proprietorship", "Sole Trader", "Co.", "Company", "Cooperative",
//                "Mutual", "Association","Pvt Ltd"
//            ];
           
//            try {
//                let legalName = data.Payload.Name.Legal_Name;
           
//                entityDesignations.forEach(term => {
//                    const regex = new RegExp(`\\b${term}\\b`, 'i');
//                    legalName = legalName.replace(regex, '').trim();
//                });
           
//                if (legalName.includes("Corporation") || legalName.includes("Corp.") || legalName.includes("Limited") || legalName.includes("Ltd.") || legalName.includes("Incorporated") || legalName.includes("Inc.")) {
//                    nameField.value = legalName;
//                } else {
//                    nameField.value = `${legalName} Corp.`;
//                }


//             if (checkbox) {
//                 checkbox.checked = data.checked;
//             }
//             submitButton.click();
//         }  catch (e) {
//             return { status: 'error', message: e.message };
//         }


//         }, data);

    


//         await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
//         log('Name added and continue button clicked.');

//         await fillNextPageCorp(page, data);
//     } catch (e) {
//         await page.evaluate((message) => {
//             const errorDiv = document.createElement('div');
//             errorDiv.textContent = `Adding name failed: ${message}`;
//             errorDiv.style.position = 'fixed';
//             errorDiv.style.top = '0';
//             errorDiv.style.left = '0';
//             errorDiv.style.backgroundColor = 'red';
//             errorDiv.style.color = 'white';
//             errorDiv.style.padding = '10px';
//             errorDiv.style.zIndex = '1000';
//             document.body.appendChild(errorDiv);
//         }, e.message);
//         console.error("Adding name failed:", e);
//     }
// }

async function fillNextPageCorp(page, data) {
    try {
        console.log("Filling the next page...");



        await page.evaluate((data) => {
           

            // document.querySelector('input[name="P3_ENTITY_NAME"]').value = data.Payload.Name.Legal_Name+" Corp.";

            const entityDesignations = [
                "L.L.C.", "Limited Liability Co.", "Limited Liability Corporation",
                "Ltd.", "Limited", "Incorporated", "Inc.", "Corp.", "Corporation",
                "PLC", "Public Limited Company", "LLP", "Limited Liability Partnership",
                "LP", "Limited Partnership", "L.P.", "General Partnership", "GP",
                "Sole Proprietorship", "Sole Trader", "Co.", "Company", "Cooperative",
                "Mutual", "Association", "Pvt Ltd"
            ];

            let legalName = data.Payload.Name.Legal_Name;
            document.querySelector('input[name="P3_ENTITY_NAME"]').value = legalName;

            entityDesignations.forEach(term => {
                const regex = new RegExp(`\\b${term}\\b`, 'i');
                legalName = legalName.replace(regex, '').trim();
            });

            // if (legalName.includes("Corporation") || legalName.includes("Corp.") || legalName.includes("Limited") || legalName.includes("Ltd.") || legalName.includes("Incorporated") || legalName.includes("Inc.")) {
            //     document.querySelector('input[name="P3_ENTITY_NAME"]').value = legalName;
            // } else {
            //     // Append " LLC" if there are no terms and no space
            //     document.querySelector('input[name="P3_ENTITY_NAME"]').value = `${legalName} Corp.`;
            // }
            // // document.querySelector('#P3_COUNTY').value = "4";

            const dropdown= document.querySelector('#P3_COUNTY')
            const option = Array.from(dropdown.options).find(opt => opt.text === data.Payload.County.County.toUpperCase());
            if(option){
                dropdown.value=option.value ;
            }



            // const effectiveDate = document.querySelector('input#P3_EXISTENCE_OPTION_0');
            // effectiveDate.scrollIntoView()
            // const Dissolution_Date = document.querySelector('input#P3_DURATION_OPTION_0');
            // Dissolution_Date.scrollIntoView()
            // const liability_statement = document.querySelector('input#P3_LIAB_STATEMENT_0');
            // liability_statement.scrollIntoView()

            // if (effectiveDate) {
            //     effectiveDate.click();
            //     const radio1 = document.querySelector("input#P3_EXISTENCE_TYPE_0");
            //     const radio2 = document.querySelector("input#P3_EXISTENCE_TYPE_1");

            //     if (radio1 && radio1.checked) {
            //         radio1.checked = true;
            //     } else if (radio2 && radio2.checked) {
            //         const effectiveDateInput = document.querySelector('input[name="P3_EXIST_CALENDAR"]');
            //         if (effectiveDateInput) {
            //             effectiveDateInput.value = data.effectiveDate;

            //             effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));

            //             const dateComponent = document.querySelector('#P3_EXIST_CALENDAR');
            //             if (dateComponent) {
            //                 const event = new Event('ojInputDateValueChanged', { bubbles: true });
            //                 dateComponent.dispatchEvent(event);
            //             }
            //         }
            //     }
            // }

            // if (Dissolution_Date) {
            //     Dissolution_Date.click();
            //     const radio1 = document.querySelector("input#P4_DISSOLUTION_TYPE_0");
            //     const radio2 = document.querySelector("input#P4_DISSOLUTION_TYPE_1");

            //     if (radio1 && radio1.checked) {
            //         radio1.checked = true;
            //     } else if (radio2 && radio2.checked) {
            //         const effectiveDateInput = document.querySelector('input[name="P3_DURATION_CALENDAR"]');
            //         if (effectiveDateInput) {
            //             effectiveDateInput.value = data.effectiveDate;

            //             effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));

            //             const dateComponent = document.querySelector('#P3_DURTION_CALENDAR');
            //             if (dateComponent) {
            //                 const event = new Event('ojInputDateValueChanged', { bubbles: true });
            //                 dateComponent.dispatchEvent(event);
            //             }
            //         }
            //     }
            // }

            // if (liability_statement) {
            //     liability_statement.click();
            // }

            const opt1 = document.querySelector("input#P3_SOP_ADDR_OPTION_0");
            const opt2 = document.querySelector("input#P3_SOP_ADDR_OPTION_1");

            if (opt1 && opt1.checked) {
                document.querySelector('input[name="P3_SOP_NAME"]').value = data.Payload.Name.Alternate_Legal_Name;
                document.querySelector('input[name="P3_SOP_ADDR1"]').value = data.Payload.Principal_Address.PA_Address_Line1;
                document.querySelector('input[name="P3_SOP_ADDR2"]').value = data.Payload.Principal_Address.PA_Address_Line2;
                document.querySelector('input[name="P3_SOP_CITY"]').value = data.Payload.Principal_Address.PA_City;
                document.querySelector('input[name="P3_SOP_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;
            } else if (opt2 && opt2.checked) {
                const serviceCompanySelect = document.querySelector("#P3_SOP_SERVICE_COMPANY");
                if (serviceCompanySelect) {
                    serviceCompanySelect.value = "440";
                }
                document.querySelector('input[name="P3_SOP_NAME"]').value = data.Payload.Name.Alternate_Legal_Name;
                document.querySelector('input[name="P3_SOP_ADDR1"]').value = data.Payload.Principal_Address.PA_Address_Line1;
                document.querySelector('input[name="P3_SOP_ADDR2"]').value = data.Payload.Principal_Address.PA_Address_Line2;
                document.querySelector('input[name="P3_SOP_CITY"]').value = data.Payload.Principal_Address.PA_City;
                document.querySelector('input[name="P3_SOP_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;
            }

            const agentOpt1 = document.querySelector("input#P3_RA_ADDR_OPTION_0");
            const agentOpt2 = document.querySelector("input#P3_RA_ADDR_OPTION_1");

            if (data.Payload.Registerd_Agent) {
                const check=document.querySelector('#P3_RA_OPTION_0')
                check.click()
                if(agentOpt1 && agentOpt1.checked){
                document.querySelector('input[name="P3_RA_NAME"]').value = data.Payload.Registerd_Agent.Name;
                document.querySelector('input[name="P3_RA_ADDR1"]').value = data.Payload.Registerd_Agent.Address.RA_Address_Line1;
                document.querySelector('input[name="P3_RA_ADDR2"]').value =  data.Payload.Registerd_Agent.Address.RA_Address_Line2;
                document.querySelector('input[name="P3_RA_CITY"]').value =  data.Payload.Registerd_Agent.Address.RA_City;
                document.querySelector('input[name="P3_RA_POSTAL_CODE"]').value = data.Payload.Registerd_Agent.Address.RA_Postal_Code;
            } else if (agentOpt2 && agentOpt2.checked) {
                const registeredAgentSelect = document.querySelector("#P3_RA_SERVICE_COMPANY");
                if (registeredAgentSelect) {
                    registeredAgentSelect.value = "440";
                }
            }
        }

            let name=data.Payload.Incorporator_Information.Incorporator_Details.Name; 
            const nameparts=name.trim().split(' ')
            if(nameparts.length === 3){
                document.querySelector('input[name="P3_INCORP_FNAME"]').value = nameparts[0];
                document.querySelector('input[name="P3_INCORP_LNAME"]').value = nameparts[2]; 
                
                document.querySelector('input[name="P3_INCORP_MI"]').value = nameparts[1]; 

            }
            else if(nameparts.length ===2  ){
                document.querySelector('input[name="P3_INCORP_FNAME"]').value = nameparts[0];
                document.querySelector('input[name="P3_INCORP_LNAME"]').value = nameparts[1]; 

            }
            else{
                document.querySelector('input[name="P3_INCORP_FNAME"]').value = nameparts[0];
                document.querySelector('input[name="P3_INCORP_LNAME"]').value = nameparts[0] ;
            }


            document.querySelector('input[name="P3_INCORP_ADDR1"]').value = data.Payload.Incorporator_Information.Address.Inc_Address_Line1;
            document.querySelector('input[name="P3_INCORP_CITY"]').value = data.Payload.Incorporator_Information.Address.Inc_City;
            document.querySelector('input[name="P3_INCORP_POSTAL_CODE"]').value = data.Payload.Incorporator_Information.Address.Inc_Postal_Code;
            document.querySelector('input[name="P3_SIGNATURE"]').value = data.Payload.Incorporator_Information.Incorporator_Details.Name ;


            // stock 

            const stockInfo = data.Payload.Stock_Information;
            console.log("Stock information is :=" ,stockInfo)
const shareValue = stockInfo.Share_Par_Value;

const stockType = shareValue !== undefined && shareValue !== null ? 'PV' : 'NPV';

document.querySelector('input[name="P3_NUM_SHARES"]').value = stockInfo.No_Of_Shares;

const stockTypeSelect = document.querySelector('#P3_STOCK_TYPE');
stockTypeSelect.value = stockType;
stockTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));

if (stockType === 'PV') {
    document.querySelector('#P3_SHARE_VALUE').value = shareValue;

    document.querySelector('#P3_SHARE_VALUE').dispatchEvent(new Event('input', { bubbles: true }));
}

           

const clickedButton = 'ServiceCompany'; // Example: this value will come based on your condition

if (clickedButton === 'ServiceCompany') {
  // Populate fields for Service Company
  
  document.querySelector('#P3_FILER_NAME').value = data.Payload.Name.Alternate_Legal_Name;
  document.querySelector('#P3_FILER_ADDR1').value = data.Payload.Principal_Address.PA_Address_Line1
    document.querySelector('input[name="P3_FILER_CITY"]').value = data.Payload.Principal_Address.PA_City;
    document.querySelector('input[name="P3_FILER_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;

   

} else if (clickedButton === 'SOP') {
  // Populate fields for SOP
  
  document.querySelector('#P3_FILER_NAME').value = data.Payload.Name.Alternate_Legal_Name;
  document.querySelector('#P3_FILER_ADDR1').value = data.Payload.Principal_Address.PA_Address_Line1
    document.querySelector('input[name="P3_FILER_CITY"]').value = data.Payload.Principal_Address.PA_City;
    document.querySelector('input[name="P3_FILER_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;

  
} else if (clickedButton === 'Incorporator') {
  // Populate fields for Incorporator
  
  document.querySelector('#P3_FILER_NAME').value = data.Payload.Name.Alternate_Legal_Name;
  document.querySelector('#P3_FILER_ADDR1').value = data.Payload.Principal_Address.PA_Address_Line1
    document.querySelector('input[name="P3_FILER_CITY"]').value = data.Payload.Principal_Address.PA_City;
    document.querySelector('input[name="P3_FILER_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;

  

        

        console.log("Next page filled.");

    } },data)}
    
    catch (e) {
        await page.evaluate((message) => {
            const errorDiv = document.createElement('div');
            errorDiv.textContent = `Next page fill failed: ${message}`;
            errorDiv.style.position = 'fixed';
            errorDiv.style.top = '0';
            errorDiv.style.left = '0';
            errorDiv.style.backgroundColor = 'red';
            errorDiv.style.color = 'white';
            errorDiv.style.padding = '10px';
            errorDiv.style.zIndex = '1000';
            result = { status: 'error', message: e.message };

            document.body.appendChild(errorDiv);
        }, e.message);
        console.error("Filling next page failed:", e);
    }
    await page.hover('button.t-Button--hot');


    await page.evaluate(() => {
                    const submitButton = document.querySelector('button.t-Button--hot');
                    if (submitButton) {

                        submitButton.click();
                    }
                });
}


async function fillNextPage(page, data) {
    try {
        console.log("Filling the next page...");

        await page.waitForSelector('div#P4_INITIAL_STATEMENT_CONTAINER', { visible: true, timeout: 30000 });


        await page.evaluate((data) => {
            const radioButtons = document.querySelectorAll('input[name="P4_INITIAL_STATEMENT"]');
            if (radioButtons.length > 0) {
                radioButtons[0].checked = true;
            }
            
            let legalName = data.Payload.Name.Legal_Name;
            document.querySelector('input[name="P4_ENTITY_NAME"]').value = legalName;
            // Set the value in the input field
            // document.querySelector('input[name="P4_ENTITY_NAME"]').value = nameField.value;
            // document.querySelector('input[name="P4_ENTITY_NAME"]').value = data.Payload.Name.Alternate_Legal_Name+" LLC";
            // document.querySelector('#P4_COUNTY').value = "4";
            const dropdown= document.querySelector('#P4_COUNTY')
            const option = Array.from(dropdown.options).find(opt => opt.text === data.Payload.County.County.toUpperCase());
            if(option){
                dropdown.value=option.value ;
            }
            // const effectiveDate = document.querySelector('input#P4_EXISTENCE_OPTION_0');
            // effectiveDate.scrollIntoView()
            // const Dissolution_Date = document.querySelector('input#P4_DISSOLUTION_OPTION_0');
            // Dissolution_Date.scrollIntoView()
            // const liability_statement = document.querySelector('input#P4_LIAB_STATEMENT_0');
            // liability_statement.scrollIntoView()

            // if (effectiveDate) {
            //     effectiveDate.click();
            //     const radio1 = document.querySelector("input#P4_EXISTENCE_TYPE_0");
            //     const radio2 = document.querySelector("input#P4_EXISTENCE_TYPE_1");

            //     if (radio1 && radio1.checked) {
            //         radio1.checked = true;
            //     } else if (radio2 && radio2.checked) {
            //         const effectiveDateInput = document.querySelector('input[name="P4_EXIST_CALENDAR"]');
            //         if (effectiveDateInput) {
            //             effectiveDateInput.value = data.effectiveDate;

            //             effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));

            //             const dateComponent = document.querySelector('#P4_EXIST_CALENDAR');
            //             if (dateComponent) {
            //                 const event = new Event('ojInputDateValueChanged', { bubbles: true });
            //                 dateComponent.dispatchEvent(event);
            //             }
            //         }
            //     }
            // }

            // if (Dissolution_Date) {
            //     Dissolution_Date.click();
            //     const radio1 = document.querySelector("input#P4_DISSOLUTION_TYPE_0");
            //     const radio2 = document.querySelector("input#P4_DISSOLUTION_TYPE_1");

            //     if (radio1 && radio1.checked) {
            //         radio1.checked = true;
            //     } else if (radio2 && radio2.checked) {
            //         const effectiveDateInput = document.querySelector('input[name="P4_DIS_CALENDAR"]');
            //         if (effectiveDateInput) {
            //             effectiveDateInput.value = data.effectiveDate;

            //             effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));

            //             const dateComponent = document.querySelector('#P4_DIS_CALENDAR');
            //             if (dateComponent) {
            //                 const event = new Event('ojInputDateValueChanged', { bubbles: true });
            //                 dateComponent.dispatchEvent(event);
            //             }
            //         }
            //     }
            // }

            // if (liability_statement) {
            //     liability_statement.click();
            // }

            const opt1 = document.querySelector("input#P4_SOP_ADDR_OPTION_0");
            const opt2 = document.querySelector("input#P4_SOP_ADDR_OPTION_1");

            if (opt1 && opt1.checked) {
                document.querySelector('input[name="P4_SOP_NAME"]').value = data.Payload.Name.Alternate_Legal_Name;
                document.querySelector('input[name="P4_SOP_ADDR1"]').value = data.Payload.Principal_Address.PA_Address_Line1;
                document.querySelector('input[name="P4_SOP_ADDR2"]').value = data.Payload.Principal_Address.PA_Address_Line2;
                document.querySelector('input[name="P4_SOP_CITY"]').value = data.Payload.Principal_Address.PA_City;
                document.querySelector('input[name="P4_SOP_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;
            } else if (opt2 && opt2.checked) {
                const serviceCompanySelect = document.querySelector("#P4_SOP_SERVICE_COMPANY");
                if (serviceCompanySelect) {
                    serviceCompanySelect.value = "440";
                }
                document.querySelector('input[name="P4_SOP_NAME"]').value = data.Payload.Name.Alternate_Legal_Name;
                document.querySelector('input[name="P4_SOP_ADDR1"]').value = data.Payload.Principal_Address.PA_Address_Line1;
                document.querySelector('input[name="P4_SOP_ADDR2"]').value = data.Payload.Principal_Address.PA_Address_Line2;
                document.querySelector('input[name="P4_SOP_CITY"]').value = data.Payload.Principal_Address.PA_City;
                document.querySelector('input[name="P4_SOP_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;
            }

            const agentOpt1 = document.querySelector("input#P4_RA_ADDR_OPTION_0");
            const agentOpt2 = document.querySelector("input#P4_RA_ADDR_OPTION_1");

            if (data.Payload.Registered_Agent) {
                const check=document.querySelector('#P4_RA_OPTION_0')
                check.click()
                if(agentOpt1 && agentOpt1.checked){
                document.querySelector('input[name="P4_RA_NAME"]').value = data.Payload.Registered_Agent.Name;
                document.querySelector('input[name="P4_RA_ADDR1"]').value = data.Payload.Registered_Agent.Address.RA_Address_Line1;
                document.querySelector('input[name="P4_RA_ADDR2"]').value =  data.Payload.Registered_Agent.Address.RA_Address_Line2;
                document.querySelector('input[name="P4_RA_CITY"]').value =  data.Payload.Registered_Agent.Address.RA_City;
                document.querySelector('input[name="P4_RA_POSTAL_CODE"]').value = data.Payload.Registered_Agent.Address.RA_Postal_Code;
            } else if (agentOpt2 && agentOpt2.checked) {
                const registeredAgentSelect = document.querySelector("#P4_RA_SERVICE_COMPANY");
                if (registeredAgentSelect) {
                    registeredAgentSelect.value = "440";
                }
            }
        }

            document.querySelector('input[name="P4_ORGANIZER_NAME"]').value = data.Payload.Organizer_Information.Organizer_Details.Og_Name;
            document.querySelector('input[name="P4_ORGANIZER_ADDR1"]').value = data.Payload.Organizer_Information.Org_Address.Org_Address_Line1;
            document.querySelector('input[name="P4_ORGANIZER_CITY"]').value = data.Payload.Organizer_Information.Org_Address.Org_City;
            document.querySelector('input[name="P4_ORGANIZER_POSTAL_CODE"]').value = data.Payload.Organizer_Information.Org_Address.Org_Postal_Code;
            document.querySelector('input[name="P4_SIGNATURE"]').value = data.Payload.Organizer_Information.Organizer_Details.Og_Name;

            document.querySelector('#P4_FILER_NAME').value = data.Payload.Organizer_Information.Organizer_Details.Og_Name;
            document.querySelector('#P4_FILER_ADDR1').value = data.Payload.Organizer_Information.Org_Address.Org_Address_Line1;
            document.querySelector('input[name="P4_FILER_CITY"]').value = data.Payload.Organizer_Information.Org_Address.Org_City;
            document.querySelector('input[name="P4_FILER_POSTAL_CODE"]').value = data.Payload.Organizer_Information.Org_Address.Org_Postal_Code;

        }, data);

        console.log("Next page filled.");

    } catch (e) {
        await page.evaluate((message) => {
            const errorDiv = document.createElement('div');
            errorDiv.textContent = `Next page fill failed: ${message}`;
            errorDiv.style.position = 'fixed';
            errorDiv.style.top = '500';
            errorDiv.style.left = '500';
            errorDiv.style.right='500';

            errorDiv.style.backgroundColor = 'white';
            errorDiv.style.color = 'red';
            errorDiv.style.padding = '10px';
            errorDiv.style.zIndex = '1000';
            document.body.appendChild(errorDiv);
        }, e.message);
        console.error("Filling next page failed:", e);
    }
    await page.hover('button.t-Button--hot');


    await page.evaluate(() => {
                    const submitButton = document.querySelector('button.t-Button--hot');
                    if (submitButton) {

                        submitButton.click();
                    }
                });
}

function isNetworkError(error) {
    return ['ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET','ERR_CONNECTION_RESET','ERR_CONNECTION_REFUSED'].includes(error.code);
}

async function retry(fn, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
        }
    }
}
async function adjustViewport(page) {
    const { innerWidth, innerHeight } = await page.evaluate(() => {
        return {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
        };
    });

    await page.setViewport({
        width: innerWidth,
        height: innerHeight,
        deviceScaleFactor: 1,
    });
}




app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});