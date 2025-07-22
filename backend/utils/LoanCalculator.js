export class LoanCalculator {
  constructor(scoreData, userData) {
    this.scoreData = scoreData;
    this.userData = userData;
    this.version = scoreData.version || 'v101';
    this.adjustments = [];
    this.auditTrail = [];
    this.offer = {};
  }

  validate() {
    const safeFields = ['activeLoanCount', 'recentDefaults', 'consecutiveMissedPayments', 'missedPaymentsLast12'];
    safeFields.forEach(field => {
      const val = this.userData[field];
      if (val < 0 || val > 1000) throw new Error(`Invalid input for ${field}`);
    });
  }

  setBaseOffer() {
    const score = this.scoreData.score;
    if (score >= 800) this.setOffer(100_000, 12, 36, 'Very Low');
    else if (score >= 740) this.setOffer(75_000, 15, 24, 'Low');
    else if (score >= 670) this.setOffer(50_000, 18, 18, 'Moderate');
    else if (score >= 580) this.setOffer(25_000, 22, 12, 'Elevated');
    else this.reject('Score too low for loan eligibility');
  }

  setOffer(amount, rate, term, riskTier) {
    this.offer = {
      approved: true,
      approvedAmount: amount,
      interestRate: rate,
      termMonths: term,
      riskTier,
      adjustments: [],
      audit: [],
      classification: this.scoreData.classification,
      score: this.scoreData.score,
      engineVersion: this.version,
      collateralValue: this.userData.collateralValue || 0,
      collateralRequired: (this.userData.collateralValue || 0) > 0
    };
  }

  reject(reason) {
    this.offer = {
      approved: false,
      reason,
      score: this.scoreData.score,
      classification: this.scoreData.classification,
      engineVersion: this.version,
      collateralValue: this.userData.collateralValue || 0,
      collateralRequired: (this.userData.collateralValue || 0) > 0
    };
    throw this.offer;
  }

  applyAdjustments() {
    const u = this.userData;

    // 🔺 Bonuses
    if (u.onTimePaymentRate >= 0.95) {
      this.apply('onTimePaymentRate', 'BONUS', +5000, -1, 'Excellent long-term payment history');
    }

    if (u.onTimeRateLast6Months >= 0.95) {
      this.apply('onTimeRateLast6Months', 'RECENT_BONUS', +2000, -0.5, 'Strong recent payment behavior');
    }

    if ((u.loanTypeCounts?.creditCard || 0) > 0 && (u.loanTypeCounts?.carLoan || 0) > 0) {
      this.apply('loanTypeCounts', 'MIXED_CREDIT_BONUS', +3000, -0.5, 'Good mix of revolving & installment credit');
    }

    // 🔻 Penalties
    if (u.recentDefaults > 0) {
      this.apply('recentDefaults', 'PENALTY', -10000, +3, 'Recent defaults');
    }

    if (u.consecutiveMissedPayments >= 2) {
      this.apply('missedStreak', 'PENALTY', -3000, +2, 'Consecutive missed payments');
    }

    if (u.missedPaymentsLast12 >= 3) {
      this.apply('missedPaymentsLast12', 'RECENT_PENALTY', -5000, +2, 'Multiple missed payments in last 12 months');
    }

    if (u.monthsSinceLastDelinquency <= 6) {
      this.apply('monthsSinceLastDelinquency', 'DELINQUENCY_RECENCY', -4000, +1.5, 'Recent delinquency');
    }

    if (u.activeLoanCount > 5) {
      this.apply('activeLoanCount', 'PENALTY', -5000, 0, 'Too many active loans');
    }

    if (u.recentLoanApplications > 3) {
      this.apply('recentLoanApplications', 'PENALTY', 0, +1.5, 'Multiple recent loan applications');
    }

    // 🔺 Collateral Bonus
    if (u.collateralValue && u.collateralValue > 0) {
      const collateralBonus = Math.floor(u.collateralValue * 0.7); // 70% of collateral value
      this.apply('collateralValue', 'COLLATERAL_BONUS', +collateralBonus, -0.5, `Collateral value of $${u.collateralValue.toLocaleString()} provides security`);
    }
  }

  apply(field, type, amountAdj = 0, rateAdj = 0, message = '') {
    if (amountAdj) this.offer.approvedAmount += amountAdj;
    if (rateAdj) this.offer.interestRate += rateAdj;

    const log = { field, type, amountAdj, rateAdj, message };
    this.adjustments.push(log);
    this.auditTrail.push({ ...log, timestamp: new Date().toISOString() });
  }

  finalize() {
    const score = this.scoreData.score;
    const tierMap = {
      'Very Low': 800,
      'Low': 740,
      'Moderate': 670,
      'Elevated': 580
    };

    this.offer.approvedAmount = Math.max(10000, this.offer.approvedAmount);
    this.offer.interestRate = Math.max(10, Math.min(this.offer.interestRate, 36));
    this.offer.termMonths = Math.min(48, this.offer.termMonths);

    this.offer.riskTier = Object.entries(tierMap).find(([_, threshold]) => score >= threshold)[0];

    const offerScore = Math.min(100, Math.floor(score * 0.8 + (this.userData.onTimePaymentRate || 0) * 20));
    const riskFlags = [];

    if (this.userData.recentDefaults > 0) riskFlags.push('RECENT_DEFAULT');
    if (this.userData.consecutiveMissedPayments >= 3) riskFlags.push('CHRONIC_LATE');
    if (this.userData.missedPaymentsLast12 >= 3) riskFlags.push('ACTIVE_RISK');

    return {
      ...this.offer,
      adjustments: this.adjustments,
      auditTrail: this.auditTrail,
      offerScore,
      riskFlags,
      collateralValue: this.userData.collateralValue || 0,
      collateralRequired: (this.userData.collateralValue || 0) > 0
    };
  }

  run() {
    try {
      this.validate();
      this.setBaseOffer();
      this.applyAdjustments();
      return this.finalize();
    } catch (res) {
      if (res.approved === false) return res;
      throw res;
    }
  }
}
