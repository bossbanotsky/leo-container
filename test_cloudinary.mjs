import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

async function test() {
  const buffer = Buffer.alloc(10 * 1024 * 1024, 'a'); // 10MB
  fs.writeFileSync('large.mp4', buffer);

  cloudinary.config({
    cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
      const result = await cloudinary.uploader.upload_large('large.mp4', {
          resource_type: 'video',
          folder: 'test_folder',
          use_filename: false,
          unique_filename: true,
          chunk_size: 6000000
      });
      console.log('UPLOAD RESULT:', result);
  } catch (err) {
      console.error('ERROR:', err);
  }
}

test();
