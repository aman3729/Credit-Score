import express from 'express';
import {
  getAllPartnerBanks,
  getAllPartnerBanksWithConfig,
  getPartnerBank,
  getPartnerBankByCode,
  createPartnerBank,
  updatePartnerBank,
  updateLendingConfig,
  updateEngineConfig,
  updateLendingPolicy,
  updateAccessControls,
  updateBranding,
  getLendingConfig,
  getEngineConfig,
  deletePartnerBank,
  getBankStatistics,
  validateLendingConfig,
  validateEngineConfig,
  getMyBanks,
  getMyBankConfig,
  getMyCompleteConfig,
  getMyEngineConfig,
  getMyLendingPolicy,
  getMyAccessControls,
  getMyBranding
} from '../controllers/partnerBankController.js';
import { protect, requireAdmin, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Public routes (for authenticated users)
router.route('/my/banks').get(getMyBanks);
router.route('/my/config').get(getMyBankConfig);
router.route('/my/complete-config').get(getMyCompleteConfig);
router.route('/my/engine-config').get(getMyEngineConfig);
router.route('/my/lending-policy').get(getMyLendingPolicy);
router.route('/my/access-controls').get(getMyAccessControls);
router.route('/my/branding').get(getMyBranding);

// Admin routes
router.route('/')
  .get(requireRole(['admin', 'underwriter', 'analyst']), getAllPartnerBanks)
  .post(requireAdmin, createPartnerBank);

// Admin dashboard route with full configuration
router.route('/admin/with-config')
  .get(requireAdmin, getAllPartnerBanksWithConfig);

router.route('/:id')
  .get(requireRole(['admin', 'underwriter', 'analyst']), getPartnerBank)
  .patch(requireAdmin, updatePartnerBank)
  .delete(requireAdmin, deletePartnerBank);

router.route('/code/:code')
  .get(requireRole(['admin', 'underwriter', 'analyst']), getPartnerBankByCode);

// Configuration routes
router.route('/:id/lending-config')
  .get(requireRole(['admin', 'underwriter', 'analyst']), getLendingConfig)
  .patch(requireRole(['admin', 'underwriter']), updateLendingConfig);

router.route('/:id/engine-config')
  .get(requireRole(['admin', 'underwriter', 'analyst']), getEngineConfig)
  .patch(requireRole(['admin', 'underwriter']), updateEngineConfig);

router.route('/:id/lending-policy')
  .patch(requireRole(['admin', 'underwriter']), updateLendingPolicy);

router.route('/:id/access-controls')
  .patch(requireAdmin, updateAccessControls);

router.route('/:id/branding')
  .patch(requireAdmin, updateBranding);

// Statistics and validation routes
router.route('/:id/statistics')
  .get(requireRole(['admin', 'underwriter', 'analyst']), getBankStatistics);

router.route('/validate/lending-config')
  .post(requireRole(['admin', 'underwriter']), validateLendingConfig);

router.route('/validate/engine-config')
  .post(requireRole(['admin', 'underwriter']), validateEngineConfig);

export default router; 