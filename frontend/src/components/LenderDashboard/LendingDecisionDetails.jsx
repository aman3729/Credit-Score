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

  // Detect new engine output structure
  const isNewEngine = lendingDecision.engine === 'LendingDecisionEngine' && lendingDecision.version && lendingDecision.decision && Array.isArray(lendingDecision.loanOffers);

  // Helper for formatting date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  // Helper for rendering loan offers
  const renderLoanOffers = (offers) => (
    <div className="space-y-4">
      {offers.map((offer, idx) => (
        <Card key={offer.offerId || idx} className="bg-blue-50 dark:bg-blue-900/10">
          <CardHeader>
            <CardTitle>Loan Offer {offer.offerId ? `#${offer.offerId}` : `#${idx+1}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><b>Type:</b> {offer.offerType}</div>
              <div><b>Amount:</b> {offer.amount} {offer.currency}</div>
              <div><b>Term:</b> {offer.term} months</div>
              <div><b>Interest Rate:</b> {offer.interestRate}%</div>
              <div><b>APR:</b> {offer.apr}%</div>
              <div><b>Monthly Payment:</b> {offer.monthlyPayment}</div>
              <div><b>Security Type:</b> {offer.securityType}</div>
              {/* Render fees, amortizationSchedule, disclosures if present */}
              {offer.fees && <div className="col-span-2"><b>Fees:</b> {JSON.stringify(offer.fees)}</div>}
              {offer.amortizationSchedule && <div className="col-span-2"><b>Amortization Schedule:</b> <pre className="whitespace-pre-wrap">{JSON.stringify(offer.amortizationSchedule, null, 2)}</pre></div>}
              {offer.disclosures && <div className="col-span-2"><b>Disclosures:</b> <pre className="whitespace-pre-wrap">{JSON.stringify(offer.disclosures, null, 2)}</pre></div>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Helper for collapsible details
  const [showScoreDetails, setShowScoreDetails] = React.useState(false);
  const [showPerfMetrics, setShowPerfMetrics] = React.useState(false);

  if (isNewEngine) {
    const { engine, version, timestamp, decision, loanOffers, scoreDetails, performanceMetrics } = lendingDecision;
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Lending Decision Engine Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2 text-sm">
                <div><b>Engine:</b> {engine}</div>
                <div><b>Version:</b> {version}</div>
                <div><b>Timestamp:</b> {formatDate(timestamp)}</div>
              </div>
              <div className="space-y-2 text-sm col-span-3">
                <h4 className="font-medium text-sm text-muted-foreground">Decision</h4>
                <div><b>Status:</b> {decision.status}</div>
                <div><b>Reason:</b> {decision.reason}</div>
                <div><b>Approved Amount:</b> {decision.approvedAmount}</div>
                <div><b>Risk Category:</b> {decision.riskCategory}</div>
                <div><b>DTI Status:</b> {decision.dtiStatus}</div>
                <div><b>Loan to Value:</b> {decision.loanToValue}</div>
                <div><b>Debt Service Coverage Ratio:</b> {decision.debtServiceCoverageRatio}</div>
                {decision.verificationFlags && decision.verificationFlags.length > 0 && (
                  <div><b>Verification Flags:</b> {decision.verificationFlags.join(', ')}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Loan Offers */}
        {loanOffers && loanOffers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Loan Offers</CardTitle>
            </CardHeader>
            <CardContent>
              {renderLoanOffers(loanOffers)}
            </CardContent>
          </Card>
        )}
        {/* Score Details (collapsible) */}
        {scoreDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => setShowScoreDetails(v => !v)}>
                <Calculator className="h-5 w-5 text-purple-600" />
                <span>Score Details</span>
                <span className="ml-2 text-xs text-blue-500">[{showScoreDetails ? 'Hide' : 'Show'}]</span>
              </CardTitle>
            </CardHeader>
            {showScoreDetails && (
              <CardContent>
                <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded overflow-x-auto">{JSON.stringify(scoreDetails, null, 2)}</pre>
              </CardContent>
            )}
          </Card>
        )}
        {/* Performance Metrics (collapsible) */}
        {performanceMetrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 cursor-pointer" onClick={() => setShowPerfMetrics(v => !v)}>
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Performance Metrics</span>
                <span className="ml-2 text-xs text-blue-500">[{showPerfMetrics ? 'Hide' : 'Show'}]</span>
              </CardTitle>
            </CardHeader>
            {showPerfMetrics && (
              <CardContent>
                <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded overflow-x-auto">{JSON.stringify(performanceMetrics, null, 2)}</pre>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    );
  }

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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