# Multi-Tenant Decision Config System

## Overview

The Multi-Tenant Decision Config System allows banks and lenders to configure their own lending parameters, score thresholds, loan amounts, interest rates, and decision rules without affecting other banks. Each bank acts as a "tenant" with isolated configurations.

## Architecture

### 1. PartnerBank Model

The `PartnerBank` model serves as the tenant container with comprehensive lending configurations:

```javascript
{
  _id: ObjectId("..."),
  name: "Commercial Bank of Ethiopia",
  slug: "commercial-bank-ethiopia",
  code: "CBE",
  status: "active",
  lendingConfig: {
    // Score thresholds per loan product
    scoreThresholds: {
      personal: { approve: 700, conditional: 650, review: 600 },
      business: { approve: 720, conditional: 670, review: 620 },
      mortgage: { approve: 750, conditional: 700, review: 650 },
      auto: { approve: 680, conditional: 630, review: 580 }
    },
    
    // Max/min loan amounts per product and credit tier
    loanAmounts: {
      personal: {
        EXCELLENT: 1000000,
        VERY_GOOD: 500000,
        GOOD: 300000,
        FAIR: 150000,
        POOR: 50000
      }
    },
    
    // Interest rate mapping
    interestRates: {
      baseRate: 12.0,
      maxRate: 35.99,
      riskAdjustments: {
        EXCELLENT: -2.0,
        VERY_GOOD: -1.0,
        GOOD: 0.0,
        FAIR: 2.0,
        POOR: 5.0
      }
    },
    
    // DTI and income rules
    dtiRules: {
      maxDTI: 0.45,
      maxDTIWithCollateral: 0.55,
      incomeMultipliers: {
        EXCELLENT: 12,
        VERY_GOOD: 10,
        GOOD: 8,
        FAIR: 6,
        POOR: 4
      }
    },
    
    // Collateral rules
    collateralRules: {
      requiredFor: ["FAIR", "POOR"],
      minValue: 5000,
      loanToValueRatio: 0.7
    }
  }
}
```

### 2. User-Bank Association

Users are linked to banks via the `bankId` field:

```javascript
// Staff user
{
  email: "analyst@cbe.com",
  bankId: "CBE",
  role: "underwriter"
}

// Borrower user
{
  phoneNumber: "+251...",
  bankId: "CBE",
  // ... other fields
}
```

### 3. Decision Engine Integration

The lending decision engine now accepts bank-specific configurations:

```javascript
// Before (global config)
const decision = evaluateLendingDecision(scoreData, userData);

// After (bank-specific config)
const bankConfig = bank.getLendingConfig('personal');
const decision = evaluateLendingDecision(scoreData, userData, bankConfig);
```

## Features

### 1. Score Thresholds by Product

Each bank can set different credit score requirements for different loan products:

- **Personal Loans**: Lower thresholds for quick approval
- **Business Loans**: Higher thresholds for risk management
- **Mortgage Loans**: Strictest thresholds for large amounts
- **Auto Loans**: Moderate thresholds with collateral options

### 2. Dynamic Loan Amounts

Loan amounts vary by:
- **Credit Tier**: EXCELLENT, VERY_GOOD, GOOD, FAIR, POOR
- **Product Type**: personal, business, mortgage, auto
- **Bank Risk Appetite**: Conservative vs. aggressive lending

### 3. Flexible Interest Rate Structure

Interest rates are calculated using:
- **Base Rate**: Bank's standard rate
- **Risk Adjustments**: Per credit tier
- **DTI Adjustments**: Based on debt-to-income ratio
- **Recession Adjustments**: Economic condition modifiers

### 4. DTI and Income Rules

Configurable parameters include:
- **Max DTI**: Without collateral (e.g., 45%)
- **Max DTI with Collateral**: Higher limits with security (e.g., 55%)
- **Income Multipliers**: Loan amount based on monthly income
- **Minimum Income**: Base income requirements

### 5. Collateral Requirements

Collateral rules include:
- **Required For**: Which credit tiers need collateral
- **Minimum Value**: Minimum collateral worth
- **Loan-to-Value Ratio**: Maximum loan vs. collateral value
- **Quality Threshold**: Collateral quality requirements

### 6. Recession Mode

Economic condition adjustments:
- **Rate Increases**: Higher rates during economic stress
- **Amount Reductions**: Lower loan amounts
- **Term Limits**: Shorter repayment periods
- **Collateral Discounts**: Reduced collateral values

## API Endpoints

### Bank Management (Admin Only)

```javascript
// Get all banks
GET /api/v1/partner-banks

// Get bank by ID
GET /api/v1/partner-banks/:id

// Create new bank
POST /api/v1/partner-banks

// Update bank
PATCH /api/v1/partner-banks/:id

// Delete bank
DELETE /api/v1/partner-banks/:id
```

### Configuration Management

```javascript
// Get bank's lending config
GET /api/v1/partner-banks/:id/lending-config?productType=personal

// Update lending config
PATCH /api/v1/partner-banks/:id/lending-config

// Validate config
POST /api/v1/partner-banks/validate-config
```

### Bank Staff Access

