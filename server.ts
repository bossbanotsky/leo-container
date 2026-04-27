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
