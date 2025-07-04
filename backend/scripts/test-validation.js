import { body, validationResult } from 'express-validator';

// Test the validation rules
const testValidation = () => {
  const testData = {
    fullName: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    passwordConfirm: 'TestPassword123!',
    phone: '+1234567890',
    dateOfBirth: '1990-01-01',
    nationalId: '1234567890123456',
    address: '123 Test Street',
    gender: 'male',
    role: 'user',
    monthlyIncome: 5000,
    monthlySavings: 500,
    totalDebt: 1000,
    bankBalance: 2000,
    mobileMoneyBalance: 500,
    employmentStatus: 'employed',
    employerName: 'Test Company',
    industry: 'technology',
    agreeTerms: true,
    authorizeCreditChecks: true
  };

  console.log('Testing validation with data:', JSON.stringify(testData, null, 2));

  // Test each validation rule
  const validations = [
    body('fullName').trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
    body('email').trim().isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('passwordConfirm').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }).withMessage('Password confirmation does not match password'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('dateOfBirth').isISO8601().withMessage('Please enter a valid date of birth'),
    body('nationalId').optional().matches(/^\d{16}$/).withMessage('National ID must be exactly 16 digits'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('role').optional().isIn(['user', 'premium', 'lender', 'admin', 'analyst']).withMessage('Invalid role'),
    body('monthlyIncome').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Monthly income must be a positive number'),
    body('monthlySavings').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Monthly savings must be a positive number'),
    body('totalDebt').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Total debt must be a positive number'),
    body('bankBalance').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Bank balance must be a positive number'),
    body('mobileMoneyBalance').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Mobile money balance must be a positive number'),
    body('employmentStatus').isIn(['employed', 'self-employed', 'unemployed', 'student', 'retired']).withMessage('Invalid employment status'),
    body('employerName').optional().trim(),
    body('industry').optional().isIn(['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'other']).withMessage('Invalid industry'),
    body('gender').optional().isIn(['male', 'female', 'other', 'prefer-not-to-say']).withMessage('Invalid gender'),
    body('agreeTerms').isBoolean().withMessage('Terms acceptance is required'),
    body('authorizeCreditChecks').isBoolean().withMessage('Credit check authorization is required')
  ];

  // Simulate validation
  const req = { body: testData };
  const res = { status: () => ({ json: (data) => console.log('Response:', data) }) };

  // Run validations
  Promise.all(validations.map(validation => validation.run(req)))
    .then(() => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:');
        errors.array().forEach(error => {
          console.log(`  - ${error.path}: ${error.msg}`);
        });
      } else {
        console.log('✅ All validations passed!');
      }
    })
    .catch(error => {
      console.error('Validation error:', error);
    });
};

testValidation(); 