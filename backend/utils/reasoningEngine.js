import { calculateCreditScore } from './creditScoring.js';
import { evaluateLendingDecision } from './lendingDecision.js';

export function generateReasoning(userData, scoreResult, lendingDecision) {
  const reasons = [];
  const actions = [];
  const insights = [];

  const { score, classification, breakdown } = scoreResult || {};
  const {
    paymentHistory,
    creditUtilization,
    creditAge,
    creditMix,
    inquiries,
    dtiPenalty,
    missedPenalty,
    defaultPenalty,
  } = breakdown || {};

  const dtiRatio = (userData.totalDebt || 0) / ((userData.monthlyIncome || 1) * 12);
  const monthlyIncome = userData.monthlyIncome || 0;
  const monthlySavings = userData.monthlySavings || 0;
  const bankBalance = userData.bankBalance || 0;
  const mobileMoneyBalance = userData.mobileMoneyBalance || 0;
  const totalDebt = userData.totalDebt || 0;
  const recentMissedPayments = userData.recentMissedPayments || 0;
  const recentDefaults = userData.recentDefaults || 0;

  // Score Summary Analysis
  reasons.push(`Your credit score is ${score} (${classification}).`);
  
  if (score >= 740) {
    insights.push("Excellent credit standing - you qualify for the best rates and terms.");
    actions.push("Maintain low credit utilization (under 30%) and continue timely payments.");
    actions.push("Consider premium credit products for better rewards.");
  } else if (score >= 670) {
    insights.push("Good credit standing - you qualify for most loans with competitive rates.");
    actions.push("Slight improvements in payment history or utilization can help you reach the 'Very Good' range.");
    actions.push("Monitor your credit utilization and keep it below 50%.");
  } else if (score >= 580) {
    insights.push("Fair credit standing - you may qualify for loans but with higher rates.");
    actions.push("Focus on reducing debt and avoiding missed payments.");
    actions.push("Consider secured credit cards to rebuild credit.");
  } else {
    insights.push("Poor credit standing - focus on rebuilding your credit profile.");
    actions.push("Address any outstanding collections or defaults.");
    actions.push("Consider credit counseling or debt management programs.");
  }

  // Payment History Analysis
  if (paymentHistory < 20) {
    reasons.push("Payment history is significantly hurting your score.");
    actions.push("Set up automatic payments to avoid future late payments.");
    actions.push("Contact creditors to negotiate payment plans if needed.");
  } else if (paymentHistory < 40) {
    reasons.push("Payment history needs improvement.");
    actions.push("Focus on making all payments on time for the next 6-12 months.");
  } else {
    insights.push("Strong payment history - this is helping your score.");
  }

  // Credit Utilization Analysis
  if (creditUtilization > 70) {
    reasons.push("Very high credit utilization is severely impacting your score.");
    actions.push("Pay down credit card balances to reduce utilization below 30%.");
    actions.push("Consider requesting credit limit increases (without using them).");
  } else if (creditUtilization > 50) {
    reasons.push("High credit utilization is negatively affecting your score.");
    actions.push("Aim to reduce credit utilization to below 30% for optimal scoring.");
  } else if (creditUtilization > 30) {
    reasons.push("Moderate credit utilization - reducing it further could improve your score.");
    actions.push("Consider paying down balances to get utilization below 30%.");
  } else {
    insights.push("Excellent credit utilization - this is helping your score.");
  }

  // Credit Age Analysis
  if (creditAge < 5) {
    reasons.push("Short credit history is limiting your score potential.");
    actions.push("Keep old accounts open to lengthen your credit age.");
    actions.push("Avoid closing your oldest credit accounts.");
  } else if (creditAge < 10) {
    reasons.push("Credit age is moderate - keeping accounts open longer will help.");
    actions.push("Maintain existing accounts to build longer credit history.");
  } else {
    insights.push("Strong credit age - this is helping your score.");
  }

  // Credit Mix Analysis
  if (creditMix < 5) {
    reasons.push("Limited credit mix may be affecting your score.");
    actions.push("Consider diversifying your credit (credit cards + installment loans).");
    actions.push("A mix of revolving and installment credit can improve scores.");
  } else {
    insights.push("Good credit mix - this is helping your score.");
  }

  // Recent Inquiries Analysis
  if (inquiries > 5) {
    reasons.push("Too many recent credit inquiries are temporarily reducing your score.");
    actions.push("Avoid applying for new credit for the next 6-12 months.");
    actions.push("Shop for loans within a 14-45 day window to minimize inquiry impact.");
  } else if (inquiries > 2) {
    reasons.push("Multiple recent inquiries may be affecting your score.");
    actions.push("Limit new credit applications to avoid further score drops.");
  } else {
    insights.push("Low inquiry activity - this is helping your score.");
  }

  // DTI Ratio Analysis
  if (dtiRatio > 0.43) {
    reasons.push(`Your debt-to-income ratio is very high (${(dtiRatio * 100).toFixed(1)}%).`);
    actions.push("Reduce monthly debt obligations or increase reported income.");
    actions.push("Consider debt consolidation to lower monthly payments.");
  } else if (dtiRatio > 0.36) {
    reasons.push(`Your debt-to-income ratio is high (${(dtiRatio * 100).toFixed(1)}%).`);
    actions.push("Work on reducing debt or increasing income to improve DTI ratio.");
  } else if (dtiRatio > 0.28) {
    reasons.push(`Your debt-to-income ratio is acceptable (${(dtiRatio * 100).toFixed(1)}%).`);
    actions.push("Maintaining this DTI ratio will help with future loan applications.");
  } else {
    insights.push(`Excellent debt-to-income ratio (${(dtiRatio * 100).toFixed(1)}%) - this is helping your profile.`);
  }

  // Missed Payments Analysis
  if (recentMissedPayments > 0) {
    reasons.push(`Recent missed payments (${recentMissedPayments}) are negatively impacting your score.`);
    actions.push("Ensure all future payments are made on time.");
    actions.push("Contact creditors to see if late payments can be removed from your report.");
  } else {
    insights.push("No recent missed payments - this is helping your score.");
  }

  // Defaults Analysis
  if (recentDefaults > 0) {
    reasons.push(`Recent defaults (${recentDefaults}) are severely impacting your credit profile.`);
    actions.push("Address any outstanding defaults immediately.");
    actions.push("Consider working with a credit counselor to develop a repayment plan.");
  } else {
    insights.push("No recent defaults - this is helping your credit profile.");
  }

  // Lending Decision Context
  if (lendingDecision?.decision === 'Approve') {
    insights.push("You are eligible for standard loan options with competitive rates.");
    actions.push("Compare offers from multiple lenders to get the best terms.");
    actions.push("Consider your loan amount carefully to maintain good DTI ratio.");
  } else if (lendingDecision?.decision === 'Review') {
    reasons.push("Your application requires additional review.");
    actions.push("Improve 1-2 core factors to increase approval odds.");
    actions.push("Consider providing additional documentation or collateral.");
  } else if (lendingDecision?.decision === 'Reject') {
    reasons.push("Your application does not meet current lending criteria.");
    actions.push("Consider financial coaching or secured loans to rebuild credit.");
    actions.push("Focus on improving your credit score before reapplying.");
  }

  // Income Analysis
  if (monthlyIncome < 3000) {
    reasons.push("Low reported income may be limiting your borrowing capacity.");
    actions.push("Consider ways to increase your reported income.");
    actions.push("Look for opportunities to reduce expenses to improve debt-to-income ratio.");
  } else if (monthlyIncome > 10000) {
    insights.push("High income level - this strengthens your loan applications.");
  }

  // Ethiopian-Specific Financial Analysis
  const totalLiquidAssets = bankBalance + mobileMoneyBalance;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  
  // Savings Analysis
  if (monthlySavings > 0) {
    if (savingsRate >= 20) {
      insights.push(`Excellent savings rate (${savingsRate.toFixed(1)}%) - this demonstrates strong financial discipline.`);
    } else if (savingsRate >= 10) {
      insights.push(`Good savings rate (${savingsRate.toFixed(1)}%) - maintaining this will help build financial security.`);
    } else {
      reasons.push(`Low savings rate (${savingsRate.toFixed(1)}%) - increasing savings can improve your financial profile.`);
      actions.push("Aim to save at least 10-20% of your monthly income.");
    }
  } else {
    reasons.push("No monthly savings recorded - this may concern lenders.");
    actions.push("Start with small savings goals, even 5% of income can make a difference.");
  }

  // Liquid Assets Analysis
  if (totalLiquidAssets > monthlyIncome * 3) {
    insights.push("Strong liquid assets - you have good financial reserves.");
  } else if (totalLiquidAssets > monthlyIncome) {
    insights.push("Adequate liquid assets for emergency situations.");
  } else {
    reasons.push("Limited liquid assets - building emergency savings is recommended.");
    actions.push("Aim to build emergency savings equal to 3-6 months of expenses.");
  }

  // Mobile Money Usage (Ethiopian Context)
  if (mobileMoneyBalance > 0) {
    insights.push("Active mobile money usage - this shows digital financial inclusion.");
  } else {
    actions.push("Consider using mobile money services for better financial tracking.");
  }

  // Bank Account Analysis
  if (bankBalance > 0) {
    insights.push("Active bank account usage - this strengthens your financial profile.");
  } else {
    reasons.push("No bank account balance recorded - having a bank account can improve creditworthiness.");
    actions.push("Consider opening a bank account if you don't have one.");
  }

  // Debt Analysis
  if (totalDebt > monthlyIncome * 12) {
    reasons.push("Total debt exceeds annual income, which is concerning to lenders.");
    actions.push("Develop a debt reduction plan.");
    actions.push("Consider debt consolidation to lower interest rates.");
  }

  // Historical Behavior Insights
  if (score > 700 && creditAge > 10) {
    insights.push("Long-term responsible credit behavior - excellent track record.");
  }
  
  if (recentMissedPayments === 0 && recentDefaults === 0 && creditAge > 5) {
    insights.push("Consistent payment history over time - strong reliability indicator.");
  }

  // Personalized Recommendations
  if (score < 600) {
    actions.push("Consider a secured credit card to rebuild credit.");
    actions.push("Look into credit-builder loans from local credit unions.");
  }
  
  if (creditUtilization > 50) {
    actions.push("Prioritize paying down high-interest credit card debt first.");
  }
  
  if (dtiRatio > 0.4) {
    actions.push("Consider refinancing existing debt to lower monthly payments.");
  }

  return {
    summary: reasons,
    recommendations: actions,
    insights: insights,
    metrics: {
      score,
      classification,
      dtiRatio: (dtiRatio * 100).toFixed(1),
      creditUtilization: (creditUtilization * 100).toFixed(1),
      creditAge: creditAge.toFixed(1),
      recentInquiries: inquiries,
      missedPayments: recentMissedPayments,
      defaults: recentDefaults
    }
  };
}

