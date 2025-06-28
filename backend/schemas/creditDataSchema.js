import Joi from 'joi';

export const creditDataSchema = Joi.object({
  // User identification
  userId: Joi.string().required(),
  email: Joi.string().email().required(),

  // Core scoring inputs (0-1 scale)
  paymentHistory: Joi.number().min(0).max(1).required(),         // % of payments made on time
  creditUtilization: Joi.number().min(0).max(1).required(),      // credit used vs. available
  creditAge: Joi.number().min(0).max(1).required(),              // age of credit
  creditMix: Joi.number().min(0).max(1).required(),              // mix of loans/credit
  inquiries: Joi.number().min(0).max(1).required(),              // normalized inquiry impact

  // Financial metrics
  monthlyIncome: Joi.number().min(0).optional(),
  monthlyDebt: Joi.number().min(0).optional(),
  debtToIncomeRatio: Joi.number().min(0).optional(),

  // Credit history
  loanDefaultHistory: Joi.number().integer().min(0).optional(),   // number of defaults
  numberOfAccounts: Joi.number().integer().min(0).optional(),     // total accounts
  numberOfCreditCards: Joi.number().integer().min(0).optional(),  // credit cards
  numberOfLoans: Joi.number().integer().min(0).optional(),       // loans

  // Recent activity
  lastLoanAmount: Joi.number().min(0).optional(),
  lastInquiryDate: Joi.date().optional(),
  lastPaymentDate: Joi.date().optional(),

  // Additional metadata
  source: Joi.string().allow('').optional(),    // source of data (bank name)
  notes: Joi.string().allow('').optional(),
  timestamp: Joi.date().default(Date.now)
});

// Helper function to validate and normalize data
export const validateCreditData = (record) => {
  const { error, value } = creditDataSchema.validate(record, {
    abortEarly: false,
    convert: true
  });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return value;
};
