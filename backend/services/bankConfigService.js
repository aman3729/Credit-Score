import PartnerBank from '../models/PartnerBank.js';
import { logger } from '../config/logger.js';

class BankConfigService {
  constructor() {
    this.configCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get bank configuration by bank code
   * @param {string} bankCode - The bank code (e.g., 'CBE', 'AMAN')
   * @returns {Promise<Object>} Bank configuration
   */
  async getBankConfig(bankCode) {
    try {
      // Check cache first
      const cacheKey = `bank_${bankCode}`;
      const cached = this.configCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.config;
      }

      const bank = await PartnerBank.findOne({ 
        code: bankCode.toUpperCase(), 
        status: 'active' 
      });

      if (!bank) {
        throw new Error(`Bank configuration not found for code: ${bankCode}`);
      }

      const config = bank.getCompleteConfig();
      
      // Cache the configuration
      this.configCache.set(cacheKey, {
        config,
        timestamp: Date.now()
      });

      return config;
    } catch (error) {
      logger.error('Error getting bank config:', error);
      throw error;
    }
  }

  /**
   * Get engine configuration for a specific bank and engine
   * @param {string} bankCode - The bank code
   * @param {string} engineType - 'engine1' or 'engine2'
   * @returns {Promise<Object>} Engine configuration
   */
  async getEngineConfig(bankCode, engineType = 'engine1') {
    try {
      const bankConfig = await this.getBankConfig(bankCode);
      return bankConfig.engineConfig[engineType];
    } catch (error) {
      logger.error('Error getting engine config:', error);
      throw error;
    }
  }

  /**
   * Get lending policy for a specific bank
   * @param {string} bankCode - The bank code
   * @returns {Promise<Object>} Lending policy
   */
  async getLendingPolicy(bankCode) {
    try {
      const bankConfig = await this.getBankConfig(bankCode);
      return bankConfig.lendingPolicy;
    } catch (error) {
      logger.error('Error getting lending policy:', error);
      throw error;
    }
  }

  /**
   * Get access controls for a specific bank
   * @param {string} bankCode - The bank code
   * @returns {Promise<Object>} Access controls
   */
  async getAccessControls(bankCode) {
    try {
      const bankConfig = await this.getBankConfig(bankCode);
      return bankConfig.accessControls;
    } catch (error) {
      logger.error('Error getting access controls:', error);
      throw error;
    }
  }

  /**
   * Get branding configuration for a specific bank
   * @param {string} bankCode - The bank code
   * @returns {Promise<Object>} Branding configuration
   */
  async getBranding(bankCode) {
    try {
      const bankConfig = await this.getBankConfig(bankCode);
      return bankConfig.branding;
    } catch (error) {
      logger.error('Error getting branding config:', error);
      throw error;
    }
  }

  /**
   * Update bank configuration
   * @param {string} bankCode - The bank code
   * @param {Object} updates - Configuration updates
   * @param {string} updatedBy - User ID who made the update
   * @returns {Promise<Object>} Updated bank configuration
   */
  async updateBankConfig(bankCode, updates, updatedBy) {
    try {
      const bank = await PartnerBank.findOne({ code: bankCode.toUpperCase() });
      if (!bank) {
        throw new Error(`Bank not found: ${bankCode}`);
      }

      // Update the configuration
      if (updates.engineConfig) {
        bank.engineConfig = { ...bank.engineConfig, ...updates.engineConfig };
      }
      if (updates.lendingPolicy) {
        bank.lendingPolicy = { ...bank.lendingPolicy, ...updates.lendingPolicy };
      }
      if (updates.accessControls) {
        bank.accessControls = { ...bank.accessControls, ...updates.accessControls };
      }
      if (updates.branding) {
        bank.branding = { ...bank.branding, ...updates.branding };
      }

      bank.updatedBy = updatedBy;

      // Validate the configuration
      const validationErrors = bank.validateConfiguration();
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      await bank.save();

      // Clear cache for this bank
      this.configCache.delete(`bank_${bankCode}`);

      return bank.getCompleteConfig();
    } catch (error) {
      logger.error('Error updating bank config:', error);
      throw error;
    }
  }

  /**
   * Clear configuration cache
   * @param {string} bankCode - Optional bank code to clear specific cache
   */
  clearCache(bankCode = null) {
    if (bankCode) {
      this.configCache.delete(`bank_${bankCode}`);
    } else {
      this.configCache.clear();
    }
  }

