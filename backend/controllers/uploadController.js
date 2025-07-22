import csv from 'csv-parser';
import xlsx from 'xlsx';
import streamifier from 'streamifier';
import { parseString } from 'xml2js';
import AppError from '../utils/appError.js';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';

// Internal schema mapping for alias handling
export const internalSchema = {
  'phone number': ['phone', 'mobile', 'customer_phone', 'msisdn'],
  'paymentHistory': ['payment_history', 'pay_hist'],
  'creditUtilization': ['utilization', 'credit_util'],
  'creditAge': ['credit_age', 'avg_age'],
  'creditMix': ['credit_mix'],
  'inquiries': ['inquiries', 'inquiry_count'],
  'totalDebt': ['debt', 'total_balance'],
  'recentMissedPayments': ['missed', 'late'],
  'recentDefaults': ['defaults'],
  'lastActiveDate': ['last_active'],
  'activeLoanCount': ['loan_count'],
  'oldestAccountAge': ['account_age'],
  'transactionsLast90Days': ['tx90', 'txn_last_90'],
  'onTimePaymentRate': ['on_time_rate', 'payment_accuracy'],
  'onTimeRateLast6Months': ['on_time_6mo'],
  'missedPaymentsLast12': ['missed12'],
  'recentLoanApplications': ['apps'],
  'defaultCountLast3Years': ['default_count'],
  'consecutiveMissedPayments': ['missed_streak'],
  'monthsSinceLastDelinquency': ['delinquency_recency'],
  'loanTypeCounts': ['loan_breakdown']
};

export const requiredFields = ['phone number', 'paymentHistory', 'creditUtilization'];

export function validateRow(row) {
  for (const field of requiredFields) {
    if (row[field] === undefined || row[field] === '') {
      return { valid: false, missing: field };
    }
  }
  return { valid: true };
}

async function detectAndParse(file) {
  const mimeType = file.mimetype;
  const fileName = file.originalname.toLowerCase();

  if (mimeType === 'application/json' || fileName.endsWith('.json')) {
    return JSON.parse(file.buffer.toString());
  }

  if (mimeType.includes('csv') || fileName.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      const results = [];
      streamifier.createReadStream(file.buffer)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  if (mimeType.includes('excel') || mimeType.includes('spreadsheetml') || 
      fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    return rows;
  }

  if (mimeType.includes('xml') || fileName.endsWith('.xml')) {
    return new Promise((resolve, reject) => {
      parseString(file.buffer.toString(), (err, result) => {
        if (err) {
          reject(new Error('Invalid XML format'));
          return;
        }
        
        // Try to extract records from XML
        const records = extractRecordsFromXML(result);
        resolve(records);
      });
    });
  }

  if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
    // Try to parse as CSV first, then as JSON
    try {
      return new Promise((resolve, reject) => {
        const results = [];
        streamifier.createReadStream(file.buffer)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    } catch (error) {
      // If CSV parsing fails, try JSON
      try {
        return JSON.parse(file.buffer.toString());
      } catch (jsonError) {
        throw new Error('Unable to parse text file as CSV or JSON');
      }
    }
  }

  // PDF support
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    // Try pdf-parse first
    try {
      const data = await pdfParse(file.buffer);
      if (data && data.text && data.text.trim().length > 0) {
        const text = data.text;
        // Try to extract table: split by lines, then columns
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          // Heuristic: if first line has multiple columns, treat as headers
          const headerLine = lines[0];
          const headers = headerLine.split(/\s{2,}|,|\t/).map(h => h.trim()).filter(Boolean);
          if (headers.length > 1) {
            const records = lines.slice(1).map(line => {
              const values = line.split(/\s{2,}|,|\t/).map(v => v.trim());
              const record = {};
              headers.forEach((h, i) => {
                record[h] = values[i] || '';
              });
              return record;
            });
            // Only return if at least half the rows have more than one field
            if (records.filter(r => Object.keys(r).length > 1).length > 0.5 * records.length) {
              return records;
            }
          }
        }
        // Try to extract key-value pairs
        const kvPairs = {};
        const kvRegex = /([\w\s]+)[:=]\s*([^\n]+)/g;
        let match;
        while ((match = kvRegex.exec(text)) !== null) {
          const key = match[1].trim();
          const value = match[2].trim();
          kvPairs[key] = value;
        }
        if (Object.keys(kvPairs).length > 0) {
          return [kvPairs];
        }
        // Fallback: return as a single record with all text
        return [{ pdfText: text }];
      }
    } catch (err) {
      // Fallback to OCR below
    }
    // OCR fallback with tesseract.js
    try {
      const { data: { text } } = await Tesseract.recognize(file.buffer, 'eng');
      if (text && text.trim().length > 0) {
        // Try to extract key-value pairs from OCR text
        const kvPairs = {};
        const kvRegex = /([\w\s]+)[:=]\s*([^\n]+)/g;
        let match;
        while ((match = kvRegex.exec(text)) !== null) {
          const key = match[1].trim();
          const value = match[2].trim();
          kvPairs[key] = value;
        }
        if (Object.keys(kvPairs).length > 0) {
          return [kvPairs];
        }
        return [{ pdfText: text }];
      }
    } catch (ocrErr) {
      throw new Error('Failed to extract text from PDF (parser and OCR failed)');
    }
    throw new Error('Unable to extract text from PDF');
  }

  throw new Error('Unsupported file type. Supported formats: JSON, CSV, Excel, XML, TXT, PDF');
}

