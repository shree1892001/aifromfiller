document.getElementById('runScript').addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'runpuppeteerScript' });
});
