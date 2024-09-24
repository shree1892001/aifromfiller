const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use Puppeteer stealth plugin
puppeteer.use(StealthPlugin());

class FormAutomation {
    constructor(formData) {
        this.formData = formData;
    }

    async initialize() {
        this.browser = await puppeteer.launch({ headless: false });
        this.page = await this.browser.newPage();
    }

    async close() {
        await this.browser.close();
    }

    async run() {
        try {
            await this.initialize();
            await this.navigateToFormPage();
            await this.fillForm();
            await this.submitForm();
        } finally {
            await this.close();
        }
    }

    async navigateToFormPage() {
        throw new Error("Method 'navigateToFormPage' must be implemented.");
    }

    async fillForm() {
        throw new Error("Method 'fillForm' must be implemented.");
    }

    async submitForm() {
        await this.page.click(this.selectors.loginButton);
        await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
    }
}

// West Virginia LLC form automation
class WestVirginiaLLCFormAutomation extends FormAutomation {
    constructor(formData) {
        super(formData);
        this.selectors = {
            usernameField: "#base_content_pageContentControl_tbLogin",
            passwordField: "#base_content_pageContentControl_tbPassword",
            loginButton: "#base_content_pageContentControl_ibtnLogIn",
            baseContentMessage: "#base_content_pageContentControl_btnTurnOffMessage", 
            selectaBusiness: "a.nav-link[href=\"#menu2\"]"
        };
    }

    async navigateToFormPage() {
        await this.page.goto("https://onestop.wv.gov/B4WVPublic/", { waitUntil: 'networkidle0' });
        try {
            await this.page.waitForSelector(this.selectors.baseContentMessage, { visible: true, timeout: 10000 });
            await this.page.click(this.selectors.baseContentMessage);
            console.log("Clicked 'Don't Show Again' button.");
        } catch (err) {
            console.log("'Don't Show Again' button not found or already dismissed.");
        }
    }

    async fillForm() {
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });

        await this.page.waitForSelector(this.selectors.usernameField, { visible: true, timeout: 120000 });
        await this.page.type(this.selectors.usernameField, this.formData.UserId);
        await this.page.type(this.selectors.passwordField, this.formData.Password);

        await this.page.waitForSelector(this.selectors.loginButton, { visible: true, timeout: 120000 });
        await this.page.click(this.selectors.loginButton);


        console.log("Logged in successfully.");

        // Navigate to the "Register a Business" section

        await this.page.waitForSelector('ul.submenu .nav-item:nth-child(2) a');
await this.page.click('ul.submenu .nav-item:nth-child(2) a');

        // Handle __doPostBack event using Puppeteer’s evaluate function
        await this.page.evaluate(() => {
            __doPostBack('base$content$pageContentControl$_ctl1', '');
        });

        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
        console.log("PostBack triggered successfully, and navigation completed.");
    }
}

// Main execution logic
(async () => {
    try {
        const formData = {
            EntityType: { orderShortName: "LLC" },
            State: { name: "West Virginia" },
            UserId: "redberyl",
            Password: "yD7?ddG0!$09",
            Field1: "someValue",
            Field2: "anotherValue"
        };

        const automation = new WestVirginiaLLCFormAutomation(formData);
        await automation.run();
        console.log("Form submitted successfully.");
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
})();
