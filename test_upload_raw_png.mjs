import http from 'http';

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

const fileContentUrlBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const fileData = Buffer.from(fileContentUrlBase64, 'base64');

const preFile = Buffer.from(
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="folder"\r\n\r\n` +
  `test_folder\r\n` +
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="file"; filename="test.png"\r\n` +
  `Content-Type: image/png\r\n\r\n`
);

const postFile = Buffer.from(`\r\n--${boundary}--\r\n`);

const data = Buffer.concat([preFile, fileData, postFile]);

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