  /**
   * Get default configuration template
   * @returns {Object} Default configuration template
   */
  getDefaultConfig() {
    return {
      engineConfig: {
        engine1: {
          scoringWeights: {
            paymentHistory: 35,
            creditUtilization: 30,
            creditAge: 15,
            creditMix: 10,
            inquiries: 10
          },
          penalties: {
            recentDefaults: -15,
            missedPaymentsLast12: { threshold: 2, penalty: -5 },
            lowOnTimeRate: { threshold: 0.85, penalty: -4 },
            highInquiries: { threshold: 3, penalty: -2 }
          },
          bonuses: {
            perfectPaymentRate: 5,
            goodCreditMix: 2,
            highTransactionVolume: 3
          },
          rejectionRules: {
            allowConsecutiveMissedPayments: false,
            maxMissedPayments12Mo: 3,
            minMonthsSinceLastDelinquency: 3
          },
          maxScore: 850,
          minScore: 300,
          allowManualOverride: true
        },
        engine2: {
          weights: {
            capacity: 35,
            capital: 20,
            collateral: 20,
            conditions: 15,
            character: 10
          },
          subFactors: {
            cashFlowWeight: 50,
            incomeStabilityWeight: 30,
            discretionarySpendingWeight: 20,
            budgetingConsistencyWeight: 10,
            savingsConsistencyWeight: 10
          },
          behavioralThresholds: {
            maxDTI: 0.45,
            minSavingsRate: 0.1,
            stableEmploymentRequired: true
          },
          riskLabels: {
            highRiskThreshold: 40,
            moderateRiskThreshold: 60,
            lowRiskThreshold: 80
          },
          allowManualReview: true
        }
      },
      lendingPolicy: {
        baseLoanAmounts: {
          EXCELLENT: 100000,
          VERY_GOOD: 75000,
          GOOD: 50000,
          FAIR: 30000,
          POOR: 10000
        },
        incomeMultipliers: {
          EXCELLENT: 10,
          VERY_GOOD: 8,
          GOOD: 6,
          FAIR: 4,
          POOR: 2
        },
        interestRateRules: {
          baseRate: 12.5,
          adjustments: {
            HIGH_DTI: 3,
            EMPLOYMENT_UNSTABLE: 2,
            RECENT_DEFAULT: 5
          },
          maxRate: 35.99
        },
        termOptions: [12, 24, 36, 48],
        recessionMode: false,
        allowCollateralOverride: true,
        requireCollateralFor: ['POOR', 'FAIR']
      },
      accessControls: {
        canExportData: true,
        apiAccessEnabled: false,
        maxFileSizeMb: 5,
        visibleTabs: ['Loan Decisions', 'Applications', 'Upload', 'Simulation']
      },
      branding: {
        primaryColor: '#004aad',
        theme: 'light',
        currency: 'ETB',
        language: 'en'
      }
    };
  }

  /**
   * Validate configuration object
   * @param {Object} config - Configuration to validate
   * @returns {Array} Array of validation errors
   */
  validateConfig(config) {
    const errors = [];

    // Validate engine1 weights sum to 100
    if (config.engineConfig?.engine1?.scoringWeights) {
      const weights = config.engineConfig.engine1.scoringWeights;
      const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      if (Math.abs(weightSum - 100) > 1) {
        errors.push(`Engine1 scoring weights must sum to 100 (current: ${weightSum})`);
      }
    }

    // Validate engine2 weights sum to 100
    if (config.engineConfig?.engine2?.weights) {
      const weights = config.engineConfig.engine2.weights;
      const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      if (Math.abs(weightSum - 100) > 1) {
        errors.push(`Engine2 weights must sum to 100 (current: ${weightSum})`);
      }
    }

    // Validate score ranges
    if (config.engineConfig?.engine1) {
      const engine1 = config.engineConfig.engine1;
      if (engine1.maxScore && engine1.minScore && engine1.maxScore <= engine1.minScore) {
        errors.push('Engine1 max score must be greater than min score');
      }
    }

    // Validate interest rates
    if (config.lendingPolicy?.interestRateRules) {
      const rates = config.lendingPolicy.interestRateRules;
      if (rates.baseRate && rates.maxRate && rates.baseRate > rates.maxRate) {
        errors.push('Base rate cannot be higher than max rate');
      }
    }

    return errors;
  }
}

// Create singleton instance
const bankConfigService = new BankConfigService();

export default bankConfigService; 