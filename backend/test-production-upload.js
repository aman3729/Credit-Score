const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Test data with realistic credit information
const testData = [
  {
    "phone number": "0954880513",
    "paymentHistory": 0.95,
    "creditUtilization": 0.2,
    "creditAge": 0.85,
    "creditMix": 0.7,
    "inquiries": 1,
    "totalDebt": 10000,
    "recentMissedPayments": 1,
    "recentDefaults": 0,
    "lastActiveDate": "2024-12-01",
    "activeLoanCount": 3,
    "oldestAccountAge": 60,
    "transactionsLast90Days": 40,
    "onTimePaymentRate": 0.94,
    "onTimeRateLast6Months": 0.96,
    "missedPaymentsLast12": 1,
    "recentLoanApplications": 2,
    "defaultCountLast3Years": 0,
    "consecutiveMissedPayments": 0,
    "monthsSinceLastDelinquency": 8,
    "loanTypeCounts": { "creditCard": 2, "carLoan": 1 }
  },
  {
    "phone number": "0954880514",
    "paymentHistory": 0.88,
    "creditUtilization": 0.35,
    "creditAge": 0.72,
    "creditMix": 0.6,
    "inquiries": 2,
    "totalDebt": 15000,
    "recentMissedPayments": 0,
    "recentDefaults": 0,
    "lastActiveDate": "2024-12-01",
    "activeLoanCount": 2,
    "oldestAccountAge": 48,
    "transactionsLast90Days": 35,
    "onTimePaymentRate": 0.88,
    "onTimeRateLast6Months": 0.92,
    "missedPaymentsLast12": 0,
    "recentLoanApplications": 1,
    "defaultCountLast3Years": 0,
    "consecutiveMissedPayments": 0,
    "monthsSinceLastDelinquency": 12,
    "loanTypeCounts": { "creditCard": 1, "personalLoan": 1 }
  },
  {
    "phone number": "0954880515",
    "paymentHistory": 0.75,
    "creditUtilization": 0.65,
    "creditAge": 0.45,
    "creditMix": 0.4,
    "inquiries": 4,
    "totalDebt": 25000,
    "recentMissedPayments": 3,
    "recentDefaults": 1,
    "lastActiveDate": "2024-11-15",
    "activeLoanCount": 1,
    "oldestAccountAge": 24,
    "transactionsLast90Days": 15,
    "onTimePaymentRate": 0.75,
    "onTimeRateLast6Months": 0.70,
    "missedPaymentsLast12": 3,
    "recentLoanApplications": 3,
    "defaultCountLast3Years": 1,
    "consecutiveMissedPayments": 2,
    "monthsSinceLastDelinquency": 3,
    "loanTypeCounts": { "creditCard": 1 }
  }
];

// Create test files in different formats
function createTestFiles() {
  const testDir = path.join(__dirname, 'test-production-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  console.log('📁 Creating test files in:', testDir);
  console.log('');

  // 1. JSON file
  const jsonContent = JSON.stringify(testData, null, 2);
  fs.writeFileSync(path.join(testDir, 'credit-data.json'), jsonContent);
  console.log('✅ credit-data.json - Standard JSON format');

  // 2. CSV file
  const csvHeader = Object.keys(testData[0]).join(',');
  const csvRows = testData.map(record => 
    Object.values(record).map(value => 
      typeof value === 'object' ? JSON.stringify(value) : value
    ).join(',')
  );
  const csvContent = [csvHeader, ...csvRows].join('\n');
  fs.writeFileSync(path.join(testDir, 'credit-data.csv'), csvContent);
  console.log('✅ credit-data.csv - Comma-separated values');

  // 3. Excel file (.xlsx)
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(testData);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Credit Data');
  xlsx.writeFile(workbook, path.join(testDir, 'credit-data.xlsx'));
  console.log('✅ credit-data.xlsx - Excel spreadsheet');

  // 4. XML file
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<creditData>
${testData.map(record => `  <record>
${Object.entries(record).map(([key, value]) => 
  `    <${key}>${typeof value === 'object' ? JSON.stringify(value) : value}</${key}>`
).join('\n')}
  </record>`).join('\n')}
</creditData>`;
  fs.writeFileSync(path.join(testDir, 'credit-data.xml'), xmlContent);
  console.log('✅ credit-data.xml - XML format');

  // 5. TXT file (CSV format)
  fs.writeFileSync(path.join(testDir, 'credit-data.txt'), csvContent);
  console.log('✅ credit-data.txt - Text file (CSV format)');

  // 6. Alternative CSV with different field names (to test mapping)
  const alternativeData = testData.map(record => ({
    'customer_phone': record['phone number'],
    'payment_score': record.paymentHistory,
    'credit_usage': record.creditUtilization,
    'account_age': record.creditAge,
    'diversity_score': record.creditMix,
    'credit_checks': record.inquiries,
    'outstanding_amount': record.totalDebt,
    'late_payments': record.recentMissedPayments,
    'charge_offs': record.recentDefaults,
    'last_activity': record.lastActiveDate,
    'open_accounts': record.activeLoanCount,
    'credit_length': record.oldestAccountAge,
    'recent_transactions': record.transactionsLast90Days,
    'timely_payments': record.onTimePaymentRate,
    'recent_payment_rate': record.onTimeRateLast6Months,
    'missed_payments_12mo': record.missedPaymentsLast12,
    'recent_applications': record.recentLoanApplications,
    'defaults_3y': record.defaultCountLast3Years,
    'late_streak': record.consecutiveMissedPayments,
    'delinquency_recency': record.monthsSinceLastDelinquency,
    'account_types': JSON.stringify(record.loanTypeCounts)
  }));
  
  const altCsvHeader = Object.keys(alternativeData[0]).join(',');
  const altCsvRows = alternativeData.map(record => 
    Object.values(record).join(',')
  );
  const altCsvContent = [altCsvHeader, ...altCsvRows].join('\n');
  fs.writeFileSync(path.join(testDir, 'credit-data-alternative.csv'), altCsvContent);
  console.log('✅ credit-data-alternative.csv - Different field names (tests mapping)');

  console.log('');
  console.log('🎯 Test Instructions:');
  console.log('1. Go to Admin Dashboard > Batch Upload');
  console.log('2. Select a partner (e.g., "First National Bank")');
  console.log('3. Create a mapping for the file format you want to test');
  console.log('4. Upload any of the test files above');
  console.log('5. Verify the mapping works and data is scored correctly');
  console.log('');
  console.log('📋 Files created:');
  console.log('  - credit-data.json (standard format)');
  console.log('  - credit-data.csv (CSV format)');
  console.log('  - credit-data.xlsx (Excel format)');
  console.log('  - credit-data.xml (XML format)');
  console.log('  - credit-data.txt (text/CSV format)');
  console.log('  - credit-data-alternative.csv (different field names)');
  console.log('');
  console.log('🔍 Test Scenarios:');
  console.log('  ✓ Standard JSON upload');
  console.log('  ✓ CSV with standard field names');
  console.log('  ✓ Excel spreadsheet upload');
  console.log('  ✓ XML data upload');
  console.log('  ✓ Text file upload');
  console.log('  ✓ CSV with different field names (mapping required)');
  console.log('');
  console.log('⚠️  Remember: All uploads now require a mapping and partner selection!');
}

createTestFiles(); 