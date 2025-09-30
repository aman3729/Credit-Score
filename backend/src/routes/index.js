import { Router } from 'express';

import authRoutes from '../../routes/auth.js';
import userRoutes from '../../routes/userRoutes.js';
import usersRoutes from '../../routes/users.js';
import uploadRoutes from '../../routes/uploadRoutes.js';
import adminRoutes from '../../routes/admin.js';
import debugRoutes from '../../routes/debugRoutes.js';
import uploadHistoryRoutes from '../../routes/uploadHistoryRoutes.js';
import lenderRoutes from '../../routes/lender.js';
import schemaMappingRoutes from '../../routes/schemaMappingRoutes.js';
import partnerBankRoutes from '../../routes/partnerBank.js';
import disputeRoutes from '../../routes/disputeRoutes.js';
import supportRoutes from '../../routes/supportRoutes.js';
import creditScoreRoutes from '../../routes/creditScoreRoutes.js';
import securityRoutes from '../../routes/security.js';
import paymentRoutes from '../../routes/payment.js';

/**
 * Route registration manager
 */
export class RouteManager {
  constructor() {
    this.router = Router();
    this.apiPrefix = '/api/v1';
  }

  /**
   * Register all application routes
   */
  registerRoutes() {
    // API routes
    this.router.use(`${this.apiPrefix}/auth`, authRoutes);
    this.router.use(`${this.apiPrefix}/users`, usersRoutes);
    this.router.use(`${this.apiPrefix}/user`, userRoutes);
    this.router.use(`${this.apiPrefix}/upload`, uploadRoutes);
    this.router.use(`${this.apiPrefix}/admin`, adminRoutes);
    this.router.use(`${this.apiPrefix}/debug`, debugRoutes);
    this.router.use(`${this.apiPrefix}/upload-history`, uploadHistoryRoutes);
    this.router.use(`${this.apiPrefix}/lenders`, lenderRoutes);
    this.router.use(`${this.apiPrefix}/schema-mapping`, schemaMappingRoutes);
    this.router.use(`${this.apiPrefix}/partner-banks`, partnerBankRoutes);
    this.router.use(`${this.apiPrefix}/disputes`, disputeRoutes);
    this.router.use(`${this.apiPrefix}/support`, supportRoutes);
    this.router.use(`${this.apiPrefix}/credit-scores`, creditScoreRoutes);
    this.router.use(`${this.apiPrefix}/security`, securityRoutes);
    this.router.use(`${this.apiPrefix}/payments`, paymentRoutes);

    return this.router;
  }

  /**
   * Get the router instance
   */
  getRouter() {
    return this.router;
  }

  /**
   * Get the API prefix
   */
  getApiPrefix() {
    return this.apiPrefix;
  }
}

/**
 * Register all routes with the Express app
 * @param {Express} app - Express application instance
 */
export function registerRoutes(app) {
  const routeManager = new RouteManager();
  const router = routeManager.registerRoutes();
  
  app.use(router);
  
  return routeManager;
} 