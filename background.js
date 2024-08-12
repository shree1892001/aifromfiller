chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === 'runPuppeteerScript') {
        runPuppeteerScript();
    }
});

async function runPuppeteerScript() {
    try {
        const response = await fetch('http://localhost:3001/get-data',{
                     method:'GET',
                     headers: {
                        'Content-Type': 'application/json'
                    },


        });
        const jsonData = await response.json();

        const scriptResponse = await fetch('http://localhost:3000/run-puppeteer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requestPayload: jsonData })
        });

        if (scriptResponse.ok) {
            console.log('Puppeteer script executed successfully.');
        } else {
            console.error('Failed to execute Puppeteer script.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
