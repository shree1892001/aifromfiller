chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'runPuppeteer') {
      // Send the data directly to the Puppeteer server
      fetch('http://localhost:3000/run-puppeteer', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(request.data)
      })
      .then(response => response.text())
      .then(result => console.log(result))
      .catch(error => console.error('Error:', error));
  }
});
