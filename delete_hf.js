
const https = require('https');

const options = {
  hostname: 'huggingface.co',
  path: '/api/spaces/HEWJDEWJDBQWJDWEJ/ATLASARCDASHBORD',
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${process.env.HF_TOKEN}`
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

req.end();
