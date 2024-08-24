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
const apiEndpoint = 'http://192.168.1.35:3001/run-puppeteer'; // Adjust this if needed

app.use(bodyParser.json());
app.use(cors({
    origin: ['chrome-extension://kpmpcomcmochjklgamghkddpaenjojhl','http://192.168.1.35:3000','http://192.168.1.35:3001','http://localhost:3000'],
    methods: ['GET','POST']
}));
let shouldTriggerAutomation = false;


// Set up logging
const logFilePath = path.join(__dirname, 'server.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

app.get('/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };
    clients.push(newClient);

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
    });
});
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

function sendEventToAll(event) {
    clients.forEach(client => client.res.write(`data: ${JSON.stringify(event)}\n\n`));
}


app.use(bodyParser.json());

async function runPuppeteerScript(apiEndpoint, requestPayload, retryCount = 0) {
    try {
        
        const jsonData = requestPayload;
        console.log(jsonData)
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
        });

        const page = await browser.newPage();
        await setupPage(page);
        await adjustViewport(page);

        await retry(async () => {
            sendWebSocketMessage('Navigating to the login page...');
             
            console.log("Navigating to the login page...");
            await page.goto("https://filings.dos.ny.gov/ords/corpanc/r/ecorp/login_desktop", {
                waitUntil: 'networkidle0',
                timeout: 60000
            });
            log('Login page loaded.');
        });

        await randomSleep(3000, 5000);
        await performLogin(page);
        await adjustViewport(page);

        

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


        await adjustViewport(page);



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
        await adjustViewport(page);



        log("Next step completed and preview loaded.");
        await randomSleep(180000, 220000);

        await browser.close();
    } catch (e) {
        log(`Error running Puppeteer: ${e.message}`);
        console.error("Error running Puppeteer:", e);

        if (isNetworkError(e)) {
            if (retryCount < 10) {  // Adjust the retry limit as needed
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

app.post('/run-puppeteer', async (req, res) => {

    shouldTriggerAutomation = true; // Set the trigger flag

    const jsonData = req.body;

    if (!jsonData) {
        res.status(400).send('API endpoint and request payload are required.');
        return;
    }

    try {
        await runPuppeteerScript(apiEndpoint, jsonData);
        res.send('Puppeteer script executed successfully.');
    } catch (e) {
        res.status(500).send('Error running Puppeteer.');
    }
});
app.get('/check-trigger', (req, res) => {
    res.json({ trigger: shouldTriggerAutomation });
    if (shouldTriggerAutomation) {
      shouldTriggerAutomation = false; // Reset the trigger flag after checking
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

async function performLogin(page) {
    try {
        console.log("Attempting to login...");
        await page.waitForSelector('form', { visible: true, timeout: 120000 });

        await page.evaluate(() => {
            const usernameField = document.querySelector('input[name="P101_USERNAME"]');
            const passwordField = document.querySelector('input[name="P101_PASSWORD"]');

            if (!usernameField || !passwordField ) {
                throw new Error("Couldn't find login elements");
            }

            usernameField.value = "redberyl";
            passwordField.value = "yD7?ddG0";
            const submitButton = document.querySelector('button#P101_LOGIN');

            submitButton.click();


        });

        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
        log('Login successful.');
        await page.evaluate(()=>{
            const submitButton = document.querySelector('button#P101_LOGIN');

            submitButton.click();


        })

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
            nameField.value = data.Payload.Name.Legal_Name;
            nameField.value=nameField.value+" LLC"
            if (nameField.value !== "Redberyltech LLC") {
                throw new Error(`The value for the entity name is incorrect. It should be RedBerylTech LLC`);
            }


            if (checkbox) {
                checkbox.checked = data.checked;
            }
            submitButton.click();


        }, data);

    


        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
        log('Name added and continue button clicked.');

        await fillNextPage(page, data);
    } catch (e) {
        await page.evaluate((message) => {
            const errorDiv = document.createElement('div');
            errorDiv.textContent = `Adding name failed: ${message}`;
            errorDiv.style.position = 'fixed';
            errorDiv.style.top = '0';
            errorDiv.style.left = '0';
            errorDiv.style.backgroundColor = 'red';
            errorDiv.style.color = 'white';
            errorDiv.style.padding = '10px';
            errorDiv.style.zIndex = '1000';
            document.body.appendChild(errorDiv);
        }, e.message);
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

            document.querySelector('input[name="P4_ENTITY_NAME"]').value = data.Payload.Name.Legal_Name+" LLC";
            document.querySelector('#P4_COUNTY').value = "4";

            const effectiveDate = document.querySelector('input#P4_EXISTENCE_OPTION_0');
            effectiveDate.scrollIntoView()
            const Dissolution_Date = document.querySelector('input#P4_DISSOLUTION_OPTION_0');
            Dissolution_Date.scrollIntoView()
            const liability_statement = document.querySelector('input#P4_LIAB_STATEMENT_0');
            liability_statement.scrollIntoView()

            if (effectiveDate) {
                effectiveDate.click();
                const radio1 = document.querySelector("input#P4_EXISTENCE_TYPE_0");
                const radio2 = document.querySelector("input#P4_EXISTENCE_TYPE_1");

                if (radio1 && radio1.checked) {
                    radio1.checked = true;
                } else if (radio2 && radio2.checked) {
                    const effectiveDateInput = document.querySelector('input[name="P4_EXIST_CALENDAR"]');
                    if (effectiveDateInput) {
                        effectiveDateInput.value = data.effectiveDate;

                        effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));

                        const dateComponent = document.querySelector('#P4_EXIST_CALENDAR');
                        if (dateComponent) {
                            const event = new Event('ojInputDateValueChanged', { bubbles: true });
                            dateComponent.dispatchEvent(event);
                        }
                    }
                }
            }

            if (Dissolution_Date) {
                Dissolution_Date.click();
                const radio1 = document.querySelector("input#P4_DISSOLUTION_TYPE_0");
                const radio2 = document.querySelector("input#P4_DISSOLUTION_TYPE_1");

                if (radio1 && radio1.checked) {
                    radio1.checked = true;
                } else if (radio2 && radio2.checked) {
                    const effectiveDateInput = document.querySelector('input[name="P4_DIS_CALENDAR"]');
                    if (effectiveDateInput) {
                        effectiveDateInput.value = data.effectiveDate;

                        effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));

                        const dateComponent = document.querySelector('#P4_DIS_CALENDAR');
                        if (dateComponent) {
                            const event = new Event('ojInputDateValueChanged', { bubbles: true });
                            dateComponent.dispatchEvent(event);
                        }
                    }
                }
            }

            if (liability_statement) {
                liability_statement.click();
            }

            const opt1 = document.querySelector("input#P4_SOP_ADDR_OPTION_0");
            const opt2 = document.querySelector("input#P4_SOP_ADDR_OPTION_1");

            if (opt1 && opt1.checked) {
                document.querySelector('input[name="P4_SOP_NAME"]').value = data.Payload.Name.Alternate_Legal_Name;
                document.querySelector('input[name="P4_SOP_ADDR1"]').value = data.Payload.Principal_Address.Address_Line1;
                document.querySelector('input[name="P4_SOP_ADDR2"]').value = data.Payload.Principal_Address.Address_Line2;
                document.querySelector('input[name="P4_SOP_CITY"]').value = data.Payload.Principal_Address.City;
                document.querySelector('input[name="P4_SOP_POSTAL_CODE"]').value = data.Payload.Principal_Address.Postal_Code;
            } else if (opt2 && opt2.checked) {
                const serviceCompanySelect = document.querySelector("#P4_SOP_SERVICE_COMPANY");
                if (serviceCompanySelect) {
                    serviceCompanySelect.value = "440";
                }
                document.querySelector('input[name="P4_SOP_NAME"]').value = data.Payload.Name.Alternate_Legal_Name;
                document.querySelector('input[name="P4_SOP_ADDR1"]').value = data.Payload.Principal_Address.Address_Line1;
                document.querySelector('input[name="P4_SOP_ADDR2"]').value = data.Payload.Principal_Address.Address_Line2;
                document.querySelector('input[name="P4_SOP_CITY"]').value = data.Payload.Principal_Address.City;
                document.querySelector('input[name="P4_SOP_POSTAL_CODE"]').value = data.Payload.Principal_Address.Postal_Code;
            }

            const agentOpt1 = document.querySelector("input#P4_RA_ADDR_OPTION_0");
            const agentOpt2 = document.querySelector("input#P4_RA_ADDR_OPTION_1");

            if (data.Payload.Registered_Agent) {
                const check=document.querySelector('#P4_RA_OPTION_0')
                check.click()
                if(agentOpt1 && agentOpt1.checked){
                document.querySelector('input[name="P4_RA_NAME"]').value = data.Payload.Registered_Agent.Name;
                document.querySelector('input[name="P4_RA_ADDR1"]').value = data.Payload.Registered_Agent.Address.Address_Line1;
                document.querySelector('input[name="P4_RA_ADDR2"]').value =  data.Payload.Registered_Agent.Address.Address_Line2;
                document.querySelector('input[name="P4_RA_CITY"]').value =  data.Payload.Registered_Agent.Address.City;
                document.querySelector('input[name="P4_RA_POSTAL_CODE"]').value = data.Payload.Registered_Agent.Address.Postal_Code;
            } else if (agentOpt2 && agentOpt2.checked) {
                const registeredAgentSelect = document.querySelector("#P4_AGENT_SERVICE_COMPANY");
                if (registeredAgentSelect) {
                    registeredAgentSelect.value = "440";
                }
            }
        }

            document.querySelector('input[name="P4_ORGANIZER_NAME"]').value = data.Payload.Organizer_Information.Organizer_Details.Name;
            document.querySelector('input[name="P4_ORGANIZER_ADDR1"]').value = data.Payload.Organizer_Information.Address.Address_Line1;
            document.querySelector('input[name="P4_ORGANIZER_CITY"]').value = data.Payload.Organizer_Information.Address.City;
            document.querySelector('input[name="P4_ORGANIZER_POSTAL_CODE"]').value = data.Payload.Organizer_Information.Address.Postal_Code;
            document.querySelector('input[name="P4_SIGNATURE"]').value = data.Payload.Organizer_Information.Organizer_Details.Signature;

            document.querySelector('#P4_FILER_NAME').value = data.Payload.Organizer_Information.Organizer_Details.Name;
            document.querySelector('#P4_FILER_ADDR1').value = data.Payload.Organizer_Information.Address.Address_Line1;
            document.querySelector('input[name="P4_FILER_CITY"]').value = data.Payload.Organizer_Information.Address.City;
            document.querySelector('input[name="P4_FILER_POSTAL_CODE"]').value = data.Payload.Organizer_Information.Address.Postal_Code;

        }, data);

        console.log("Next page filled.");

    } catch (e) {
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

// Call this function where needed



app.listen(port, () => {
    console.log(`Server listening at http://192.168.1.35:${port}`);
});