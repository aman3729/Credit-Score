// utils/creditScoring.js

export function calculateCreditScore(userData, options = {}) {
  if (!userData) {
    console.error('[Credit Scoring] Error: No user data provided');
    throw new Error('User data is required for credit scoring');
  }

  try {
    // Log input data for debugging
    console.log('[Credit Scoring] Calculating score with data:', {
      paymentHistory: userData.paymentHistory,
      creditUtilization: userData.creditUtilization,
      creditAge: userData.creditAge,
      creditMix: userData.creditMix,
      inquiries: userData.inquiries,
      totalDebt: userData.totalDebt,
      totalCredit: userData.totalCredit,
      monthlyIncome: userData.monthlyIncome,
      recentMissedPayments: userData.recentMissedPayments,
      recentDefaults: userData.recentDefaults,
      lastActiveDate: userData.lastActiveDate,
      creditScore: userData.creditScore,
      creditReport: userData.creditReport ? 'present' : 'missing'
    });

    // Destructure with defaults
    const {
      paymentHistory = 0,
      creditUtilization = 1,
      creditAge = 0,
      creditMix = 0,
      inquiries = 1,
      totalDebt = 0,
      totalCredit = 1,
      monthlyIncome = 1,
      recentMissedPayments = 0,
      recentDefaults = 0,
      lastActiveDate = new Date(),
    } = userData;

    const utilizationScore = 1 - creditUtilization;
    const inquiryScore = 1 - inquiries;
    const dti = totalDebt / (monthlyIncome * 12);
    const dtiPenalty = dti > 0.4 ? -5 : 0;
    const missedPenalty = recentMissedPayments > 0 ? -5 : 0;
    const defaultPenalty = recentDefaults > 0 ? -10 : 0;

    const weightedScore = (
      paymentHistory * 35 +
      utilizationScore * 30 +
      creditAge * 15 +
      creditMix * 10 +
      inquiryScore * 10
    );

    const rawScore = weightedScore + dtiPenalty + missedPenalty + defaultPenalty;
    const scaledScore = Math.round(300 + ((rawScore / 100) * 550));
    const finalScore = Math.max(300, Math.min(scaledScore, 850));

    let classification = 'Poor';
    if (finalScore >= 800) classification = 'Excellent';
    else if (finalScore >= 740) classification = 'Very Good';
    else if (finalScore >= 670) classification = 'Good';
    else if (finalScore >= 580) classification = 'Fair';

    const scoreComponents = {
      paymentHistory: +(paymentHistory * 35).toFixed(2),
      creditUtilization: +(utilizationScore * 30).toFixed(2),
      creditAge: +(creditAge * 15).toFixed(2),
      creditMix: +(creditMix * 10).toFixed(2),
      inquiries: +(inquiryScore * 10).toFixed(2),
    };

    const result = {
      score: finalScore,
      classification,
      baseScore: weightedScore,
      breakdown: {
        ...scoreComponents,
        dtiPenalty,
        missedPaymentPenalty: missedPenalty,
        defaultPenalty,
      },
    };

    console.log('[Credit Scoring] Calculated score result:', result);
    return result;
  } catch (error) {
    console.error('[Credit Scoring] Error calculating credit score:', {
      error: error.message,
      stack: error.stack,
      userData: JSON.stringify(userData, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value // handle BigInt serialization
      )
    });
    throw error; // Re-throw to be handled by the caller
  }
}