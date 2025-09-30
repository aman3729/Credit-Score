import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

const MAX_FILE_SIZE = process.env.UPLOAD_MAX_BYTES
  ? parseInt(process.env.UPLOAD_MAX_BYTES, 10)
  : 10 * 1024 * 1024;

const allowedMimes = [
  'application/pdf',
  'text/csv',
  'text/x-csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/json',
  'application/x-json'
];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const baseMime = (file.mimetype || '').split(';')[0].toLowerCase();
    const permissiveMimes = new Set([
      ...allowedMimes,
      'application/octet-stream', // common for generic uploads
      'text/plain'                // some clients use this for CSV/JSON
    ]);
    if (!permissiveMimes.has(baseMime)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  },
});

async function validateFileBuffer(req, res, next) {
  try {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) files.push(...req.files);

    if (files.length === 0) return next();

    for (const file of files) {
      if (!file.buffer) continue;

      const ft = await fileTypeFromBuffer(file.buffer);
      if (!ft) {
        const mime = (file.mimetype || '').split(';')[0].toLowerCase();
        const bufStr = file.buffer.toString('utf8').trimStart();

        if (mime === 'application/json') {
          const startsLikeJson = bufStr.startsWith('{') || bufStr.startsWith('[');
          if (!startsLikeJson) {
            return res.status(400).json({ error: 'JSON content not detected' });
          }
          try {
            JSON.parse(bufStr);
          } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON content' });
          }
        }
        else if (mime === 'text/csv' || mime === 'text/x-csv' || mime === 'application/vnd.ms-excel') {
          const hasNewline = /\r?\n/.test(bufStr);
          const hasDelimiter = /[,;\t]/.test(bufStr);
          if (!hasNewline || !hasDelimiter) {
            return res.status(400).json({ error: 'CSV content not detected' });
          }
        }
        else if (!allowedMimes.includes(mime)) {
          return res.status(400).json({ error: 'Unable to determine file type' });
        }
      }
      else if (!allowedMimes.includes(ft.mime)) {
        return res.status(400).json({ error: 'File content does not match allowed types' });
      }

      // Add AV scanning here if needed
      // await scanWithClamAV(file.buffer);
      
      file.safeBuffer = file.buffer;
    }

    next();
  } catch (err) {
    next(err);
  }
}

export const uploadSingle = (fieldName = 'file') => [
  upload.single(fieldName),
  validateFileBuffer
];

export const uploadArray = (fieldName = 'files', maxCount = 5) => [
  upload.array(fieldName, maxCount),
  validateFileBuffer
];

export const uploadSingleRaw = (fieldName = 'file') => [
  upload.single(fieldName)
];

export { allowedMimes, MAX_FILE_SIZE };
export default upload;