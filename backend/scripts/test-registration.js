import fetch from 'node-fetch';

async function testRegistration() {
  try {
    const testUser = {
      fullName: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!',
      passwordConfirm: 'TestPassword123!',
      phone: '+1234567890',
      dateOfBirth: '1990-01-01',
      nationalId: '1234567890123456',
      address: '123 Test Street, Test City',
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

    console.log('Testing registration with user:', testUser.email);

    const response = await fetch('http://localhost:3000/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    const data = await response.json();

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Registration successful!');
      console.log('User status:', data.user?.status);
      console.log('User ID:', data.user?.id);
    } else {
      console.log('❌ Registration failed!');
      console.log('Error:', data.message);
      if (data.errors) {
        console.log('Validation errors:', data.errors);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRegistration(); 