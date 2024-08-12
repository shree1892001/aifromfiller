const express = require('express');
const app = express();
const port = 300;

// Sample JSON data (you can replace this with your actual data source)
const jsonData = {
        "nameField": "505050jar llc",
        "checked": true,
        "sop": {
            "name": "John Doe",
            "addr1": "123 Main Street",
            "addr2": "Suite 456",
            "city": "Albany",
            "postal_code": "11557"
        },
        "organizer": {
            "name": "Alex Englard",
            "addr1": "301 Mill Road, Suite U-5",
            "city": "Hewlett",
            "postal_code": "11557",
            "signature": "alex englard"
        },
        "filer": {
            "name": "Alex Englard",
            "addr1": "301 Mill Road, Suite U-5",
            "city": "Hewlett",
            "postal_code": "11557"
        },
        "registeredAgent": {
            "name": "Registered Agent Name",
            "addr1": "Agent Address 1",
            "addr2": "Agent Address 2",
            "city": "Agent City",
            "postal_code": "Agent Postal Code"
        }
    };

// Endpoint to get data
app.get('/get-data', (req, res) => {
    // Respond with the sample data
    res.status(200).json(sampleData);
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
