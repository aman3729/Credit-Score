import PartnerBank from '../models/PartnerBank.js';
import User from '../models/User.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import bankConfigService from '../services/bankConfigService.js';

// Get all partner banks
export const getAllPartnerBanks = catchAsync(async (req, res) => {
  const banks = await PartnerBank.find({ status: { $ne: 'suspended' } })
    .select('-engineConfig -lendingPolicy -accessControls -branding')
    .sort({ name: 1 });

  res.status(200).json({
    status: 'success',
    results: banks.length,
    data: banks
  });
});

// Get all partner banks with full configuration (for admin dashboard)
export const getAllPartnerBanksWithConfig = catchAsync(async (req, res) => {
  console.log('🔍 getAllPartnerBanksWithConfig called');
  console.log('👤 Current user:', {
    id: req.user._id,
    role: req.user.role,
    bankId: req.user.bankId,
    email: req.user.email
  });
  
  const banks = await PartnerBank.find({ status: { $ne: 'suspended' } })
    .sort({ name: 1 });

  console.log(`📊 Query returned ${banks.length} banks`);
  console.log('🏦 Bank codes:', banks.map(b => b.code).join(', '));

  res.status(200).json({
    status: 'success',
    results: banks.length,
    data: banks
  });
});

// Get partner bank by ID
export const getPartnerBank = catchAsync(async (req, res, next) => {
  const bank = await PartnerBank.findById(req.params.id);
  
  if (!bank) {
    return next(new AppError('Partner bank not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: bank
  });
});

// Get partner bank by code
export const getPartnerBankByCode = catchAsync(async (req, res, next) => {
  const bank = await PartnerBank.findOne({ code: req.params.code.toUpperCase() });
  
  if (!bank) {
    return next(new AppError('Partner bank not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: bank
  });
});

// Create new partner bank
export const createPartnerBank = catchAsync(async (req, res) => {
  const newBank = await PartnerBank.create({
    ...req.body,
    createdBy: req.user.id
  });

  res.status(201).json({
    status: 'success',
    data: newBank
  });
});

// Update partner bank
export const updatePartnerBank = catchAsync(async (req, res, next) => {
  const bank = await PartnerBank.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      updatedBy: req.user.id
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!bank) {
    return next(new AppError('Partner bank not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: bank
  });
});

// Update lending configuration
export const updateLendingConfig = catchAsync(async (req, res, next) => {
  const { lendingConfig } = req.body;
  
  if (!lendingConfig) {
    return next(new AppError('Lending configuration is required', 400));
  }

  const bank = await PartnerBank.findById(req.params.id);
  
  if (!bank) {
    return next(new AppError('Partner bank not found', 404));
  }

  // Update lending config
  bank.lendingConfig = {
    ...bank.lendingConfig,
    ...lendingConfig
  };

  // Validate configuration
  const validationErrors = bank.validateLendingConfig();
  if (validationErrors.length > 0) {
    return next(new AppError(`Configuration validation failed: ${validationErrors.join(', ')}`, 400));
  }

  bank.updatedBy = req.user.id;
  await bank.save();

  res.status(200).json({
    status: 'success',
    data: bank
  });
});

// Update engine configuration
export const updateEngineConfig = catchAsync(async (req, res, next) => {
  const { engineConfig } = req.body;
  
  if (!engineConfig) {
    return next(new AppError('Engine configuration is required', 400));
  }

  const bank = await PartnerBank.findById(req.params.id);
  
  if (!bank) {
    return next(new AppError('Partner bank not found', 404));
  }

  // Update engine config
  bank.engineConfig = {
    ...bank.engineConfig,
    ...engineConfig
  };

  // Validate configuration
  const validationErrors = bank.validateConfiguration();
  if (validationErrors.length > 0) {
    return next(new AppError(`Configuration validation failed: ${validationErrors.join(', ')}`, 400));
  }

  bank.updatedBy = req.user.id;
  await bank.save();

  // Clear cache for this bank
  bankConfigService.clearCache(bank.code);

  res.status(200).json({
    status: 'success',
    data: bank
  });
});

// Update lending policy
export const updateLendingPolicy = catchAsync(async (req, res, next) => {
  const { lendingPolicy } = req.body;
  
  if (!lendingPolicy) {
    return next(new AppError('Lending policy is required', 400));
  }

  const bank = await PartnerBank.findById(req.params.id);
  
  if (!bank) {
    return next(new AppError('Partner bank not found', 404));
  }

  // Update lending policy
  bank.lendingPolicy = {
    ...bank.lendingPolicy,
    ...lendingPolicy
  };

  bank.updatedBy = req.user.id;
  await bank.save();

  // Clear cache for this bank
  bankConfigService.clearCache(bank.code);

  res.status(200).json({
    status: 'success',
    data: bank
  });
});

// Update access controls
export const updateAccessControls = catchAsync(async (req, res, next) => {
  const { accessControls } = req.body;
  
  if (!accessControls) {
    return next(new AppError('Access controls are required', 400));
  }

  const bank = await PartnerBank.findById(req.params.id);
  
  if (!bank) {
    return next(new AppError('Partner bank not found', 404));
  }

  // Update access controls
  bank.accessControls = {
    ...bank.accessControls,
    ...accessControls
  };

  bank.updatedBy = req.user.id;
  await bank.save();

  res.status(200).json({
    status: 'success',
    data: bank
  });
});

// Update branding
export const updateBranding = catchAsync(async (req, res, next) => {
  const { branding } = req.body;
  
  if (!branding) {
    return next(new AppError('Branding configuration is required', 400));
  }

  const bank = await PartnerBank.findById(req.params.id);
  
  if (!bank) {
    return next(new AppError('Partner bank not found', 404));
  }

  // Update branding
  bank.branding = {
    ...bank.branding,
    ...branding
  };

  bank.updatedBy = req.user.id;
  await bank.save();

  res.status(200).json({
    status: 'success',
    data: bank
  });
});

// Get lending configuration for a specific product
export const getLendingConfig = catchAsync(async (req, res, next) => {
  const { productType = 'personal' } = req.query;
  
  const bank = await PartnerBank.findById(req.params.id);
  
  if (!bank) {
    return next(new AppError('Partner bank not found', 404));
  }

  const config = bank.getLendingConfig(productType);

  res.status(200).json({
    status: 'success',
    data: {
      bankId: bank._id,
      bankName: bank.name,
      bankCode: bank.code,
      productType,
      config
    }
  });
});

// Get engine configuration
export const getEngineConfig = catchAsync(async (req, res, next) => {
  const { engineType = 'engine1' } = req.query;
  
  const bank = await PartnerBank.findById(req.params.id);
  
  if (!bank) {
    return next(new AppError('Partner bank not found', 404));
  }

  const config = bank.getEngineConfig(engineType);

  res.status(200).json({
    status: 'success',
    data: {
      bankId: bank._id,
      bankName: bank.name,
      bankCode: bank.code,
      engineType,
      config
    }
  });
});

// Delete partner bank
export const deletePartnerBank = catchAsync(async (req, res, next) => {
  const bank = await PartnerBank.findById(req.params.id);
  
  if (!bank) {
    return next(new AppError('Partner bank not found', 404));
  }

  // Check if there are users associated with this bank
  const userCount = await User.countDocuments({ bankId: bank.code });
  if (userCount > 0) {
    return next(new AppError(`Cannot delete bank with ${userCount} associated users`, 400));
  }

  await PartnerBank.findByIdAndDelete(req.params.id);

  // Clear cache for this bank
  bankConfigService.clearCache(bank.code);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get bank statistics
export const getBankStatistics = catchAsync(async (req, res, next) => {
  const bank = await PartnerBank.findById(req.params.id);
  
  if (!bank) {
    return next(new AppError('Partner bank not found', 404));
  }

  // Get user statistics
  const userStats = await User.aggregate([
    { $match: { bankId: bank.code } },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        pendingUsers: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        premiumUsers: { $sum: { $cond: [{ $eq: ['$plan', 'premium'] }, 1, 0] } }
      }
    }
  ]);

  const stats = userStats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    premiumUsers: 0
  };

  res.status(200).json({
    status: 'success',
    data: {
      bankId: bank._id,
      bankName: bank.name,
      bankCode: bank.code,
      status: bank.status,
      createdAt: bank.createdAt,
      statistics: stats
    }
  });
});

// Validate lending configuration
export const validateLendingConfig = catchAsync(async (req, res, next) => {
  const { lendingConfig } = req.body;
  
  if (!lendingConfig) {
    return next(new AppError('Lending configuration is required', 400));
  }

  // Create a temporary bank instance for validation
  const tempBank = new PartnerBank({
    name: 'Temp',
    slug: 'temp',
    code: 'TEMP',
    lendingConfig
  });

  const validationErrors = tempBank.validateLendingConfig();

  res.status(200).json({
    status: 'success',
    data: {
      isValid: validationErrors.length === 0,
      errors: validationErrors
    }
  });
});

// Validate engine configuration
export const validateEngineConfig = catchAsync(async (req, res, next) => {
  const { engineConfig } = req.body;
  
  if (!engineConfig) {
    return next(new AppError('Engine configuration is required', 400));
  }

  // Create a temporary bank instance for validation
  const tempBank = new PartnerBank({
    name: 'Temp',
    slug: 'temp',
    code: 'TEMP',
    engineConfig
  });

  const validationErrors = tempBank.validateConfiguration();

  res.status(200).json({
    status: 'success',
    data: {
      isValid: validationErrors.length === 0,
      errors: validationErrors
    }
  });
});

// Get banks for current user
export const getMyBanks = catchAsync(async (req, res) => {
  const userBanks = await PartnerBank.find({
    code: req.user.bankId,
    status: 'active'
  }).select('-engineConfig -lendingPolicy -accessControls -branding');

  res.status(200).json({
    status: 'success',
    data: userBanks
  });
});

// Get current user's bank configuration
export const getMyBankConfig = catchAsync(async (req, res, next) => {
  const { productType = 'personal' } = req.query;
  
  // Check if user has a bankId
  if (!req.user.bankId) {
    return next(new AppError('User is not associated with any bank. Please contact your administrator.', 404));
  }
  
  const bank = await PartnerBank.findOne({
    code: req.user.bankId,
    status: 'active'
  });
  
  if (!bank) {
    return next(new AppError(`Bank configuration not found for bank code: ${req.user.bankId}`, 404));
  }

  const config = bank.getLendingConfig(productType);

  res.status(200).json({
    status: 'success',
    data: {
      bankId: bank._id,
      bankName: bank.name,
      bankCode: bank.code,
      productType,
      config
    }
  });
});

// Get current user's complete bank configuration
export const getMyCompleteConfig = catchAsync(async (req, res, next) => {
  // Check if user has a bankId
  if (!req.user.bankId) {
    return next(new AppError('User is not associated with any bank. Please contact your administrator.', 404));
  }
  
  try {
    const bankConfig = await bankConfigService.getBankConfig(req.user.bankId);
    
    res.status(200).json({
      status: 'success',
      data: {
        bankCode: req.user.bankId,
        config: bankConfig
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to load bank configuration: ${error.message}`, 404));
  }
});

// Get current user's engine configuration
export const getMyEngineConfig = catchAsync(async (req, res, next) => {
  const { engineType = 'engine1' } = req.query;
  
  // Check if user has a bankId
  if (!req.user.bankId) {
    return next(new AppError('User is not associated with any bank. Please contact your administrator.', 404));
  }
  
  try {
    const engineConfig = await bankConfigService.getEngineConfig(req.user.bankId, engineType);
    
    res.status(200).json({
      status: 'success',
      data: {
        bankCode: req.user.bankId,
        engineType,
        config: engineConfig
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to load engine configuration: ${error.message}`, 404));
  }
});

// Get current user's lending policy
export const getMyLendingPolicy = catchAsync(async (req, res, next) => {
  // Check if user has a bankId
  if (!req.user.bankId) {
    return next(new AppError('User is not associated with any bank. Please contact your administrator.', 404));
  }
  
  try {
    const lendingPolicy = await bankConfigService.getLendingPolicy(req.user.bankId);
    
    res.status(200).json({
      status: 'success',
      data: {
        bankCode: req.user.bankId,
        policy: lendingPolicy
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to load lending policy: ${error.message}`, 404));
  }
});

// Get current user's access controls
export const getMyAccessControls = catchAsync(async (req, res, next) => {
  // Check if user has a bankId
  if (!req.user.bankId) {
    return next(new AppError('User is not associated with any bank. Please contact your administrator.', 404));
  }
  
  try {
    const accessControls = await bankConfigService.getAccessControls(req.user.bankId);
    
    res.status(200).json({
      status: 'success',
      data: {
        bankCode: req.user.bankId,
        accessControls
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to load access controls: ${error.message}`, 404));
  }
});

// Get current user's branding
export const getMyBranding = catchAsync(async (req, res, next) => {
  // Check if user has a bankId
  if (!req.user.bankId) {
    return next(new AppError('User is not associated with any bank. Please contact your administrator.', 404));
  }
  
  try {
    const branding = await bankConfigService.getBranding(req.user.bankId);
    
    res.status(200).json({
      status: 'success',
      data: {
        bankCode: req.user.bankId,
        branding
      }
    });
  } catch (error) {
    return next(new AppError(`Failed to load branding: ${error.message}`, 404));
  }
}); 