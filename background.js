chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === 'runAutomation') {
        fetch('http://localhost:3000/run-puppeteer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message.data)
        })
        .then(response => response.text())
        .then(result => {
            console.log('Background script: Success:', result);
            sendResponse({ status: 'success', result });
        })
        .catch(error => {
            console.error('Background script: Error:', error);
            sendResponse({ status: 'error', message: error.message });
        });

        // Indicate that the response will be sent asynchronously
        return true;
    }
});
