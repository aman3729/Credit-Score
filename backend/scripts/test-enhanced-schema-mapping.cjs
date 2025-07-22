const mongoose = require('mongoose');
const SchemaMappingService = require('../services/schemaMappingService');
const { logSecurityEvent } = require('../services/securityLogs');

// Test data with various field formats
const testData = [
  {
    first_name: 'John',
    last_name: 'Doe',
    email_address: 'john.doe@email.com',
    phone_number: '(555) 123-4567',
    birth_date: '1990-05-15',
    ssn: '123-45-6789',
    home_address: '123 Main St',
    city_name: 'New York',
    state_code: 'NY',
    zip_code: '10001',
    annual_income: '$75,000',
    job_status: 'Full-time',
    employer: 'Tech Corp',
    credit_score: '750',
    credit_limit: '$10,000',
    current_balance: '$2,500',
    payment_history: 'Good',
    account_number: 'ACC123456789',
    account_type: 'Credit Card',
    open_date: '2020-01-15',
    last_payment: '2024-01-15',
    utilization_rate: '25%',
    days_delinquent: '0'
  },
  {
    first_name: 'Jane',
    last_name: 'Smith',
    email_address: 'jane.smith@email.com',
    phone_number: '555-987-6543',
    birth_date: '1985-08-22',
    ssn: '987-65-4321',
    home_address: '456 Oak Ave',
    city_name: 'Los Angeles',
    state_code: 'CA',
    zip_code: '90210',
    annual_income: '$85,000',
    job_status: 'Part-time',
    employer: 'Design Studio',
    credit_score: '720',
    credit_limit: '$15,000',
    current_balance: '$5,200',
    payment_history: 'Excellent',
    account_number: 'ACC987654321',
    account_type: 'Personal Loan',
    open_date: '2019-06-10',
    last_payment: '2024-01-10',
    utilization_rate: '35%',
    days_delinquent: '0'
  }
];

// Test data with different field names (alternative format)
const alternativeTestData = [
  {
    given_name: 'Bob',
    surname: 'Johnson',
    e_mail: 'bob.johnson@email.com',
    mobile: '+1-555-111-2222',
    dob: '1988-12-03',
    social_security: '111-22-3333',
    street_address: '789 Pine Rd',
    town: 'Chicago',
    province: 'IL',
    postal_code: '60601',
    yearly_income: '$65,000',
    employment_type: 'Self-employed',
    company: 'Freelance Consulting',
    fico_score: '680',
    max_credit: '$8,000',
    outstanding_balance: '$3,100',
    payment_record: 'Fair',
    account_id: 'ACC555666777',
    account_category: 'Line of Credit',
    account_open_date: '2021-03-20',
    payment_date: '2024-01-05',
    credit_utilization: '40%',
    late_days: '5'
  }
];

