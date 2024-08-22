document.getElementById('run-script').addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'runpuppeteerScript' });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === 'displayScreenshot') {
        const imgElement = document.getElementById('screenshot');
        imgElement.src = message.screenshotUrl;
    }
});
