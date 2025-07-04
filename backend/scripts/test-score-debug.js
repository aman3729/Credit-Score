import fs from 'fs';
import path from 'path';
import { calculateCreditScore } from '../utils/creditScoring.js';

if (process.argv.length < 3) {
  console.error('Usage: node backend/scripts/test-score-debug.js <input.json>');
  process.exit(1);
}

const inputPath = path.resolve(process.argv[2]);
if (!fs.existsSync(inputPath)) {
  console.error('Input file not found:', inputPath);
  process.exit(1);
}

const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
const record = Array.isArray(inputData) ? inputData[0] : inputData;

console.log('Input record:', JSON.stringify(record, null, 2));

const result = calculateCreditScore(record, { debug: true });

console.log('\n--- Scoring Output ---');
console.log(JSON.stringify(result, null, 2)); 