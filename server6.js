if(data.stateFullDesc == 'Florida'){
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

    await page.type('#princ_zip', data.Payload.Principal_Address.PA_Zip_Code);
    await randomSleep(1000, 3000);

    await page.waitForSelector("#princ_cntry");

    await page.type('#princ_cntry', data.Payload.Principal_Address.PA_Country);
    await randomSleep(1000, 3000);
  
    // if (data.Payload.Shipping_Address.SH_Address_Line1 === data.Payload.Principal_Address.PA_Address_Line1) {
    //   await page.waitForSelector('#same_addr_flag');
    //   await page.click('#same_addr_flag');
    //   await randomSleep(1000, 3000);
    // } else if(data.Payload.Shipping_Address.SH_Address_Line1) {
    //   await page.waitForSelector("#mail_addr1");

    //   await page.type('#mail_addr1', data.Payload.Shipping_Address.SH_Address_Line1);
    //   await randomSleep(1000, 3000);
    //   await page.waitForSelector("#mail_addr2");

    //   await page.type('#mail_addr2', data.Payload.Shipping_Address.SH_Address_Line2);
    //   await randomSleep(1000, 3000);
    //   await page.waitForSelector("#mail_city");

    //   await page.type('#mail_city', data.Payload.Shipping_Address.SH_City);
    //   await randomSleep(1000, 3000);
    //   await page.waitForSelector("#mail_st");

    //   await page.type('#mail_st', data.Payload.Shipping_Address.SH_Address_Line1);
    //   await randomSleep(1000, 3000);

    //   await page.waitForSelector("#mail_zip");

    //   await page.type('#mail_zip', data.Payload.Shipping_Address.SH_State);
    //   await randomSleep(1000, 3000);

    //   await page.waitForSelector("#mail_cntry");

    //   await page.type('#mail_cntry', data.Payload.Shipping_Address.SH_Country);
    //   await randomSleep(1000, 3000);
    // }

    if (data.Payload.Incorporator_Information.Address.Inc_Address_Line1 === data.Payload.Principal_Address.PA_Address_Line1) {
      await page.waitForSelector('#same_addr_flag');
      await page.click('#same_addr_flag');
      await randomSleep(1000, 3000);
    } else if(data.Payload.Incorporator_Information.Address.Inc_Address_Line1) {
      await page.waitForSelector("#mail_addr1");

      await page.type('#mail_addr1', data.Payload.Incorporator_Information.Address.Inc_Address_Line1);
      await randomSleep(1000, 3000);
      await page.waitForSelector("#mail_addr2");

      await page.type('#mail_addr2', data.Payload.Incorporator_Information.Address.Inc_Address_Line2);
      await randomSleep(1000, 3000);
      await page.waitForSelector("#mail_city");

      await page.type('#mail_city', data.Payload.Incorporator_Information.Address.Inc_City);
      await randomSleep(1000, 3000);
      await page.waitForSelector("#mail_st");

      await page.type('#mail_st', data.Payload.Incorporator_Information.Address.Inc_State);
      await randomSleep(1000, 3000);

      await page.waitForSelector("#mail_zip");

      await page.type('#mail_zip', data.Payload.Incorporator_Information.Address.Inc_Postal_Code);
      await randomSleep(1000, 3000);

      await page.waitForSelector("#mail_cntry");

      await page.type('#mail_cntry', data.Payload.Incorporator_Information.Address.Inc_Country);
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
    if(data.Payload.Officer_Information){
    await page.type('#off1_name_title', data.Payload.Officer_Information.Officer_Details.Off_Title);

    let name=data.Payload.Officer_Information.Off_Name.split(" ");
    await page.type('#off1_name_last_name', name[1]);
    await page.type('#off1_name_first_name', name[0]);
  // await page.type('#off1_name_m_name', data.Manager.Name.MidInitial1);
   

   await page.type('#off1_name_addr1', data.Payload.Officer_Information.Address.Of_Address_Line1);
   await page.type('#off1_name_city', data.Payload.Officer_Information.Address.Of_City);
   await page.type('#off1_name_st', data.Payload.Officer_Information.Address.Of_State);
   await page.type('#off1_name_zip', data.Payload.Officer_Information.Address.Of_Postal_Code);
   await page.type('#off1_name_cntry', data.Payload.Officer_Information.Address.Of_Country)

    }
    await page.waitForSelector('input[name="submit"]', { visible: true, timeout: 60000 });


await page.evaluate(() => {
      document.querySelector('input[name="submit"]').submit();
    });
  
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
    console.log('Form submitted successfully');
    await randomSleep(100000,300000); 

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
      }else{await page.waitForSelector("#corp_name");}
    
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

    await page.type('#princ_zip', data.Payload.Principal_Address.PA_Zip_Code);
    await randomSleep(1000, 3000);

    await page.waitForSelector("#princ_cntry");

    await page.type('#princ_cntry', data.Payload.Principal_Address.PA_Country);
    await randomSleep(1000, 3000);
    
    if (data.Payload.Incorporator_Information.Address.Inc_Address_Line1 === data.Payload.Principal_Address.PA_Address_Line1) {
      await page.waitForSelector('#same_addr_flag');
      await page.click('#same_addr_flag');
      await randomSleep(1000, 3000);
    } else if(data.Payload.Incorporator_Information.Address.Inc_Address_Line1) {
      await page.waitForSelector("#mail_addr1");

      await page.type('#mail_addr1', data.Payload.Incorporator_Information.Address.Inc_Address_Line1);
      await randomSleep(1000, 3000);
      await page.waitForSelector("#mail_addr2");

      await page.type('#mail_addr2', data.Payload.Incorporator_Information.Address.Inc_Address_Line2);
      await randomSleep(1000, 3000);
      await page.waitForSelector("#mail_city");

      await page.type('#mail_city', data.Payload.Incorporator_Information.Address.Inc_City);
      await randomSleep(1000, 3000);
      await page.waitForSelector("#mail_st");

      await page.type('#mail_st', data.Payload.Incorporator_Information.Address.Inc_State);
      await randomSleep(1000, 3000);

      await page.waitForSelector("#mail_zip");

      await page.type('#mail_zip', data.Payload.Incorporator_Information.Address.Inc_Postal_Code);
      await randomSleep(1000, 3000);

      await page.waitForSelector("#mail_cntry");

      await page.type('#mail_cntry', data.Payload.Incorporator_Information.Address.Inc_Country);
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
      if(data.Payload.Officer_Information){
        await page.type('#off1_name_title', data.Payload.Officer_Information.Officer_Details.Off_Title);

        let name=data.Payload.Officer_Information.Off_Name.split(" ");
        await page.type('#off1_name_last_name', name[1]);
        await page.type('#off1_name_first_name', name[0]);
      // await page.type('#off1_name_m_name', data.Manager.Name.MidInitial1);
       

       await page.type('#off1_name_addr1', data.Payload.Officer_Information.Address.Of_Address_Line1);
       await page.type('#off1_name_city', data.Payload.Officer_Information.Address.Of_City);
       await page.type('#off1_name_st', data.Payload.Officer_Information.Address.Of_State);
       await page.type('#off1_name_zip', data.Payload.Officer_Information.Address.Of_Postal_Code);
       await page.type('#off1_name_cntry', data.Payload.Officer_Information.Address.Of_Country)

        }
    
      
      await page.waitForSelector('input[name="submit"]', { visible: true, timeout: 60000 });

    await page.evaluate(() => {
        document.querySelector('input[name="submit"]').submit();
      });
    
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
      console.log('Form submitted successfully');

      await randomSleep(100000,300000);

   return errorResponse;
}

}