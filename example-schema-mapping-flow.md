# Schema Mapping Engine - Complete Flow Example

## 🎯 **Complete Data Flow: Upload → Map → Score**

### **Step 1: Bank Uploads Data**
Bank A sends a CSV file with their format:
```csv
Customer_ID,Outstanding_Balance,Credit_History_Months,Payment_Score,Utilization_Rate
0954880513,15000,72,0.92,0.25
1234567890,8000,48,0.88,0.35
9876543210,25000,120,0.95,0.15
```

### **Step 2: Schema Mapping Engine Detects Fields**
The system analyzes the CSV and suggests mappings:
```javascript
{
  "detectedFields": [
    {
      "sourceField": "Customer_ID",
      "targetField": "phone number",
      "confidence": 0.85,
      "transformation": "phone_format"
    },
    {
      "sourceField": "Outstanding_Balance", 
      "targetField": "totalDebt",
      "confidence": 0.92,
      "transformation": "none"
    },
    {
      "sourceField": "Credit_History_Months",
      "targetField": "creditAge", 
      "confidence": 0.78,
      "transformation": "number_format"
    },
    {
      "sourceField": "Payment_Score",
      "targetField": "paymentHistory",
      "confidence": 0.95,
      "transformation": "none"
    },
    {
      "sourceField": "Utilization_Rate",
      "targetField": "creditUtilization", 
      "confidence": 0.88,
      "transformation": "none"
    }
  ]
}
```

### **Step 3: Admin Creates Mapping**
Admin maps the fields via UI:
```javascript
{
  "name": "Bank A CSV Mapping",
  "partnerId": "bank-a",
  "fieldMappings": {
    "phone number": {
      "sourceField": "Customer_ID",
      "targetField": "phone number", 
      "transformation": "phone_format",
      "isRequired": true
    },
    "totalDebt": {
      "sourceField": "Outstanding_Balance",
      "targetField": "totalDebt",
      "transformation": "none", 
      "isRequired": true
    },
    "creditAge": {
      "sourceField": "Credit_History_Months",
      "targetField": "creditAge",
      "transformation": "number_format",
      "transformationParams": { "decimals": 0 },
      "isRequired": true
    },
    "paymentHistory": {
      "sourceField": "Payment_Score", 
      "targetField": "paymentHistory",
      "transformation": "none",
      "isRequired": true
    },
    "creditUtilization": {
      "sourceField": "Utilization_Rate",
      "targetField": "creditUtilization", 
      "transformation": "none",
      "isRequired": true
    }
  }
}
```

### **Step 4: Apply Mapping & Transform Data**
The engine converts Bank A's format to your internal schema:
```javascript
// Original Bank A Data
{
  "Customer_ID": "0954880513",
  "Outstanding_Balance": 15000,
  "Credit_History_Months": 72,
  "Payment_Score": 0.92,
  "Utilization_Rate": 0.25
}

// ↓ Transformed to Internal Schema ↓

{
  "phone number": "0954880513",
  "totalDebt": 15000,
  "creditAge": 72,
  "paymentHistory": 0.92,
  "creditUtilization": 0.25
}
```

### **Step 5: Send to Credit Scoring Engine**
The standardized data goes to your existing scoring system:
```javascript
// Input to calculateCreditScore()
{
  phoneNumber: "0954880513",
  paymentHistory: 0.92,
  creditUtilization: 0.25,
  creditAge: 72,
  creditMix: 0.8, // Default value
  inquiries: 2,   // Default value
  totalDebt: 15000,
  // ... other fields with defaults
}

// ↓ Credit Scoring Engine Processes ↓

{
  score: 785,
  classification: "Good",
  factors: {
    paymentHistory: "Good",
    utilization: "Excellent", 
    creditAge: "Excellent",
    creditMix: "Good",
    inquiries: "Good"
  }
}
```

### **Step 6: Return Results**
The system returns both mapping and scoring results:
```javascript
{
  "success": true,
  "data": {
    "mappedData": [
      {
        "phone number": "0954880513",
        "totalDebt": 15000,
        "creditAge": 72,
        "paymentHistory": 0.92,
        "creditUtilization": 0.25
      }
    ],
    "scoringResults": [
      {
        "phoneNumber": "0954880513",
        "creditScore": 785,
        "scoreClass": "Good",
        "factors": {
          "paymentHistory": "Good",
          "utilization": "Excellent",
          "creditAge": "Excellent",
          "creditMix": "Good", 
          "inquiries": "Good"
        }
      }
    ],
    "summary": {
      "totalRecords": 3,
      "mappedRecords": 3,
      "scoredRecords": 3,
      "averageScore": 785
    }
  }
}
```

## 🎯 **Key Benefits:**

1. **Universal Compatibility**: Works with any bank's format
2. **Automatic Transformation**: Converts any format to your standard
3. **Seamless Integration**: Directly feeds into your existing scoring engine
4. **Batch Processing**: Handle thousands of records at once
5. **Error Handling**: Comprehensive validation and error reporting
6. **Audit Trail**: Track all operations for compliance

## 🔄 **Complete API Flow:**

```bash
# 1. Upload file for field detection
POST /api/v1/schema-mapping/detect-fields
Body: file (CSV/JSON/Excel)

# 2. Create mapping template
POST /api/v1/schema-mapping/create
Body: mapping configuration

# 3. Apply mapping and score data
POST /api/v1/schema-mapping/apply/:mappingId
Body: file + partnerId + autoScore=true

# 4. Get results with scores
Response: {
  mappedData: [...],
  scoringResults: [...],
  summary: { averageScore: 785 }
}
```

## 🎉 **Result:**
Any bank's data format → Your internal schema → Credit scores → Results!

The Schema Mapping Engine handles the complexity of different data formats so you can focus on credit scoring and lending decisions. 