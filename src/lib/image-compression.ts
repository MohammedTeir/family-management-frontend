import compress from 'browser-image-compression';

/**
 * Compresses an image file to reduce its size
 * @param file - The image file to compress
 * @returns A promise that resolves to the compressed file
 */
export const compressImage = async (file: File): Promise<File> => {
  // Define compression options
  const options = {
    maxSizeMB: 1, // Maximum size in MB (reduces from potentially 5+ MB to 1 MB)
    maxWidthOrHeight: 1920, // Maximum width or height
    useWebWorker: true, // Use web worker for better performance
    quality: 0.7, // Quality factor (0-1), where 1 is highest quality
  };

  try {
    // Compress the image
    const compressedFile = await compress(file, options);
    
    // browser-image-compression returns a File object, but with different properties
    // Create a new File with the compressed blob to ensure proper type and metadata
    return new File([compressedFile], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    // If compression fails, return the original file
    return file;
  }
};