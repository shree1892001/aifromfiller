const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');

const path = require('path');
const { timeout } = require('puppeteer');
const { evaluationString } = require('puppeteer');



puppeteer.use(StealthPlugin());

const app = express();
const port = 3001;
const apiEndpoint = 'http://localhost:3001/run-puppeteer'; // Adjust this if needed

app.use(bodyParser.json());
app.use(cors({
    origin: ['chrome-extension://kpmpcomcmochjklgamghkddpaenjojhl','http://192.168.1.108:3000','http://192.168.1.108:3001','http://localhost:3000','http://192.168.1.108:3000','http://192.168.1.108:3000','http://192.168.1.108:3001','http://192.168.1.108:3001','http://192.168.1.4:3000','http://192.168.1.11:3000'],
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
        let jsonData = requestPayload.data;
        // let jsonData = requestPayload;

        jsonData=JSON.parse(jsonData)
        console.log(jsonData)

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
        // console.log(jsonData);
        if(jsonData.State.stateFullDesc === "New-York"){
            await handleNy(page,jsonData); 
        }
        else if(jsonData.State.stateFullDesc=="Florida"){
            await handleFL(page,jsonData); 
        }
        else if(jsonData.State.stateFullDesc=== "Wyoming"){

            await handleWy(page,jsonData);

        }
        else if(jsonData.State.stateFullDesc === "New-Jersey"){

          await handleNJ(page,jsonData);

      }
      else if(jsonData.State.stateFullDesc=='Delaware'){
        await handleNy(page,jsonData);


      }
      async function handleNJ(page,jsonData){
        await retry(async () => {
            try {
                // sendWebSocketMessage('Navigating to the login page...');
                console.log("Navigating to the login page...");
                // const response = await page.goto("https://filings.dos.ny.gov/ords/corpanc/r/ecorp/login_desktop", {
                const response = await page.goto(jsonData.State.stateUrl, {

                    waitUntil: 'networkidle0',
                    timeout: 60000
                });
                log('Login page loaded.');
            } catch (error) {
                console.error("Error navigating to the login page:", error.message);
                throw new Error("Navigation to the login page failed.");
            }
        },5,page);

        await randomSleep(3000, 5000);
        await adjustViewport(page);

        let businessType;
        if (jsonData.EntityType.orderShortName === 'LLC') {
            try {
                   
                   businessType = await page.evaluate(() => {
                    const selectElement = document.querySelector('#BusinessType');
            const option = Array.from(selectElement.options).find(opt => opt.text === 'NJ Domestic Limited Liability Company (LLC)');
            return option ? option.value : null;
                
            });
                if(businessType){
                 
                  await page.evaluate((value) => {
                    const select = document.querySelector('#BusinessType');
                    select.value = value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }, businessType);
                }
            } catch (error) {
                console.error("Error getting the business type LLC:", error.message);
                throw new Error("Failed to get the  LLC business type");
            }
        } else if (jsonData.EntityType.orderShortName === 'CORP') {
            try {
              businessType = await page.evaluate(() => {
                const selectElement = document.querySelector('#BusinessType');
        const option = Array.from(selectElement.options).find(opt => opt.text === 'NJ Domestic For-Profit Corporation (DP)');
        return option ? option.value : null;
            
        });
            if(businessType){
              
              await page.evaluate((value) => {
                const select = document.querySelector('#BusinessType');
                select.value = value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }, businessType);
            }
                
            } catch (error) {
                console.error("Error getting the Corp business tyoe", error.message);
                throw new Error("Failed to get the Corp business type.");
            }
        }

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
    }
      } catch (e) {
        console.error("Error running Puppeteer:", e);
    
        // Pass a more specific error message to your API response
        return { status: 'error', message: e.message || "An unexpected error occurred" };

    } finally {
        if (browser) {
            await browser.close();
        }

    }


          
      
        async function handleWy(page, data) {

            await retry(async () => {

              try {
                console.log("Navigating to the Landing page...");


                await page.goto(jsonData.State.stateUrl, {
                  waitUntil: 'networkidle0',
                  timeout: 60000
                });
                console.log('Landing Page Loaded');
              } catch (error) {
                console.error("Error navigating to the Landing page:", error.message);
                throw new Error("Navigation to the Landing page failed.");
              }
            }, 5, page);
          
            await randomSleep(3000, 5000);
            await performEventsonLandingPage(page);
          
            await adjustViewport(page);
          
            console.log("Waiting for the list to appear...");
          
            async function performEventsonLandingPage(page) {
              try {
                console.log("Attempting to interact with the landing page...");
          
                await page.waitForSelector('form', { visible: true, timeout: 120000 });
                console.log("Form found.");
          
                
                const submitButtonExists = await page.evaluate(() => {
                  const submitButton = document.querySelector('#regStartNow');
                  console.log("Submit button found:", !!submitButton);
                  return !!submitButton;
                });
          
                if (!submitButtonExists) {
                  throw new Error("Submit button not found.");
                }
                await page.click('#regStartNow');
                console.log("Submit button clicked.");
          
                await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
                console.log('Form submission successful.');
          
              } catch (e) {
                console.error("Form submission failed:", e.message);
                return { status: 'error', message: e.message };
              }
            }
          
            await adjustViewport(page);
          
            if(data.orderShortName == 'LLC'){
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
                  await Promise.race([
                    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
                    page.waitForSelector('#txtName', { visible: true, timeout: 60000 })
                  ]);
                  await page.evaluate(() => {
                    __doPostBack('ctl00$MainContent$slctBusType', '');
                });
                await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
                await page.click('#MainContent_chkAgree');
                await page.click('#MainContent_ContinueButton');
                await Promise.race([
                    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
                    page.waitForSelector('#txtName', { visible: true, timeout: 60000 })
                  ]);
                  await page.waitForSelector("#txtName",{ visible: true, timeout: 60000 })
                  await page.evaluate(() => {
                    const inputElement = document.querySelector('#txtName');
                    inputElement.value = data.Payload.Name.CD_Legal_Name;
                    inputElement.dispatchEvent(new Event('input', { bubbles: true })); 
                    inputElement.dispatchEvent(new Event('change', { bubbles: true })); 
                });
                await page.type('#txtName', data.Payload.Name.CD_Legal_Name);
                await page.waitForSelector("#txtNameConfirm",{ visible: true, timeout: 60000 });
                await page.type('#txtNameConfirm', data.Payload.Name.CD_Legal_Name);

                if(data.Payload.Date.EffectiveDate){
                     await randomSleep(4000,5000);

                     const clickContinueAndWait = async () => {
                      try {
                        await Promise.all([
                          page.waitForNavigation({ waitUntil: 'networkidle0' }),
                          page.click('#ContinueButton')
                        ]);
                      } catch (error) {
                        console.error('Error clicking Continue button:', error);
                        await page.type('#txtDelayedDate', data.Payload.Date.EffectiveDate, { delay: 100});
                
                        await page.evaluate(() => {
                          const continueButton = document.getElementById('ContinueButton');
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
                   




                }else{
                  await clickContinueAndWait(); 
                


                }


               
                  console.log('Clicked ContinueButton');

                  if(data.Payload.Registered_Agent){
                    let parts=data.Payload.Registered_Agent.RA_Name.split(" ");


                  await page.waitForSelector('#txtFirstName', { visible: true, timeout: 180000 });
                  await page.type('#txtFirstName', parts[0]);
                  await page.type('input[name="ctl00$MainContent$ucRA$txtMiddleName"]', parts[1], { delay: 100 });
                  await page.type('input[name="ctl00$MainContent$ucRA$txtLastName"]',parts[2], { delay: 100 });
                  await page.type('input[name="ctl00$MainContent$ucRA$txtAddr1"]', data.Payload.Registered_Agent.Address.RA_Address_Line1, { delay: 100 });
                  await page.type('input[name="ctl00$MainContent$ucRA$txtAddr2"]', data.Payload.Registered_Agent.Address.RA_Address_Line2, { delay: 100 });
                  await page.type('input[name="ctl00$MainContent$ucRA$txtCity"]', data.Payload.Registered_Agent.Address.RA_City, { delay: 100 });
                  await page.keyboard.press('Tab'); // Trigger any onchange events

    // Wait for the postal code popup to appear
    await page.waitForSelector('.ui-dialog[aria-describedby="ui-id-1"]', { visible: true });
  
  
    await page.evaluate(() => {
      const postalCodeItems = document.querySelectorAll('#ui-id-1 .postalCodeListItem');
      if (postalCodeItems.length > 0) {
        postalCodeItems[0].click();
      }
    });
  
    await page.waitForSelector('.ui-dialog[aria-describedby="ui-id-1"]', { hidden: true });
  
    await page.waitForFunction(() => document.querySelector('#txtPostal').value !== '');
  
    await page.evaluate(() => {
      AgentChanged();
      SetPostalCode(); 
    });

    await randomSleep(80000,1200000); 


  
                  await page.type('input[name="ctl00$MainContent$ucRA$txtPhone"]', data.Payload.Registered_Agent.RA_Contact_No, { delay: 100 });
                  await page.type('input[name="ctl00$MainContent$ucRA$txtEmail"]', data.Payload.Registered_Agent.Contact.RA_Email, { delay: 100 });

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
              }

                  if(data.Payload.Principal_Address){
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
    await selectOption('#slctCountry', data.Payload.Principal_Address.PA_Country);
    await page.type('#txtAddr1', data.Payload.Principal_Address.PA_Address_Line1);
    await page.type('#txtAddr2',data.Payload.Principal_Address.PA_Address_Line2 );
    
    await page.type('#txtCity', data.Payload.Principal_Address.PA_City);
    await page.type('#txtState',data.Payload.Principal_Address.PA_State);
    // await page.type('#txtPostal', data.Payload.Principal_Address.PA_Postal_Code);
    await page.evaluate((data) => {
      // Set the value of the phone number field directly
      document.getElementById('txtPostal').value =data.Payload.Principal_Address.PA_Postal_Code;
  }, data);
    // await page.type('#txtPhone', data.Payload.Principal_Address.PA_Contact_NO);
    await page.evaluate((data) => {
      // Set the value of the phone number field directly
      document.getElementById('txtPhone').value =data.Payload.Principal_Address.PA_Contact_No;
  }, data);
    await page.type('#txtEmail', data.Payload.Principal_Address.PA_Email);

                  }
                  if(data.Payload.Shipping_Address){
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
    await selectOption('#slctCountry', data.Payload.Principal_Address.PA_Country);
    await page.type('#txtAddr1Mail', data.Payload.Principal_Address.PA_Address_Line1);
    await page.type('#txtAddr2Mail',data.Payload.Principal_Address.PA_Address_Line2 );
    
    await page.type('#txtCityMail', data.Payload.Principal_Address.PA_City);
    await page.type('#txtStateMail',data.Payload.Principal_Address.PA_State);
    // await page.type('#txtPostalMail', data.Payload.Principal_Address.PA_Postal_Code);
    await page.evaluate((data) => {
      document.getElementById('txtPostalMail').value =data.Payload.Principal_Address.PA_Postal_Code;
  }, data);
    // await page.type('#txtPhone', data.Payload.Principal_Address.PA_Contact_NO);
    
    await page.evaluate(() => {
      const selectElement = document.querySelector('#slctCountry');
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      __doPostBack('ctl00$MainContent$ucAddress$slctCountry', ''); // Trigger postback manually if necessary
    });
        

    await page.waitForSelector('#ContinueButton'); 
    await page.evaluate(() => {
      const nextButton = document.querySelector('#ContinueButton');
      if (nextButton) {
        nextButton.dispatchEvent(new Event('click', { bubbles: true }));
        __doPostBack('ctl00$MainContent$ContinueButton', ''); // Trigger postback manually if necessary
      }
    });

                  }

          if(data.Payload.Organizer_Information){

            let Name= data.Payload.Organizer_Information.Organizer_Details.Org_Name;

            let parts=Name.split(" "); 


              await page.waitForSelector("#txtFirstName");
              await page.type('#txtFirstName', parts[1],{ delay: 100 });
              await page.waitForSelector("#txtMiddletName");

              await page.type('#txtMiddleName', parts[1],{ delay: 100 });
              await page.waitForSelector("#txtLastName");

              await page.type('#txtLastName', parts[2], { delay: 100 });
              await page.waitForSelector("#txtOrgName");

              await page.type('#txtOrgName', data.Payload.Organizer_Information.Organizer_Details.Org_Name, { delay: 100 });
              await page.waitForSelector("#txtMail1");
              const combinedAddr = `${data.Payload.Organizer_Information.Org_Address.Org_Address_Line1}, ${data.Payload.Organizer_Information.Org_Address.Org_City}, ${data.Payload.Organizer_Information.Org_Address.Org_State}, ${data.Payload.Organizer_Information.Org_Address.Org_Postal_Code}`;
              await page.waitForSelector('#txtMail1');
              // await page.type('#txtMail1', data.Payload.Organizer_Information.Organizer_Details.Org_Name, { delay: 100 });
              await page.evaluate((address) => {
                const input = document.querySelector('#txtMail1');
                input.focus(); // Triggers the onfocus event and calls input.select()
                input.value = address; // Set the value of the input field to the combined address
            }, combinedAddr);

            await page.waitForSelector('#ContinueButton', { visible: true });

try {

    await page.click('#ContinueButton');

    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    await page.evaluate(() => {
        const nextButton = document.querySelector('#ContinueButton');
        if (nextButton) {
            nextButton.click(); 
            __doPostBack('ctl00$MainContent$ContinueButton', '');

        }
    });

} catch (error) {

    console.error('Failed to click the button:', error);
}
}



















            
          
           
            }

        
        else if(data.orderShortName=="CORP"){
          await page.evaluate(() => {
            const dropdown = document.querySelector('#MainContent_slctBusType');
            const options = Array.from(dropdown.options);
            const optionToSelect = options.find(option => option.text.includes('Profit Corporation (Domestic)'));
            if (optionToSelect) {
              dropdown.value = optionToSelect.value;
              dropdown.text=optionToSelect.text; 
      
              dropdown.dispatchEvent(new Event('change', { bubbles: true })); // Trigger onchange event
      
              
            }

          });
          await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
            page.waitForSelector('#txtName', { visible: true, timeout: 60000 })
          ]);
          await page.evaluate(() => {
            __doPostBack('ctl00$MainContent$slctBusType', '');
        });
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
        await page.click('#MainContent_chkAgree');
        await page.click('#MainContent_ContinueButton');
        await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
            page.waitForSelector('#txtName', { visible: true, timeout: 60000 })
          ]);
          await page.waitForSelector("#txtName",{ visible: true, timeout: 60000 })
          await page.evaluate(() => {
            const inputElement = document.querySelector('#txtName');
            inputElement.value = data.Payload.Name.CD_Legal_Name;
            inputElement.dispatchEvent(new Event('input', { bubbles: true })); 
            inputElement.dispatchEvent(new Event('change', { bubbles: true })); 
        });
        await page.type('#txtName', data.Payload.Name.CD_Legal_Name);
        await page.waitForSelector("#txtNameConfirm",{ visible: true, timeout: 60000 });
        await page.type('#txtNameConfirm', data.Payload.Name.CD_Legal_Name);

        await page.evaluate(() => {
          const continueButton = document.getElementById('ContinueButton');
          continueButton.scrollIntoView();
          continueButton.click(); // Trigger a click event on the continue button
        });
        await page.waitForSelector("#ddlDuration", { visible: true, timeout: 18000 });
        await selectOptionByText(page, '#ddlDuration',data.Payload.Period_of_Duration );
      
        if(data.Payload.Date.DelayedEffectiveDate){
             await randomSleep(4000,5000);

             await page.waitForSelector("#textDelayedDate"); 
             page.tyoe('#texyDelayedDate',data.Payload.Date.DelayedEffectiveDate);




        }else{
         await page.waitForSelector("ddlShareClass",{visible:true,timeout:18000});


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
        await page.waitForSelector("#ddlShareClass",{visible:true,timeout:18000});
        await selectOptionByText(page, '#ddlShareClass', data.Payload.Class_of_Shares);
        const ShareClassValue = await page.evaluate(() => document.querySelector('#ddlShareClass').value);
        if(ShareClassValue === '0'){
          throw new Error("Class of Share is not selected"); 

        }

        await page.evaluate(() => {

          ['#txtCommonShares','#txtCommonPar', '#txtPreferredShares', '#txtPreferredPar'].forEach(selector =>{
            const input=document.querySelector(selector); 
            if(input) input.value = '' ; 
          });
        })
        if(data.Payload.Class_of_Shares === 'Common'){
          await page.waitForSelector('#plcCommonStock', { visible: true });
          await fillInput(page, '#txtCommonShares', data.Payload.Stock_Information.SI_No_Of_Shares);
          await fillInput(page, '#txtCommonPar', data.Payload.Stock_Information.SI_Share_Par_Value);

        }else if(data.Payload.Class_of_Shares === 'Preferred'){
          await page.waitForSelector('#plcPreferredStock', { visible: true });
          await fillInput(page, '#txtPreferredShares', data.Payload.Stock_Information.PF_No_Of_Shares);
          await fillInput(page, '#txtPreferredPar', data.Payload.Stock_Information.PF_Share_Par_Value);
        }
        else{
          await page.waitForSelector('#txtPreferredShares',{visible:"true",timeout: 1000}); 
          await fillInput(page, '#txtCommonShares', data.Payload.Stock_Information.SI_No_Of_Shares);
          await fillInput(page, '#txtCommonPar', data.Payload.Stock_Information.SI_Share_Par_Value);
          await fillInput(page, '#txtPreferredShares', data.Payload.Stock_Information.PF_No_Of_Shares);
          await fillInput(page, '#txtPreferredPar', data.Payload.Stock_Information.PF_Share_Par_Value);

        }

        await page.waitForSelector('#ContinueButton');
        await page.evaluate(() => {
          const continueButton = document.getElementById('ContinueButton');
          continueButton.scrollIntoView();
          continueButton.click();
        });

       
          console.log('Clicked ContinueButton');

          if(data.Payload.Registered_Agent){
            let parts=data.Payload.Registered_Agent.RA_Name.split(" ");


          await page.waitForSelector('#txtFirstName', { visible: true, timeout: 180000 });
          await page.type('#txtFirstName', parts[0]);
          await page.type('input[name="ctl00$MainContent$ucRA$txtMiddleName"]', parts[1], { delay: 100 });
          await page.type('input[name="ctl00$MainContent$ucRA$txtLastName"]',parts[2], { delay: 100 });
          await page.type('input[name="ctl00$MainContent$ucRA$txtAddr1"]', data.Payload.Registered_Agent.Address.RA_Address_Line1, { delay: 100 });
          await page.type('input[name="ctl00$MainContent$ucRA$txtAddr2"]', data.Payload.Registered_Agent.Address.RA_Address_Line2, { delay: 100 });
          await page.type('input[name="ctl00$MainContent$ucRA$txtCity"]', data.Payload.Registered_Agent.Address.RA_City, { delay: 100 });
          await page.keyboard.press('Tab'); // Trigger any onchange events

// Wait for the postal code popup to appear
await page.waitForSelector('.ui-dialog[aria-describedby="ui-id-1"]', { visible: true });


await page.evaluate(() => {
const postalCodeItems = document.querySelectorAll('#ui-id-1 .postalCodeListItem');
if (postalCodeItems.length > 0) {
postalCodeItems[0].click();
}
});

await page.waitForSelector('.ui-dialog[aria-describedby="ui-id-1"]', { hidden: true });

await page.waitForFunction(() => document.querySelector('#txtPostal').value !== '');

await page.evaluate(() => {
AgentChanged();
SetPostalCode(); 
});

await randomSleep(80000,1200000); 



          await page.type('input[name="ctl00$MainContent$ucRA$txtPhone"]', data.Payload.Registered_Agent.RA_Contact_No, { delay: 100 });
          await page.type('input[name="ctl00$MainContent$ucRA$txtEmail"]', data.Payload.Registered_Agent.Contact.RA_Email, { delay: 100 });

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
      }

          if(data.Payload.Principal_Address){
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
await selectOption('#slctCountry', data.Payload.Principal_Address.PA_Country);
await page.type('#txtAddr1', data.Payload.Principal_Address.PA_Address_Line1);
await page.type('#txtAddr2',data.Payload.Principal_Address.PA_Address_Line2 );

await page.type('#txtCity', data.Payload.Principal_Address.PA_City);
await page.type('#txtState',data.Payload.Principal_Address.PA_State);
// await page.type('#txtPostal', data.Payload.Principal_Address.PA_Postal_Code);
await page.evaluate((data) => {
// Set the value of the phone number field directly
document.getElementById('txtPostal').value =data.Payload.Principal_Address.PA_Postal_Code;
}, data);
// await page.type('#txtPhone', data.Payload.Principal_Address.PA_Contact_NO);
await page.evaluate((data) => {
// Set the value of the phone number field directly
document.getElementById('txtPhone').value =data.Payload.Principal_Address.PA_Contact_No;
}, data);
await page.type('#txtEmail', data.Payload.Principal_Address.PA_Email);

          }
          if(data.Payload.Shipping_Address){
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
await selectOption('#slctCountry', data.Payload.Principal_Address.PA_Country);
await page.type('#txtAddr1Mail', data.Payload.Principal_Address.PA_Address_Line1);
await page.type('#txtAddr2Mail',data.Payload.Principal_Address.PA_Address_Line2 );

await page.type('#txtCityMail', data.Payload.Principal_Address.PA_City);
await page.type('#txtStateMail',data.Payload.Principal_Address.PA_State);
// await page.type('#txtPostalMail', data.Payload.Principal_Address.PA_Postal_Code);
await page.evaluate((data) => {
document.getElementById('txtPostalMail').value =data.Payload.Principal_Address.PA_Postal_Code;
}, data);
// await page.type('#txtPhone', data.Payload.Principal_Address.PA_Contact_NO);

await page.evaluate(() => {
const selectElement = document.querySelector('#slctCountry');
selectElement.dispatchEvent(new Event('change', { bubbles: true }));
__doPostBack('ctl00$MainContent$ucAddress$slctCountry', ''); // Trigger postback manually if necessary
});


await page.waitForSelector('#ContinueButton'); 
await page.evaluate(() => {
const nextButton = document.querySelector('#ContinueButton');
if (nextButton) {
nextButton.dispatchEvent(new Event('click', { bubbles: true }));
__doPostBack('ctl00$MainContent$ContinueButton', ''); // Trigger postback manually if necessary
}
});

          }

  if(data.Payload.Incorporator_Information){

    let Name= data.Payload.Incorporator_Information.Incorporator_Details.Inc_Name;

    let parts=Name.split(" "); 


      await page.waitForSelector("#txtFirstName");
      await page.type('#txtFirstName', parts[1],{ delay: 100 });
      await page.waitForSelector("#txtMiddletName");

      await page.type('#txtMiddleName', parts[1],{ delay: 100 });
      await page.waitForSelector("#txtLastName");

      await page.type('#txtLastName', parts[2], { delay: 100 });
      await page.waitForSelector("#txtOrgName");

      await page.type('#txtOrgName', data.Payload.Incorporator_Information.Incorporator_Details.Inc_Name, { delay: 100 });
      await page.waitForSelector("#txtMail1");
      const combinedAddr = `${data.Payload.Incorporator_Information.Address.Inc_Address_Line1}, ${data.Payload.Incorporator_Information.Address.Inc_City}, ${data.Payload.Incorporator_Information.Address.Inc_State}, ${data.Payload.Incorporator_Information.Address.Inc_Postal_Code}`;
      await page.waitForSelector('#txtMail1');
      // await page.type('#txtMail1', data.Payload.Organizer_Information.Organizer_Details.Org_Name, { delay: 100 });
      await page.evaluate((address) => {
        const input = document.querySelector('#txtMail1');
        input.focus(); // Triggers the onfocus event and calls input.select()
        input.value = address; // Set the value of the input field to the combined address
    }, combinedAddr);

    await page.waitForSelector('#ContinueButton', { visible: true });

try {

await page.click('#ContinueButton');

await page.waitForNavigation({ waitUntil: 'networkidle0' });

await page.evaluate(() => {
const nextButton = document.querySelector('#ContinueButton');
if (nextButton) {
    nextButton.click(); 
    __doPostBack('ctl00$MainContent$ContinueButton', '');

}
});

await page.waitForSelector("#txtArticleDetail",{visible :true ,timeout : 10000});

if(data.Payload.Additional_Articles){
  await page.type("#txtArticleDetail", data.Payload.Additional_Articles); 

}
else{
  await page.evaluate(() => {
    const continueButton = document.querySelector('#ContinueButton');
    continueButton.click();
    });
    

}
await page.waitForSelector("#ContinueButton");
await page.evaluate(() => {
  const continueButton = document.querySelector('#ContinueButton');
  continueButton.click();
  });
  

} catch (error) {

console.error('Failed to click the button:', error);
}
}
        }
          }

        async function handleFL(page, data) {
            if(data.orderShortName=='LLC'){

            await retry(async () => {

              try {
                console.log("Navigating to the Landing page...");

                const url = "https://efile.sunbiz.org/llc_file.html";
                const baseUrl = url.split('/llc_file.html')[1];  // Split the URL till the base part
                const appendedUrl = `${data.State.stateUrl}/${baseUrl}`;
                await page.goto(appendedUrl, {
                  waitUntil: 'networkidle0',
                  timeout: 60000
                });
                console.log('Landing Page Loaded');
              } catch (error) {
                console.error("Error navigating to the Landing page:", error.message);
                throw new Error("Navigation to the Landing page failed.");
              }
            }, 5, page);
          
            await randomSleep(3000, 5000);
            await performEventsonLandingPage(page);
          
            await adjustViewport(page);
          
            console.log("Waiting for the list to appear...");
          
            async function performEventsonLandingPage(page) {
              try {
                console.log("Attempting to interact with the landing page...");
          
                await page.waitForSelector('form', { visible: true, timeout: 120000 });
                console.log("Form found.");
          
                const checkboxExists = await page.evaluate(() => {
                  const checkbox = document.querySelector('input[name="Disclaimer"]');
                  console.log("Checkbox found:", !!checkbox);
                  return !!checkbox;
                });
          
                if (!checkboxExists) {
                  throw new Error("Checkbox not found.");
                }
          
                await page.click('input[name="Disclaimer"]');
                console.log("Disclaimer checkbox checked.");
          
                const submitButtonExists = await page.evaluate(() => {
                  const submitButton = document.querySelector('input[name="submit"]');
                  console.log("Submit button found:", !!submitButton);
                  return !!submitButton;
                });
          
                if (!submitButtonExists) {
                  throw new Error("Submit button not found.");
                }
          
                await page.click('input[name="submit"]');
                console.log("Submit button clicked.");
          
                await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
                console.log('Form submission successful.');
          
              } catch (e) {
                console.error("Form submission failed:", e.message);
                return { status: 'error', message: e.message };
              }
            }
          
            await adjustViewport(page);
          
            console.log("Next step completed and preview loaded.");
            await randomSleep(18000, 22000);
          
            await page.evaluate(() => {
              document.querySelector('input[name="filing_type"]').value = 'LLC';
              document.querySelector('input[name="track_number"]').value = '100435715291';
              document.querySelector('input[name="menu_function"]').value = 'ADD';
            });
          
            if (data.effectiveDate) {
              await page.type('#eff_date_mm', data.effectiveDate.month);
              await randomSleep(1000, 3000);
              await page.type('#eff_date_dd', data.effectiveDate.day);
              await randomSleep(1000, 3000);
              await page.type('#eff_date_yyyy', data.effectiveDate.year);
              await randomSleep(1000, 3000);
            }else{}
          
            if (data.Payload.Status.certificateOfStatus) {
              await page.click('#cos_num_flag');
              await randomSleep(1000, 3000);
            }else{}
            if (data.certifiedCopy) {
              await page.click('#cert_num_flag');
              await randomSleep(1000, 3000);
            }else{}
            try{

                let legalName =data.Payload.Name.CD_Legal_Name; 
                if(legalName.includes("LLC") || legalName.includes("L.L.C.") || legalName.includes("Limited Liability Company")){
          
                await page.type('#corp_name', legalName);
                await randomSleep(1000, 3000);
                return { success: true, message: "Name added successfully" };
                }else{

                    throw new Error("Name of the entity is invalid it should end with either LLC/L.L.C. / Limited Liability Company")
                }
            
            }catch(e){

                let errorResponse = {
                    success: false,
                    error: e.message
                };
                if(e.message.includes("Name of entity is invalid")){
                    errorResponse.error=e.message; 
                }
            
            
            }  
            await page.waitForSelector("#princ_addr1");
            await page.type('#princ_addr1', data.Payload.Principal_Address.PA_Address_Line1);
            await randomSleep(1000, 3000);
            await page.waitForSelector("#princ_addr2");

            await page.type('#princ_addr2', data.Payload.Principal_Address.PA_Address_Line2);
            await randomSleep(1000, 3000);
            await page.waitForSelector("#princ_city");

            await page.type('#princ_city', data.Payload.Principal_Address.PA_City);
            await randomSleep(1000, 3000);
            await page.waitForSelector("#princ_st");

            await page.type('#princ_st', data.Payload.Principal_Address.PA_State);
            await randomSleep(1000, 3000);
            await page.waitForSelector("#princ_zip");

            await page.type('#princ_zip', data.Payload.Principal_Address.PA_Postal_Code);
            await randomSleep(1000, 3000);

            await page.waitForSelector("#princ_cntry");

            await page.type('#princ_cntry', data.Payload.Principal_Address.PA_Country);
            await randomSleep(1000, 3000);
          
            if (data.Payload.Shipping_Address.SH_Address_Line1 === data.Payload.Principal_Address.PA_Address_Line1) {
              await page.waitForSelector('#same_addr_flag');
              await page.click('#same_addr_flag');
              await randomSleep(1000, 3000);
            } else if(data.Payload.Shipping_Address.SH_Address_Line1) {
              await page.waitForSelector("#mail_addr1");

              await page.type('#mail_addr1', data.Payload.Shipping_Address.SH_Address_Line1);
              await randomSleep(1000, 3000);
              await page.waitForSelector("#mail_addr2");

              await page.type('#mail_addr2', data.Payload.Shipping_Address.SH_Address_Line2);
              await randomSleep(1000, 3000);
              await page.waitForSelector("#mail_city");

              await page.type('#mail_city', data.Payload.Shipping_Address.SH_City);
              await randomSleep(1000, 3000);
              await page.waitForSelector("#mail_st");

              await page.type('#mail_st', data.Payload.Shipping_Address.SH_Address_Line1);
              await randomSleep(1000, 3000);

              await page.waitForSelector("#mail_zip");

              await page.type('#mail_zip', data.Payload.Shipping_Address.SH_State);
              await randomSleep(1000, 3000);

              await page.waitForSelector("#mail_cntry");

              await page.type('#mail_cntry', data.Payload.Shipping_Address.SH_Country);
              await randomSleep(1000, 3000);
            }
            let fullName=data.Payload.Registered_Agent.RA_Name; 

            let parts=fullName.split(" "); 
            if (data.Payload.Registered_Agent) {
              

              await page.waitForSelector("#ra_name_last_name"); 

              await page.type('#ra_name_last_name', parts[2]);
              await randomSleep(1000, 3000);
              await page.waitForSelector("#ra_name_first_name"); 

              await page.type('#ra_name_first_name', parts[0]);
              await randomSleep(1000, 3000);

              await page.waitForSelector("#ra_name_m_name"); 


              await page.type('#ra_name_m_name', parts[1]);
              await randomSleep(1000, 3000);
              await page.type('#ra_name_title_name', parts[1]);
              await randomSleep(1000, 3000);
              await page.type('#ra_addr1',data.Registered_Agent.Address.RA_Address_Line1)
              await page.type('#ra_addr2',data.Registered_Agent.Address.RA_Address_Line2)
              await page.type('#ra_city',data.Registered_Agent.Address.RA_City)
              await page.type('#ra_zip',data.Registered_Agent.Address.RA_Postal_Code)

            }
            else if(data.Registered_Agent.Name){
                  await page.type('#ra_name_corp_name',data.Registered_Agent.Name)
                  await page.type('#ra_addr1',data.Registered_Agent.Address.RA_Address_Line1)
                  await page.type('#ra_addr2',data.Registered_Agent.Address.RA_Address_Line2)
                  await page.type('#ra_city',data.Registered_Agent.Address.RA_City)
                  await page.type('#ra_zip',data.Registered_Agent.Address.RA_Postal_Code)




            }
            await page.waitForSelector('#ra_signature');
            await page.type('#ra_signautre',parts[2] + parts[1]); 

            await page.waitForSelector('#purpose');

            if (data.Payload.Purpose) {
              await page.type('#purpose', data.Payload.Purposerpose.CD_Business_Purpose_Details);
              await randomSleep(1000, 3000);
            }
            if(data.Payload.Organizer_Information.Organizer_Details){
                await page.waitForSelector('#ret_name'); 
                await page.type('#ret_name',data.Payload.Organizer_Information.Organizer_Details.Org_Name);
                await page.waitForSelector('#ret_email_addr'); 

                await page.type('#ret_email_addr',data.Payload.Organizer_Information.Organizer_Details.Org_Email);
                await page.waitForSelector('#email_addr_verify'); 

                await page.type('#email_addr_verify',data.Payload.Organizer_Information.Organizer_Details.Org_Email);
            }
            await page.type('#signature',data.Payload.Organizer_Information.Organizer_Details.Org_Name);
            if(data.Manager.Name.FirstName){
            await page.type('#off1_name_title', data.Payload.Organizer_Information.Organizer_Details.Name.CA_Title);
            await page.type('#off1_name_last_name', data.Payload.Manager.Name.LastName1);
            await page.type('#off1_name_first_name', data.Manager.Name.FirstName1);
          await page.type('#off1_name_m_name', data.Manager.Name.MidInitial1);
           await page.type('#off1_name_title_name', data.Manager.Name.Name_Title1);

           await page.type('#off1_name_addr1', data.Manager.Address.streetAddress1);
           await page.type('#off1_name_city', data.Manager.Address.City1);
           await page.type('#off1_name_st', data.Manager.Address.State1);
           await page.type('#off1_name_zip', data.Manager.Address.zipCode1);
           await page.type('#off1_name_cntry', data.Manager.Address.Country1)

           //second manager
           await page.type('#off2_name_title', data.Manager.Name.Title2);
           await page.type('#off2_name_last_name', data.Manager.Name.LastName2);
           await page.type('#off2_name_first_name', data.Manager.Name.FirstName2);
         await page.type('#off2_name_m_name', data.Manager.Name.MidInitial2);
          await page.type('#off2_name_title_name', data.Manager.Name.Name_Title2);


          await page.type('#off2_name_addr1', data.Manager.Address.streetAddress2);
          await page.type('#off2_name_city', data.Manager.Address.City2);
          await page.type('#off2_name_st', data.Manager.Address.State2);
          await page.type('#off2_name_zip', data.Manager.Address.zipCode2);
          await page.type('#off2_name_cntry', data.Manager.Address.Country2)
          //third manager
          await page.type('#off3_name_title', data.Manager.Name.Title3);
          await page.type('#off3_name_last_name', data.Manager.Name.LastName33);
          await page.type('#off3_name_first_name', data.Manager.Name.FirstName3);
        await page.type('#off3_name_m_name', data.Manager.Name.MidInitial3);
         await page.type('#off3_name_title_name', data.Manager.Name.Name_Title3);
         await page.type('#off3_name_addr1', data.Manager.Address.streetAddress3);
         await page.type('#off3_name_city', data.Manager.Address.City3);
         await page.type('#off3_name_st', data.Manager.Address.State3);
         await page.type('#off3_name_zip', data.Manager.Address.zipCode3);
         await page.type('#off3_name_cntry', data.Manager.Address.Country3)
         //fourth
         await page.type('#off4_name_title', data.Manager.Name.Title4);
         await page.type('#off4_name_last_name', data.Manager.Name.LastName4);
         await page.type('#off4_name_first_name', data.Manager.Name.FirstName4);
       await page.type('#off4_name_m_name', data.Manager.Name.MidInitial4);
        await page.type('#off4_name_title_name', data.Manager.Name.Name_Title4);

        await page.type('#off4_name_addr1', data.Manager.Address.streetAddress4);
        await page.type('#off4_name_city', data.Manager.Address.City4);
        await page.type('#off4_name_st', data.Manager.Address.State4);
        await page.type('#off4_name_zip', data.Manager.Address.zipCode4);
        await page.type('#off4_name_cntry', data.Manager.Address.Country4)
        //fifth
        await page.type('#off5_name_title', data.Manager.Name.Title5);
        await page.type('#off5_name_last_name', data.Manager.Name.LastName5);
        await page.type('#off5_name_first_name', data.Manager.Name.FirstName5);
      await page.type('#off5_name_m_name', data.Manager.Name.MidInitial5);
       await page.type('#off5_name_title_name', data.Manager.Name.Name_Title5);

       await page.type('#off5_name_addr1', data.Manager.Address.streetAddress5);
       await page.type('#off5_name_city', data.Manager.Address.City5);
       await page.type('#off5_name_st', data.Manager.Address.State5);
       await page.type('#off5_name_zip', data.Manager.Address.zipCode5);
       await page.type('#off5_name_cntry', data.Manager.Address.Country5)

       await page.type('#off6_name_title', data.Manager.Name.Title6);
       await page.type('#off6_name_last_name', data.Manager.Name.LastName6);
       await page.type('#off6_name_first_name', data.Manager.Name.FirstName6);
     await page.type('#off6_name_m_name', data.Manager.Name.MidInitial6);
      await page.type('#off6_name_title_name', data.Manager.Name.Name_Title6);


      await page.type('#off6_name_addr1', data.Manager.Address.streetAddress6);
      await page.type('#off6_name_city', data.Manager.Address.City6);
      await page.type('#off6_name_st', data.Manager.Address.State6);
      await page.type('#off6_name_zip', data.Manager.Address.zipCode6);
      await page.type('#off6_name_cntry', data.Manager.Address.Country6)
            }
            else if(data.Manager.Name.entityName){

                if (data.Manager.Name.entityName.length > 42) {
                    throw new Error('Entity Name exceeds 42 characters.');
                  }
                  if (data.Manager.Address.streetAddress.length  > 42) {
                    throw new Error('Street Address exceeds 42 characters.');
                  }
                  if (data.Manager.Address.City.length > 28) {
                    throw new Error('City exceeds 28 characters.');
                  }
                  if (data.Manager.Address.State.length > 2) {
                    throw new Error('State exceeds 2 characters.');
                  }
                  if (data.Manager.Address.postal_code.length > 9) {
                    throw new Error('Zip Code exceeds 9 characters.');
                  }
                  if (data.Manager.Address.Country.length > 2) {
                    throw new Error('Country exceeds 2 characters.');
                  }
                
                  // Fill in the form fields
                  await page.type('#off1_name_corp_name', data.Manager.Name.entityName1);
                  await page.type('#off1_name_addr1', data.Manager.Address.streetAddress1);
                  await page.type('#off1_name_city', data.Manager.Address.City1);
                  await page.type('#off1_name_st', data.Manager.Address.State1);
                  await page.type('#off1_name_zip', data.Manager.Address.zipCode1);
                  await page.type('#off1_name_cntry', data.Manager.Address.Country1);

                  await page.type('#off2_name_corp_name', data.Manager.Name.entityName2);
                  await page.type('#off2_name_addr1', data.Manager.Address.streetAddress2);
                  await page.type('#off2_name_city', data.Manager.Address.City2);
                  await page.type('#off2_name_st', data.Manager.Address.State2);
                  await page.type('#off2_name_zip', data.Manager.Address.zipCode2);
                  await page.type('#off2_name_cntry', data.Manager.Address.Country2);

                  await page.type('#off3_name_corp_name', data.Manager.Name.entityName3);
                  await page.type('#off3_name_addr1', data.Manager.Address.streetAddress3);
                  await page.type('#off3_name_city', data.Manager.Address.City3);
                  await page.type('#off3_name_st', data.Manager.Address.State3);
                  await page.type('#off3_name_zip', data.Manager.Address.zipCode3);
                  await page.type('#off3_name_cntry', data.Manager.Address.Country3);

                  await page.type('#off4_name_corp_name', data.Manager.Name.entityName4);
                  await page.type('#off4_name_addr1', data.Manager.Address.streetAddress4);
                  await page.type('#off4_name_city', data.Manager.Address.City4);
                  await page.type('#off4_name_st', data.Manager.Address.State4);
                  await page.type('#off4_name_zip', data.Manager.Address.zipCode4);
                  await page.type('#off4_name_cntry', data.Manager.Address.Country4);

                  await page.type('#off5_name_corp_name', data.Manager.Name.entityName5);
                  await page.type('#off5_name_addr1', data.Manager.Address.streetAddress5);
                  await page.type('#off5_name_city', data.Manager.Address.City5);
                  await page.type('#off5_name_st', data.Manager.Address.State5);
                  await page.type('#off5_name_zip', data.Manager.Address.zipCode5);
                  await page.type('#off5_name_cntry', data.Manager.Address.Country5);

                  await page.type('#off6_name_corp_name', data.Manager.Name.entityName6);
                  await page.type('#off6_name_addr1', data.Manager.Address.streetAddress6);
                  await page.type('#off6_name_city', data.Manager.Address.City6);
                  await page.type('#off6_name_st', data.Manager.Address.State6);
                  await page.type('#off6_name_zip', data.Manager.Address.zipCode6);
                  await page.type('#off6_name_cntry', data.Manager.Address.Country6);
                
            }
            await page.waitForSelector('input[name="submit"]', { visible: true, timeout: 60000 });
        

        
          await page.evaluate(() => {
              document.querySelector('input[name="submit"]').submit();
            });
          
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
            console.log('Form submitted successfully');

            return { success: true, message: "Name added successfully" };
        }

        
        else if(data.orderShortName=="CORP"){
            await retry(async () => {

                try {
                  console.log("Navigating to the Landing page...");
                  const url = "https://efile.sunbiz.org/profit_file.html";
                const baseUrl = url.split('/profit_file.html')[0];  // Split the URL till the base part
                const appendedUrl = `${baseUrl}/profit_file.html`;
  
                  await page.goto(appendedUrl, {
                    waitUntil: 'networkidle0',
                    timeout: 60000
                  });
                  console.log('Landing Page Loaded');
                } catch (error) {
                  console.error("Error navigating to the Landing page:", error.message);
                  throw new Error("Navigation to the Landing page failed.");
                }
              }, 5, page);
            
              await randomSleep(3000, 5000);
              await performEventsonLandingPage(page);
            
              await adjustViewport(page);
            
              console.log("Waiting for the list to appear...");
            
              async function performEventsonLandingPage(page) {
                try {
                  console.log("Attempting to interact with the landing page...");
            
                  await page.waitForSelector('form', { visible: true, timeout: 120000 });
                  console.log("Form found.");
            
                  const checkboxExists = await page.evaluate(() => {
                    const checkbox = document.querySelector('input[name="Disclaimer"]');
                    console.log("Checkbox found:", !!checkbox);
                    return !!checkbox;
                  });
            
                  if (!checkboxExists) {
                    throw new Error("Checkbox not found.");
                  }
            
                  await page.click('input[name="Disclaimer"]');
                  console.log("Disclaimer checkbox checked.");
            
                  const submitButtonExists = await page.evaluate(() => {
                    const submitButton = document.querySelector('input[name="submit"]');
                    console.log("Submit button found:", !!submitButton);
                    return !!submitButton;
                  });
            
                  if (!submitButtonExists) {
                    throw new Error("Submit button not found.");
                  }
            
                  await page.click('input[name="submit"]');
                  console.log("Submit button clicked.");
            
                  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
                  console.log('Form submission successful.');
            
                } catch (e) {
                  console.error("Form submission failed:", e.message);
                  return { status: 'error', message: e.message };
                }
              }
            
              await adjustViewport(page);
            
              console.log("Next step completed and preview loaded.");
              await randomSleep(18000, 22000);
            
              await page.evaluate(() => {
                document.querySelector('input[name="filing_type"]').value = 'CORP';
                document.querySelector('input[name="track_number"]').value = '100435715291';
                document.querySelector('input[name="menu_function"]').value = 'ADD';
              });
            
              if (data.effectiveDate) {
                await page.type('#eff_date_mm', data.effectiveDate.month);
                await randomSleep(1000, 3000);
                await page.type('#eff_date_dd', data.effectiveDate.day);
                await randomSleep(1000, 3000);
                await page.type('#eff_date_yyyy', data.effectiveDate.year);
                await randomSleep(1000, 3000);
              }else{}
            
              if (data.certificateOfStatus) {
                await page.click('#cos_num_flag');
                await randomSleep(1000, 3000);
              }else{}
              if (data.certifiedCopy) {
                await page.click('#cert_num_flag');
                await randomSleep(1000, 3000);
              }else{}
              await page.waitForSelector('#corp_name');
              try{
              let legalName=data.Payload.Name.CD_Legal_Name; 


              if(legalName.includes("Corp") || legalName.includes("Inc.") || legalName.includes("Incorporated")){

            
              await page.type('#corp_name', legalName);

              }else {

                throw new Error("Name of the comapny is invalid it should end with Corp / Inc. / Incorporated")
              }
              await randomSleep(1000, 3000);
              return { success: true, message: "Name added successfully" };

            }catch(e){
                let errorResponse = {
                    success: false,
                    error: e.message
                };
                if(e.message.includes("Name of entity is invalid")){
                    errorResponse.error=e.message; 
                }

            }
              
            
            await page.waitForSelector("#princ_addr1");
            await page.type('#princ_addr1', data.Payload.Principal_Address.PA_Address_Line1);
            await randomSleep(1000, 3000);
            await page.waitForSelector("#princ_addr2");

            await page.type('#princ_addr2', data.Payload.Principal_Address.PA_Address_Line2);
            await randomSleep(1000, 3000);
            await page.waitForSelector("#princ_city");

            await page.type('#princ_city', data.Payload.Principal_Address.PA_City);
            await randomSleep(1000, 3000);
            await page.waitForSelector("#princ_st");

            await page.type('#princ_st', data.Payload.Principal_Address.PA_State);
            await randomSleep(1000, 3000);
            await page.waitForSelector("#princ_zip");

            await page.type('#princ_zip', data.Payload.Principal_Address.PA_Postal_Code);
            await randomSleep(1000, 3000);

            await page.waitForSelector("#princ_cntry");

            await page.type('#princ_cntry', data.Payload.Principal_Address.PA_Country);
            await randomSleep(1000, 3000);
            
            if (data.Payload.Shipping_Address.SH_Address_Line1 === data.Payload.Principal_Address.PA_Address_Line1) {
              await page.waitForSelector('#same_addr_flag');
              await page.click('#same_addr_flag');
              await randomSleep(1000, 3000);
            } else if(data.Payload.Shipping_Address.SH_Address_Line1) {
              await page.waitForSelector("#mail_addr1");

              await page.type('#mail_addr1', data.Payload.Shipping_Address.SH_Address_Line1);
              await randomSleep(1000, 3000);
              await page.waitForSelector("#mail_addr2");

              await page.type('#mail_addr2', data.Payload.Shipping_Address.SH_Address_Line2);
              await randomSleep(1000, 3000);
              await page.waitForSelector("#mail_city");

              await page.type('#mail_city', data.Payload.Shipping_Address.SH_City);
              await randomSleep(1000, 3000);
              await page.waitForSelector("#mail_st");

              await page.type('#mail_st', data.Payload.Shipping_Address.SH_Address_Line1);
              await randomSleep(1000, 3000);

              await page.waitForSelector("#mail_zip");

              await page.type('#mail_zip', data.Payload.Shipping_Address.SH_State);
              await randomSleep(1000, 3000);

              await page.waitForSelector("#mail_cntry");

              await page.type('#mail_cntry', data.Payload.Shipping_Address.SH_Country);
              await randomSleep(1000, 3000);
            }


              let fullName=data.Payload.Registered_Agent.RA_Name; 

            let parts=fullName.split(" "); 
            if (data.Payload.Registered_Agent) {
              

              await page.waitForSelector("#ra_name_last_name"); 

              await page.type('#ra_name_last_name', parts[2]);
              await randomSleep(1000, 3000);
              await page.waitForSelector("#ra_name_first_name"); 

              await page.type('#ra_name_first_name', parts[0]);
              await randomSleep(1000, 3000);

              await page.waitForSelector("#ra_name_m_name"); 


              await page.type('#ra_name_m_name', parts[1]);
              await randomSleep(1000, 3000);
              await page.type('#ra_name_title_name', parts[1]);
              await randomSleep(1000, 3000);
              await page.type('#ra_addr1',data.Registered_Agent.Address.RA_Address_Line1)
              await page.type('#ra_addr2',data.Registered_Agent.Address.RA_Address_Line2)
              await page.type('#ra_city',data.Registered_Agent.Address.RA_City)
              await page.type('#ra_zip',data.Registered_Agent.Address.RA_Postal_Code)

            }
            else if(data.Registered_Agent.Name){
                  await page.type('#ra_name_corp_name',data.Registered_Agent.Name)
                  await page.type('#ra_addr1',data.Registered_Agent.Address.RA_Address_Line1)
                  await page.type('#ra_addr2',data.Registered_Agent.Address.RA_Address_Line2)
                  await page.type('#ra_city',data.Registered_Agent.Address.RA_City)
                  await page.type('#ra_zip',data.Registered_Agent.Address.RA_Postal_Code)




            }
            await page.waitForSelector('#ra_signature');
            await page.type('#ra_signautre',parts[2] + parts[1]); 

            await page.waitForSelector('#purpose');

            if (data.Payload.Purpose) {
              await page.type('#purpose', data.Payload.Purposerpose.CD_Business_Purpose_Details);
              await randomSleep(1000, 3000);
            }
            if(data.Payload.Organizer_Information.Organizer_Details){
                await page.waitForSelector('#ret_name'); 
                await page.type('#ret_name',data.Payload.Organizer_Information.Organizer_Details.Org_Name);
                await page.waitForSelector('#ret_email_addr'); 

                await page.type('#ret_email_addr',data.Payload.Organizer_Information.Organizer_Details.Org_Email);
                await page.waitForSelector('#email_addr_verify'); 

                await page.type('#email_addr_verify',data.Payload.Organizer_Information.Organizer_Details.Org_Email);
            }

            await page.waitForSelector('#signature'); 
            await page.type('#signature',data.Payload.Organizer_Information.Organizer_Details.Org_Name);
              // await page.type('#signature',data.Correspondance.Name);
              if(data.Manager.Name.FirstName){
              await page.type('#off1_name_title', data.Manager.Name.Title1);
              await page.type('#off1_name_last_name', data.Manager.Name.LastName1);
              await page.type('#off1_name_first_name', data.Manager.Name.FirstName1);
            await page.type('#off1_name_m_name', data.Manager.Name.MidInitial1);
             await page.type('#off1_name_title_name', data.Manager.Name.Name_Title1);
  
             await page.type('#off1_name_addr1', data.Manager.Address.streetAddress1);
             await page.type('#off1_name_city', data.Manager.Address.City1);
             await page.type('#off1_name_st', data.Manager.Address.State1);
             await page.type('#off1_name_zip', data.Manager.Address.zipCode1);
             await page.type('#off1_name_cntry', data.Manager.Address.Country1)
  
             //second manager
             await page.type('#off2_name_title', data.Manager.Name.Title2);
             await page.type('#off2_name_last_name', data.Manager.Name.LastName2);
             await page.type('#off2_name_first_name', data.Manager.Name.FirstName2);
           await page.type('#off2_name_m_name', data.Manager.Name.MidInitial2);
            await page.type('#off2_name_title_name', data.Manager.Name.Name_Title2);
  
  
            await page.type('#off2_name_addr1', data.Manager.Address.streetAddress2);
            await page.type('#off2_name_city', data.Manager.Address.City2);
            await page.type('#off2_name_st', data.Manager.Address.State2);
            await page.type('#off2_name_zip', data.Manager.Address.zipCode2);
            await page.type('#off2_name_cntry', data.Manager.Address.Country2)
            //third manager
            await page.type('#off3_name_title', data.Manager.Name.Title3);
            await page.type('#off3_name_last_name', data.Manager.Name.LastName33);
            await page.type('#off3_name_first_name', data.Manager.Name.FirstName3);
          await page.type('#off3_name_m_name', data.Manager.Name.MidInitial3);
           await page.type('#off3_name_title_name', data.Manager.Name.Name_Title3);
           await page.type('#off3_name_addr1', data.Manager.Address.streetAddress3);
           await page.type('#off3_name_city', data.Manager.Address.City3);
           await page.type('#off3_name_st', data.Manager.Address.State3);
           await page.type('#off3_name_zip', data.Manager.Address.zipCode3);
           await page.type('#off3_name_cntry', data.Manager.Address.Country3)
           //fourth
           await page.type('#off4_name_title', data.Manager.Name.Title4);
           await page.type('#off4_name_last_name', data.Manager.Name.LastName4);
           await page.type('#off4_name_first_name', data.Manager.Name.FirstName4);
         await page.type('#off4_name_m_name', data.Manager.Name.MidInitial4);
          await page.type('#off4_name_title_name', data.Manager.Name.Name_Title4);
  
          await page.type('#off4_name_addr1', data.Manager.Address.streetAddress4);
          await page.type('#off4_name_city', data.Manager.Address.City4);
          await page.type('#off4_name_st', data.Manager.Address.State4);
          await page.type('#off4_name_zip', data.Manager.Address.zipCode4);
          await page.type('#off4_name_cntry', data.Manager.Address.Country4)
          //fifth
          await page.type('#off5_name_title', data.Manager.Name.Title5);
          await page.type('#off5_name_last_name', data.Manager.Name.LastName5);
          await page.type('#off5_name_first_name', data.Manager.Name.FirstName5);
        await page.type('#off5_name_m_name', data.Manager.Name.MidInitial5);
         await page.type('#off5_name_title_name', data.Manager.Name.Name_Title5);
  
         await page.type('#off5_name_addr1', data.Manager.Address.streetAddress5);
         await page.type('#off5_name_city', data.Manager.Address.City5);
         await page.type('#off5_name_st', data.Manager.Address.State5);
         await page.type('#off5_name_zip', data.Manager.Address.zipCode5);
         await page.type('#off5_name_cntry', data.Manager.Address.Country5)
  
         await page.type('#off6_name_title', data.Manager.Name.Title6);
         await page.type('#off6_name_last_name', data.Manager.Name.LastName6);
         await page.type('#off6_name_first_name', data.Manager.Name.FirstName6);
       await page.type('#off6_name_m_name', data.Manager.Name.MidInitial6);
        await page.type('#off6_name_title_name', data.Manager.Name.Name_Title6);
  
  
        await page.type('#off6_name_addr1', data.Manager.Address.streetAddress6);
        await page.type('#off6_name_city', data.Manager.Address.City6);
        await page.type('#off6_name_st', data.Manager.Address.State6);
        await page.type('#off6_name_zip', data.Manager.Address.zipCode6);
        await page.type('#off6_name_cntry', data.Manager.Address.Country6)
              }
              else if(data.Manager.Name.entityName){
  
                  if (data.Manager.Name.entityName.length > 42) {
                      throw new Error('Entity Name exceeds 42 characters.');
                    }
                    if (data.Manager.Address.streetAddress.length  > 42) {
                      throw new Error('Street Address exceeds 42 characters.');
                    }
                    if (data.Manager.Address.City.length > 28) {
                      throw new Error('City exceeds 28 characters.');
                    }
                    if (data.Manager.Address.State.length > 2) {
                      throw new Error('State exceeds 2 characters.');
                    }
                    if (data.Manager.Address.postal_code.length > 9) {
                      throw new Error('Zip Code exceeds 9 characters.');
                    }
                    if (data.Manager.Address.Country.length > 2) {
                      throw new Error('Country exceeds 2 characters.');
                    }
                  
                    // Fill in the form fields
                    await page.type('#off1_name_corp_name', data.Manager.Name.entityName1);
                    await page.type('#off1_name_addr1', data.Manager.Address.streetAddress1);
                    await page.type('#off1_name_city', data.Manager.Address.City1);
                    await page.type('#off1_name_st', data.Manager.Address.State1);
                    await page.type('#off1_name_zip', data.Manager.Address.zipCode1);
                    await page.type('#off1_name_cntry', data.Manager.Address.Country1);
  
                    await page.type('#off2_name_corp_name', data.Manager.Name.entityName2);
                    await page.type('#off2_name_addr1', data.Manager.Address.streetAddress2);
                    await page.type('#off2_name_city', data.Manager.Address.City2);
                    await page.type('#off2_name_st', data.Manager.Address.State2);
                    await page.type('#off2_name_zip', data.Manager.Address.zipCode2);
                    await page.type('#off2_name_cntry', data.Manager.Address.Country2);
  
                    await page.type('#off3_name_corp_name', data.Manager.Name.entityName3);
                    await page.type('#off3_name_addr1', data.Manager.Address.streetAddress3);
                    await page.type('#off3_name_city', data.Manager.Address.City3);
                    await page.type('#off3_name_st', data.Manager.Address.State3);
                    await page.type('#off3_name_zip', data.Manager.Address.zipCode3);
                    await page.type('#off3_name_cntry', data.Manager.Address.Country3);
  
                    await page.type('#off4_name_corp_name', data.Manager.Name.entityName4);
                    await page.type('#off4_name_addr1', data.Manager.Address.streetAddress4);
                    await page.type('#off4_name_city', data.Manager.Address.City4);
                    await page.type('#off4_name_st', data.Manager.Address.State4);
                    await page.type('#off4_name_zip', data.Manager.Address.zipCode4);
                    await page.type('#off4_name_cntry', data.Manager.Address.Country4);
  
                    await page.type('#off5_name_corp_name', data.Manager.Name.entityName5);
                    await page.type('#off5_name_addr1', data.Manager.Address.streetAddress5);
                    await page.type('#off5_name_city', data.Manager.Address.City5);
                    await page.type('#off5_name_st', data.Manager.Address.State5);
                    await page.type('#off5_name_zip', data.Manager.Address.zipCode5);
                    await page.type('#off5_name_cntry', data.Manager.Address.Country5);
  
                    await page.type('#off6_name_corp_name', data.Manager.Name.entityName6);
                    await page.type('#off6_name_addr1', data.Manager.Address.streetAddress6);
                    await page.type('#off6_name_city', data.Manager.Address.City6);
                    await page.type('#off6_name_st', data.Manager.Address.State6);
                    await page.type('#off6_name_zip', data.Manager.Address.zipCode6);
                    await page.type('#off6_name_cntry', data.Manager.Address.Country6);
                  
              }
              await page.waitForSelector('input[name="submit"]', { visible: true, timeout: 60000 });
   
            await page.evaluate(() => {
                document.querySelector('input[name="submit"]').submit();
              });
            
              await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
              console.log('Form submitted successfully');
  
           return errorResponse;
        }
          }



            
          }
        async function handleNy(page,jsonData){
        if(jsonData.State.stateFullDesc=="New-York"){
        await retry(async () => {

          
            try {
                // sendWebSocketMessage('Attempting to add the name');
                console.log("Navigating to the login page...");
                // const response = await page.goto("https://filings.dos.ny.gov/ords/corpanc/r/ecorp/login_desktop", {
                const response = await page.goto(jsonData.State.stateUrl, {

                    waitUntil: 'networkidle0',
                    timeout: 60000
                });
                log('Login page loaded.');
            } catch (error) {
                console.error("Error navigating to the login page:", error.message);
                throw new Error("Navigation to the login page failed.");
            }
        },5,page);

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
                    return secondLink ? secondLink.getAttribute('href') : null;
                });
            } catch (error) {
                console.error("Error getting the second link URL:", error.message);
                throw new Error("Failed to get the second link URL for LLC.");
            }
        } else if (jsonData.EntityType.orderShortName === 'CORP') {
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
    }

    else if(jsonData.State.stateFullDesc=="Delaware"){

      await retry(async () => {

          
        try {
            // sendWebSocketMessage('Navigating to the login page...');
            console.log("Navigating to the login page...");
            // const response = await page.goto("https://filings.dos.ny.gov/ords/corpanc/r/ecorp/login_desktop", {
            const response = await page.goto(jsonData.State.stateUrl, {

                waitUntil: 'networkidle0',
                timeout: 60000
            });
            log('Login page loaded.');
        } catch (error) {
            console.error("Error navigating to the login page:", error.message);
            throw new Error("Navigation to the login page failed.");
        }
    },5,page);

    await randomSleep(3000, 5000);
        try {
            await performLogin(page, jsonData);
        } catch (error) {
            console.error("Error waiting for the preview page:", error.message);
            throw new Error("Invalid Login Credentials");
        }
        await adjustViewport(page);

        console.log ('Waiting for options to appear'); 
        await page.waitForSelector('.service-item  a', { visible: true}); 
           try {
            // Use page.evaluate to click the link in the context of the page
            await page.evaluate(() => {
              const firstLink = document.querySelector('.service-item  a');
              if (firstLink) {
                firstLink.scrollIntoView(); // Ensure the link is in view
                firstLink.click();
              } else {
                throw new Error('No links found on the page');
              }
            });
            console.log('Clicked the first link');
            
            // Optionally, wait for navigation or additional actions
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            console.log('Redirected to the first link\'s destination');
          } catch (error) {
            console.error('Error during link click operation:', error.message);
          }

          await  page.waitForSelector('form-group',{ visible: true, timeout: 60000 }); 
          async function selectOptionByText(selector, optionText) {
            await page.evaluate((selector, optionText) => {
              const select = document.querySelector(selector);
              const option = Array.from(select.options).find(opt => opt.text.trim() === optionText);
              if (option) {
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }, selector, optionText);
          }
          await selectOptionByText('select[formcontrolname="workFlowPriority"]', 'Priority 7 (Normal Processing)');

          await page.waitForSelector('kendo-maskedtextbox[formcontrolname="phoneNumber"] input.k-textbox',{visible:true, timeout:10000});
          await page.focus('kendo-maskedtextbox[formcontrolname="phoneNumber"] input.k-textbox');
          await page.evaluate((phoneNumber) => {
            const input = document.querySelector('kendo-maskedtextbox[formcontrolname="phoneNumber"] input.k-textbox');
            if (input) {
              input.value = phoneNumber;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, data.phoneNumber);
      
          const phoneNumber = await page.$eval('kendo-maskedtextbox[formcontrolname="phoneNumber"] input.k-textbox', el => el.value);
          console.log('Entered phone number:', phoneNumber);
          const options = await page.evaluate(() => {
            const selectElement = document.querySelector('select[formcontrolname="documentUploadRequestType"]');
            return Array.from(selectElement.options).map(option => ({
              text: option.text,
              value: option.value
            }));
          });
          const optionToSelect = options.find(option => option.text === data.BusinessType);
          if (optionToSelect) {
            await page.select('select[formcontrolname="documentUploadRequestType"]', optionToSelect.value);
          }
          await page.waitForSelector('div.k-button.k-upload-button',{visible:true, timeout:10000});
          await page.click('div.k-button.k-upload-button');
          await randomSleep(100000,2000000);
          const filePath = path.resolve(__dirname, 'path-to-your-file.txt');

          await page.setInputFiles('input[type="file"]', filePath);
          
          await new Promise(resolve => setTimeout(resolve, 50000));



          await page.waitForSelector('input[formcontrolname="corporationName"]');
          await page.waitForSelector('input[formcontrolname="corporationNumber"]');
          await page.waitForSelector('input[formcontrolname="reservationNumber"]');
          await page.waitForSelector('input[formcontrolname="documentType"]');

          await page.evaluate((data) => {
            document.querySelector('input[formcontrolname="corporationName"]').value = data.Payload.Name.CD_Legal_Name;

            if(data.Payload.Name.CD_Corporate_Number){
            document.querySelector('input[formcontrolname="corporationNumber"]').value = data.Payload.Name.CD_Corporate_Number;

            }
            if(data.Payload.Name.CD_Reserve_Number){
            document.querySelector('input[formcontrolname="reservationNumber"]').value = data.Payload.Name.CD_Reserve_Number;

            }

            if(data.EntityType.orderShortName){
            document.querySelector('input[formcontrolname="documentType"]').value = data.EntityType.orderShortName;
            }
            // Optionally, trigger any event listeners if required
            const event = new Event('input', { bubbles: true });
            document.querySelector('input[formcontrolname="corporationName"]').dispatchEvent(event);
            document.querySelector('input[formcontrolname="corporationNumber"]').dispatchEvent(event);
            document.querySelector('input[formcontrolname="reservationNumber"]').dispatchEvent(event);
            document.querySelector('input[formcontrolname="documentType"]').dispatchEvent(event);
          },data);
          const returnOptions= await page.evaluate(() => {
            const selectElement = document.querySelector('select[formcontrolname="returnMethod"]');
            return Array.from(selectElement.returnOptions).map(option => ({
              text: option.text,
              value: option.value
            }));
          });
          const returnoptionselect= returnOptions.find(option => option.text === data.Payload.Return_Type);
          if (returnoptionselect) {
            await page.select('select[formcontrolname="returnMethod"]', returnoptionselect.value);
          }
          await page.waitForSelector('button.btn.btn-primary.btn-lg');

    await page.click('button.btn.btn-primary.btn-lg');


      




      










      
     





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

   if(jsonData.State.stateFullDesc=="New-York"){
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

  }else if(jsonData.State.stateFullDesc=="Delaware"){

    try {
      console.log("Attempting to login...");

      // Wait for the form to be visible
      await page.waitForSelector('a[routerlink="/account/login"]', { visible: true, timeout: 60000 });

      const loginButton = await page.$('a[routerlink="/account/login"]');
      if (loginButton) {
        await loginButton.click();
        console.log('Clicked login link');
        
        // Wait for navigation to the login page
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log('Redirected to login page');
      } else {
        throw new Error('Login button not found');
      }
      await page.waitForSelector('input[formcontrolname="userName"]', { visible: true });
    await page.waitForSelector('input[formcontrolname="password"]', { visible: true });

      // Fill in the login form and handle the submit
      await page.evaluate((jsonData) => {
        const usernameField = document.querySelector('input[formcontrolname="userName"]');
        const passwordField = document.querySelector('input[formcontrolname="password"]');
        const submitButton = document.querySelector('button[type="submit"]');
    
        if (!usernameField || !passwordField || !submitButton) {
          throw new Error("Couldn't find login elements");
        }
    
        // Set the username and password
        usernameField.value = jsonData.State.filingWebsiteUsername;
        passwordField.value = jsonData.State.filingWebsitePassword;
    
        // Submit the form
        submitButton.click();
      }, jsonData);
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });

      // Check for error messages after navigation
      const alertSelector = 'ngb-alert';  
  const errorMessage = 'You have entered an invalid user ID/ password';
  
  try {
    const alertVisible = await page.evaluate((alertSelector, errorMessage) => {
      const alert = document.querySelector(alertSelector);
      return alert && alert.textContent.includes(errorMessage);
    }, alertSelector, errorMessage);

    if (alertVisible) {
      console.error("Login failed: Invalid Login Credentials");
      throw new Error("Login failed: Invalid Login Credentials");
    }

    console.log('Login successful.');

  } catch (error) {
      console.error("Login failed:", error.message);
      throw error; // Re-throw the error for higher-level handling
  }
}catch (error) {
  console.error("Login failed:", error.message);
  throw error; // Re-throw the error for higher-level handling
}
  }
}



async function addDataLLC(page, data) {
  if(data.State.stateFullDesc=="New-York"){
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
            nameField.value = data.Payload.Name.CD_Legal_Name;
            if (checkbox) {
                checkbox.checked = data.checked;
            }

            // Trigger form submission
            submitButton.click();
        }, data);

        try {
            // Wait for navigation after form submission
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
        } catch (err) {
            console.log("Page did not navigate, likely staying on the same page due to an error.");
        }

        // Check if the error message about the unacceptable name appears
        // await page.waitForSelector('p[style="color:red;text-align:left"]', { visible: true, timeout: 120000 });

        const isDuplicate =await page.evaluate(()=>{

          

            return false; 
        }); 
        if (isDuplicate) {
            await page.waitForSelector('table[id$="_orig"]', { timeout: 10000 });

            const entityDetails = await page.evaluate(() => {
                const table = document.querySelector('table[id$="_orig"]');
                if (!table) {
                    console.error("Table not found");
                    return null;
                }
                console.log("Table found:", table);
        
                // Change: Select the second row (first data row) instead of the first row
                const row = table.querySelectorAll('tbody tr')[1];
                if (!row) {
                    console.error("Row not found");
                    return null;
                }
                console.log("Row found:", row);
        
                const cells = row.querySelectorAll('td');
                if (cells.length < 4) {
                    console.error("Not enough cells found");
                    return null;
                }
                console.log("Cells found:", cells);
        
                return {
                    name: cells[0].textContent.trim(),
                    dosid: cells[1].textContent.trim(),
                    formationDate: cells[2].textContent.trim(),
                    county: cells[3].textContent.trim()
                };
            });
        
            if (!entityDetails) {
                throw new Error("Failed to retrieve entity details from the table.");
            }
            throw new Error(`DuplicateEntityError: ${JSON.stringify(entityDetails)} exists. Enter a new entity name.`);
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
            throw new Error(`LLC name "${data.Payload.Name.CD_Legal_Name}" is invalid it should end with LLC or Limited Liability Company or LL.C. . Error: ${errorText}`);
        }

        console.log("Entity name is valid.");
        // If the error message exists, throw an error
       

        console.log("Name added successfully!");
        await fillNextPage(page, data);

        return { success: true, message: "Name added successfully" };


    } catch (e) {
        // Specific error handling
        let errorResponse = {
            success: false,
            error: e.message
        };
        if (e.message.includes('Execution context was destroyed')) {
            errorResponse.error = "Error: Execution context was destroyed, possibly due to page navigation.";
        } else if (e.message.includes('Name is Invalid')) {
            errorResponse.error = e.message;
        } else if (e.message.startsWith('DuplicateEntityError:')) {
            errorResponse.error = "Duplicate entity found: " + e.message;
            try {
                const entityDetails = JSON.parse(e.message.split('DuplicateEntityError: ')[1]);
                errorResponse.entityDetails = entityDetails;
            } catch (parseError) {
                console.error("Failed to parse entity details:", parseError);
            }
        }

        console.error("An error occurred:", errorResponse.error);
        return errorResponse;
        // Re-throw the error if necessary
    }

  }
  else if(data.State.stateFullDesc=="New-Jersey"){
             
        try {
          console.log("Attempting to add the name");
  
          // Wait for the form to be available
          // await page.waitForSelector('form', { visible: true, timeout: 120000 });
  
          // Fill out the form and submit
          await page.evaluate((data) => {
              const nameField = document.querySelector('input[name="BusinessName"]');
              const submitButton = document.querySelector('input.btn.btn-success');
  
              if (!nameField || !submitButton) {
                  throw new Error("Couldn't find name field or submit button");
              }
  
              let legalName = data.Payload.Name.CD_Legal_Name; 
        const designators =['LLC','L.L.C','LL.C.','Limited Liability Company'];
            const upperCaseName = legalName.toUpperCase();
            console.log("the company name is :=",upperCaseName); 

                const businessDesignator=designators.filter(designator => upperCaseName.includes(designator));

                   let nameWithoutDesignator = upperCaseName;
businessDesignator.forEach(designator => {
    nameWithoutDesignator = nameWithoutDesignator.replace(designator, '').trim();
})
        nameField.value = nameWithoutDesignator;
             
  
              // Trigger form submission
              submitButton.click();
          }, data);
  
          try {
              // Wait for navigation after form submission
              await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
          } catch (err) {
              console.log("Page did not navigate, likely staying on the same page due to an error.");
          }
  
          // Check if the error message about the unacceptable name appears
          // await page.waitForSelector('p[style="color:red;text-align:left"]', { visible: true, timeout: 120000 });
  
          const errorText = await page.evaluate(() => {
            const errorMessage = document.querySelector('span.field-validation-error[data-valmsg-for="mystery"]');
            return errorMessage ? errorMessage.innerText : '';
        });
        
        // If the error message exists, throw an error with the message
        if (errorText.includes("Business Name can not include business designators like 'LLC'")) {
          throw new Error(`Error: ${errorText}`);
      } else if (errorText) {
          throw new Error(`Error encountered: ${errorText}`);
      } else {
          console.log("No error message found. Proceeding with the next steps.");
      }
          
         
  
          console.log("Entity name is valid.");
          // If the error message exists, throw an error
         
  
          console.log("Name added successfully!");
          await fillNextPage(page, data);
  
          return { success: true, message: "Name added successfully" };
  
  
      } catch (e) {
          // Specific error handling
          let errorResponse = {
              success: false,
              error: e.message
          };
          if (e.message.includes('Execution context was destroyed')) {
              errorResponse.error = "Error: Execution context was destroyed, possibly due to page navigation.";
          } else if (e.message.includes('Name is Invalid')) {
              errorResponse.error = e.message;
          } else if (e.message.startsWith('DuplicateEntityError:')) {
              errorResponse.error = "Duplicate entity found: " + e.message;
              try {
                  const entityDetails = JSON.parse(e.message.split('DuplicateEntityError: ')[1]);
                  errorResponse.entityDetails = entityDetails;
              } catch (parseError) {
                  console.error("Failed to parse entity details:", parseError);
              }
          }
  
          console.error("An error occurred:", errorResponse.error);
          return errorResponse;
          // Re-throw the error if necessary
      }

       }
      
  
}

