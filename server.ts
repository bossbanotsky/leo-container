import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import 'dotenv/config';
import fs from 'fs';

const upload = multer({ dest: 'uploads/' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  // API to upload media
  app.post("/api/upload", (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer Error:', err);
        return res.status(400).json({ error: `File upload error: ${err.message}` });
      }
      next();
    });
  }, async (req: express.Request, res: express.Response) => {
    try {
      if (!process.env.VITE_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(500).json({ error: 'Cloudinary credentials are not configured. Please add VITE_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the app settings.' });
      }

      const file = req.file;
      const folder = req.body.folder;
      
      if (!file || !folder) {
        return res.status(400).json({ error: 'File and folder are required' });
      }

      const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';

      // Configure Cloudinary per request to ensure latest env variables are used
      cloudinary.config({
        cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      // Upload to Cloudinary
      let result;
      if (resourceType === 'video') {
        result = await cloudinary.uploader.upload_large(file.path, {
          resource_type: resourceType,
          folder,
          use_filename: false,
          unique_filename: true,
          chunk_size: 6000000 // 6MB chunks
        });
      } else {
        result = await cloudinary.uploader.upload(file.path, {
          resource_type: resourceType,
          folder,
          use_filename: false,
          unique_filename: true,
        });
      }

      // Remove the file from our local disk
      fs.unlinkSync(file.path);

      res.json({ url: result.secure_url });
    } catch (error: any) {
      console.error('Upload Error Details:', error);
      
      // Clean up the file if upload fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      const errorMessage = error?.message || error?.error?.message || 'Upload failed with unknown error';
      res.status(500).json({ error: errorMessage, details: error });
    }
  });

  // API to delete media
  app.post("/api/delete", express.json(), async (req: express.Request, res: express.Response) => {
    try {
      if (!process.env.VITE_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(500).json({ error: 'Cloudinary credentials are not configured.' });
      }

      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      // Extract public_id and resource_type from Cloudinary URL
      const match = url.match(/\/res\.cloudinary\.com\/[^\/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid Cloudinary URL' });
      }

      const resourceType = match[1];
      const publicId = match[2];

      cloudinary.config({
        cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      
      res.json({ success: true, result });
    } catch (error: any) {
      console.error('Delete Error Details:', error);
      res.status(500).json({ error: error.message || 'Delete failed' });
    }
  });

  // API to archive media
  app.post("/api/archive", express.json(), async (req: express.Request, res: express.Response) => {
    try {
      if (!process.env.VITE_CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(500).json({ error: 'Cloudinary credentials are not configured.' });
      }

      const { urls } = req.body;
      if (!urls || !Array.isArray(urls)) {
        return res.status(400).json({ error: 'URLs array is required' });
      }

      cloudinary.config({
        cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const results: Record<string, string> = {};

      for (const url of urls) {
        if (!url) continue;
        const match = url.match(/\/res\.cloudinary\.com\/[^\/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
        if (match) {
          const resourceType = match[1];
          const publicId = match[2];
          
          if (!publicId.startsWith('archived/')) {
            const newPublicId = `archived/${publicId}`;
            try {
              const result = await cloudinary.uploader.rename(publicId, newPublicId, { 
                resource_type: resourceType, 
                overwrite: true,
                invalidate: true
              });
              results[url] = result.secure_url;
            } catch (err) {
              console.error(`Failed to archive ${url}:`, err);
            }
          }
        }
      }
      
      res.json({ success: true, results });
    } catch (error: any) {
      console.error('Archive Error Details:', error);
      res.status(500).json({ error: error.message || 'Archive failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Note: process.cwd() would be where we run `node dist/server.cjs`
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler to always return JSON for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Express Error:', err);
    if (req.path.startsWith('/api/')) {
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    } else {
        next(err);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
