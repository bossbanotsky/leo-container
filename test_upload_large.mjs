import fs from 'fs';
import http from 'http';

const buffer = Buffer.alloc(10 * 1024 * 1024, 'a'); // 10MB
const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

const preFile = Buffer.from(
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="folder"\r\n\r\n` +
  `test_folder\r\n` +
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="file"; filename="large.mp4"\r\n` +
  `Content-Type: video/mp4\r\n\r\n`
);
const postFile = Buffer.from(`\r\n--${boundary}--\r\n`);
const data = Buffer.concat([preFile, buffer, postFile]);

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
    console.log('BODY:', responseText.substring(0, 100));
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
