import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promisify } from 'util';
import AppError from './appError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

// Configure upload directories
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const PROCESSED_DIR = path.join(UPLOAD_DIR, 'processed');
const ERROR_DIR = path.join(UPLOAD_DIR, 'errors');
const TEMPLATE_DIR = path.join(process.cwd(), 'templates');

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

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload-${uniqueSuffix}${ext}`);
  },
});

// File filter for multer
const fileFilter = (req, file, cb) => {
  const filetypes = /\.(csv|json)$/i;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = [
    'text/csv',
    'application/json',
    'application/vnd.ms-excel',
    'text/plain',
    'application/octet-stream'
  ].includes(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  
  const error = new Error('Only .csv and .json files are allowed');
  error.code = 'INVALID_FILE_TYPE';
  return cb(error, false);
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

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
  
  const dir = path.dirname(destination);
  if (!(await existsAsync(dir))) {
    await mkdirAsync(dir, { recursive: true });
  }
  
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(source);
    const writeStream = fs.createWriteStream(destination);
    
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
