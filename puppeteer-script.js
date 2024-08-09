const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const port = 3000; // Port for the Puppeteer server

app.use(express.json());

app.post('/run-puppeteer', async (req, res) => {
    const data = req.body;

    let browser;
    try {
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        // Navigate to the form page
        await page.goto('https://example.com/form', { waitUntil: 'networkidle0' });

        // Fill out the form based on data
        await page.type('input[name="field1"]', data.nameField);
        await page.type('input[name="field2"]', data.checked ? 'Checked' : 'Unchecked');

        // Add more interactions as needed based on your form and data

        // Submit the form
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        res.status(200).send('Form filled successfully');
    } catch (error) {
        console.error('Puppeteer script error:', error);
        res.status(500).send('Error filling form');
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
