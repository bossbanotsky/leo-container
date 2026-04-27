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
          reject(new Error('Failed to parse response JSON'));
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
