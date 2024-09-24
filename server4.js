// Base Class (FormAutomation)
class FormAutomation {
    constructor(page, jsonData) {
        this.page = page;
        this.jsonData = jsonData;
    }

    async performLogin() {
        throw new Error("Method must be implemented by subclass");
    }

    async addDataLLC() {
        throw new Error("Method must be implemented by subclass");
    }

    async addDataCorp() {
        throw new Error("Method must be implemented by subclass");
    }

    async fillNextPage() {
        throw new Error("Method must be implemented by subclass");
    }

    async fillNextPageCorp() {
        throw new Error("Method must be implemented by subclass");
    }
}

// State-Specific Class (NewYorkFormAutomation)
class NewYorkFormAutomation extends FormAutomation {
    constructor(page, jsonData) {
        super(page, jsonData);
    }

    async performLogin() {
        try {
            console.log("Attempting to login...");
            const stateSelectors = loadSelectors(this.jsonData.State.stateFullDesc);
            await this.page.waitForSelector(stateSelectors["New-York"].form, { visible: true, timeout: 120000 });
            await this.page.evaluate((jsonData) => {
                const usernameField = document.querySelector(stateSelectors["New-York"].usernameField);
                const passwordField = document.querySelector(stateSelectors["New-York"].passwordField);
                const submitButton = document.querySelector(stateSelectors["New-York"].submitButton);
                if (!usernameField || !passwordField || !submitButton) {
                    throw new Error("Couldn't find login elements");
                }
                usernameField.value = jsonData.State.filingWebsiteUsername;
                passwordField.value = jsonData.State.filingWebsitePassword;
                submitButton.click();
            }, this.jsonData);
            await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
            console.log('Login successful.');
        } catch (error) {
            console.error("Login failed:", error.message);
            throw error;
        }
    }

    async addDataLLC() {
        try {
            console.log("Attempting to add the name");
            await this.page.waitForSelector('form', { visible: true, timeout: 120000 });
            await this.page.evaluate((jsonData) => {
                const nameField = document.querySelector('input[name="P2_ENTITY_NAME"]');
                const checkbox = document.querySelector('input[name="P2_CHECKBOX"]');
                const submitButton = document.querySelector('button.t-Button--hot');
                if (!nameField || !submitButton) {
                    throw new Error("Couldn't find name field or submit button");
                }
                nameField.value = jsonData.Payload.Name.CD_Legal_Name;
                if (checkbox) {
                    checkbox.checked = true;
                }
                submitButton.click();
            }, this.jsonData);
            await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
            console.log("Name added successfully!");
            await this.fillNextPage();
        } catch (e) {
            console.error("An error occurred:", e.message);
            throw e;
        }
    }

