
const https = require('https');

const data = JSON.stringify({
  type: 'space',
  name: 'HEWJDEWJDBQWJDWEJ/ATLASARCDASHBORD'
});

const options = {
  hostname: 'huggingface.co',
  path: '/api/repos/delete',
  method: 'POST', // Repos delete is often a POST with DELETE method override or just POST
  headers: {
    'Authorization': `Bearer ${process.env.HF_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(data);
req.end();
