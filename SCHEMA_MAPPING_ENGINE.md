# Schema Mapping Engine

> **⚠️ IMPORTANT: Schema mapping is now mandatory for all batch uploads.**
> - All uploads must use a mapping and partner.
> - Direct upload is no longer supported.
> - Supported formats: JSON, CSV, Excel, XML, TXT

## Overview
The Schema Mapping Engine allows you to upload credit data from any partner or format, as long as you select a mapping and partner during upload. The system will not accept uploads without a mapping.

## Migration Note
If you previously uploaded data directly, you must now create a mapping for your format and use it for all uploads.

## Features

### 🔍 **Automatic Field Detection**
- Analyzes uploaded files and detects potential field mappings
- Uses intelligent pattern matching to suggest mappings
- Provides confidence scores for each detected field
- Supports multiple file formats (CSV, JSON, Excel, XML)

### 🗺️ **Visual Mapping Interface**
- Drag-and-drop field mapping interface
- Real-time validation of required fields
- Support for data transformations (uppercase, lowercase, phone formatting, etc.)
- Preview mapped data before saving

### 💾 **Template Management**
- Save mapping templates per partner
- Reuse mappings automatically for future uploads
- Version control for mapping changes
- Partner-specific mapping configurations

### 🔄 **Data Transformation**
- **Phone Format**: Cleans and standardizes phone numbers
- **Date Format**: Converts various date formats to standard format
- **Number Format**: Rounds and formats numerical values
- **Text Transformations**: Uppercase, lowercase, trim whitespace
- **Custom Transformations**: Extensible transformation system

## How It Works

### Step 1: Upload File
```
Upload any file (CSV, Excel, JSON, XML, etc.)
```

### Step 2: Field Detection
```
You analyze columns:
- Detect fields like "Customer Phone", "Utilization", "Defaults", etc.
- Use pattern matching and AI to suggest mappings
- Provide confidence scores for each detection
```

### Step 3: Create Mapping
```
Let the user map their fields to your expected fields via UI:
"User_ID" → phone number
"OutstandingAmount" → totalDebt
"AgeInMonths" → creditAge
```

### Step 4: Save Template
```
Save that mapping template per partner and reuse automatically next time.
```

## Internal Schema Fields

The system expects the following internal schema fields:

### Required Fields
- **phone number**: Customer phone number (string)
- **paymentHistory**: Payment history score 0-1 (number)
- **creditUtilization**: Credit utilization ratio 0-1 (number)
- **creditAge**: Credit age in years (number)
- **creditMix**: Credit mix diversity 0-1 (number)
- **inquiries**: Number of recent inquiries (number)
- **totalDebt**: Total outstanding debt (number)

### Optional Fields
- **recentMissedPayments**: Recent missed payments count (number)
- **recentDefaults**: Recent defaults count (number)
- **lastActiveDate**: Last active date (string)
- **activeLoanCount**: Number of active loans (number)
- **oldestAccountAge**: Oldest account age in months (number)
- **transactionsLast90Days**: Transactions in last 90 days (number)
- **onTimePaymentRate**: On-time payment rate 0-1 (number)
- **onTimeRateLast6Months**: On-time rate last 6 months 0-1 (number)
- **missedPaymentsLast12**: Missed payments in last 12 months (number)
- **recentLoanApplications**: Recent loan applications (number)
- **defaultCountLast3Years**: Defaults in last 3 years (number)
- **consecutiveMissedPayments**: Consecutive missed payments (number)
- **monthsSinceLastDelinquency**: Months since last delinquency (number)
- **loanTypeCounts**: Loan type breakdown (object)

## API Endpoints

### Field Detection
```http
POST /api/v1/schema-mapping/detect-fields
Content-Type: multipart/form-data

Body: file (CSV, JSON, Excel file)
```

### Create Mapping
```http
POST /api/v1/schema-mapping/create
Content-Type: application/json

{
  "name": "Bank A CSV Mapping",
  "description": "Mapping for Bank A CSV format",
  "partnerId": "bank-a",
  "partnerName": "Bank A",
  "fileType": "csv",
  "fieldMappings": {
    "phone number": {
      "sourceField": "User_ID",
      "targetField": "phone number",
      "transformation": "phone_format",
      "isRequired": true
    }
  }
}
```

### Apply Mapping
```http
POST /api/v1/schema-mapping/apply/:mappingId
Content-Type: multipart/form-data

Body: file + partnerId
```

### Get Partner Mappings
```http
GET /api/v1/schema-mapping/partner/:partnerId
```