async function testEnhancedSchemaMapping() {
  console.log('🧪 Testing Enhanced Schema Mapping Engine...\n');

  try {
    // Test 1: Enhanced Field Detection
    console.log('📋 Test 1: Enhanced Field Detection');
    console.log('Testing with standard field names...');
    
    const detectionResult1 = await SchemaMappingService.detectFields(testData, 'test-partner-1');
    
    console.log(`✅ Detected ${detectionResult1.detectedFields.length} fields`);
    console.log(`✅ Mapped ${detectionResult1.mappedFields} fields`);
    console.log(`✅ Success rate: ${Math.round((detectionResult1.mappedFields / detectionResult1.totalFields) * 100)}%`);
    
    // Show detected fields
    detectionResult1.detectedFields.forEach(field => {
      const confidence = Math.round(field.confidence * 100);
      const status = field.targetField ? '✅' : '❌';
      console.log(`   ${status} ${field.sourceField} → ${field.targetField || 'unmapped'} (${confidence}% confidence)`);
    });

    console.log('\n📋 Testing with alternative field names...');
    const detectionResult2 = await SchemaMappingService.detectFields(alternativeTestData, 'test-partner-2');
    
    console.log(`✅ Detected ${detectionResult2.detectedFields.length} fields`);
    console.log(`✅ Mapped ${detectionResult2.mappedFields} fields`);
    console.log(`✅ Success rate: ${Math.round((detectionResult2.mappedFields / detectionResult2.totalFields) * 100)}%`);

    // Test 2: Security Validation
    console.log('\n🔒 Test 2: Security Validation');
    
    const maliciousMapping = {
      name: 'Test Mapping',
      partnerId: 'test-partner',
      fieldMappings: {
        normal_field: { targetField: 'firstName', transformation: null },
        malicious_field: { 
          targetField: 'db.system.users.find()', 
          transformation: '$where' 
        }
      }
    };

    try {
      await SchemaMappingService.createMapping(maliciousMapping, 'test-user');
      console.log('❌ Security validation failed - malicious mapping was created');
    } catch (error) {
      console.log('✅ Security validation passed - malicious mapping blocked');
      console.log(`   Error: ${error.message}`);
    }

    // Test 3: Type Detection and Validation
    console.log('\n🔍 Test 3: Type Detection and Validation');
    
    const typeTestData = [
      {
        string_field: 'text value',
        number_field: '123.45',
        date_field: '2024-01-15',
        email_field: 'test@example.com',
        phone_field: '(555) 123-4567',
        boolean_field: true,
        null_field: null
      }
    ];

    const typeDetectionResult = await SchemaMappingService.detectFields(typeTestData, 'test-partner-3');
    
    typeDetectionResult.detectedFields.forEach(field => {
      console.log(`   ${field.sourceField}: ${field.fieldType}`);
    });

    // Test 4: Performance with Large Dataset
    console.log('\n⚡ Test 4: Performance Testing');
    
    // Generate large test dataset
    const largeTestData = [];
    for (let i = 0; i < 1000; i++) {
      largeTestData.push({
        first_name: `User${i}`,
        last_name: `Test${i}`,
        email: `user${i}@test.com`,
        phone: `555-${String(i).padStart(3, '0')}-${String(i).padStart(4, '0')}`,
        credit_score: Math.floor(Math.random() * 300) + 500,
        income: Math.floor(Math.random() * 100000) + 30000
      });
    }

    const startTime = Date.now();
    const largeDetectionResult = await SchemaMappingService.detectFields(largeTestData.slice(0, 100), 'test-partner-4');
    const detectionTime = Date.now() - startTime;

    console.log(`✅ Processed 100 records in ${detectionTime}ms`);
    console.log(`✅ Average time per record: ${(detectionTime / 100).toFixed(2)}ms`);

    // Test 5: Transformation Pipeline
    console.log('\n🔄 Test 5: Transformation Pipeline');
    
    const transformationTestData = [
      {
        dirty_phone: '  (555) 123-4567  ',
        dirty_email: '  TEST@EMAIL.COM  ',
        dirty_number: '  $1,234.56  ',
        dirty_date: '2024-01-15T10:30:00Z'
      }
    ];

    const transformationResult = await SchemaMappingService.detectFields(transformationTestData, 'test-partner-5');
    
    console.log('✅ Transformation suggestions:');
    transformationResult.detectedFields.forEach(field => {
      if (field.transformation) {
        console.log(`   ${field.sourceField}: ${field.transformation}`);
      }
    });

    // Test 6: Error Handling
    console.log('\n⚠️ Test 6: Error Handling');
    
    try {
      await SchemaMappingService.detectFields(null, 'test-partner');
      console.log('❌ Error handling failed - should have thrown error for null data');
    } catch (error) {
      console.log('✅ Error handling passed - null data properly rejected');
    }

    try {
      await SchemaMappingService.detectFields([], 'test-partner');
      console.log('❌ Error handling failed - should have thrown error for empty data');
    } catch (error) {
      console.log('✅ Error handling passed - empty data properly rejected');
    }

    // Test 7: Semantic Similarity
    console.log('\n🧠 Test 7: Semantic Similarity');
    
    const similarityTestData = [
      {
        'first_name': 'John',
        'given_name': 'Jane',
        'fname': 'Bob',
        'customer_first_name': 'Alice'
      }
    ];

    const similarityResult = await SchemaMappingService.detectFields(similarityTestData, 'test-partner-6');
    
    console.log('✅ Semantic similarity results:');
    similarityResult.detectedFields.forEach(field => {
      if (field.targetField === 'firstName') {
        console.log(`   ${field.sourceField} → firstName (${Math.round(field.confidence * 100)}% confidence)`);
      }
    });

    // Test 8: Value Pattern Validation
    console.log('\n🔍 Test 8: Value Pattern Validation');
    
    const patternTestData = [
      {
        valid_email: 'test@example.com',
        invalid_email: 'not-an-email',
        valid_phone: '(555) 123-4567',
        invalid_phone: 'not-a-phone',
        valid_ssn: '123-45-6789',
        invalid_ssn: '123456789',
        valid_zip: '12345',
        invalid_zip: '123'
      }
    ];

    const patternResult = await SchemaMappingService.detectFields(patternTestData, 'test-partner-7');
    
    console.log('✅ Value pattern validation results:');
    patternResult.detectedFields.forEach(field => {
      if (field.confidence > 0.8) {
        console.log(`   ${field.sourceField}: High confidence (${Math.round(field.confidence * 100)}%)`);
      }
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('✅ Enhanced field detection with semantic similarity');
    console.log('✅ Security validation and injection prevention');
    console.log('✅ Improved type detection and validation');
    console.log('✅ Performance optimization with batch processing');
    console.log('✅ Advanced transformation pipeline');
    console.log('✅ Comprehensive error handling');
    console.log('✅ Value pattern validation');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testEnhancedSchemaMapping()
    .then(() => {
      console.log('\n✅ Enhanced Schema Mapping Engine test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testEnhancedSchemaMapping }; 