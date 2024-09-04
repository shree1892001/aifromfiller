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
    origin: ['chrome-extension://kpmpcomcmochjklgamghkddpaenjojhl','http://192.168.1.108:3000','http://192.168.1.108:3001','http://localhost:3000','http://192.168.1.108:3000','http://192.168.1.108:3000','http://192.168.1.108:3001','http://192.168.1.108:3001','http://192.168.1.4:3000'],
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
        // let jsonData = requestPayload.data;
        let jsonData = requestPayload;

        // jsonData=JSON.parse(jsonData)
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
        console.log(jsonData);
        if(jsonData.State.stateFullDesc=="New-York"){
            await handleNy(page,jsonData); 
        }
        else if(jsonData.State.stateFullDesc=="Florida"){
            await handleFL(page,jsonData); 
        }

        async function handleFL(page, data) {
            if(data.orderShortName=='LLC'){

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
            }
          
            if (data.certificateOfStatus) {
              await page.click('#cos_num_flag');
              await randomSleep(1000, 3000);
            }
            if (data.certifiedCopy) {
              await page.click('#cert_num_flag');
              await randomSleep(1000, 3000);
            }
            try{ 

                let legalName =data.llcName; 
                if(legalName.includes("LLC") || legalName.includes("L.L.C.") || legalName.includes("Limited Liability Company")){
          
                await page.type('#corp_name', data.llcName);
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
            await page.type('#princ_addr1', data.principalPlace.address);
            await randomSleep(1000, 3000);
            await page.type('#princ_addr2', data.principalPlace.suite);
            await randomSleep(1000, 3000);
            await page.type('#princ_city', data.principalPlace.city);
            await randomSleep(1000, 3000);
            await page.type('#princ_st', data.principalPlace.state);
            await randomSleep(1000, 3000);
            await page.type('#princ_zip', data.principalPlace.zip);
            await randomSleep(1000, 3000);
            await page.type('#princ_cntry', data.principalPlace.country);
            await randomSleep(1000, 3000);
          
            if (data.mailingAddressSameAsPrincipal) {
              await page.click('#same_addr_flag');
              await randomSleep(1000, 3000);
            } else {
              await page.type('#mail_addr1', data.mailingAddress.address);
              await randomSleep(1000, 3000);
              await page.type('#mail_addr2', data.mailingAddress.suite);
              await randomSleep(1000, 3000);
              await page.type('#mail_city', data.mailingAddress.city);
              await randomSleep(1000, 3000);
              await page.type('#mail_st', data.mailingAddress.state);
              await randomSleep(1000, 3000);
              await page.type('#mail_zip', data.mailingAddress.zip);
              await randomSleep(1000, 3000);
              await page.type('#mail_cntry', data.mailingAddress.country);
              await randomSleep(1000, 3000);
            }
          
            if (data.Registered_Agent.Name.lastName) {
              await page.type('#ra_name_last_name', data.Registered_Agent.Name.lastName);
              await randomSleep(1000, 3000);
              await page.type('#ra_name_first_name', data.Registered_Agent.Name.firstName);
              await randomSleep(1000, 3000);
              await page.type('#ra_name_m_name', data.Registered_Agent.Name.initial);
              await randomSleep(1000, 3000);
              await page.type('#ra_name_title_name', data.Registered_Agent.Name.title);
              await randomSleep(1000, 3000);
              await page.type('#ra_addr1',data.Registered_Agent.Address.RA_Address_Line1)
              await page.type('#ra_addr2',data.Registered_Agent.Address.RA_Address_Line2)
              await page.type('#ra_city',data.Registered_Agent.Address.RA_City)
              await page.type('#ra_zip',data.Registered_Agent.Address.RA_Postal_Code)

            }
            else if(data.Registered_Agent.Name.Corp_Name){
                  await page.type('#ra_name_corp_name',data.Registered_Agent.Name.Corp_Name)
                  await page.type('#ra_addr1',data.Registered_Agent.Address.RA_Address_Line1)
                  await page.type('#ra_addr2',data.Registered_Agent.Address.RA_Address_Line2)
                  await page.type('#ra_city',data.Registered_Agent.Address.RA_City)
                  await page.type('#ra_zip',data.Registered_Agent.Address.RA_Postal_Code)




            }
            await page.type('#ra_signautre',data.Registered_Agent.Name.LastName + data.Registered_Agent.Name.FirstName); 

          
            if (data.purpose) {
              await page.type('#purpose', data.purpose);
              await randomSleep(1000, 3000);
            }
            if(data.Correspondance.Name){

                await page.type('#ret_name',data.Correspondance.Name);
                await page.type('#ret_email_addr',data.Correspondance.Email);
                await page.type('#email_addr_verify',data.Correspondance.Email);
            }
            await page.type('#signature',data.Correspondance.Name);
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

            return { success: true, message: "Name added successfully" };
        }

        
        else if(data.orderShortName=="CORP"){
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
              }
            
              if (data.certificateOfStatus) {
                await page.click('#cos_num_flag');
                await randomSleep(1000, 3000);
              }
              if (data.certifiedCopy) {
                await page.click('#cert_num_flag');
                await randomSleep(1000, 3000);
              }
              try{
              let legalName=data.llcName; 


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
              
            
              await page.type('#princ_addr1', data.principalPlace.address);
              await randomSleep(1000, 3000);
              await page.type('#princ_addr2', data.principalPlace.suite);
              await randomSleep(1000, 3000);
              await page.type('#princ_city', data.principalPlace.city);
              await randomSleep(1000, 3000);
              await page.type('#princ_st', data.principalPlace.state);
              await randomSleep(1000, 3000);
              await page.type('#princ_zip', data.principalPlace.zip);
              await randomSleep(1000, 3000);
              await page.type('#princ_cntry', data.principalPlace.country);
              await randomSleep(1000, 3000);
            
              if (data.mailingAddressSameAsPrincipal) {
                await page.click('#same_addr_flag');
                await randomSleep(1000, 3000);
              } else {
                await page.type('#mail_addr1', data.mailingAddress.address);
                await randomSleep(1000, 3000);
                await page.type('#mail_addr2', data.mailingAddress.suite);
                await randomSleep(1000, 3000);
                await page.type('#mail_city', data.mailingAddress.city);
                await randomSleep(1000, 3000);
                await page.type('#mail_st', data.mailingAddress.state);
                await randomSleep(1000, 3000);
                await page.type('#mail_zip', data.mailingAddress.zip);
                await randomSleep(1000, 3000);
                await page.type('#mail_cntry', data.mailingAddress.country);
                await randomSleep(1000, 3000);
              }
            
              if (data.Registered_Agent.Name.lastName) {
                await page.type('#ra_name_last_name', data.Registered_Agent.Name.lastName);
                await randomSleep(1000, 3000);
                await page.type('#ra_name_first_name', data.Registered_Agent.Name.firstName);
                await randomSleep(1000, 3000);
                await page.type('#ra_name_m_name', data.Registered_Agent.Name.initial);
                await randomSleep(1000, 3000);
                await page.type('#ra_name_title_name', data.Registered_Agent.Name.title);
                await randomSleep(1000, 3000);
                await page.type('#ra_addr1',data.Registered_Agent.Address.RA_Address_Line1)
                await page.type('#ra_addr2',data.Registered_Agent.Address.RA_Address_Line2)
                await page.type('#ra_city',data.Registered_Agent.Address.RA_City)
                await page.type('#ra_zip',data.Registered_Agent.Address.RA_Postal_Code)
  
              }
              else if(data.Registered_Agent.Name.Corp_Name){
                    await page.type('#ra_name_corp_name',data.Registered_Agent.Name.Corp_Name)
                    await page.type('#ra_addr1',data.Registered_Agent.Address.RA_Address_Line1)
                    await page.type('#ra_addr2',data.Registered_Agent.Address.RA_Address_Line2)
                    await page.type('#ra_city',data.Registered_Agent.Address.RA_City)
                    await page.type('#ra_zip',data.Registered_Agent.Address.RA_Postal_Code)
  
  
  
  
              }
              await page.type('#ra_signautre',data.Registered_Agent.Name.LastName + data.Registered_Agent.Name.FirstName); 
  
            
              if (data.purpose) {
                await page.type('#purpose', data.purpose);
                await randomSleep(1000, 3000);
              }
              if(data.Correspondance.Name){
  
                  await page.type('#ret_name',data.Correspondance.Name);
                  await page.type('#ret_email_addr',data.Correspondance.Email);
                  await page.type('#email_addr_verify',data.Correspondance.Email);
              }
              await page.type('#signature',data.Correspondance.Name);
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
        async function handleNy(page,jsonData){
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

async function addDataCorp(page, data) {
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
            nameField.value = data.Payload.Name.CD_Legal_Name;
            if (checkbox) {
                checkbox.checked = data.checked;
            }

            // Trigger form submission
            submitButton.click();
        }, data);

        try {
            // Wait for navigation after form submission
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 50000 });
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
        // If the error message exists, throw an error
       

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
}






async function fillNextPageCorp(page, data) {
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
                document.querySelector('input[name="P3_RA_ADDR1"]').value = data.Payload.Registered_Agent.Address.RA_Address_Line1;
                document.querySelector('input[name="P3_RA_ADDR2"]').value =  data.Payload.Registered_Agent.Address.RA_Address_Line2;
                document.querySelector('input[name="P3_RA_CITY"]').value =  data.Payload.Registered_Agent.Address.RA_City;
                document.querySelector('input[name="P3_RA_POSTAL_CODE"]').value = data.Payload.Registered_Agent.Address.RA_Postal_Code;
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

            document.querySelector('input[name="P4_ORGANIZER_NAME"]').value = data.Payload.Organizer_Information.Organizer_Details.Org_Name;
            document.querySelector('input[name="P4_ORGANIZER_ADDR1"]').value = data.Payload.Organizer_Information.Org_Address.Org_Address_Line1;
            document.querySelector('input[name="P4_ORGANIZER_CITY"]').value = data.Payload.Organizer_Information.Org_Address.Org_City;
            document.querySelector('input[name="P4_ORGANIZER_POSTAL_CODE"]').value = data.Payload.Organizer_Information.Org_Address.Org_Postal_Code;
            document.querySelector('input[name="P4_SIGNATURE"]').value = data.Payload.Organizer_Information.Organizer_Details.Org_Name;

            document.querySelector('#P4_FILER_NAME').value = data.Payload.Organizer_Information.Organizer_Details.Org_Name;
            document.querySelector('#P4_FILER_ADDR1').value = data.Payload.Organizer_Information.Org_Address.Org_Address_Line1;
            document.querySelector('input[name="P4_FILER_CITY"]').value = data.Payload.Organizer_Information.Org_Address.Org_City;
            document.querySelector('input[name="P4_FILER_POSTAL_CODE"]').value = data.Payload.Organizer_Information.Org_Address.Org_Postal_Code;

        }, data);

        console.log("Next page filled.");
        await randomSleep(10000, 220000);


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