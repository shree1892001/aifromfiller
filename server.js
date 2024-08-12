// const express = require('express');
// const bodyParser = require('body-parser');
// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const axios = require('axios');
// const fs = require('fs');
// const cors = require('cors');

// const path = require('path');

// puppeteer.use(StealthPlugin());

// const app = express();
// const port = 3000;
// const apiEndpoint = 'http://192.168.1.17:3000/run-puppeteer'; // Adjust this if needed

// app.use(bodyParser.json());
// app.use(cors({
//     origin: '*',
// }));

// // Set up logging
// const logFilePath = path.join(__dirname, 'server.log');
// const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });


// const log = (message) => {
//     const timestamp = new Date().toISOString();
//     logStream.write(`[${timestamp}] ${message}\n`);
// };

// app.use(bodyParser.json());

// // Function to run Puppeteer script
// async function runPuppeteerScript(apiEndpoint, requestPayload, retryCount = 0) {
//     try {
//         const response = await axios.get('http://localhost:3001/get-data');
//         const jsonData = response.data;
//         log('Data fetched from API successfully.');

//         const browser = await puppeteer.launch({
//             headless: false,
//             args: [
//                 '--start-maximized',
//                 '--no-sandbox',
//                 '--disable-setuid-sandbox',
//                 '--disable-infobars',
//                 '--ignore-certificate-errors',
//                 '--ignore-certificate-errors-spki-list',
//                 '--disable-blink-features=AutomationControlled',
                
//             ],
//             ignoreHTTPSErrors: true,
//             defaultViewport: null,
//         });

//         const page = await browser.newPage();
//         await setupPage(page);

//         await retry(async () => {
//             console.log("Navigating to the login page...");
//             await page.goto("https://filings.dos.ny.gov/ords/corpanc/r/ecorp/login_desktop", {
//                 waitUntil: 'networkidle0',
//                 timeout: 60000
//             });
//             log('Login page loaded.');
//         });

//         await randomSleep(3000, 5000);
//         await performLogin(page);

//         await addData(page, jsonData);

//         console.log("Waiting for the preview page to be loaded...");
//         await page.waitForSelector('.page-6.app-EFILING', { visible: true, timeout: 60000 });

//         log("Next step completed and preview loaded.");
//         await randomSleep(180000, 220000);

//         await browser.close();
//     } catch (e) {
//         log(`Error running Puppeteer: ${e.message}`);
//         console.error("Error running Puppeteer:", e);

//         if (isNetworkError(e)) {
//             if (retryCount < 3) {  // Adjust the retry limit as needed
//                 log(`Network error detected. Restarting script... (Attempt ${retryCount + 1})`);
//                 await runPuppeteerScript(apiEndpoint, requestPayload, retryCount + 1);
//             } else {
//                 log('Max retries reached. Script stopped.');
//                 throw e;  // Rethrow the error if max retries are reached
//             }
//         } else {
//             throw e;
//         }
//     }
// }

// // Endpoint for running Puppeteer with dynamic data
// app.post('/run-puppeteer', async (req, res) => {
//     const { requestPayload } = req.body;

//     if (!requestPayload) {
//         res.status(400).send('API endpoint and request payload are required.');
//         return;
//     }

//     try {
//         await runPuppeteerScript(apiEndpoint, requestPayload);
//         res.send('Puppeteer script executed successfully.');
//     } catch (e) {
//         res.status(500).send('Error running Puppeteer.');
//     }
// });

// async function setupPage(page) {
//     await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
//     await page.setJavaScriptEnabled(true);
//     await page.setDefaultNavigationTimeout(120000);

//     await page.evaluate(() => {
//         Object.defineProperty(navigator, 'platform', { get: () => ['Win32', 'MacIntel', 'Linux x86_64'][Math.floor(Math.random() * 3)] });
//         Object.defineProperty(navigator, 'productSub', { get: () => '20100101' });
//     });
// }

