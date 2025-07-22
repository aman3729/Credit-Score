import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  AlertTriangle, 
  Calculator, 
  User, 
  TrendingUp, 
  Shield, 
  Clock,
  DollarSign,
  Percent,
  FileText
} from 'lucide-react';

const LendingDecisionDetails = ({ lendingDecision }) => {
  if (!lendingDecision) return null;

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Add a mapping for loanType values to labels
  const loanTypeLabels = {
    home_purchase: 'Home Purchase Loan',
    refinance: 'Refinance Loan',
    home_equity: 'Home Equity Loan (HEL)',
    heloc: 'Home Equity Line of Credit (HELOC)',
    construction: 'Construction Loan',
    new_car: 'New Car Loan',
    used_car: 'Used Car Loan',
    auto_refinance: 'Auto Refinance',
    lease_buyout: 'Lease Buyout Loan',
    federal_student: 'Federal Student Loan',
    private_student: 'Private Student Loan',
    student_refinance: 'Student Loan Refinance',
    credit_card: 'Credit Card',
    store_card: 'Store/Retail Card',
    charge_card: 'Charge Card',
    secured_card: 'Secured Credit Card',
    personal_unsecured: 'Unsecured Personal Loan',
    personal_secured: 'Secured Personal Loan',
    debt_consolidation: 'Debt Consolidation',
    medical_loan: 'Medical Loan',
    wedding_loan: 'Wedding or Vacation Loan',
    emergency_loan: 'Emergency Loan',
    business_term: 'Term Business Loan',
    business_line: 'Line of Credit',
    sba_loan: 'SBA or Government-backed Loan',
    equipment_finance: 'Equipment Financing',
    invoice_finance: 'Invoice Financing',
    microfinance: 'Microfinance Loan',
    bnpl: 'Buy Now, Pay Later (BNPL)',
    installment_retail: 'Installment Purchase Loan',
    mobile_loan: 'Mobile Loan',
    crop_loan: 'Crop Loan',
    livestock_loan: 'Livestock Loan',
    agri_equipment: 'Agricultural Equipment Loan',
    seasonal_loan: 'Seasonal Working Capital',
  };

  return (
    <div className="space-y-6">
      {/* Core Decision Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Complete Lending Decision Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Decision Summary */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Decision Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Decision:</span>
                  <Badge variant={
                    lendingDecision.decision === 'Approve' ? 'default' :
                    lendingDecision.decision === 'Reject' ? 'destructive' : 'secondary'
                  }>
                    {lendingDecision.decision || 'N/A'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Score:</span>
                  <span className="font-medium">{lendingDecision.score || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Classification:</span>
                  <span className="font-medium">{lendingDecision.classification || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Engine Version:</span>
                  <span className="font-medium">{lendingDecision.engineVersion || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timestamp:</span>
                  <span className="font-medium text-xs">{formatDate(lendingDecision.timestamp)}</span>
                </div>
                {lendingDecision.loanType && (
                  <div className="flex justify-between">
                    <span>Loan Type:</span>
                    <span className="font-medium">{loanTypeLabels[lendingDecision.loanType] || lendingDecision.loanType}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Risk Assessment</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Risk Tier:</span>
                  <span className="font-medium">{lendingDecision.riskTier || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Risk Label:</span>
                  <span className="font-medium">{lendingDecision.riskTierLabel || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Default Risk:</span>
                  <span className="font-medium">{lendingDecision.defaultRiskEstimate || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>DTI Ratio:</span>
                  <span className="font-medium">
                    {typeof lendingDecision.dti === 'number' ? 
                     `${(lendingDecision.dti * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>DTI Rating:</span>
                  <span className="font-medium">{lendingDecision.dtiRating || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Customer Profile */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Customer Profile</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Employment:</span>
                  <span className="font-medium">{lendingDecision.customerProfile?.employmentStatus || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Loans:</span>
                  <span className="font-medium">{lendingDecision.customerProfile?.activeLoans || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Delinquency:</span>
                  <span className="font-medium">
                    {lendingDecision.customerProfile?.lastDelinquency === 'N/A' ? 'N/A' : 
                     `${lendingDecision.customerProfile?.lastDelinquency} months ago`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Manual Override:</span>
                  <span className="font-medium">{lendingDecision.isManual ? 'Yes' : 'No'}</span>
                </div>
                {lendingDecision.rejectionCode && (
                  <div className="flex justify-between">
                    <span>Rejection Code:</span>
                    <span className="font-medium text-red-600">{lendingDecision.rejectionCode}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scoring Engine Details */}
      {lendingDecision.scoringDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-purple-600" />
              Scoring Engine Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Engine Settings</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Recession Mode:</span>
                    <Badge variant={lendingDecision.scoringDetails.recessionMode ? 'destructive' : 'default'}>
                      {lendingDecision.scoringDetails.recessionMode ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>AI Enabled:</span>
                    <Badge variant={lendingDecision.scoringDetails.aiEnabled ? 'default' : 'secondary'}>
                      {lendingDecision.scoringDetails.aiEnabled ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Risk Flags</h4>
                <div className="flex flex-wrap gap-1">
                  {lendingDecision.riskFlags && lendingDecision.riskFlags.length > 0 ? (
                    lendingDecision.riskFlags.map((flag, index) => (
                      <Badge key={index} variant="outline" className="text-red-600 border-red-300">
                        {flag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No risk flags</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decision Reasons */}
      {lendingDecision.reasons && lendingDecision.reasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Decision Reasoning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lendingDecision.reasons.map((reason, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span className="text-sm">{reason}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LendingDecisionDetails; 