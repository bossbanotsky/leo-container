import { v2 as cloudinary } from 'cloudinary';

async function test() {
  console.log(typeof cloudinary.uploader.upload_large);
  
  // try passing a callback to Promise-ify it 
  const p = new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large('large.mp4', {
      resource_type: 'video',
    }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}