// async function randomSleep(min = 1000, max = 2000) {
//     const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
//     await new Promise(resolve => setTimeout(resolve, sleepTime));
// }

// async function performLogin(page) {
//     try {
//         console.log("Attempting to login...");
//         await page.waitForSelector('form', { visible: true, timeout: 120000 });

//         await page.evaluate(() => {
//             const usernameField = document.querySelector('input[name="P101_USERNAME"]');
//             const passwordField = document.querySelector('input[name="P101_PASSWORD"]');
//             const submitButton = document.querySelector('button#P101_LOGIN');

//             if (!usernameField || !passwordField || !submitButton) {
//                 throw new Error("Couldn't find login elements");
//             }

//             usernameField.value = "redberyl";
//             passwordField.value = "yD7?ddG0";

//             submitButton.click();
//         });

//         await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
//         log('Login successful.');
//     } catch (e) {
//         log(`Login failed: ${e.message}`);
//         console.error("Login failed:", e);
//     }
// }

// async function addData(page, data) {
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

//             nameField.value = data.nameField;

//             if (checkbox) {
//                 checkbox.checked = data.checked;
//             }

//             submitButton.click();
//         }, data);

//         await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
//         log('Name added and continue button clicked.');
//         await fillNextPage(page, data);
//     } catch (e) {
//         log(`Adding name failed: ${e.message}`);
//         console.error("Adding name failed:", e);
//     }
// }

// async function fillNextPage(page, data) {
//     try {
//         console.log("Filling the next page...");
//         await page.waitForSelector('div#P4_INITIAL_STATEMENT_CONTAINER', { visible: true, timeout: 30000 });

//         await page.evaluate((data) => {
//             const radioButtons = document.querySelectorAll('input[name="P4_INITIAL_STATEMENT"]');
//             if (radioButtons.length > 0) {
//                 radioButtons[0].checked = true;
//             }

//             document.querySelector('input[name="P4_ENTITY_NAME"]').value = data.nameField;
//             document.querySelector('#P4_COUNTY').value = "4";

//             const effectiveDate = document.querySelector('input#P4_EXISTENCE_OPTION_0');
//             if (effectiveDate) {
//                 effectiveDate.click();
//                 const effectiveDateInput = document.querySelector('input[name="P4_EXIST_CALENDAR"]');
//                 if (effectiveDateInput) {
//                     effectiveDateInput.value = data.effectiveDate;
//                     effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));
//                 }
//             }

//             const Dissolution_Date = document.querySelector('input#P4_DISSOLUTION_OPTION_0');
//             if (Dissolution_Date) {
//                 Dissolution_Date.click();
//                 const effectiveDateInput = document.querySelector('input[name="P4_DIS_CALENDAR"]');
//                 if (effectiveDateInput) {
//                     effectiveDateInput.value = data.effectiveDate;
//                     effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));
//                 }
//             }

//             const liability_statement = document.querySelector('input#P4_LIAB_STATEMENT_0');
//             if (liability_statement) {
//                 liability_statement.click();
//             }

//             const opt1 = document.querySelector("input#P4_SOP_ADDR_OPTION_0");
//             if (opt1 && opt1.checked) {
//                 document.querySelector('input[name="P4_SOP_NAME"]').value = data.sop.name;
//                 document.querySelector('input[name="P4_SOP_ADDR1"]').value = data.sop.addr1;
//                 document.querySelector('input[name="P4_SOP_ADDR2"]').value = data.sop.addr2;
//                 document.querySelector('input[name="P4_SOP_CITY"]').value = data.sop.city;
//                 document.querySelector('input[name="P4_SOP_POSTAL_CODE"]').value = data.sop.postal_code;
//             }

