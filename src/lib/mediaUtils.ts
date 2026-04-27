import imageCompression from 'browser-image-compression';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

const loadFFmpeg = async () => {
  if (ffmpeg) return ffmpeg;
  ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await toBlobURL(`https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm`, 'application/wasm'),
  });
  return ffmpeg;
};

const toBlobURL = async (url: string, mimeType: string) => {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return URL.createObjectURL(new Blob([blob], { type: mimeType }));
};

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: 'image/webp' as any,
    initialQuality: 0.8
  };
  
  try {
    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' });
  } catch (error) {
    console.error('Image compression failed', error);
    return file; // Fallback to original
  }
};

export const compressVideo = async (file: File, onProgress?: (ratio: number) => void): Promise<File> => {
  try {
    const _ffmpeg = await loadFFmpeg();
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';
    
    await _ffmpeg.writeFile(inputName, await fetchFile(file));
    
    if (onProgress) {
      _ffmpeg.on('progress', ({ progress }) => {
        onProgress(progress);
      });
    }

    // -i input.mp4 -vf scale=-1:720 -b:v 1000k -preset fast output.mp4
    await _ffmpeg.exec([
      '-i', inputName,
      '-vf', 'scale=-1:720',
      '-b:v', '1000k',
      '-preset', 'fast',
      outputName
    ]);
    
    const data = await _ffmpeg.readFile(outputName);
    const compressedBlob = new Blob([data], { type: 'video/mp4' });
    
    // Clean up
    await _ffmpeg.deleteFile(inputName);
    await _ffmpeg.deleteFile(outputName);
    if (onProgress) {
        _ffmpeg.off('progress', () => {});
    }

    return new File([compressedBlob], outputName, { type: 'video/mp4' });
  } catch (error) {
    console.error('Video compression failed', error);
    if (file.size > 30 * 1024 * 1024) {
      throw new Error("Video compression failed and the original file is too large (>30MB) to upload directly.");
    }
    return file; // Fallback to original if small enough
  }
};

export const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = function() {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = function() {
      reject(new Error("Invalid video file"));
    };
    video.src = URL.createObjectURL(file);
  });
};

export const getOptimizedMediaUrl = (
  url: string, 
  type: 'video' | 'image', 
  options: {
    asDownload?: boolean;
    isThumbnail?: boolean;
    isLightbox?: boolean;
    videoThumbnail?: string | null;
  } = {}
) => {
  if (!url.includes('res.cloudinary.com')) return url;
  
  // URL structure: https://res.cloudinary.com/<cloud>/video/upload/v12345/folder/file.mp4
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  
  let resourcePath = parts[1];
  let transformations = ['f_auto', 'q_auto:eco'];

  if (type === 'image') {
    if (options.isThumbnail) {
      transformations.push('c_fill,w_400,h_400'); // Crop small for grid
    } else if (options.isLightbox) {
      transformations.push('c_limit,w_1920,h_1920'); // Limit to 1080p screen bounds
    } else {
      transformations.push('c_limit,w_800'); // Default limits
    }
  } else if (type === 'video') {
    if (options.isThumbnail) {
      // Force generating a jpg image instead of video player for the thumbnail
      let offset = options.videoThumbnail || '0';
      transformations = ['c_fill,w_400,h_400', 'f_jpg', 'q_auto:eco', `so_${offset}`];
      // strip extension and add .jpg to be safe, though f_jpg should work
      resourcePath = resourcePath.replace(/\.[^/.]+$/, "") + ".jpg";
    } else {
      transformations.push('vc_auto'); 
      if (options.isLightbox) {
        transformations.push('c_limit,w_1280'); // 720p limit for video lightbox
      } else {
        transformations.push('c_limit,w_800');
      }
    }
  }

  // If serving as an attachment download
  if (options.asDownload) {
    transformations = ['fl_attachment', 'f_auto', 'q_auto']; // Use standard auto quality for downloads
  }
  
  return `${parts[0]}/upload/${transformations.join(',')}/${resourcePath}`;
};
