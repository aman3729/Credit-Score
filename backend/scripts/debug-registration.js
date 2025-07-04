// Simple test to debug registration
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

console.log('Testing registration with data:', JSON.stringify(testData, null, 2));

fetch('http://localhost:3000/api/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData),
})
.then(response => {
  console.log('Response status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response data:', JSON.stringify(data, null, 2));
  if (data.errors) {
    console.log('Validation errors:');
    data.errors.forEach(error => {
      console.log(`  - ${error.path}: ${error.msg}`);
    });
  }
})
.catch(error => {
  console.error('Error:', error);
}); 