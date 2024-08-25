// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     if (message.command === 'runpuppeteerScript') {
//         runPuppeteerScript(sendResponse);
//         return true; // Indicate that the response is asynchronous
//     }
// });

// async function runPuppeteerScript(sendResponse) {
//     try {
       
//         const jsonData = await response.json();

//         // Send the data to the second endpoint to run the Puppeteer script
//         const scriptResponse = await fetch('http://192.168.1.35:3000/run-puppeteer', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ requestPayload: jsonData })
//         });

//         if (scriptResponse.ok) {
//             // Expecting the screenshot data in base64 format
//             const screenshotData = await scriptResponse.json();
//             sendResponse({ status: 'success', screenshot: screenshotData.screenshot });
//         } else {
//             sendResponse({ status: 'error', message: 'Failed to execute Puppeteer script.' });
//         }
//     } catch (error) {
//         console.error('Error:', error);
//         sendResponse({ status: 'error', message: error.message });
//     }
// }









chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === 'runpuppeteerScript') {
      const jsonData = message.data; // Extract JSON data from the message
      runPuppeteerScript(jsonData).then(response => {
        sendResponse(response);
      }).catch(error => {
        sendResponse({ status: 'error', message: error.message });
      });
      return true; // Keep the message channel open for asynchronous response
    }
  });
  
  async function runPuppeteerScript(data) {
    try {
      // Forward request to the Puppeteer script API
      const response = await fetch('http://192.168.1.10:3001/run-puppeteer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data) // Send the received JSON data
      });
  
      if (response.ok) {
        const result = await response.json();
        return { status: 'success', message: 'Puppeteer script executed successfully!' };
      } else {
        return { status: 'error', message: 'Failed to execute Puppeteer script.' };
      }
    } catch (error) {
      console.error('Error:', error);
      return { status: 'error', message: error.message };
    }
  }
  





