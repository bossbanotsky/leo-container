export const uploadMedia = async (file: File, folder: string, onProgress?: (progress: number) => void): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url);
        } catch (e) {
          console.error("Failed to parse response JSON. Raw response Text:", xhr.responseText);
          reject(new Error('Failed to parse response JSON: ' + xhr.responseText.substring(0, 50)));
        }
      } else {
        let errorMessage = `Upload failed (${xhr.status})`;
        try {
          const contentType = xhr.getResponseHeader('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.error || errorMessage;
          } else {
            if (xhr.status === 413) {
              errorMessage = 'File is too large completely! Ensure video is < 30MB or compress it before uploading.';
            } else {
              errorMessage = `Server error: ${xhr.status}. Try a smaller file.`;
            }
            console.error('Non-JSON error from server:', xhr.responseText.substring(0, 500));
          }
        } catch (e) {
          // Ignore parsing errors
        }
        reject(new Error(errorMessage));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during file upload'));
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
};

export const getVideoVersions = (originalUrl: string, thumbnailUrl?: string | null) => {
  // Cloudinary URL format: https://res.cloudinary.com/[cloud_name]/video/upload/[transformations]/[version]/[public_id].[ext]
  // We want to transform:
  // Playback: f_auto,q_auto,w_854 (480p)
  // Download: f_auto,q_auto:good,w_1280,h_720,c_limit (720p)

  if (!originalUrl.includes('cloudinary.com')) {
    return {
      originalUrl,
      playbackUrl: originalUrl,
      downloadUrl: originalUrl,
      thumbnailUrl
    };
  }

  // Find the 'upload/' part
  const uploadPart = '/upload/';
  const index = originalUrl.indexOf(uploadPart);
  
  if (index === -1) {
    return {
      originalUrl,
      playbackUrl: originalUrl,
      downloadUrl: originalUrl,
      thumbnailUrl
    };
  }

  const base = originalUrl.substring(0, index + uploadPart.length);
  const rest = originalUrl.substring(index + uploadPart.length);

  return {
    originalUrl,
    playbackUrl: `${base}f_auto,q_auto,w_854/${rest}`,
    downloadUrl: `${base}f_auto,q_auto:good,w_1280,h_720,c_limit/${rest}`,
    thumbnailUrl
  };
};

export const deleteMedia = async (url: string): Promise<void> => {
  const response = await fetch('/api/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    let errorMessage = `Delete failed (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch(e) {
      // Ignore
    }
    throw new Error(errorMessage);
  }
};

export const archiveMedia = async (urls: string[]): Promise<Record<string, string>> => {
  if (!urls || urls.length === 0) return {};

  const response = await fetch('/api/archive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urls }),
  });

  if (!response.ok) {
    let errorMessage = `Archive failed (${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch(e) {
      // Ignore
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.results || {};
};