async function addDataCorp(page, data) {

  if(jsonData.State.stateFullDesc=="New-York"){
  try {
      console.log("Attempting to add the name");

      // Wait for the form to be available
      await page.waitForSelector('form', { visible: true, timeout: 12000000 });

      // Fill out the form and submit
      await page.evaluate((data) => {
          const nameField = document.querySelector('input[name="P2_ENTITY_NAME"]');
          const checkbox = document.querySelector('input[name="P2_CHECKBOX"]');
          const submitButton = document.querySelector('button.t-Button--hot');

          if (!nameField || !submitButton) {
              throw new Error("Couldn't find name field or submit button");
          }

          // Set the name and checkbox values
          let legalName=data.Payload.Name.CD_Legal_Name;
          nameField.value = legalName;
          if (checkbox) {
              checkbox.checked = data.checked;
          }

          submitButton.click();
      }, data);

      try {
          await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 50000 });
      } catch (err) {
          console.log("Page did not navigate, likely staying on the same page due to an error.");
      }

     

      const isDuplicate =await page.evaluate(()=>{

          const table=document.querySelector('table[id$="_orig"');
          if(table){
              const r=table.querySelectorAll('tbody tr'); 
              return r.length > 0;
            }

          return false; 
      }); 
      if (isDuplicate) {
          await page.waitForSelector('table[id$="_orig"]', { timeout: 10000 });

          const entityDetails = await page.evaluate(() => {
              const table = document.querySelector('table[id$="_orig"]');
              if (!table) {
                  console.error("Table not found");
                  return null;
              }
              console.log("Table found:", table);
      
              // Change: Select the second row (first data row) instead of the first row
              const row = table.querySelectorAll('tbody tr')[1];
              if (!row) {
                  console.error("Row not found");
                  return null;
              }
              console.log("Row found:", row);
      
              const cells = row.querySelectorAll('td');
              if (cells.length < 4) {
                  console.error("Not enough cells found");
                  return null;
              }
              console.log("Cells found:", cells);
      
              return {
                  name: cells[0].textContent.trim(),
                  dosid: cells[1].textContent.trim(),
                  formationDate: cells[2].textContent.trim(),
                  county: cells[3].textContent.trim()
              };
          });
      
          if (!entityDetails) {
              throw new Error("Failed to retrieve entity details from the table.");
          }
          throw new Error(`DuplicateEntityError: ${JSON.stringify(entityDetails)} exists. Enter a new entity name.`);
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
          throw new Error(`Corp Entity name "${data.Payload.Name.CD_Legal_Name}" is invalid it should end with Corporation or Corp. or Limited or Ltd. or  Incorporated or Inc.  Error: ${errorText}`);
      }

      console.log("Entity name is valid.");
     

      console.log("Name added successfully!");
      await fillNextPageCorp(page, data)

      return { success: true, message: "Name added successfully" };


  } catch (e) {
      
      let errorResponse = {
          success: false,
          error: e.message
      };
      if (e.message.includes('Execution context was destroyed')) {
          errorResponse.error = "Error: Execution context was destroyed, possibly due to page navigation.";
      } else if (e.message.includes('Name is Invalid')) {
          errorResponse.error = e.message;
      } else if (e.message.startsWith('DuplicateEntityError:')) {
          errorResponse.error = "Duplicate entity found: " + e.message;
          try {
              const entityDetails = JSON.parse(e.message.split('DuplicateEntityError: ')[1]);
              errorResponse.entityDetails = entityDetails;
          } catch (parseError) {
              console.error("Failed to parse entity details:", parseError);
          }
      }

      console.error("An error occurred:", errorResponse.error);
      return errorResponse;
      
  }
}else if(jsonData.State.stateFullDesc=="New-Jersey"){
             
  try {
    console.log("Attempting to add the name");

  
    await page.evaluate((data) => {
        const nameField = document.querySelector('input[name="BussinessName"]');
        const submitButton = document.querySelector('input.btn.btn-success');

        if (!nameField || !submitButton) {
            throw new Error("Couldn't find name field or submit button");
        }
        
        let legalName=data.Payload.Name.CD_Legal_Name; 
        const designators = ['CORPORATION', 'INCORPORATED' ,'COMPANY', 'LTD', 'CO', 'CO.', 'CORP', 'CORP.', 'INC', 'INC.'];
          

            const upperCaseName = legalName.toUpperCase();
            console.log("the company name is :=",upperCaseName); 

                let businessDesignator=designators.filter(designator => upperCaseName.includes(designator));

                   let nameWithoutDesignator = upperCaseName;
businessDesignator.forEach(designator => {
    nameWithoutDesignator = nameWithoutDesignator.replace(designator, '').trim();
})
        nameField.value = nameWithoutDesignator;

        
       

        // Trigger form submission
        submitButton.click();
    }, data);

    try {
        // Wait for navigation after form submission
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
    } catch (err) {
        console.log("Page did not navigate, likely staying on the same page due to an error.");
    }

    

    const errorText = await page.evaluate(() => {
      const errorMessage = document.querySelector('span.field-validation-error[data-valmsg-for="mystery"]');
      return errorMessage ? errorMessage.innerText : '';
  });
  
  // If the error message exists, throw an error with the message
  if (errorText.includes("Business Name can not include business designators like 'LLC'")) {
    throw new Error(`Error: ${errorText}`);
} else if (errorText) {
    throw new Error(`Error encountered: ${errorText}`);
} else {
    console.log("No error message found. Proceeding with the next steps.");
}
    
   

    console.log("Entity name is valid.");
   

    console.log("Name added successfully!");
    await fillNextPageCorp(page, data);

    return { success: true, message: "Name added successfully" };


} catch (e) {
    // Specific error handling
    let errorResponse = {
        success: false,
        error: e.message
    };
    if (e.message.includes('Execution context was destroyed')) {
        errorResponse.error = "Error: Execution context was destroyed, possibly due to page navigation.";
    } else if (e.message.includes('Name is Invalid')) {
        errorResponse.error = e.message;
    } else if (e.message.startsWith('DuplicateEntityError:')) {
        errorResponse.error = "Duplicate entity found: " + e.message;
        try {
            const entityDetails = JSON.parse(e.message.split('DuplicateEntityError: ')[1]);
            errorResponse.entityDetails = entityDetails;
        } catch (parseError) {
            console.error("Failed to parse entity details:", parseError);
        }
    }

    console.error("An error occurred:", errorResponse.error);
    return errorResponse;
    // Re-throw the error if necessary
}

 }
}