    async addDataCorp() {
        try {
            console.log("Attempting to add the name");
            await this.page.waitForSelector('form', { visible: true, timeout: 120000 });
            await this.page.evaluate((jsonData) => {
                const nameField = document.querySelector('input[name="P2_ENTITY_NAME"]');
                const checkbox = document.querySelector('input[name="P2_CHECKBOX"]');
                const submitButton = document.querySelector('button.t-Button--hot');
                if (!nameField || !submitButton) {
                    throw new Error("Couldn't find name field or submit button");
                }
                let legalName = jsonData.Payload.Name.CD_Legal_Name;
                nameField.value = legalName;
                if (checkbox) {
                    checkbox.checked = true;
                }
                submitButton.click();
            }, this.jsonData);
            await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 120000 });
            console.log("Name added successfully!");
            await this.fillNextPageCorp();
        } catch (e) {
            console.error("An error occurred:", e.message);
            throw e;
        }
    }

    async fillNextPage() {
        try {
            console.log("Filling the next page...");
            await this.page.waitForSelector('div#P4_INITIAL_STATEMENT_CONTAINER', { visible: true, timeout: 30000 });
            await this.page.evaluate((jsonData) => {
                const radioButtons = document.querySelectorAll('input[name="P4_INITIAL_STATEMENT"]');
                if (radioButtons.length > 0) {
                    radioButtons[0].checked = true;
                }
                let legalName = jsonData.Payload.Name.CD_Legal_Name;
                document.querySelector('input[name="P4_ENTITY_NAME"]').value = legalName;
                const dropdown = document.querySelector('#P4_COUNTY');
                const option = Array.from(dropdown.options).find(opt => opt.text === jsonData.Payload.County.CD_County.toUpperCase());
                if (option) {
                    dropdown.value = option.value;
                }
                const effectiveDate = document.querySelector('input#P4_EXISTENCE_OPTION_0');
                const Dissolution_Date = document.querySelector('input#P4_DISSOLUTION_OPTION_0');
                Dissolution_Date.scrollIntoView();
                const liability_statement = document.querySelector('input#P4_LIAB_STATEMENT_0');
                liability_statement.scrollIntoView();
                if (effectiveDate) {
                    effectiveDate.click();
                    const radio1 = document.querySelector("input#P4_EXISTENCE_TYPE_0");
                    const radio2 = document.querySelector("input#P4_EXISTENCE_TYPE_1");
                    if (radio1 && radio1.checked) {
                        radio1.checked = true;
                    } else if (radio2 && radio2.checked) {
                        const effectiveDateInput = document.querySelector('input[name="P4_EXIST_CALENDAR"]');
                        if (effectiveDateInput) {
                            effectiveDateInput.value = jsonData.effectiveDate;
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
                            effectiveDateInput.value = jsonData.effectiveDate;
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
                    document.querySelector('input[name="P4_SOP_NAME"]').value = jsonData.Payload.Name.CD_Alternate_Legal_Name;
                    document.querySelector('input[name="P4_SOP_ADDR1"]').value = jsonData.Payload.Principal_Address.PA_Address_Line1;
                    document.querySelector('input[name="P4_SOP_ADDR2"]').value = jsonData.Payload.Principal_Address.PA_Address_Line2;
                    document.querySelector('input[name="P4_SOP_CITY"]').value = jsonData.Payload.Principal_Address.PA_City;
                    document.querySelector('input[name="P4_SOP_POSTAL_CODE"]').value = jsonData.Payload.Principal_Address.PA_Postal_Code;
                } else if (opt2 && opt2.checked) {
                    const serviceCompanySelect = document.querySelector("#P4_SOP_SERVICE_COMPANY");
                    if (serviceCompanySelect) {
                        serviceCompanySelect.value = "440";
                    }
                    document.querySelector('input[name="P4_SOP_NAME"]').value = jsonData.Payload.Name.CD_Alternate_Legal_Name;
                    document.querySelector('input[name="P4_SOP_ADDR1"]').value = jsonData.Payload.Principal_Address.PA_Address_Line1;
                    document.querySelector('input[name="P4_SOP_ADDR2"]').value = jsonData.Payload.Principal_Address.PA_Address_Line2;
                    document.querySelector('input[name="P4_SOP_CITY"]').value = jsonData.Payload.Principal_Address.PA_City;
                    document.querySelector('input[name="P4_SOP_POSTAL_CODE"]').value = jsonData.Payload.Principal_Address.PA_Postal_Code;
                }
                const agentOpt1 = document.querySelector("input#P4_RA_ADDR_OPTION_0");
                const agentOpt2 = document.querySelector("input#P4_RA_ADDR_OPTION_1");
                if (jsonData.Payload.Registered_Agent) {
                    const check = document.querySelector('#P4_RA_OPTION_0');
                    check.click();
                    if (agentOpt1 && agentOpt1.checked) {
                        document.querySelector('input[name="P4_RA_NAME"]').value = jsonData.Payload.Registered_Agent.RA_Name;
                        document.querySelector('input[name="P4_RA_ADDR1"]').value = jsonData.Payload.Registered_Agent.RA_Address.RA_Address_Line1;
                        document.querySelector('input[name="P4_RA_ADDR2"]').value = jsonData.Payload.Registered_Agent.RA_Address.RA_Address_Line2;
                        document.querySelector('input[name="P4_RA_CITY"]').value = jsonData.Payload.Registered_Agent.RA_Address.RA_City;
                        document.querySelector('input[name="P4_RA_POSTAL_CODE"]').value = jsonData.Payload.Registered_Agent.RA_Address.RA_Postal_Code;
                    } else if (agentOpt2 && agentOpt2.checked) {
                        const registeredAgentSelect = document.querySelector("#P4_RA_SERVICE_COMPANY");
                        if (registeredAgentSelect) {
                            registeredAgentSelect.value = "440";
                        }
                    }
                }
                document.querySelector('input[name="P4_ORGANIZER_NAME"]').value = jsonData.Payload.Organizer_Information.Organizer_Details.Org_Name;
                document.querySelector('input[name="P4_ORGANIZER_ADDR1"]').value = jsonData.Payload.Organizer_Information.Org_Address.Org_Address_Line1;
                document.querySelector('input[name="P4_ORGANIZER_CITY"]').value = jsonData.Payload.Organizer_Information.Org_Address.Org_City;
                document.querySelector('input[name="P4_ORGANIZER_POSTAL_CODE"]').value = jsonData.Payload.Organizer_Information.Org_Address.Org_Postal_Code;
                document.querySelector('input[name="P4_SIGNATURE"]').value = jsonData.Payload.Organizer_Information.Organizer_Details.Org_Name;
                document.querySelector('#P4_FILER_NAME').value = jsonData.Payload.Name.CD_Alternate_Legal_Name;
                document.querySelector('#P4_FILER_ADDR1').value = jsonData.Payload.Organizer_Information.Org_Address.Org_Address_Line1;
                document.querySelector('input[name="P4_FILER_CITY"]').value = jsonData.Payload.Organizer_Information.Org_Address.Org_City;
                document.querySelector('input[name="P4_FILER_POSTAL_CODE"]').value = jsonData.Payload.Organizer_Information.Org_Address.Org_Postal_Code;
            }, this.jsonData);
            console.log("Next page filled.");
            await this.page.hover('button.t-Button--hot');
            await this.page.evaluate(() => {
                const submitButton = document.querySelector('button.t-Button--hot');
                if (submitButton) {
                    submitButton.click();
                }
            });
        } catch (e) {
            console.error("Filling next page failed:", e);
        }
    }

    async fillNextPageCorp() {
        try {
            console.log("Filling the next page...");
            await this.page.waitForSelector('div#P3 _INITIAL_STATEMENT_CONTAINER', { visible: true, timeout: 30000 });
            await this.page.evaluate((jsonData) => {
                const radioButtons = document.querySelectorAll('input[name="P3_INITIAL_STATEMENT"]');
                if (radioButtons.length > 0) {
                    radioButtons[0].checked = true;
                }
                let legalName = jsonData.Payload.Name.CD_Legal_Name;
                document.querySelector('input[name="P3_ENTITY_NAME"]').value = legalName;
                const dropdown = document.querySelector('#P3_COUNTY');
                const option = Array.from(dropdown.options).find(opt => opt.text === jsonData.Payload.County.CD_County.toUpperCase());
                if (option) {
                    dropdown.value = option.value;
                }
                const effectiveDate = document.querySelector('input#P3_EXISTENCE_OPTION_0');
                const Dissolution_Date = document.querySelector('input#P3_DURATION_OPTION_0');
                Dissolution_Date.scrollIntoView();
                const liability_statement = document.querySelector('input#P3_LIAB_STATEMENT_0');
                liability_statement.scrollIntoView();
                if (effectiveDate) {
                    effectiveDate.click();
                    const radio1 = document.querySelector("input#P3_EXISTENCE_TYPE_0");
                    const radio2 = document.querySelector("input#P3_EXISTENCE_TYPE_1");
                    if (radio1 && radio1.checked) {
                        radio1.checked = true;
                    } else if (radio2 && radio2.checked) {
                        const effectiveDateInput = document.querySelector('input[name="P3_EXIST_CALENDAR"]');
                        if (effectiveDateInput) {
                            effectiveDateInput.value = jsonData.effectiveDate;
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
                    const radio1 = document.querySelector("input#P3_DISSOLUTION_TYPE_0");
                    const radio2 = document.querySelector("input#P3_DISSOLUTION_TYPE_1");
                    if (radio1 && radio1.checked) {
                        radio1.checked = true;
                    } else if (radio2 && radio2.checked) {
                        const effectiveDateInput = document.querySelector('input[name="P3_DURATION_CALENDAR"]');
                        if (effectiveDateInput) {
                            effectiveDateInput.value = jsonData.effectiveDate;
                            effectiveDateInput.dispatchEvent(new Event('change', { bubbles: true }));
                            const dateComponent = document.querySelector('#P3_DURATION_CALENDAR');
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
                    document.querySelector('input[name="P3_SOP_NAME"]').value = jsonData.Payload.Name.CD_Alternate_Legal_Name;
                    document.querySelector('input[name="P3_SOP_ADDR1"]').value = jsonData.Payload.Principal_Address.PA_Address_Line1;
                    document.querySelector('input[name="P3_SOP_ADDR2"]').value = jsonData.Payload.Principal_Address.PA_Address_Line2;
                    document.querySelector('input[name="P3_SOP_CITY"]').value = jsonData.Payload.Principal_Address.PA_City;
                    document.querySelector('input[name="P3_SOP_POSTAL_CODE"]').value = jsonData.Payload.Principal_Address.PA_Postal_Code;
                } else if (opt2 && opt2.checked) {
                    const serviceCompanySelect = document.querySelector("#P3_SOP_SERVICE_COMPANY");
                    if (serviceCompanySelect) {
                        serviceCompanySelect.value = "440";
                    }
                    document.querySelector('input[name="P3_SOP_NAME"]').value = jsonData.Payload.Name.CD_Alternate_Legal_Name;
                    document.querySelector('input[name="P3_SOP_ADDR1"]').value = jsonData.Payload.Principal_Address.PA_Address_Line1;
                    document.querySelector('input[name="P3_SOP_ADDR2"]').value = jsonData.Payload.Principal_Address.PA_Address_Line2;
                    document.querySelector('input[name="P3_SOP_CITY"]').value = jsonData.Payload.Principal_Address.PA_City;
                    document.querySelector('input[name="P3_SOP_POSTAL_CODE"]').value = jsonData.Payload.Principal_Address.PA_Postal_Code;
                }
                const agentOpt1 = document.querySelector("input#P3_RA_ADDR_OPTION_0");
                const agentOpt2 = document.querySelector("input#P3_RA_ADDR_OPTION_1");
                if (jsonData.Payload.Registered_Agent) {
                    const check = document.querySelector('#P3_RA_OPTION_0');
                    check.click();
                    if (agentOpt1 && agentOpt1.checked) {
                        document.querySelector('input[name="P3_RA_NAME"]').value = jsonData.Payload.Registered_Agent.RA_Name;
                        document.querySelector('input[name="P3_RA_ADDR1"]').value = jsonData.Payload.Registered_Agent.RA_Address.RA_Address_Line1;
                        document.querySelector('input[name="P3_RA_ADDR2"]').value = jsonData.Payload.Registered_Agent.RA_Address.RA_Address_Line2;
                        document.querySelector('input[name="P3_RA_CITY"]').value = jsonData.Payload.Registered_Agent.RA_Address.RA_City;
                        document.querySelector('input[name="P3_RA_POSTAL_CODE"]').value = jsonData.Payload.Registered_Agent.RA_Address.RA_Postal_Code;
                    } else if (agentOpt2 && agentOpt2.checked) {
                        const registeredAgentSelect = document.querySelector("#P3_RA_SERVICE_COMPANY");
                        if (registeredAgentSelect) {
                            registeredAgentSelect.value = "440";
                        }
                    }
                }
                document.querySelector('input[name="P3_ORGANIZER_NAME"]').value = jsonData.Payload.Organizer_Information.Organizer_Details.Org_Name;
                document.querySelector('input[name="P3_ORGANIZER_ADDR1"]').value = jsonData.Payload.Organizer_Information.Org_Address.Org_Address_Line1;
                document.querySelector('input[name="P3_ORGANIZER_CITY"]').value = jsonData.Payload.Organizer_Information.Org_Address.Org_City;
                document.querySelector('input[name="P3_ORGANIZER_POSTAL_CODE"]').value = jsonData.Payload.Organizer_Information.Org_Address.Org_Postal_Code;
                document.querySelector('input[name="P3_SIGNATURE"]').value = jsonData.Payload.Organizer_Information.Organizer_Details.Org_Name;
                document.querySelector('#P3_FILER_NAME').value = jsonData.Payload.Name.CD_Alternate_Legal_Name;
                document.querySelector('#P3_FILER_ADDR1').value = jsonData.Payload.Organizer_Information.Org_Address.Org_Address_Line1;
                document.querySelector('input[name="P3_FILER_CITY"]').value = jsonData.Payload.Organizer_Information.Org_Address.Org_City;
                document.querySelector('input[name="P3_FILER_POSTAL_CODE"]').value = jsonData.Payload.Organizer_Information.Org_Address.Org_Postal_Code;
            }, this.jsonData);
            console.log ("Next page filled.");
            await this.page.hover('button.t-Button--hot');
            await this.page.evaluate(() => {
                const submitButton = document.querySelector('button.t-Button--hot');
                if (submitButton) {
                    submitButton.click();
                }
            });
        } catch (e) {
            console.error("Filling next page failed:", e);
        }
    }
}

// Factory Method
async function createFormAutomation(page, jsonData) {
    if (jsonData.State.stateFullDesc === "New-York") {
        return new NewYorkFormAutomation(page, jsonData);
    } else {
        throw new Error("Unsupported state");
    }
}

// Main Script
async function runFormAutomation(page, jsonData) {
    const formAutomation = await createFormAutomation(page, jsonData);
    await formAutomation.performLogin();
    if (jsonData.EntityType.orderShortName === 'LLC') {
        await formAutomation.addDataLLC();
    } else if (jsonData.EntityType.orderShortName === 'CORP') {
        await formAutomation.addDataCorp();
    }
    await formAutomation.fillNextPage();
    await formAutomation.fillNextPageCorp();
}

 