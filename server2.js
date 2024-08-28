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
const apiEndpoint = 'http://192.168.1.10:3001/run-puppeteer'; // Adjust this if needed

app.use(bodyParser.json());
app.use(cors({
    origin: ['chrome-extension://kpmpcomcmochjklgamghkddpaenjojhl','http://192.168.1.35:3000','http://192.168.1.35:3001','http://localhost:3000','http://192.168.1.11:3000','http://192.168.1.4:3000','http://192.168.1.10:3001','http://192.168.1.4:3001'],
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
    try {
        
        const  jsonData = cleanData(requestPayload.data);
        //jsonData=JSON.parse(jsonData);
        console.log(jsonData);
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
                '--disable-notifications'

                
            ],
            ignoreHTTPSErrors: true,
            slowMo : 100
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
        await performLogin(page,jsonData);

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
        let secondLinkUrl;
        if(jsonData.EntityType.orderShortName === 'LLC'){
        console.log("Getting the url for Articles of Organization for a Domestic Limited Liability Company (not for professional service limited liability companies)...");
          secondLinkUrl = await page.evaluate(() => {
            const secondLink = document.querySelector('ul.t-LinksList li.t-LinksList-item:nth-child(2) a.t-LinksList-link');
            secondLink.scrollIntoView()
            return secondLink ? secondLink.getAttribute('href') : null;
        });
    }  else if(jsonData.EntityType.orderShortName === 'Corp'){
        console.log("Getting the url for Articles of Organization for a Domestic Limited Liability Company (not for professional service limited liability companies)...");
          secondLinkUrl = await page.evaluate(() => {
            const secondLink = document.querySelector('ul.t-LinksList li.t-LinksList-item:nth-child(1) a.t-LinksList-link');
            secondLink.scrollIntoView()
            return secondLink ? secondLink.getAttribute('href') : null;
        });

    }
    
    
    
    await randomSleep(3000, 5000);


        await adjustViewport(page);



        if (!secondLinkUrl) {
            throw new Error("Couldn't find the Articles of Organization for a Domestic Limited Liability Company (not for professional service limited liability companies) URL");
        }

        console.log("Opening the Articles of Organization for a Domestic Limited Liability Company (not for professional service limited liability companies) URL...");
        await page.goto(new URL(secondLinkUrl, page.url()).href, { waitUntil: 'networkidle0' });

        console.log("Articles of Organization for a Domestic Limited Liability Company (not for professional service limited liability companies) page   loaded.");
        await randomSleep(3000, 5000);
        let entityType = jsonData.EntityType.orderShortName.trim().toUpperCase();

        if (entityType === 'LLC') {
            await addDataLLC(page, browser,jsonData);
        } else if (entityType === 'CORP') {
            await addDataCorp(page, jsonData);
        }

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
            if (retryCount < 10) {  
                log(`Network error detected. Restarting script... (Attempt ${retryCount + 1})`);
                await runPuppeteerScript(apiEndpoint, requestPayload, retryCount + 1);
            } else {
                log('Max retries reached. Script stopped.');
                throw e;  
            }
        } else {
            throw e;
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
        await runPuppeteerScript(apiEndpoint, jsonData);
        res.status(200).json(result);
        //res.send('Puppeteer script executed successfully.');
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });

        browser.close();
        //res.status(200).send('The En.');
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

async function performLogin(page,jsonData) {
    try {
        console.log("Attempting to login...");
        await page.waitForSelector('form', { visible: true, timeout: 120000 });

        await page.evaluate((jsonData) => {
            const usernameField = document.querySelector('input[name="P101_USERNAME"]');
            const passwordField = document.querySelector('input[name="P101_PASSWORD"]');

            if (!usernameField || !passwordField ) {
                throw new Error("Couldn't find login elements");
            }

            usernameField.value = jsonData.State.filingWebsiteUsername;
            passwordField.value = jsonData.State.filingWebsitePassword;
            const submitButton = document.querySelector('button#P101_LOGIN');

            submitButton.click();


        },jsonData);

        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
        log('Login successful.');
        await page.evaluate(()=>{
            const submitButton = document.querySelector('button#P101_LOGIN');

            submitButton.click();


        })

    } catch (e) {
        log(`Login failed: ${e.message}`);
        result = { status: 'error', message: e.message };

        console.error("Login failed:", e);
    }
}

// async function addDataLLC(page, data) {
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
//             // try{
//             //     if(data.Payload.Name.Legal_Name.includes("LLC") || data.Payload.Name.Legal_Name.includes("Limited Liability Company") || data.Payload.Name.Legal_Name.includes("LL.C.")){
//             //         nameField.value = data.Payload.Name.Legal_Name;

//             //     }
//             //     // else if(!((data.Payload.Name.Legal_Name.includes("LLC") || data.Payload.Name.Legal_Name.includes("Limited Liability Company") || data.Payload.Name.Legal_Name.includes("LL.C.")) && data.Payload.Name.Legal_Name.includes(" "))){
//             //     //     const error = new Error("Company name does not contain any allowed terms such as 'LLC', 'Limited Liability Company', or 'LL.C.'");
//             //     //     error.statusCode = 400 ; 
//             //     //     throw error;
//             //     // } 
//             //     else if(!(data.Payload.Name.Legal_Name.includes("LLC") || data.Payload.Name.Legal_Name.includes("Limited Liability Company") || data.Payload.Name.Legal_Name.includes("LL.C.")) && !(data.Payload.Name.Legal_Name.includes(" ")) ) {
//             //         nameField.value = data.Payload.Name.Legal_Name;
//             //         nameField.value=nameField.value+" LLC"
//             //     }
//             //     if (checkbox) {
//             //         checkbox.checked = data.checked;
//             //     }
//             //     submitButton.click();
//             // }catch(e){
//             //     return { status: 'error', message: e.message };
//             // }
//             const entityDesignations = [
//                  "L.L.C.", "Limited Liability Co.", "Limited Liability Corporation",
//                 "Ltd.", "Limited", "Incorporated", "Inc.", "Corp.", "Corporation",
//                 "PLC", "Public Limited Company", "LLP", "Limited Liability Partnership",
//                 "LP", "Limited Partnership", "L.P.", "General Partnership", "GP",
//                 "Sole Proprietorship", "Sole Trader", "Co.", "Company", "Cooperative",
//                 "Mutual", "Association","Pvt Ltd"
//             ];
            
//             try {
//                 let legalName = data.Payload.Name.Legal_Name;
            
             
            
//                 if (legalName.includes("LLC") || legalName.includes("Limited Liability Company") || legalName.includes("LL.C.")) {
//                     nameField.value = legalName;
//                     console.log("Legal Name ;=", legalName)
//                     return  {status: "success"} ;

//                 } else {
//                     nameField.value=legalName;

//                     throw new error(legalName +" Entity name is invalid it should be in the form Infosys LLC / Infosys Limited Liability Company /Infosys LL.C.")
                     



//  }


            
//                 // Handle checkbox if present
//                 if (checkbox) {
//                     checkbox.checked = data.checked;
//                 }
            
//                 // Click the submit button
//                 submitButton.click();
            
//             } catch (e) {
//                 // Return error status with message
//                 result={ status: 'error', message: e.message };
//                 process.exit(1);
//             }
            
//             // nameField.value=nameField.value+" LLC"
//             // const name1= nameField.value+" LLC"
//             // console.log(name1)
//             // if (nameField.value !== nameField.value) {
//             //     throw new Error(`The value for the entity name is incorrect. It is Infosys LLC`);
//             // }


//         }, data);
    
    


//         await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
//         log('Name added and continue button clicked.');

//         await fillNextPage(page, data);
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
//             result = { status: 'error', message: e.message };
//             process.exit(1); 

//         }, e.message);
//         console.error("Adding name failed:", e);
//         return { status: 'error', message: e.message };
//     }
// }
async function addDataLLC(page, browser, data) {
    let result;

    try {
        console.log("Attempting to add the name");
        await page.waitForSelector('form', { visible: true, timeout: 120000 });

        const  result = await page.evaluate((data) => {
            const nameField = document.querySelector('input[name="P2_ENTITY_NAME"]');
            const checkbox = document.querySelector('input[name="P2_CHECKBOX"]');

            if (!nameField) {
                throw new Error("Couldn't find the name field");
            }

            const legalName = data.Payload.Name.Legal_Name;
            const validFormats = ["LLC", "Limited Liability Company", "LL.C."];

            if (!validFormats.some(format => legalName.includes(format))) {
                // Set the invalid name in the field for visibility
                nameField.value = legalName;

                // Throw an error if the legal name is invalid
                throw new Error(`Entity name "${legalName}" is invalid. It should include 'LLC', 'Limited Liability Company', or 'LL.C.'`);
            }

            // Set the legal name in the field
            nameField.value = legalName;

            // Set checkbox if present
            if (checkbox) {
                checkbox.checked = data.checked;
            }

            // Return success status
            return { status: 'success' };
        }, data);

        if (result.status === 'success') {
            // Proceed with automation
            await page.waitForSelector('button.t-Button--hot', { visible: true, timeout: 120000 });
            const submitButtonExists = await page.evaluate(() => {
                const submitButton = document.querySelector('button.t-Button--hot');
                if (!submitButton) {
                    return false;
                }
        
                submitButton.click();  // Click the button within the browser context
                return true;
            });
        
            if (!submitButtonExists) {
                throw new Error("Couldn't find the submit button");
            }

            await fillNextPage(page, data);
        }

    } catch (e) {
        console.error("Adding name failed:", e.message);
        browser.close();
        throw e;
    }
        // Close the browser if an error occurred
        
    
    // Return the result
}


async function addDataCorp(page, data) {
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
            // //Corporation, Corp., Limited, Ltd., Incorporated, Inc.
            // if(data.Payload.Name.Legal_Name.includes("Corporation") || data.Payload.Name.Legal_Name.includes("Corp.") || data.Payload.Name.Legal_Name.includes("Limited") ||data.Payload.Name.Legal_Name.includes("Ltd") ||data.Payload.Name.Legal_Name.includes("Incorporated") || data.Payload.Name.Legal_Name.includes("Inc.") || data.Payload.Name.Legal_Name.includes("Inc") ){
            //     nameField.value = data.Payload.Name.Legal_Name;

            // }
            // else if(!((data.Payload.Name.Legal_Name.includes("Corporation") || data.Payload.Name.Legal_Name.includes("Corp.") || data.Payload.Name.Legal_Name.includes("Limited") ||data.Payload.Name.Legal_Name.includes("Ltd") ||data.Payload.Name.Legal_Name.includes("Incorporated") || data.Payload.Name.Legal_Name.includes("Inc.") || data.Payload.Name.Legal_Name.includes("Inc")) && data.Payload.Name.Legal_Name.includes(" "))){
            //     const error = new Error("Company name does not contain any allowed terms such as 'Corporation, Corp., Limited, Ltd., Incorporated, Inc.'");
            //     error.statusCode = 400 ; 
            //     throw error;
            // } 
            // else if(!((data.Payload.Name.Legal_Name.includes("Corporation") || data.Payload.Name.Legal_Name.includes("Corp.") || data.Payload.Name.Legal_Name.includes("Limited") ||data.Payload.Name.Legal_Name.includes("Ltd") ||data.Payload.Name.Legal_Name.includes("Incorporated") || data.Payload.Name.Legal_Name.includes("Inc.") || data.Payload.Name.Legal_Name.includes("Inc"))) && !(data.Payload.Name.Legal_Name.includes(" ")) ) {
            //     nameField.value = data.Payload.Name.Legal_Name;
            //     nameField.value=nameField.value+" Corp."
            //     // const error = new Error("Company name does not contain any allowed terms such as 'LLC', 'Limited Liability Company', or 'LL.C.'");
            //     // error.statusCode = 400 ; 
            //     // throw error;


            // } 
            const entityDesignations = [
                "L.L.C.", "Limited Liability Co.", "Limited Liability Corporation",
               "LLC","Limited Liability Company","L.L.C.",
               "PLC", "Public Limited Company", "LLP", "Limited Liability Partnership",
               "LP", "Limited Partnership", "L.P.", "General Partnership", "GP",
               "Sole Proprietorship", "Sole Trader", "Co.", "Company", "Cooperative",
               "Mutual", "Association","Pvt Ltd"
           ];
           
           try {
               let legalName = data.Payload.Name.Legal_Name;
           
               entityDesignations.forEach(term => {
                   const regex = new RegExp(`\\b${term}\\b`, 'i');
                   legalName = legalName.replace(regex, '').trim();
               });
           
               if (legalName.includes("Corporation") || legalName.includes("Corp.") || legalName.includes("Limited") || legalName.includes("Ltd.") || legalName.includes("Incorporated") || legalName.includes("Inc.")) {
                   nameField.value = legalName;
               } else {
                   nameField.value = `${legalName} Corp.`;
               }


            if (checkbox) {
                checkbox.checked = data.checked;
            }
            submitButton.click();
        }  catch (e) {
            return { status: 'error', message: e.message };
        }


        }, data);

    


        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
        log('Name added and continue button clicked.');

        await fillNextPageCorp(page, data);
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

