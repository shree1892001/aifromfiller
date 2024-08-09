document.getElementById('fetchDataButton').addEventListener('click', () => {
    fetch('http://localhost:3000/run-puppeteer', {  // Replace with your Puppeteer server's URL
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ /* You can pass any required data here */ })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('name').value = data.name;
        document.getElementById('email').value = data.email;
        document.getElementById('address').value = data.address;
    })
    .catch(error => console.error('Error fetching data:', error));
});