// Generate specific reasoning for different components
export function generateScoreBreakdownReasoning(breakdown) {
  const analysis = {};
  
  if (breakdown.paymentHistory < 20) {
    analysis.paymentHistory = {
      status: 'critical',
      message: 'Payment history is severely impacting your score',
      action: 'Focus on making all payments on time'
    };
  } else if (breakdown.paymentHistory < 40) {
    analysis.paymentHistory = {
      status: 'warning',
      message: 'Payment history needs improvement',
      action: 'Continue making timely payments'
    };
  } else {
    analysis.paymentHistory = {
      status: 'good',
      message: 'Strong payment history',
      action: 'Maintain current payment behavior'
    };
  }

  if (breakdown.creditUtilization > 70) {
    analysis.creditUtilization = {
      status: 'critical',
      message: 'Very high credit utilization',
      action: 'Pay down balances immediately'
    };
  } else if (breakdown.creditUtilization > 50) {
    analysis.creditUtilization = {
      status: 'warning',
      message: 'High credit utilization',
      action: 'Reduce utilization below 30%'
    };
  } else {
    analysis.creditUtilization = {
      status: 'good',
      message: 'Good credit utilization',
      action: 'Maintain current utilization levels'
    };
  }

  return analysis;
}

// Generate lending decision reasoning
export function generateLendingReasoning(lendingDecision, userData) {
  const reasoning = {
    decision: lendingDecision.decision,
    confidence: 'high',
    factors: [],
    nextSteps: []
  };

  if (lendingDecision.decision === 'Approve') {
    reasoning.confidence = 'high';
    reasoning.factors.push('Strong credit score');
    reasoning.factors.push('Good payment history');
    reasoning.factors.push('Reasonable debt-to-income ratio');
    reasoning.nextSteps.push('Compare offers from multiple lenders');
    reasoning.nextSteps.push('Review loan terms carefully');
  } else if (lendingDecision.decision === 'Review') {
    reasoning.confidence = 'medium';
    reasoning.factors.push('Moderate credit score');
    reasoning.factors.push('Some risk factors present');
    reasoning.nextSteps.push('Improve credit score before reapplying');
    reasoning.nextSteps.push('Consider providing additional documentation');
  } else {
    reasoning.confidence = 'low';
    reasoning.factors.push('Low credit score');
    reasoning.factors.push('High debt-to-income ratio');
    reasoning.factors.push('Recent payment issues');
    reasoning.nextSteps.push('Focus on credit repair');
    reasoning.nextSteps.push('Consider secured loan options');
  }

  return reasoning;
}

