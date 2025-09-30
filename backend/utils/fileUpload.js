import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promisify } from 'util';
import AppError from './appError.js';
import { uploadSingle, uploadArray } from '../middleware/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

// Configure upload directories
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const PROCESSED_DIR = path.join(UPLOAD_DIR, 'processed');
const ERROR_DIR = path.join(UPLOAD_DIR, 'errors');
const TEMPLATE_DIR = path.join(process.cwd(), 'templates');

// Path validation function to prevent path traversal
const validateAndSanitizePath = (filePath, allowedDir) => {
  // Resolve the path to get absolute path
  const resolvedPath = path.resolve(filePath);
  const allowedDirResolved = path.resolve(allowedDir);
  
  // Check if the resolved path is within the allowed directory
  if (!resolvedPath.startsWith(allowedDirResolved)) {
    throw new Error('Path traversal detected');
  }
  
  // Normalize the path to remove any .. or . segments
  const normalizedPath = path.normalize(resolvedPath);
  
  // Double-check the normalized path is still within allowed directory
  if (!normalizedPath.startsWith(allowedDirResolved)) {
    throw new Error('Path traversal detected after normalization');
  }
  
  return normalizedPath;
};

// Ensure all required directories exist
const ensureDirectories = async () => {
  for (const dir of [UPLOAD_DIR, PROCESSED_DIR, ERROR_DIR, TEMPLATE_DIR]) {
    if (!(await existsAsync(dir))) {
      await mkdirAsync(dir, { recursive: true });
    }
  }
};

// Initialize directories
ensureDirectories().catch(console.error);

// DEPRECATED: Disk-based multer setup removed in favor of hardened middleware in '../middleware/upload.js'.
// Provide a backward-compatible facade exposing single/array that return the hardened middleware arrays.
const upload = {
  single: (fieldName = 'file') => uploadSingle(fieldName),
  array: (fieldName = 'files', maxCount = 5) => uploadArray(fieldName, maxCount)
};

// Error handler for file uploads
const handleUploadError = (err, req, res, next) => {
  if (err) {
    console.error('File upload error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size is 10MB.', 400));
    }
    
    if (err.code === 'INVALID_FILE_TYPE' || err.message.includes('file type')) {
      return next(new AppError('Invalid file type. Only .csv and .json files are allowed.', 400));
    }
    
    return next(new AppError('Error uploading file', 500, {
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    }));
  }
  
  next();
};

// Move file to a different directory
const moveFile = async (source, destination) => {
  await ensureDirectories();
  
  // Validate and sanitize paths
  const validatedSource = validateAndSanitizePath(source, process.cwd());
  const validatedDestination = validateAndSanitizePath(destination, process.cwd());
  
  const dir = path.dirname(validatedDestination);
  if (!(await existsAsync(dir))) {
    await mkdirAsync(dir, { recursive: true });
  }
  
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(validatedSource);
    const writeStream = fs.createWriteStream(validatedDestination);
    
    const onError = (error) => {
      readStream.destroy();
      writeStream.destroy();
      reject(error);
    };
    
    readStream.on('error', onError);
    writeStream.on('error', onError);
    
    writeStream.on('finish', () => {
      // Delete the original file after successful move
      fs.unlink(source, (err) => {
        if (err) console.error('Error deleting original file:', err);
        resolve(destination);
      });
    });
    
    readStream.pipe(writeStream);
  });
};

export {
  UPLOAD_DIR,
  PROCESSED_DIR,
  ERROR_DIR,
  TEMPLATE_DIR,
  upload,
  handleUploadError,
  moveFile,
  ensureDirectories
};
