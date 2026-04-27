import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/upload_fake',
  method: 'POST',
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`CONTENT-TYPE: ${res.headers['content-type']}`);
  let responseText = '';
  res.on('data', (chunk) => {
    responseText += chunk;
  });
  res.on('end', () => {
    console.log('BODY:', responseText.substring(0, 100));
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
