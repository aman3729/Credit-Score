// Utility functions for fraud detection
export function detectFraudSignals({ user, applications, deviceInfo, documents }) {
  const riskFlags = [];
  // Example checks:
  if (applications.filter(a => a.deviceId === deviceInfo.deviceId).length > 2) {
    riskFlags.push('IP_REUSE');
  }
  if (user.idNumber && user.phoneNumber && user.idNumber !== user.phoneNumber) {
    riskFlags.push('MISMATCHED_DOC_ID');
  }
  // Add more checks as needed
  return riskFlags;
} 