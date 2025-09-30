import mongoose from 'mongoose';
import MappingProfile from '../models/MappingProfile.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleMappingProfiles = [
  {
    name: 'Standard CSV Credit Data',
    partnerId: 'CBE',
    fieldsMapping: {
      'fullName': { sourceField: 'customer_name', transformation: null, confidence: 0.9 },
      'phoneNumber': { sourceField: 'phone', transformation: null, confidence: 0.8 },
      'email': { sourceField: 'email_address', transformation: null, confidence: 0.9 },
      'dateOfBirth': { sourceField: 'birth_date', transformation: 'date', confidence: 0.7 },
      'address': { sourceField: 'residential_address', transformation: null, confidence: 0.8 },
      'employmentStatus': { sourceField: 'job_status', transformation: null, confidence: 0.7 },
      'monthlyIncome': { sourceField: 'income', transformation: 'number', confidence: 0.9 },
      'creditScore': { sourceField: 'credit_rating', transformation: 'number', confidence: 0.8 },
      'loanAmount': { sourceField: 'loan_requested', transformation: 'number', confidence: 0.9 },
      'loanPurpose': { sourceField: 'purpose', transformation: null, confidence: 0.7 }
    }
  },
  {
    name: 'Excel Template Mapping',
    partnerId: 'CBE',
    fieldsMapping: {
      'fullName': { sourceField: 'Name', transformation: null, confidence: 0.9 },
      'phoneNumber': { sourceField: 'Phone', transformation: null, confidence: 0.8 },
      'email': { sourceField: 'Email', transformation: null, confidence: 0.9 },
      'dateOfBirth': { sourceField: 'DOB', transformation: 'date', confidence: 0.7 },
      'address': { sourceField: 'Address', transformation: null, confidence: 0.8 },
      'employmentStatus': { sourceField: 'Employment', transformation: null, confidence: 0.7 },
      'monthlyIncome': { sourceField: 'Income', transformation: 'number', confidence: 0.9 },
      'creditScore': { sourceField: 'CreditScore', transformation: 'number', confidence: 0.8 },
      'loanAmount': { sourceField: 'LoanAmount', transformation: 'number', confidence: 0.9 },
      'loanPurpose': { sourceField: 'Purpose', transformation: null, confidence: 0.7 }
    }
  },
  {
    name: 'JSON Credit Data Format',
    partnerId: 'CBE',
    fieldsMapping: {
      'fullName': { sourceField: 'customer.fullName', transformation: null, confidence: 0.9 },
      'phoneNumber': { sourceField: 'customer.phone', transformation: null, confidence: 0.8 },
      'email': { sourceField: 'customer.email', transformation: null, confidence: 0.9 },
      'dateOfBirth': { sourceField: 'customer.dateOfBirth', transformation: 'date', confidence: 0.7 },
      'address': { sourceField: 'customer.address', transformation: null, confidence: 0.8 },
      'employmentStatus': { sourceField: 'employment.status', transformation: null, confidence: 0.7 },
      'monthlyIncome': { sourceField: 'employment.monthlyIncome', transformation: 'number', confidence: 0.9 },
      'creditScore': { sourceField: 'credit.score', transformation: 'number', confidence: 0.8 },
      'loanAmount': { sourceField: 'loan.amount', transformation: 'number', confidence: 0.9 },
      'loanPurpose': { sourceField: 'loan.purpose', transformation: null, confidence: 0.7 }
    }
  },
  {
    name: 'Awash Bank Standard Format',
    partnerId: 'AWASH',
    fieldsMapping: {
      'fullName': { sourceField: 'client_name', transformation: null, confidence: 0.9 },
      'phoneNumber': { sourceField: 'contact_number', transformation: null, confidence: 0.8 },
      'email': { sourceField: 'email_id', transformation: null, confidence: 0.9 },
      'dateOfBirth': { sourceField: 'birthdate', transformation: 'date', confidence: 0.7 },
      'address': { sourceField: 'home_address', transformation: null, confidence: 0.8 },
      'employmentStatus': { sourceField: 'work_status', transformation: null, confidence: 0.7 },
      'monthlyIncome': { sourceField: 'monthly_salary', transformation: 'number', confidence: 0.9 },
      'creditScore': { sourceField: 'credit_rating', transformation: 'number', confidence: 0.8 },
      'loanAmount': { sourceField: 'requested_amount', transformation: 'number', confidence: 0.9 },
      'loanPurpose': { sourceField: 'loan_reason', transformation: null, confidence: 0.7 }
    }
  },
  {
    name: 'Dashen Bank CSV Template',
    partnerId: 'DASHEN',
    fieldsMapping: {
      'fullName': { sourceField: 'Applicant_Name', transformation: null, confidence: 0.9 },
      'phoneNumber': { sourceField: 'Mobile_Number', transformation: null, confidence: 0.8 },
      'email': { sourceField: 'Email_Address', transformation: null, confidence: 0.9 },
      'dateOfBirth': { sourceField: 'Date_of_Birth', transformation: 'date', confidence: 0.7 },
      'address': { sourceField: 'Current_Address', transformation: null, confidence: 0.8 },
      'employmentStatus': { sourceField: 'Employment_Type', transformation: null, confidence: 0.7 },
      'monthlyIncome': { sourceField: 'Monthly_Income', transformation: 'number', confidence: 0.9 },
      'creditScore': { sourceField: 'Credit_Score', transformation: 'number', confidence: 0.8 },
      'loanAmount': { sourceField: 'Loan_Amount', transformation: 'number', confidence: 0.9 },
      'loanPurpose': { sourceField: 'Loan_Purpose', transformation: null, confidence: 0.7 }
    }
  },
  {
    name: 'Development Bank Excel Format',
    partnerId: 'DBE',
    fieldsMapping: {
      'fullName': { sourceField: 'CustomerName', transformation: null, confidence: 0.9 },
      'phoneNumber': { sourceField: 'PhoneNumber', transformation: null, confidence: 0.8 },
      'email': { sourceField: 'EmailAddress', transformation: null, confidence: 0.9 },
      'dateOfBirth': { sourceField: 'BirthDate', transformation: 'date', confidence: 0.7 },
      'address': { sourceField: 'ResidentialAddress', transformation: null, confidence: 0.8 },
      'employmentStatus': { sourceField: 'JobStatus', transformation: null, confidence: 0.7 },
      'monthlyIncome': { sourceField: 'MonthlySalary', transformation: 'number', confidence: 0.9 },
      'creditScore': { sourceField: 'CreditRating', transformation: 'number', confidence: 0.8 },
      'loanAmount': { sourceField: 'RequestedLoanAmount', transformation: 'number', confidence: 0.9 },
      'loanPurpose': { sourceField: 'LoanPurpose', transformation: null, confidence: 0.7 }
    }
  },
  {
    name: 'Bank of Abyssinia Standard Format',
    partnerId: 'ABYSSINIA',
    fieldsMapping: {
      'fullName': { sourceField: 'Customer_Name', transformation: null, confidence: 0.9 },
      'phoneNumber': { sourceField: 'Phone_Number', transformation: null, confidence: 0.8 },
      'email': { sourceField: 'Email_Address', transformation: null, confidence: 0.9 },
      'dateOfBirth': { sourceField: 'Birth_Date', transformation: 'date', confidence: 0.7 },
      'address': { sourceField: 'Address', transformation: null, confidence: 0.8 },
      'employmentStatus': { sourceField: 'Employment_Status', transformation: null, confidence: 0.7 },
      'monthlyIncome': { sourceField: 'Monthly_Income', transformation: 'number', confidence: 0.9 },
      'creditScore': { sourceField: 'Credit_Score', transformation: 'number', confidence: 0.8 },
      'loanAmount': { sourceField: 'Loan_Amount', transformation: 'number', confidence: 0.9 },
      'loanPurpose': { sourceField: 'Loan_Purpose', transformation: null, confidence: 0.7 }
    }
  },
  {
    name: 'Wegagen Bank CSV Template',
    partnerId: 'WEGAGEN',
    fieldsMapping: {
      'fullName': { sourceField: 'ClientName', transformation: null, confidence: 0.9 },
      'phoneNumber': { sourceField: 'ContactNumber', transformation: null, confidence: 0.8 },
      'email': { sourceField: 'Email', transformation: null, confidence: 0.9 },
      'dateOfBirth': { sourceField: 'DateOfBirth', transformation: 'date', confidence: 0.7 },
      'address': { sourceField: 'Address', transformation: null, confidence: 0.8 },
      'employmentStatus': { sourceField: 'EmploymentType', transformation: null, confidence: 0.7 },
      'monthlyIncome': { sourceField: 'MonthlyIncome', transformation: 'number', confidence: 0.9 },
      'creditScore': { sourceField: 'CreditScore', transformation: 'number', confidence: 0.8 },
      'loanAmount': { sourceField: 'RequestedAmount', transformation: 'number', confidence: 0.9 },
      'loanPurpose': { sourceField: 'Purpose', transformation: null, confidence: 0.7 }
    }
  }
];

async function seedMappingProfiles() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/credit-score-dashboard');
    console.log('Connected to MongoDB');

    // Clear existing mapping profiles
    await MappingProfile.deleteMany({});
    console.log('Cleared existing mapping profiles');

    // Insert sample mapping profiles
    const createdProfiles = await MappingProfile.insertMany(sampleMappingProfiles);
    console.log(`Created ${createdProfiles.length} mapping profiles`);

    // Display created profiles
    console.log('\nCreated Mapping Profiles:');
    createdProfiles.forEach(profile => {
      console.log(`- ${profile.name} (${profile.partnerId}) - ${Object.keys(profile.fieldsMapping).length} fields`);
    });

    console.log('\n✅ Mapping profiles seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding mapping profiles:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
seedMappingProfiles(); 