function extractRecordsFromXML(xmlData) {
  // Common XML structures for credit data
  const possiblePaths = [
    'records.record',
    'data.record',
    'creditData.record',
    'customers.customer',
    'users.user',
    'accounts.account'
  ];

  for (const path of possiblePaths) {
    const records = getNestedValue(xmlData, path);
    if (records && Array.isArray(records)) {
      return records;
    }
  }

  // If no standard structure found, try to flatten the XML
  return flattenXMLToRecords(xmlData);
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key];
  }, obj);
}

function flattenXMLToRecords(xmlData) {
  const records = [];
  
  // Recursively find arrays that might contain records
  function findRecords(obj, path = '') {
    if (Array.isArray(obj)) {
      if (obj.length > 0 && typeof obj[0] === 'object') {
        records.push(...obj);
      }
    } else if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        findRecords(value, `${path}.${key}`);
      }
    }
  }
  
  findRecords(xmlData);
  return records;
}

export async function handleFileUpload(req, res, next) {
  try {
    let parsedData = [];
    // Support JSON payloads with 'records' array
    if (req.body && req.body.records) {
      parsedData = Array.isArray(req.body.records) ? req.body.records : [];
    } else if (req.file) {
      parsedData = await detectAndParse(req.file);
    } else {
      throw new Error('No file or records provided');
    }
    const normalizedRecords = [];
    const errors = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      const normalized = normalizeRow(row, internalSchema);
      // Enforce bankId assignment and validation
      if (req.user && req.user.role === 'lender') {
        normalized.bankId = req.user.bankId;
      } else if (req.user && req.user.role === 'admin') {
        const validBankIds = [
          'CBE', 'DBE', 'AWASH', 'DASHEN', 'ABYSSINIA', 'WEGAGEN', 'NIB', 'HIBRET', 'LION', 'COOP',
          'ZEMEN', 'OROMIA', 'BUNNA', 'BERHAN', 'ABAY', 'ADDIS', 'DEBUB', 'ENAT', 'GADAA', 'HIJRA',
          'SHABELLE', 'SIINQEE', 'TSEHAY', 'AMHARA', 'AHADU', 'GOH', 'AMAN'
        ];
        if (!normalized.bankId || !validBankIds.includes(normalized.bankId)) {
          errors.push({ row: i + 1, error: `Missing or invalid bankId` });
          continue;
        }
      }
      const validation = validateRow(normalized);
      if (validation.valid) {
        normalizedRecords.push(normalized);
      } else {
        errors.push({ row: i + 1, error: `Missing: ${validation.missing}` });
      }
    }

    res.status(200).json({
      success: true,
      validRecords: normalizedRecords.length,
      invalidRecords: errors.length,
      normalizedRecords,
      errors
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    next(new AppError(err.message, 400));
  }
}

export function normalizeRow(row, schema) {
  const normalized = {};

  for (const [targetField, aliases] of Object.entries(schema)) {
    for (const alias of [targetField, ...(aliases || [])]) {
      if (row[alias] !== undefined) {
        normalized[targetField] = row[alias];
        break;
      }
    }
  }

  // Add defaults
  if (!normalized['loanTypeCounts']) normalized['loanTypeCounts'] = {};
  return normalized;
}

export {
  // list all exported functions here
}; 