//             const agentOpt1 = document.querySelector("input#P4_OPT_AGENT_OPTION_0");
//             if (agentOpt1 && agentOpt1.checked) {
//                 document.querySelector('input[name="P4_OPT_AGENT_NAME"]').value = data.optional_agent.name;
//                 document.querySelector('input[name="P4_OPT_AGENT_ADDR1"]').value = data.optional_agent.addr1;
//                 document.querySelector('input[name="P4_OPT_AGENT_ADDR2"]').value = data.optional_agent.addr2;
//                 document.querySelector('input[name="P4_OPT_AGENT_CITY"]').value = data.optional_agent.city;
//                 document.querySelector('input[name="P4_OPT_AGENT_POSTAL_CODE"]').value = data.optional_agent.postal_code;
//             }

//             const newStatement = document.querySelector('input#P4_ADDITIONAL_STATEMENT_OPTION_0');
//             if (newStatement) {
//                 newStatement.click();
//                 document.querySelector('input#P4_ADD_STATE').value = data.new_statement;
//             }

//             const nextButton = document.querySelector('button.t-Button--hot');

//             if (nextButton) {
//                 nextButton.click();
//             }
//         }, data);

//         await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
//         log("Next step completed.");
//     } catch (e) {
//         log(`Filling the next page failed: ${e.message}`);
//         console.error("Filling the next page failed:", e);
//     }
// }

// function isNetworkError(error) {
//     return ['ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET'].includes(error.code);
// }

// async function retry(fn, retries = 3) {
//     for (let i = 0; i < retries; i++) {
//         try {
//             return await fn();
//         } catch (error) {
//             if (i === retries - 1) throw error;
//         }
//     }
// }

// app.listen(port, () => {
//     console.log(`Server listening at http://192.168.1.17:${port}`);
// });


const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');

const path = require('path');

puppeteer.use(StealthPlugin());

const app = express();
const port = 3000;
const apiEndpoint = 'http://192.168.1.1:3000/run-puppeteer'; // Adjust this if needed

app.use(bodyParser.json());
app.use(cors({
    origin: '*',
}));

