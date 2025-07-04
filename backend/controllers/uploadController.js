import csv from 'csv-parser';
import xlsx from 'xlsx';
import streamifier from 'streamifier';

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

  if (mimeType === 'application/json') {
    return JSON.parse(file.buffer.toString());
  }

  if (mimeType.includes('csv')) {
    return new Promise((resolve, reject) => {
      const results = [];
      streamifier.createReadStream(file.buffer)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  if (mimeType.includes('excel') || mimeType.includes('spreadsheetml')) {
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    return rows;
  }

  throw new Error('Unsupported file type');
}

export async function handleFileUpload(req, res) {
  try {
    const parsedData = await detectAndParse(req.file);
    const normalizedRecords = [];
    const errors = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      const normalized = normalizeRow(row, internalSchema);
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
    res.status(400).json({ success: false, error: err.message });
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