import fs from 'fs';
import http from 'http';
import https from 'https';

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

const data = Buffer.from(
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="folder"\r\n\r\n` +
  `test_folder\r\n` +
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="file"; filename="test.txt"\r\n` +
  `Content-Type: text/plain\r\n\r\n` +
  `hello world\r\n` +
  `--${boundary}--\r\n`
);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/upload',
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let responseText = '';
  res.on('data', (chunk) => {
    responseText += chunk;
  });
  res.on('end', () => {
    console.log('BODY:', responseText);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
