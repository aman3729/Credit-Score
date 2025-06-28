import { securityLogger } from '../config/logger.js';

// Define a plan hierarchy for easy comparison. Higher number = more permissions.
const planHierarchy = {
  free: 0,
  starter: 1,
  premium: 2,
};

/**
 * Middleware factory to check if a user's plan meets a minimum requirement.
 * It assumes `req.user` has been populated by the `auth` middleware.
 * @param {('starter'|'premium')} requiredPlan - The minimum plan required to access the route.
 */
export const checkPlan = (requiredPlan) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user || !user.plan) {
      securityLogger.error('Plan check failed: User or plan information missing from request object.', { userId: user?._id, ip: req.ip });
      return res.status(500).json({ error: 'Cannot verify user plan. User data is incomplete.' });
    }

    const userPlanLevel = planHierarchy[user.plan] ?? -1;
    const requiredPlanLevel = planHierarchy[requiredPlan] ?? -1;

    if (userPlanLevel >= requiredPlanLevel) {
      return next(); // User has the required access level or higher
    }

    // User does not have sufficient permissions
    securityLogger.warn('Authorization failed: Insufficient plan.', {
      userId: user._id,
      ip: req.ip,
      currentPlan: user.plan,
      requiredPlan,
      path: req.originalUrl,
    });
    
    return res.status(403).json({
      error: `This feature requires a '${requiredPlan}' plan or higher. Your current plan is '${user.plan}'.`,
      upgrade: true,
      currentPlan: user.plan,
      requiredPlan,
    });
  };
};

/**
 * Convenience middleware to require a 'premium' plan.
 */
export const isPremium = checkPlan('premium');

/**
 * Convenience middleware to require a 'starter' plan (allows starter and premium).
 */
export const isStarter = checkPlan('starter');