### Get Available Fields
```http
GET /api/v1/schema-mapping/fields
```

## Database Schema

### SchemaMapping Model
```javascript
{
  name: String,                    // Mapping name
  description: String,             // Mapping description
  partnerId: String,              // Partner identifier
  partnerName: String,            // Partner name
  createdBy: ObjectId,            // User who created mapping
  isActive: Boolean,              // Whether mapping is active
  isDefault: Boolean,             // Whether this is default for partner
  fileType: String,               // csv, json, excel, xml
  fieldMappings: Map,             // Field mappings
  sampleData: Mixed,              // Sample data for validation
  validationRules: Object,        // Validation rules
  usageCount: Number,             // How many times used
  lastUsed: Date,                 // Last usage date
  successRate: Number             // Success rate 0-1
}
```

## Usage Examples

### Example 1: Bank CSV Format
**Input CSV:**
```csv
Customer_ID,Outstanding_Balance,Credit_History_Months,Payment_Score,Utilization_Rate
0954880513,15000,72,0.92,0.25
```

**Mapping:**
```javascript
{
  "phone number": {
    "sourceField": "Customer_ID",
    "targetField": "phone number",
    "transformation": "phone_format"
  },
  "totalDebt": {
    "sourceField": "Outstanding_Balance",
    "targetField": "totalDebt"
  },
  "creditAge": {
    "sourceField": "Credit_History_Months",
    "targetField": "creditAge",
    "transformation": "number_format",
    "transformationParams": { "decimals": 0 }
  },
  "paymentHistory": {
    "sourceField": "Payment_Score",
    "targetField": "paymentHistory"
  },
  "creditUtilization": {
    "sourceField": "Utilization_Rate",
    "targetField": "creditUtilization"
  }
}
```

### Example 2: JSON Format
**Input JSON:**
```json
{
  "userPhone": "0954880513",
  "debtAmount": 10000,
  "creditLength": 60,
  "paymentAccuracy": 0.95,
  "creditUsage": 0.3
}
```

**Mapping:**
```javascript
{
  "phone number": {
    "sourceField": "userPhone",
    "targetField": "phone number",
    "transformation": "phone_format"
  },
  "totalDebt": {
    "sourceField": "debtAmount",
    "targetField": "totalDebt"
  },
  "creditAge": {
    "sourceField": "creditLength",
    "targetField": "creditAge"
  },
  "paymentHistory": {
    "sourceField": "paymentAccuracy",
    "targetField": "paymentHistory"
  },
  "creditUtilization": {
    "sourceField": "creditUsage",
    "targetField": "creditUtilization"
  }
}
```

## Field Detection Patterns

The system uses intelligent pattern matching to detect fields:

### Phone Number Patterns
- `phone`, `mobile`, `msisdn`, `contact`, `number`
- Matches: `User_ID`, `Customer_Phone`, `Mobile_Number`

### Payment Patterns
- `payment`, `pay`, `on.?time`, `timely`
- Matches: `Payment_Score`, `OnTime_Payments`, `Payment_Accuracy`

### Utilization Patterns
- `util`, `usage`, `ratio`, `percentage`
- Matches: `Credit_Usage`, `Utilization_Rate`, `Credit_Ratio`

### Age Patterns
- `age`, `length`, `duration`, `years`, `months`
- Matches: `Credit_Age`, `Account_Length`, `History_Months`

## Security Features

- **Audit Logging**: All mapping operations are logged
- **Access Control**: Only admin users can create/modify mappings
- **Data Validation**: Input validation for all mapping operations
- **Error Handling**: Comprehensive error handling and reporting

## Testing

Run the test script to verify functionality:

```bash
cd backend
node test-schema-mapping.js
```

This will test:
- Field detection accuracy
- Mapping creation
- Data transformation
- Error handling

## Benefits

1. **Universal Compatibility**: Works with any data format
2. **Time Saving**: Automatic field detection reduces manual work
3. **Consistency**: Standardized data format across all partners
4. **Scalability**: Easy to add new partners and formats
5. **Reliability**: Comprehensive validation and error handling
6. **Reusability**: Save and reuse mapping templates

## Future Enhancements

- **AI-Powered Detection**: Machine learning for better field detection
- **Bulk Mapping**: Apply mappings to multiple files at once
- **Mapping Versioning**: Track changes to mappings over time
- **Advanced Transformations**: More sophisticated data transformations
- **Real-time Validation**: Live validation as users create mappings
- **Mapping Analytics**: Track mapping success rates and usage patterns 