async function fillNextPageCorp(page, data) {
  if(jsonData.State.stateFullDesc=="New-York"){
    try {
        console.log("Filling the next page...");



        await page.evaluate((data) => {
           

            // document.querySelector('input[name="P3_ENTITY_NAME"]').value = data.Payload.Name.Legal_Name+" Corp.";

            

            let legalName = data.Payload.Name.CD_Legal_Name;
            document.querySelector('input[name="P3_ENTITY_NAME"]').value = legalName;


            const dropdown= document.querySelector('#P3_COUNTY')
            const option = Array.from(dropdown.options).find(opt => opt.text === data.Payload.County.CD_County.toUpperCase());
            if(option){
                dropdown.value=option.value ;
            }



            const effectiveDate = document.querySelector('input#P3_EXISTENCE_OPTION_0');
            const Dissolution_Date = document.querySelector('input#P3_DURATION_OPTION_0');
            const liability_statement = document.querySelector('input#P3_LIAB_STATEMENT_0');

            if (effectiveDate) {
                effectiveDate.click();
                const radio1 = document.querySelector("input#P3_EXISTENCE_TYPE_0");
                const radio2 = document.querySelector("input#P3_EXISTENCE_TYPE_1");

                if (radio1 && radio1.checked) {
                    radio1.checked = true;
                } else if (radio2 && radio2.checked) {
                    const effectiveDateInput = document.querySelector('input[name="P3_EXIST_CALENDAR"]');
                    if (effectiveDateInput) {
                        effectiveDateInput.value = data.effectiveDate;

                        effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));

                        const dateComponent = document.querySelector('#P3_EXIST_CALENDAR');
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
                    const effectiveDateInput = document.querySelector('input[name="P3_DURATION_CALENDAR"]');
                    if (effectiveDateInput) {
                        effectiveDateInput.value = data.effectiveDate;

                        effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));

                        const dateComponent = document.querySelector('#P3_DURTION_CALENDAR');
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

            const opt1 = document.querySelector("input#P3_SOP_ADDR_OPTION_0");
            const opt2 = document.querySelector("input#P3_SOP_ADDR_OPTION_1");

            if (opt1 && opt1.checked) {
                document.querySelector('input[name="P3_SOP_NAME"]').value = data.Payload.Name.CD_Alternate_Legal_Name;
                document.querySelector('input[name="P3_SOP_ADDR1"]').value = data.Payload.Principal_Address.PA_Address_Line1;
                document.querySelector('input[name="P3_SOP_ADDR2"]').value = data.Payload.Principal_Address.PA_Address_Line2;
                document.querySelector('input[name="P3_SOP_CITY"]').value = data.Payload.Principal_Address.PA_City;
                document.querySelector('input[name="P3_SOP_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;
            } else if (opt2 && opt2.checked) {
                const serviceCompanySelect = document.querySelector("#P3_SOP_SERVICE_COMPANY");
                if (serviceCompanySelect) {
                    serviceCompanySelect.value = "440";
                }
                document.querySelector('input[name="P3_SOP_NAME"]').value = data.Payload.Name.CD_Alternate_Legal_Name;
                document.querySelector('input[name="P3_SOP_ADDR1"]').value = data.Payload.Principal_Address.PA_Address_Line1;
                document.querySelector('input[name="P3_SOP_ADDR2"]').value = data.Payload.Principal_Address.PA_Address_Line2;
                document.querySelector('input[name="P3_SOP_CITY"]').value = data.Payload.Principal_Address.PA_City;
                document.querySelector('input[name="P3_SOP_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;
            }

            const agentOpt1 = document.querySelector("input#P3_RA_ADDR_OPTION_0");
            const agentOpt2 = document.querySelector("input#P3_RA_ADDR_OPTION_1");

            if (data.Payload.Registered_Agent) {
                const check=document.querySelector('#P3_RA_OPTION_0')
                check.click()
                if(agentOpt1 && agentOpt1.checked){
                document.querySelector('input[name="P3_RA_NAME"]').value = data.Payload.Registered_Agent.RA_Name;
                document.querySelector('input[name="P3_RA_ADDR1"]').value = data.Payload.Registered_Agent.RA_Address.RA_Address_Line1;
                document.querySelector('input[name="P3_RA_ADDR2"]').value =  data.Payload.Registered_Agent.RA_Address.RA_Address_Line2;
                document.querySelector('input[name="P3_RA_CITY"]').value =  data.Payload.Registered_Agent.RA_Address.RA_City;
                document.querySelector('input[name="P3_RA_POSTAL_CODE"]').value = data.Payload.Registered_Agent.RA_Address.RA_Postal_Code;
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
const shareValue = stockInfo.SI_Share_Par_Value;

const stockType = shareValue !== undefined && shareValue !== null ? 'PV' : 'NPV';

document.querySelector('input[name="P3_NUM_SHARES"]').value = stockInfo.SI_No_Of_Shares;

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
  
  document.querySelector('#P3_FILER_NAME').value = data.Payload.Name.CD_Alternate_Legal_Name;
  document.querySelector('#P3_FILER_ADDR1').value = data.Payload.Principal_Address.PA_Address_Line1
    document.querySelector('input[name="P3_FILER_CITY"]').value = data.Payload.Principal_Address.PA_City;
    document.querySelector('input[name="P3_FILER_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;

   

} else if (clickedButton === 'SOP') {
  // Populate fields for SOP
  
  document.querySelector('#P3_FILER_NAME').value = data.Payload.Name.CD_Alternate_Legal_Name;
  document.querySelector('#P3_FILER_ADDR1').value = data.Payload.Principal_Address.PA_Address_Line1
    document.querySelector('input[name="P3_FILER_CITY"]').value = data.Payload.Principal_Address.PA_City;
    document.querySelector('input[name="P3_FILER_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;

  
} else if (clickedButton === 'Incorporator') {
  // Populate fields for Incorporator
  
  document.querySelector('#P3_FILER_NAME').value = data.Payload.Name.CD_Alternate_Legal_Name;
  document.querySelector('#P3_FILER_ADDR1').value = data.Payload.Principal_Address.PA_Address_Line1
    document.querySelector('input[name="P3_FILER_CITY"]').value = data.Payload.Principal_Address.PA_City;
    document.querySelector('input[name="P3_FILER_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;

  

        

        console.log("Next page filled.");


    } },data)

    await randomSleep(10000, 220000);
}
    
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

              }else if(jsonData.State.stateFullDesc=="New-Jersey"){
                const designators = ['CORPORATION', 'INCORPORATED' ,'COMPANY', 'LTD', 'CO', 'CO.', 'CORP', 'CORP.', 'INC', 'INC.'];
            const upperCaseName = legalName.toUpperCase();
            console.log("the company name is :=",upperCaseName); 

                const businessDesignator=designators.filter(designator => upperCaseName.includes(designator));

                   let nameWithoutDesignator = upperCaseName;
businessDesignator.forEach(designator => {
    nameWithoutDesignator = nameWithoutDesignator.replace(designator, '').trim();
});
                await page.waitForSelector('#BusinessNameDesignator');

                await page.select('#BusinessNameDesignator', businessDesignator);



                await page.evaluate(() => {
                  const submitButton = document.querySelector('input.btn.btn-success');
                  if (submitButton) {

                      submitButton.click();
                  }
              });
              if(data.Payload.FeinInformation.FeinNumber){
              await page.type('#FeinNumber', data.Payload.FeinInformation.FeinNumber); 
              }
              else{}
              if(data.Payload.FeinInformation.FeinLocation){
              await page.type('#FeinLocation', data.Payload.FeinInformation.FeinLocation);               
            }else{} 
              if(data.Payload.FeinInformation.NaicsCode){
              await page.type('#NaicsCode', '123456'); 
              }else{}

              if(data.Payload.Duration.duration){
              await page.type('#Duration',data.Payload.Duration.duration); 
              }else{}
              // Set the Effective Date

              if(data.Payload.EffectiveDate.effectivedate){
              await page.click('#effective-date-picker'); // Click on the date picker input
              await page.evaluate(() => {
                  document.querySelector('#effective-date-picker').value = data.Payload.EffectiveDate.effectivedate;// Set the desired date
              });
            }
            if(data.Payload.Stock_Information.SI_No_Of_Shares){
              let shares=data.Payload.Stock_Information.SI_No_Of_Shares; 
              if (isNaN(shares) || parseInt(shares) <= 0 || shares.length > 11) {
                console.log("Invalid number for total shares. Please enter a positive number with a maximum of 11 digits.");
              } 

              await page.waitForSelector('#TotalShares',{visible: true, timeout: 120000 })
              await page.type('#TotalShares',data.Payload.Stock_Information.SI_No_Of_Shares); 

              const errorMessage = await page.$eval('.help-inline.nod_msg', el => el.innerText);

              if (errorMessage === 'The maximum number of shares allowed is 1,000,000') {
      // console.log("Validation Error: The maximum number of shares allowed is 1,000,000.");
                throw new Error("Validation Error: The maximum number of shares allowed is 1,000,000."); 
    } else {
      console.log("Total shares input successfully. No validation errors found.");
    }


            }
            await page.evaluate(() => {
              const submitButton = document.querySelector('input.btn.btn-success');
              if (submitButton) {

                  submitButton.click();
              }
          });

            await page.type('#BusinessPurpose', data.Payload.Registered_Agent.Purpose.CD_Business_Purpose_Details);
            await page.evaluate(() => {
              const submitButton = document.querySelector('#btnSubmit');
              if (submitButton) {

                  submitButton.click();
              }
          });


          if(data.Payload.Incorporator_Information.Incorporator_Details){

            await page.waitForSelector('#add-member-btn',{visible: true, timeout: 120000 });
            await page.click('#add-member-btn');
            await page.waitForSelector('#member-add-modal', { visible: true,timeout : 120000 });
            await page.type('#Name', data.Payload.Incorporator_Information.Incorporator_Details.Name);
            await page.type('#StreetAddress1', data.Payload.Incorporator_Information.Incorporator_Details.Address.Inc_Address_Line1);
            await page.type('#StreetAddress2', data.Payload.Incorporator_Information.Incorporator_Details.Address.Inc_Address_Line2);
            await page.type('#City', data.Payload.Incorporator_Information.Incorporator_Details.Address.Inc_City); 

            await page.waitForSelector('#State',{visible: true, timeout: 120000 }); 


            const statecheck= document.querySelector('#State')
            const option = Array.from(statecheck.options).find(opt => opt.text === data.Payload.Incorporator_Information.Incorporator_Details.Address.State.toUpperCase());
            if(option){
                statecheck.value=option.value ;
            }
            // await page.type('#Zip', data.Payload.Incorporator_Information.Incorporator_Information.Address.Inc_Postal_Code);
            await page.evaluate((data) => {
              const postalInput = document.querySelector('#Zip');
              if (postalInput) {
                postalInput.value = data.Payload.Incorporator_Information.Incorporator_Information.Address.Inc_Postal_Code;  // Set value directly using document.querySelector
                postalInput.dispatchEvent(new Event('input', { bubbles: true }));  // Trigger input event if necessary
              } else {
                console.error('Postal Code input field not found');
              }
            }, data);
            await page.waitForSelector('#ZipPlus');
            await page.evaluate((data) => {
              const postalInput = document.querySelector('#ZipPlus');
              if (postalInput) {
                postalInput.value = data.Payload.Incorporator_Information.Incorporator_Information.Address.Inc_Postal_Code;  // Set value directly using document.querySelector
                postalInput.dispatchEvent(new Event('input', { bubbles: true }));  // Trigger input event if necessary
              } else {
                console.error('Postal Code input field not found');
              }
            }, data); 
            // await page.type('#ZipPlus', data.Payload.Incorporator_Information.Incorporator_Information.Address.Inc_Postal_Code); 
            page.on('dialog', async dialog => {
              console.log(dialog.message());
              await dialog.accept();
            });
            await page.click('input[type="submit"].btn-primary');
            await page.waitForSelector('#member-add-modal', { hidden: true });
            console.log('Modal closed.');

            await page.waitForSelector('#table-body',{visible: true, timeout: 120000 });
            const directAdd =await page.evaluate(()=>{

              return Array.from(document.querySelectorAll('#table-body tr')).some(row =>
                row.innerText.includes(data.Payload.Incorporator_Information.Incorporator_Details.Name) 
              ); 
            }); 

            if(directAdd){
              console.log('Director added successfully.');
            }
            else{

              throw new Error('Failed to Add director');
            }
            await page.evaluate(() => {
              const submitButton = document.querySelector('input.btn.btn-success');
              if (submitButton) {

                  submitButton.click();
              }
          });
          page.on('dialog', async dialog => {
            console.log(dialog.message());
            await dialog.accept(); // Automatically accept any further popups
          });
        }
await page.evaluate(() => {
  const submitButton = document.querySelector('input.btn.btn-success');
  if (submitButton) {

      submitButton.click();
  }
});

if(data.Payload.Registered_Agent){
        
  await page.click('#ra-num-link a');
  await page.waitForSelector('#RegisteredAgentName', { visible: true, timeout: 10000 });

  await page.type('#RegisteredAgentName', data.Payload.Registered_Agent.RA_Name);
  await page.type('#RegisteredAgentEmail', data.Payload.Registered_Agent.RA_Email);
  await page.type('#OfficeAddress1', data.Payload.Registered_Agent.RA_Address.RA_Address_Line1);
  await page.type('#OfficeAddress2', data.Payload.Registered_Agent.RA_Address.RA_Address_Line2);
  await page.type('#OfficeCity', data.Payload.Registered_Agent.RA_Address.RA_City)
  // await page.type('#OfficeZip', data.Payload.Registered_Agent.Addres.RA_Postal_Code);

  await page.waitForSelector('#OfficeZip')
  await page.evaluate((data) => {
    const postalInput = document.querySelector('#OfficeZip');
    if (postalInput) {
      postalInput.value = data.Payload.Registered_Agent.RA_Address.RA_Postal_Code;  // Set value directly using document.querySelector
      postalInput.dispatchEvent(new Event('input', { bubbles: true }));  // Trigger input event if necessary
    } else {
      console.error('Postal Code input field not found');
    }
  }, data);
  // await page.type('#OfficeZipPlus', data.Payload.Registered_Agent.Address.RA_Postal_Code);

  await page.waitForSelector('#OfficeZipPlus')
  await page.evaluate((data) => {
    const postalInput = document.querySelector('#OfficeZipPlus');
    if (postalInput) {
      postalInput.value = data.Payload.Registered_Agent.RA_Address.RA_Postal_Code;  // Set value directly using document.querySelector
      postalInput.dispatchEvent(new Event('input', { bubbles: true }));  // Trigger input event if necessary
    } else {
      console.error('Postal Code input field not found');
    }
  }, data);



  await page.click('#Attested');
  await page.evaluate(() => {
    const submitButton = document.querySelector('input.btn.btn-success');
    if (submitButton) {
  
        submitButton.click();
    }
  });
       

}
if(data.Payload.Members){

  await page.evaluate(() => {
    const submitButton = document.querySelector('input.btn.btn-success');
    if (submitButton) {
  
        submitButton.click();
    }
  });
}

await page.evaluate(() => {
  const submitButton = document.querySelector('input.btn.btn-success');
  if (submitButton) {

      submitButton.click();
  }
});

await page.waitForSelector('#add-signer-btn', { visible: true, timeout: 30000 });
await page.click('#add-signer-btn');

await page.waitForSelector('#signer-modal', { visible: true ,timeout: 30000 });
await page.type('#Name',data.Payload.Organizer_Information.Organizer_Details.Org_Name );
await page.waitForSelector('#Title', { visible: true ,timeout: 30000 });


await page.evaluate(() => {
  const businessType = document.querySelector('#Title');
  const option = Array.from(businessType.options).find(opt => opt.text.trim() === 'Authorized Representative');
  if (option) {
      businessType.value = option.value;
      businessType.dispatchEvent(new Event('change', { bubbles: true }));  // Trigger the change event
  }
});

const isErrorVisible = await page.evaluate(() => {
  const errorMessageElement = document.querySelector('#modal-error-msg');
  return errorMessageElement && !errorMessageElement.classList.contains('hidden');
});

if (isErrorVisible) {
  const errorMessage = await page.$eval('#error-text', el => el.innerText.trim());
  console.log('Error in form:', errorMessage);
} else {
  await page.waitForSelector('#modal-save-btn',{ visible: true, timeout: 30000 }); 

  
  await page.click('#modal-save-btn');
}
  await page.waitForSelector('#signer-modal', { hidden: true }).catch(async () => {
      console.log('Modal did not close automatically, closing manually.');
      await page.click('#modal-close-btn'); 
  });
    
  const signerExists = await page.evaluate((data) => {
    const rows = Array.from(document.querySelectorAll('#table-body tr'));
    return rows.some(row => row.textContent.includes(data.Payload.Organizer_Information.Organizer_Details.Org_Name)); 
},data);

if (signerExists) {
    console.log('New signer is successfully added to the table.');

    await page.evaluate((data) => {
        const row = Array.from(document.querySelectorAll('#table-body tr'))
            .find(row => row.textContent.includes(data.Payload.Organizer_Information.Organizer_Details.Org_Name)); 
        if (row) {
            const checkbox = row.querySelector('input[type="checkbox"]'); 
            if (checkbox && !checkbox.checked) {
                checkbox.click(); 
            }
        }
    },data);

    console.log('Checkbox for the new signer is checked.');

  }
  await page.evaluate(() => {
    const submitButton = document.querySelector('input.btn.btn-success');
    if (submitButton) {
  
        submitButton.click();
    }
  });





              }
}


async function fillNextPage(page, data) {
  if(data.State.stateFullDesc=="New-York"){

    try {
        console.log("Filling the next page...");

        await page.waitForSelector('div#P4_INITIAL_STATEMENT_CONTAINER', { visible: true, timeout: 30000 });


        await page.evaluate((data) => {
            const radioButtons = document.querySelectorAll('input[name="P4_INITIAL_STATEMENT"]');
            if (radioButtons.length > 0) {
                radioButtons[0].checked = true;
            }
            
            let legalName = data.Payload.Name.CD_Legal_Name;
            document.querySelector('input[name="P4_ENTITY_NAME"]').value = legalName;
            
            const dropdown= document.querySelector('#P4_COUNTY')
            const option = Array.from(dropdown.options).find(opt => opt.text === data.Payload.County.CD_County.toUpperCase());
            if(option){
                dropdown.value=option.value ;
            }
            const effectiveDate = document.querySelector('input#P4_EXISTENCE_OPTION_0');
            const Dissolution_Date = document.querySelector('input#P4_DISSOLUTION_OPTION_0');
            Dissolution_Date.scrollIntoView()
            const liability_statement = document.querySelector('input#P4_LIAB_STATEMENT_0');
            liability_statement.scrollIntoView()

            // if (data.Payload.effectiveDate) {
            if(effectiveDate){
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
                document.querySelector('input[name="P4_SOP_NAME"]').value = data.Payload.Name.CD_Alternate_Legal_Name;
                document.querySelector('input[name="P4_SOP_ADDR1"]').value = data.Payload.Principal_Address.PA_Address_Line1;
                document.querySelector('input[name="P4_SOP_ADDR2"]').value = data.Payload.Principal_Address.PA_Address_Line2;
                document.querySelector('input[name="P4_SOP_CITY"]').value = data.Payload.Principal_Address.PA_City;
                document.querySelector('input[name="P4_SOP_POSTAL_CODE"]').value = data.Payload.Principal_Address.PA_Postal_Code;
            } else if (opt2 && opt2.checked) {
                const serviceCompanySelect = document.querySelector("#P4_SOP_SERVICE_COMPANY");
                if (serviceCompanySelect) {
                    serviceCompanySelect.value = "440";
                }
                document.querySelector('input[name="P4_SOP_NAME"]').value = data.Payload.Name.CD_Alternate_Legal_Name;
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
                document.querySelector('input[name="P4_RA_NAME"]').value = data.Payload.Registered_Agent.RA_Name;
                document.querySelector('input[name="P4_RA_ADDR1"]').value = data.Payload.Registered_Agent.RA_Address.RA_Address_Line1;
                document.querySelector('input[name="P4_RA_ADDR2"]').value =  data.Payload.Registered_Agent.RA_Address.RA_Address_Line2;
                document.querySelector('input[name="P4_RA_CITY"]').value =  data.Payload.Registered_Agent.RA_Address.RA_City;
                document.querySelector('input[name="P4_RA_POSTAL_CODE"]').value = data.Payload.Registered_Agent.RA_Address.RA_Postal_Code;
            } else if (agentOpt2 && agentOpt2.checked) {
                const registeredAgentSelect = document.querySelector("#P4_RA_SERVICE_COMPANY");
                if (registeredAgentSelect) {
                    registeredAgentSelect.value = "440";
                }
            }
        }

            document.querySelector('input[name="P4_ORGANIZER_NAME"]').value = data.Payload.Organizer_Information.Organizer_Details.Org_Name;
            document.querySelector('input[name="P4_ORGANIZER_ADDR1"]').value = data.Payload.Organizer_Information.Org_Address.Org_Address_Line1;
            document.querySelector('input[name="P4_ORGANIZER_CITY"]').value = data.Payload.Organizer_Information.Org_Address.Org_City;
            document.querySelector('input[name="P4_ORGANIZER_POSTAL_CODE"]').value = data.Payload.Organizer_Information.Org_Address.Org_Postal_Code;
            document.querySelector('input[name="P4_SIGNATURE"]').value = data.Payload.Organizer_Information.Organizer_Details.Org_Name;

            document.querySelector('#P4_FILER_NAME').value = data.Payload.Name.CD_Alternate_Legal_Name;
            document.querySelector('#P4_FILER_ADDR1').value = data.Payload.Organizer_Information.Org_Address.Org_Address_Line1;
            document.querySelector('input[name="P4_FILER_CITY"]').value = data.Payload.Organizer_Information.Org_Address.Org_City;
            document.querySelector('input[name="P4_FILER_POSTAL_CODE"]').value = data.Payload.Organizer_Information.Org_Address.Org_Postal_Code;

        }, data);

        console.log("Next page filled.");
        await randomSleep(4000, 6000);


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


              }else if(data.State.stateFullDesc=="New-Jersey"){
                const designators = [
                  'LLC',
                  'L.L.C.',
                  'L.L.C',
                  'LTD LIABILITY CO',
                  'LTD LIABILITY CO.',
                  'LTD LIABILITY COMPANY',
                  'LIMITED LIABILITY CO',
                  'LIMITED LIABILITY CO.',
                  'LIMITED LIABILITY COMPANY'
              ];
            businessType = await page.evaluate(() => {
              const selectElement = document.querySelector('#BusinessNameDesignator');
      const option = Array.from(selectElement.options).find(opt => opt.text === 'LLC');
      return option ? option.value : null;
          
      });
          if(businessType){
            // const selectElement = document.querySelector('#BusinessType');
            // const option = Array.from(selectElement.options).find(opt => opt.text === 'NJ DOMESTIC LIMITED LIABILITY COMPANY (LLC)');
            // return option ? option.value : null;
            await page.evaluate((value) => {
              const select = document.querySelector('#BusinessNameDesignator');
              select.value = value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
          }, businessType);
          }

                // await page.waitForSelector('');
                // await page.select('#BusinessNameDesignator', upperCaseName);



                await page.evaluate(() => {
                  const submitButton = document.querySelector('input.btn.btn-success');
                  if (submitButton) {

                      submitButton.click();
                  }
              });
            //   if(data.Payload.FeinInformation.FeinNumber){
            //   await page.type('#FeinNumber', data.Payload.FeinInformation.FeinNumber); 
            //   }
            //   if(data.Payload.FeinInformation.FeinLocation){
            //   await page.type('#FeinLocation', data.Payload.FeinInformation.FeinLocation);               
            // } 
            //   if(data.Payload.FeinInformation.NaicsCode){
            //   await page.type('#NaicsCode', '123456'); 
            //   }

            //   if(data.Payload.Duration.duration)
            //   await page.type('#Duration',data.Payload.Duration.duration); 
          
            //   // Set the Effective Date

            //   if(data.Payload.EffectiveDate.effectivedate){
            //   await page.click('#effective-date-picker'); // Click on the date picker input
            //   await page.evaluate(() => {
            //       document.querySelector('#effective-date-picker').value = data.Payload.EffectiveDate.effectivedate;// Set the desired date
            //   });
            // }
            await page.waitForSelector('input.btn.btn-success')
            await page.evaluate(() => {
              const submitButton = document.querySelector('input.btn.btn-success');
              if (submitButton) {

                  submitButton.click();
              }
          });
          await page.waitForSelector('#BusinessPurpose');

          await page.evaluate((businessPurpose) => {
            document.querySelector('#BusinessPurpose').value = businessPurpose;
        }, data.Payload.Purpose.CD_Business_Purpose_Details);
            await page.waitForSelector('#btnSubmit');

            await page.evaluate(() => {
              const submitButton = document.querySelector("#btnSubmit");
              if (submitButton) {

                  submitButton.click();
              }
          });

      //     await page.waitForSelector('#BusinessAddressLine1');
      //     if(data.Payload.Principal_Address){

      //       await page.type('#BusinessAddressLine1', data.Payload.Principal_Address.PA_Address_Line1);
      //       await page.type('#City', data.Payload.Principal_Address.PA_City);
      //       // await page.select('#State', data.Payload.Principal_Address.PA_State); // Select 'New York' from the dropdown
      //       await page.waitForSelector('#State');
      // //       businessType = await page.evaluate((data) => {
      // //         const selectElement = document.querySelector('#State');
      // // const option = Array.from(selectElement.options).find(opt => opt.text === data.Payload.Principal_Address.PA_State);
      // // return option ? option.value : null;
          
      // // },data);
      //     if(businessType){
      //       // const selectElement = document.querySelector('#BusinessType');
      //       // const option = Array.from(selectElement.options).find(opt => opt.text === 'NJ DOMESTIC LIMITED LIABILITY COMPANY (LLC)');
      //       // return option ? option.value : null;
      //       await page.evaluate((value) => {
      //         const select = document.querySelector('#State');
      //         select.value = value;
      //         select.dispatchEvent(new Event('change', { bubbles: true }));
      //     }, businessType);
      //     }
      //       await page.type('#Zip', data.Payload.Principal_Address.PA_Postal_Code);

      //       await page.evaluate((businessPurpose) => {
      //         document.querySelector('#BusinessPurpose').value = businessPurpose;
      //     }, businessPurpose);
// }
await page.waitForSelector('input.btn.btn-success');

await page.evaluate(() => {
  const submitButton = document.querySelector('input.btn.btn-success');
  if (submitButton) {

      submitButton.click();
  }
});
await page.waitForSelector('#ra-num-link a');

await randomSleep(10000,20000);

if(data.Payload.Registered_Agent){
        
  await page.click('#ra-num-link a',{visible:true,timeout:1000});

  await page.waitForSelector('#RegisteredAgentName', { visible: true, timeout: 10000 });

  await page.type('#RegisteredAgentName', data.Payload.Registered_Agent.RA_Name);
  await page.type('#RegisteredAgentEmail', data.Payload.Registered_Agent.RA_Email);
  await page.type('#OfficeAddress1', data.Payload.Registered_Agent.RA_Address.RA_Address_Line1);
  await page.type('#OfficeAddress2', data.Payload.Registered_Agent.RA_Address.RA_Address_Line2);
   await page.type('#OfficeCity', data.Payload.Registered_Agent.RA_Address.RA_City);
   await page.waitForSelector('#OfficeZip', { visible: true, timeout: 5000 });

   const postalCode = data.Payload.Registered_Agent.RA_Address.RA_Postal_Code;

   await page.evaluate((postalCode) => {
     const postalInput = document.querySelector('#OfficeZip');
     if (postalInput) {
       postalInput.value = "08802";  // Set value directly using document.querySelector
       postalInput.dispatchEvent(new Event('input', { bubbles: true }));  // Trigger input event if necessary
     } else {
       console.error('Postal Code input field not found');
     }
   }, postalCode);
   

  //  await page.evaluate((postalCode) => {
  //    const postalInput = document.querySelector('#OfficeZipPlus');
  //    if (postalInput) {
  //      postalInput.value = postalCode;  // Set value directly using document.querySelector
  //      postalInput.dispatchEvent(new Event('input', { bubbles: true }));  // Trigger input event if necessary
  //    } else {
  //      console.error('Postal Code input field not found');
  //    }
  //  }, postalCode);

  await page.waitForSelector('#Attested'); 
  // await page.click('#Attested');
  await page.evaluate(() => {
    const submitButton = document.querySelector('#Attested');
    if (submitButton) {
  
        submitButton.click();
    }
  });

  await page.waitForSelector('input.btn.btn-success');
  await page.evaluate(() => {
    const submitButton = document.querySelector('input.btn.btn-success');
    if (submitButton) {
  
        submitButton.click();
    }
  });
       

}
if(data.Payload.Memeber_Or_Manager_Details){
  await page.waitForSelector('input.btn.btn-success');
  await page.evaluate(() => {
    
    const submitButton = document.querySelector('input.btn.btn-success');
    if (submitButton) {
  
        submitButton.click();
    }
  });
}
await page.waitForSelector('input.btn.btn-success');


await page.evaluate(() => {
  const submitButton = document.querySelector('input.btn.btn-success');
  if (submitButton) {

      submitButton.click();
  }
});

await page.waitForSelector('input.btn.btn-success');


await page.evaluate(() => {
  const submitButton = document.querySelector('input.btn.btn-success');
  if (submitButton) {

      submitButton.click();
  }
});
await page.waitForSelector('#add-signer-btn', { visible: true, timeout: 30000 });
await page.click('#add-signer-btn');

await page.waitForSelector('#signer-modal', { visible: true ,timeout: 30000 });
await page.type('#Name',data.Payload.Organizer_Information.Organizer_Details.Org_Name );
await page.waitForSelector('#Title', { visible: true ,timeout: 30000 });

await page.evaluate(() => {
  const busisnessType = document.querySelector('#Title');
  
  // Check if the businessType element exists
  if (!busisnessType) {
    console.error('Dropdown element not found');
    return;
  }

  // Check if options exist within the dropdown
  const options = Array.from(busisnessType.options);
  if (options.length === 0) {
    console.error('No options found in dropdown');
    return;
  }

  // Find the option with the text 'Authorized Representative'
  const option = options.find(opt => opt.text.trim() === 'Authorized Representative');
  
  if (option) {
    busisnessType.value = option.value; // Set the value of the dropdown
    busisnessType.dispatchEvent(new Event('change', { bubbles: true })); // Trigger a change event if necessary
  } else {
    console.error('Option not found in dropdown');
  }
});


const isErrorVisible = await page.evaluate(() => {
  const errorMessageElement = document.querySelector('#modal-error-msg');
  return errorMessageElement && !errorMessageElement.classList.contains('hidden');
});

if (isErrorVisible) {
  const errorMessage = await page.$eval('#error-text', el => el.innerText.trim());
  console.log('Error in form:', errorMessage);
} else {
  await page.waitForSelector('#modal-save-btn',{ visible: true, timeout: 30000 }); 

  
  await page.click('#modal-save-btn');
}
  await page.waitForSelector('#signer-modal', { hidden: true }).catch(async () => {
      console.log('Modal did not close automatically, closing manually.');
      await page.click('#modal-close-btn'); 
  });
    
  const signerExists = await page.evaluate((data) => {
    const rows = Array.from(document.querySelectorAll('#table-body tr'));
    return rows.some(row => row.textContent.includes(data.Payload.Organizer_Information.Organizer_Details.Org_Name)); 
},data);

if (signerExists) {
    console.log('New signer is successfully added to the table.');

    await page.evaluate((data) => {
        const row = Array.from(document.querySelectorAll('#table-body tr'))
            .find(row => row.textContent.includes(data.Payload.Organizer_Information.Organizer_Details.Org_Name)); 
        if (row) {
            const checkbox = row.querySelector('input[type="checkbox"]'); 
            if (checkbox && !checkbox.checked) {
                checkbox.click(); 
            }
        }
    },data);

    console.log('Checkbox for the new signer is checked.');

  }
  
await page.waitForSelector('input.btn.btn-success');
  await page.evaluate(() => {
    const submitButton = document.querySelector('input.btn.btn-success');
    if (submitButton) {
  
        submitButton.click();
    }
  });





              }

}


function isNetworkError(error) {
    return ['ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET','ERR_CONNECTION_RESET','ERR_CONNECTION_REFUSED'].includes(error.code);
}

async function retry(fn, retries = 3,page) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if(isNetworkError(error)){
                console.error(`Network error occured : ${error.message} ...Error reloading the script `)
                await page.reload({waitUntil : 'networkidle0' })
            }
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