// Set up logging
const logFilePath = path.join(__dirname, 'server.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });


const log = (message) => {
    const timestamp = new Date().toISOString();
    logStream.write(`[${timestamp}] ${message}\n`);
};

app.use(bodyParser.json());

// Function to run Puppeteer script
async function runPuppeteerScript(apiEndpoint, requestPayload, retryCount = 0) {
    try {
        const response = await axios.get('http://192.168.1.31:3001/get-data');
        const jsonData = response.data;
        log('Data fetched from API successfully.');

        const browser = await puppeteer.launch({
            headless: false,
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list',
                '--disable-blink-features=AutomationControlled',
                
            ],
            ignoreHTTPSErrors: true,
            defaultViewport: null,
        });

        const page = await browser.newPage();
        await setupPage(page);

        await retry(async () => {
            console.log("Navigating to the login page...");
            await page.goto("https://filings.dos.ny.gov/ords/corpanc/r/ecorp/login_desktop", {
                waitUntil: 'networkidle0',
                timeout: 60000
            });
            log('Login page loaded.');
        });

        await randomSleep(3000, 5000);
        await performLogin(page);
        console.log("Waiting for the list to appear...");
        await page.waitForSelector('ul.t-LinksList', { visible: true, timeout: 60000 });

        console.log("Opening the link Domestic Business Corporation and Domestic Limited Liability Company..");
        const firstLinkUrl = await page.evaluate(() => {
            const firstLink = document.querySelector('ul.t-LinksList li.t-LinksList-item:nth-child(1) a.t-LinksList-link');
            firstLink.scrollIntoView()
            return firstLink ? firstLink.getAttribute('href') : null;

        });
        await randomSleep(3000, 5000);

        if (!firstLinkUrl) {
            throw new Error("Couldn't find the Domestic Business Corporation and Domestic Limited Liability Company");
        }

        console.log("Opening the Domestic Business Corporation and Domestic Limited Liability Company..");
        await page.goto(new URL(firstLinkUrl, page.url()).href, { waitUntil: 'networkidle0' });

        console.log("Domestic Business Corporation and Domestic Limited Liability Company page loaded.");
        await randomSleep(3000, 5000);

        console.log("Getting the url for Articles of Organization for a Domestic Limited Liability Company (not for professional service limited liability companies)...");
        const secondLinkUrl = await page.evaluate(() => {
            const secondLink = document.querySelector('ul.t-LinksList li.t-LinksList-item:nth-child(2) a.t-LinksList-link');
            secondLink.scrollIntoView()
            return secondLink ? secondLink.getAttribute('href') : null;
        });
        await randomSleep(3000, 5000);

        if (!secondLinkUrl) {
            throw new Error("Couldn't find the Articles of Organization for a Domestic Limited Liability Company (not for professional service limited liability companies) URL");
        }

        console.log("Opening the Articles of Organization for a Domestic Limited Liability Company (not for professional service limited liability companies) URL...");
        await page.goto(new URL(secondLinkUrl, page.url()).href, { waitUntil: 'networkidle0' });

        console.log("Articles of Organization for a Domestic Limited Liability Company (not for professional service limited liability companies) page   loaded.");
        await randomSleep(3000, 5000);

        await addData(page, jsonData);

        console.log("Waiting for the preview page to be loaded...");
        await page.waitForSelector('.page-6.app-EFILING', { visible: true, timeout: 60000 });

        log("Next step completed and preview loaded.");
        await randomSleep(180000, 220000);

        await browser.close();
    } catch (e) {
        log(`Error running Puppeteer: ${e.message}`);
        console.error("Error running Puppeteer:", e);

        if (isNetworkError(e)) {
            if (retryCount < 3) {  // Adjust the retry limit as needed
                log(`Network error detected. Restarting script... (Attempt ${retryCount + 1})`);
                await runPuppeteerScript(apiEndpoint, requestPayload, retryCount + 1);
            } else {
                log('Max retries reached. Script stopped.');
                throw e;  // Rethrow the error if max retries are reached
            }
        } else {
            throw e;
        }
    }
}

// Endpoint for running Puppeteer with dynamic data
app.post('/run-puppeteer', async (req, res) => {
    const { requestPayload } = req.body;

    if (!requestPayload) {
        res.status(400).send('API endpoint and request payload are required.');
        return;
    }

    try {
        await runPuppeteerScript(apiEndpoint, requestPayload);
        res.send('Puppeteer script executed successfully.');
    } catch (e) {
        res.status(500).send('Error running Puppeteer.');
    }
});

async function setupPage(page) {
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.setJavaScriptEnabled(true);
    await page.setDefaultNavigationTimeout(120000);

    await page.evaluate(() => {
        Object.defineProperty(navigator, 'platform', { get: () => ['Win32', 'MacIntel', 'Linux x86_64'][Math.floor(Math.random() * 3)] });
        Object.defineProperty(navigator, 'productSub', { get: () => '20100101' });
    });
}

async function randomSleep(min = 1000, max = 2000) {
    const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, sleepTime));
}

async function performLogin(page) {
    try {
        console.log("Attempting to login...");
        await page.waitForSelector('form', { visible: true, timeout: 120000 });

        await page.evaluate(() => {
            const usernameField = document.querySelector('input[name="P101_USERNAME"]');
            const passwordField = document.querySelector('input[name="P101_PASSWORD"]');
            const submitButton = document.querySelector('button#P101_LOGIN');

            if (!usernameField || !passwordField || !submitButton) {
                throw new Error("Couldn't find login elements");
            }

            usernameField.value = "redberyl";
            passwordField.value = "yD7?ddG0";

            submitButton.click();
        });

        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
        log('Login successful.');
    } catch (e) {
        log(`Login failed: ${e.message}`);
        console.error("Login failed:", e);
    }
}

