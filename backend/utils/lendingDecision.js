import { calculateCreditScore } from './creditScoring.js';

export function evaluateLendingDecision(userData) {
  // Input validation
  if (!userData || typeof userData !== 'object') {
    throw new Error('User data is required and must be an object');
  }

  const result = {
    decision: 'Review',
    scoreData: null,
    reasons: [],
    recommendations: [],
  };

  try {
    // Step 1: Calculate credit score
    const scoreResult = calculateCreditScore(userData);
    if (!scoreResult || typeof scoreResult !== 'object') {
      throw new Error('Invalid score result from calculateCreditScore');
    }

    result.scoreData = scoreResult;

    const {
      score = 0,
      classification = 'Unknown',
      baseScore = 0,
      breakdown = {}
    } = scoreResult || {};

    const {
      totalDebt = 0,
      monthlyIncome = 1,
      recentMissedPayments = 0,
      recentDefaults = 0,
    } = userData;

    // Validate financial values
    if (typeof monthlyIncome !== 'number' || monthlyIncome <= 0) {
      throw new Error('Monthly income must be a positive number');
    }

    const debtToIncomeRatio = totalDebt / (monthlyIncome * 12);

    // Step 2: Decision logic
    if (score >= 740 && debtToIncomeRatio <= 0.35 && recentDefaults === 0) {
      result.decision = 'Approve';
      result.reasons.push('Strong credit score');
      result.reasons.push('Healthy debt-to-income ratio');
      result.recommendations.push('Proceed with standard interest rate');
    } else if (score >= 670 && debtToIncomeRatio <= 0.4 && recentDefaults === 0) {
      result.decision = 'Review';
      result.reasons.push('Average credit score');
      result.reasons.push('Moderate risk');
      result.recommendations.push('Consider with conditions or collateral');
    } else {
      result.decision = 'Reject';
      result.reasons.push('Credit score below lending threshold');
      if (recentDefaults > 0) result.reasons.push('Recent default(s) found');
      if (debtToIncomeRatio > 0.4) result.reasons.push('High debt-to-income ratio');
      result.recommendations.push('Recommend credit counseling');
    }

    // Add contextual information
    result.reasons.push(`Score Classification: ${classification}`);
    result.reasons.push(`DTI Ratio: ${(debtToIncomeRatio * 100).toFixed(2)}%`);
    result.recommendations.push('Encourage timely payments and lower credit usage');

    return result;
  } catch (error) {
    console.error('Error in evaluateLendingDecision:', error);
    throw new Error(`Failed to evaluate lending decision: ${error.message}`);
  }
}