// Generate improvement suggestions
export function generateImprovementSuggestions(userData, scoreResult) {
  const suggestions = [];
  const priority = [];

  const { score, breakdown } = scoreResult || {};
  const dtiRatio = (userData.totalDebt || 0) / ((userData.monthlyIncome || 1) * 12);

  // High priority suggestions
  if (breakdown?.paymentHistory < 20) {
    priority.push({
      action: 'Fix payment history',
      impact: 'High',
      timeframe: '6-12 months',
      description: 'Make all payments on time to improve this critical factor'
    });
  }

  if (breakdown?.creditUtilization > 70) {
    priority.push({
      action: 'Reduce credit utilization',
      impact: 'High',
      timeframe: '1-3 months',
      description: 'Pay down credit card balances to below 30%'
    });
  }

  if (dtiRatio > 0.43) {
    priority.push({
      action: 'Lower debt-to-income ratio',
      impact: 'High',
      timeframe: '3-6 months',
      description: 'Reduce debt or increase income to improve DTI'
    });
  }

  // Medium priority suggestions
  if (breakdown?.creditAge < 5) {
    suggestions.push({
      action: 'Build credit age',
      impact: 'Medium',
      timeframe: 'Long-term',
      description: 'Keep old accounts open to lengthen credit history'
    });
  }

  if (breakdown?.creditMix < 5) {
    suggestions.push({
      action: 'Diversify credit mix',
      impact: 'Medium',
      timeframe: '6-12 months',
      description: 'Consider adding different types of credit'
    });
  }

  return { priority, suggestions };
} 