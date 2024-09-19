const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://www.nebraska.gov/apps-sos-edocs/', { waitUntil: 'networkidle2' });

    await page.click('#entn');

    await page.waitForSelector('#entity');

    await page.select('#entity', 'DOMESTIC_LIMITED_LIABILITY');

    await page.type('#optclientmemo', 'Your client memo here');

    
    await page.click('#submit');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Form submitted successfully');

    await browser.close();
})();