async function fillNextPageCorp(page, data) {
    try {
        console.log("Filling the next page...");



        await page.evaluate((data) => {
           

            document.querySelector('input[name="P3_ENTITY_NAME"]').value = data.Payload.Name.Legal_Name+" Corp.";

            // const entityDesignations = [
            //     "L.L.C.", "Limited Liability Co.", "Limited Liability Corporation",
            //     "Ltd.", "Limited", "Incorporated", "Inc.", "Corp.", "Corporation",
            //     "PLC", "Public Limited Company", "LLP", "Limited Liability Partnership",
            //     "LP", "Limited Partnership", "L.P.", "General Partnership", "GP",
            //     "Sole Proprietorship", "Sole Trader", "Co.", "Company", "Cooperative",
            //     "Mutual", "Association", "Pvt Ltd"
            // ];

            let legalName = data.Payload.Name.Legal_Name;

            entityDesignations.forEach(term => {
                const regex = new RegExp(`\\b${term}\\b`, 'i');
                legalName = legalName.replace(regex, '').trim();
            });

            if (legalName.includes("Corporation") || legalName.includes("Corp.") || legalName.includes("Limited") || legalName.includes("Ltd.") || legalName.includes("Incorporated") || legalName.includes("Inc.")) {
                document.querySelector('input[name="P3_ENTITY_NAME"]').value = legalName;
            } else {
                // Append " LLC" if there are no terms and no space
                document.querySelector('input[name="P3_ENTITY_NAME"]').value = `${legalName} Corp.`;
            }
            // document.querySelector('#P3_COUNTY').value = "4";

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
            
            // const entityDesignations = [
            //     "L.L.C.", "Limited Liability Co.", "Limited Liability Corporation",
            //     "Ltd.", "Limited", "Incorporated", "Inc.", "Corp.", "Corporation",
            //     "PLC", "Public Limited Company", "LLP", "Limited Liability Partnership",
            //     "LP", "Limited Partnership", "L.P.", "General Partnership", "GP",
            //     "Sole Proprietorship", "Sole Trader", "Co.", "Company", "Cooperative",
            //     "Mutual", "Association", "Pvt Ltd"
            // ];

            let legalName = data.Payload.Name.Legal_Name;

            entityDesignations.forEach(term => {
                const regex = new RegExp(`\\b${term}\\b`, 'i');
                legalName = legalName.replace(regex, '').trim();
            });

            if (legalName.includes("LLC") || legalName.includes("Limited Liability Company") || legalName.includes("LL.C.")) {
                document.querySelector('input[name="P4_ENTITY_NAME"]').value = legalName;
            } else {
                // Append " LLC" if there are no terms and no space
                document.querySelector('input[name="P4_ENTITY_NAME"]').value = `${legalName} LLC`;
            }
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
    // await page.hover('button.t-Button--hot');


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
    console.log(`Server listening at http://192.168.1.10:${port}`);
});