import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function test() {
  const form = new FormData();
  fs.writeFileSync('test.mp4', 'test content video file bla bla');
  form.append('file', fs.createReadStream('test.mp4'), 'test.mp4');
  form.append('folder', 'test_folder');
  
  const response = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    body: form,
  });
  
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Body:', text.substring(0, 100));
}
test().catch(console.error);
