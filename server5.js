const puppeteer = require('puppeteer');

(async () => {
  // Launch browser in non-headless mode and open in full screen
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized'],  // Open browser in full screen
  });

  const page = await browser.newPage();
  
  // Set the viewport to full screen dimensions
  const { width, height } = await page.evaluate(() => {
    return { width: window.screen.width, height: window.screen.height };
  });
  await page.setViewport({ width, height });
  
  // Navigate to the page containing the login button
  await page.goto('https://icis.corp.delaware.gov/ecorp2/');

  try {
    // Wait for the login link to be available in the DOM
    await page.waitForSelector('a[routerlink="/account/login"]', { visible: true, timeout: 60000 });
    
    // Click the login link
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

    // Wait for the username and password fields on the new form
    await page.waitForSelector('input[formcontrolname="userName"]', { visible: true });
    await page.waitForSelector('input[formcontrolname="password"]', { visible: true });

    // Fill in the username and password fields
    const username = 'redberyltech';  // Replace with actual username
    const password = 'RedBeryl@123';  // Replace with actual password
    
    await page.type('input[formcontrolname="userName"]', username);
    await page.type('input[formcontrolname="password"]', password);
    
    console.log('Filled in login credentials');

    // Wait until the button is no longer disabled (it might become enabled after filling the fields)
    await page.waitForFunction(() => {
      const button = document.querySelector('button[type="submit"]');
      return button && !button.disabled;
    });

    // Submit the form by clicking the button
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('Login successful, redirected to dashboard or other page');

    // Wait for the first link element to load
    await page.waitForSelector('.service-item a', { visible: true });

    // Click the first link with class "service-link"
    try {
      const firstLink = await page.$('.service-item a');
      if (firstLink) {
        await firstLink.click();
        console.log('Clicked the first link');
        
        // Wait for the dialog to appear (if applicable)
        const dialogSelector = 'div[role="dialog"]';
        const closeButtonSelector = 'button.k-button.k-primary';
        
        const dialog = await page.waitForSelector(dialogSelector, { visible: true, timeout: 5000 }).catch(() => null);
        
        if (dialog) {
          console.log('Dialog appeared');
          
          // Close the dialog by clicking the "Close" button
          await page.click(closeButtonSelector);
          console.log('Closed the dialog');
        } else {
          console.log('No dialog appeared');
        }

        // Optionally, wait for navigation after the link click
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log('Redirected to the first link\'s destination');
      } else {
        throw new Error('No links found on the page');
      }
    } catch (error) {
      console.error('Error during link click operation:', error.message);
    }

  } catch (error) {
    console.error('Error during operation:', error);
  }

  // Close the browser (optional)
  // await browser.close();
})();
