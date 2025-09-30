// Role definitions with permissions
export const ROLES = {
  USER: {
    value: 'user',
    label: 'Standard User',
    permissions: ['view_own_score', 'basic_report']
  },
  PREMIUM_USER: {
    value: 'premium',
    label: 'Premium User',
    permissions: ['full_report', 'score_simulations', 'credit_monitoring']
  },
  LENDER: {
    value: 'lender',
    label: 'Lender',
    permissions: ['view_applicants', 'bulk_score_check', 'lender_dashboard']
  },
  UNDERWRITER: {
    value: 'underwriter',
    label: 'Underwriter',
    permissions: ['manual_reviews', 'fraud_detection', 'score_adjustments', 'lending_config']
  },
  MANAGER: {
    value: 'manager',
    label: 'Manager',
    permissions: ['view_applicants', 'bulk_score_check', 'lender_dashboard', 'view_config']
  },
  ANALYST: {
    value: 'analyst',
    label: 'Credit Analyst',
    permissions: ['manual_reviews', 'fraud_detection', 'score_adjustments', 'view_config']
  },
  ADMIN: {
    value: 'admin',
    label: 'Administrator',
    permissions: ['manage_users', 'system_config', 'audit_logs', 'override_scores', 'manage_banks']
  }
};

// Helper function to get role permissions
export const getRolePermissions = (role) => {
  const roleKey = Object.keys(ROLES).find(key => ROLES[key].value === role);
  return roleKey ? ROLES[roleKey].permissions : [];
};

// List of all role values
export const ROLE_VALUES = Object.values(ROLES).map(r => r.value);

// Role labels mapping
export const ROLE_LABELS = Object.values(ROLES).reduce((acc, role) => {
  acc[role.value] = role.label;
  return acc;
}, {});