async function addData(page, data) {
    try {
        console.log("Attempting to add the name");
        await page.waitForSelector('form', { visible: true, timeout: 120000 });

        await page.evaluate((data) => {
            const nameField = document.querySelector('input[name="P2_ENTITY_NAME"]');
            const checkbox = document.querySelector('input[name="P2_CHECKBOX"]');
            const submitButton = document.querySelector('button.t-Button--hot');

            if (!nameField || !submitButton) {
                throw new Error("Couldn't find name field or submit button");
            }

            nameField.value = data.nameField;

            if (checkbox) {
                checkbox.checked = data.checked;
            }

            submitButton.click();
        }, data);

        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
        log('Name added and continue button clicked.');
        await fillNextPage(page, data);
    } catch (e) {
        log(`Adding name failed: ${e.message}`);
        console.error("Adding name failed:", e);
    }
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

            document.querySelector('input[name="P4_ENTITY_NAME"]').value = data.nameField;
            document.querySelector('#P4_COUNTY').value = "4";

            const effectiveDate = document.querySelector('input#P4_EXISTENCE_OPTION_0');
            if (effectiveDate) {
                effectiveDate.click();
                const effectiveDateInput = document.querySelector('input[name="P4_EXIST_CALENDAR"]');
                if (effectiveDateInput) {
                    effectiveDateInput.value = data.effectiveDate;
                    effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            const Dissolution_Date = document.querySelector('input#P4_DISSOLUTION_OPTION_0');
            if (Dissolution_Date) {
                Dissolution_Date.click();
                const effectiveDateInput = document.querySelector('input[name="P4_DIS_CALENDAR"]');
                if (effectiveDateInput) {
                    effectiveDateInput.value = data.effectiveDate;
                    effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            const liability_statement = document.querySelector('input#P4_LIAB_STATEMENT_0');
            if (liability_statement) {
                liability_statement.click();
            }

            const opt1 = document.querySelector("input#P4_SOP_ADDR_OPTION_0");
            if (opt1 && opt1.checked) {
                document.querySelector('input[name="P4_SOP_NAME"]').value = data.sop.name;
                document.querySelector('input[name="P4_SOP_ADDR1"]').value = data.sop.addr1;
                document.querySelector('input[name="P4_SOP_ADDR2"]').value = data.sop.addr2;
                document.querySelector('input[name="P4_SOP_CITY"]').value = data.sop.city;
                document.querySelector('input[name="P4_SOP_POSTAL_CODE"]').value = data.sop.postal_code;
            }

            const agentOpt1 = document.querySelector("input#P4_OPT_AGENT_OPTION_0");
            if (agentOpt1 && agentOpt1.checked) {
                document.querySelector('input[name="P4_OPT_AGENT_NAME"]').value = data.optional_agent.name;
                document.querySelector('input[name="P4_OPT_AGENT_ADDR1"]').value = data.optional_agent.addr1;
                document.querySelector('input[name="P4_OPT_AGENT_ADDR2"]').value = data.optional_agent.addr2;
                document.querySelector('input[name="P4_OPT_AGENT_CITY"]').value = data.optional_agent.city;
                document.querySelector('input[name="P4_OPT_AGENT_POSTAL_CODE"]').value = data.optional_agent.postal_code;
            }

            const newStatement = document.querySelector('input#P4_ADDITIONAL_STATEMENT_OPTION_0');
            if (newStatement) {
                newStatement.click();
                document.querySelector('input#P4_ADD_STATE').value = data.new_statement;
            }

            const nextButton = document.querySelector('button.t-Button--hot');

            if (nextButton) {
                nextButton.click();
            }
        }, data);

        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
        log("Next step completed.");
    } catch (e) {
        log(`Filling the next page failed: ${e.message}`);
        console.error("Filling the next page failed:", e);
    }
}

function isNetworkError(error) {
    return ['ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET'].includes(error.code);
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

app.listen(port, () => {
    console.log(`Server listening at http://192.168.1.31:${port}`);
});