```javascript
// Get current user's bank
GET /api/v1/partner-banks/my/banks

// Get current user's bank config
GET /api/v1/partner-banks/my/config?productType=personal
```

## Frontend Components

### Decision Config Panel

The `DecisionConfigPanel` component provides a comprehensive UI for configuring lending parameters:

```jsx
<DecisionConfigPanel />
```

**Features:**
- **Tabbed Interface**: Score thresholds, loan amounts, interest rates, DTI rules, collateral
- **Real-time Validation**: Immediate feedback on configuration errors
- **Change Tracking**: Visual indicators for unsaved changes
- **Product-specific Settings**: Different configurations per loan type

**Tabs:**
1. **Score Thresholds**: Configure approval scores by product
2. **Loan Amounts**: Set maximum amounts by credit tier and product
3. **Interest Rates**: Configure base rates and adjustments
4. **DTI & Income**: Set debt-to-income limits and multipliers
5. **Collateral**: Define collateral requirements and rules

## Usage Examples

### 1. Conservative Bank Configuration

```javascript
{
  scoreThresholds: {
    personal: { approve: 750, conditional: 700, review: 650 }
  },
  loanAmounts: {
    personal: {
      EXCELLENT: 500000,
      VERY_GOOD: 250000,
      GOOD: 150000,
      FAIR: 75000,
      POOR: 25000
    }
  },
  interestRates: {
    baseRate: 15.0,
    riskAdjustments: {
      EXCELLENT: -1.0,
      VERY_GOOD: 0.0,
      GOOD: 2.0,
      FAIR: 4.0,
      POOR: 7.0
    }
  },
  dtiRules: {
    maxDTI: 0.35,
    maxDTIWithCollateral: 0.45
  }
}
```

### 2. Aggressive Bank Configuration

```javascript
{
  scoreThresholds: {
    personal: { approve: 650, conditional: 600, review: 550 }
  },
  loanAmounts: {
    personal: {
      EXCELLENT: 1500000,
      VERY_GOOD: 750000,
      GOOD: 500000,
      FAIR: 250000,
      POOR: 100000
    }
  },
  interestRates: {
    baseRate: 10.0,
    riskAdjustments: {
      EXCELLENT: -3.0,
      VERY_GOOD: -1.5,
      GOOD: 0.0,
      FAIR: 1.5,
      POOR: 3.0
    }
  },
  dtiRules: {
    maxDTI: 0.50,
    maxDTIWithCollateral: 0.60
  }
}
```

## Security and Access Control

### Role-Based Permissions

- **Admin**: Full access to all banks and configurations
- **Underwriter**: Can modify lending config for their bank
- **Analyst**: Can view configurations and run reports
- **Manager**: Can view and suggest changes
- **Viewer**: Read-only access

### Data Isolation

- Users can only access their assigned bank's data
- Configurations are isolated per bank
- Audit trails track all changes
- Validation prevents invalid configurations

## Implementation Steps

### 1. Database Setup

```bash
# Run the seeding script
node backend/scripts/seed-partner-banks.js
```

### 2. User Association

Ensure users have the correct `bankId` field set to their assigned bank code.

### 3. Configuration Access

Users can access their bank's configuration through the Decision Config Panel in the lender dashboard.

### 4. Decision Engine Integration

The lending decision engine automatically uses bank-specific configurations when available.

## Benefits

### 1. Customization
- Each bank can set their own risk parameters
- Product-specific configurations
- Flexible approval criteria

### 2. Scalability
- Easy to add new banks
- Isolated configurations
- No cross-bank interference

### 3. Compliance
- Bank-specific regulatory requirements
- Audit trails for all changes
- Validation prevents invalid configurations

### 4. Risk Management
- Conservative vs. aggressive lending strategies
- Economic condition adjustments
- Collateral-based risk mitigation

## Future Enhancements

### 1. Advanced Features
- **Seasonal Adjustments**: Holiday and seasonal rate changes
- **Geographic Variations**: Location-based pricing
- **Customer Segment Rules**: VIP customer special rates
- **Market Condition Rules**: Real-time economic indicators

### 2. Analytics
- **Configuration Impact Analysis**: How changes affect approval rates
- **Performance Metrics**: Bank-specific KPIs
- **A/B Testing**: Compare different configurations
- **Predictive Modeling**: AI-driven configuration optimization

### 3. Integration
- **Core Banking Systems**: Direct integration with bank systems
- **Regulatory Reporting**: Automated compliance reporting
- **Third-party Data**: External credit bureau integration
- **API Marketplace**: Allow third-party configuration tools

## Troubleshooting

### Common Issues

1. **Configuration Not Loading**
   - Check user's `bankId` field
   - Verify bank exists and is active
   - Check user permissions

2. **Validation Errors**
   - Score thresholds must be in descending order
   - Base rate cannot exceed max rate
   - DTI limits must be logical

3. **Decision Engine Issues**
   - Ensure bank config is passed to decision engine
   - Check for missing required fields
   - Verify product type is supported

### Support

For technical support or questions about the multi-tenant decision config system, please contact the development team or refer to the API documentation. 