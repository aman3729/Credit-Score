import mongoose from 'mongoose';
import CreditScore from '../models/CreditScore.js';
import LoanDecision from '../models/LoanDecision.js';
import User from '../models/User.js';
import { Parser as Json2csvParser } from 'json2csv';
import xlsx from 'xlsx';
import fs from 'fs';

async function exportRegulatoryReport(month, year, format = 'csv') {
  // Connect to DB if needed
  // await mongoose.connect(...);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const scores = await CreditScore.find({ uploadedAt: { $gte: start, $lt: end } });
  const decisions = await LoanDecision.find({ timestamp: { $gte: start, $lt: end } });
  // Anonymize and aggregate
  const data = decisions.map(d => ({
    score: d.creditScore,
    decision: d.decision?.decision,
    reason: d.decision?.reasons?.[0] || '',
    timestamp: d.timestamp
  }));
  if (format === 'csv') {
    const parser = new Json2csvParser();
    const csv = parser.parse(data);
    fs.writeFileSync('regulatory_report.csv', csv);
  } else if (format === 'xlsx') {
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Report');
    xlsx.writeFile(wb, 'regulatory_report.xlsx');
  } else if (format === 'json') {
    fs.writeFileSync('regulatory_report.json', JSON.stringify(data, null, 2));
  }
  // Add PDF export if needed
  console.log('Report exported.');
}

// Usage: node export-regulatory-report.js 7 2025 csv
const [,, month, year, format] = process.argv;
exportRegulatoryReport(Number(month), Number(year), format || 'csv'); 