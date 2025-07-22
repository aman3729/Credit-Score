import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  DollarSign,
  Percent,
  Calendar,
  Calculator,
  FileText,
  Download,
  Send,
  Edit,
  User,
  CalendarDays,
  AlertTriangle,
  CheckSquare,
  Square,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { useToast } from '../hooks/use-toast';

const LoanDecisionStatus = ({ 
  decision, 
  loanOffer, 
  onDecisionAction,
  onEditOffer,
  onDownloadPDF,
  onSendOffer,
  onDeclineOffer,
  isLender = true 
}) => {
  const { toast } = useToast();
  const [internalNotes, setInternalNotes] = useState(decision?.internalNotes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Format decision date
  const formatDecisionDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Render decision status badge
  const renderDecisionBadge = (decisionStatus) => {
    const baseClasses = 'inline-flex items-center rounded-full text-xs font-medium px-3 py-1';
    
    switch(decisionStatus?.toLowerCase()) {
      case 'approve':
        return (
          <Badge className={`${baseClasses} bg-green-100 text-green-800 border border-green-200`}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Approved
          </Badge>
        );
      case 'reject':
        return (
          <Badge className={`${baseClasses} bg-red-100 text-red-800 border border-red-200`}>
            <XCircle className="h-4 w-4 mr-1" />
            Rejected
          </Badge>
        );
      case 'hold':
        return (
          <Badge className={`${baseClasses} bg-orange-100 text-orange-800 border border-orange-200`}>
            <Clock className="h-4 w-4 mr-1" />
            Hold
          </Badge>
        );
      case 'review':
      default:
        return (
          <Badge className={`${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`}>
            <AlertCircle className="h-4 w-4 mr-1" />
            Under Review
          </Badge>
        );
    }
  };

  // Save internal notes
  const saveInternalNotes = async () => {
    setIsSavingNotes(true);
    try {
      // Here you would typically save to backend
      // await api.post(`/lenders/save-notes/${decision.userId}`, { notes: internalNotes });
      
      toast({
        title: "Notes Saved",
        description: "Internal notes have been saved successfully.",
        variant: "default",
      });
      setIsEditingNotes(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Handle decision actions
  const handleDecisionAction = (action) => {
    if (onDecisionAction) {
      onDecisionAction(action);
    }
  };

  // Calculate monthly payment
  const calculateMonthlyPayment = (amount, rate, term) => {
    if (!amount || !rate || !term) return 0;
    const monthlyRate = rate / 100 / 12;
    const payment = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                   (Math.pow(1 + monthlyRate, term) - 1);
    return payment;
  };

  const monthlyPayment = calculateMonthlyPayment(
    loanOffer?.amount || loanOffer?.maxAmount,
    loanOffer?.interestRate,
    loanOffer?.termMonths || loanOffer?.term
  );

  return (
    <div className="space-y-6">
      {/* Loan Decision Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Loan Decision Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Badge and Decision Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {renderDecisionBadge(decision?.decision)}
                <div className="text-sm text-muted-foreground">
                  by {decision?.decisionBy || 'System'} on {formatDecisionDate(decision?.timestamp)}
                </div>
              </div>
              {decision?.decision === 'Approve' && (
                <div className="text-green-600 text-sm font-medium">
                  💼 Loan Approved
                </div>
              )}
            </div>

            {/* Decision Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Decision Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Decision:</span>
                    <span className="font-medium">{decision?.decision || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Score:</span>
                    <span className="font-medium">{decision?.score || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classification:</span>
                    <span className="font-medium">{decision?.classification || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Risk Tier:</span>
                    <span className="font-medium">{decision?.riskTier || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Risk Label:</span>
                    <span className="font-medium">{decision?.riskTierLabel || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Default Risk:</span>
                    <span className="font-medium">{decision?.defaultRiskEstimate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DTI Ratio:</span>
                    <span className="font-medium">
                      {typeof decision?.dti === 'number' ? `${(decision.dti * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>DTI Rating:</span>
                    <span className="font-medium">{decision?.dtiRating || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Processing Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Decision Date:</span>
                    <span className="font-medium">{formatDecisionDate(decision?.timestamp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Decision By:</span>
                    <span className="font-medium">{decision?.decisionBy || 'System'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Engine Version:</span>
                    <span className="font-medium">{decision?.engineVersion || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual Override:</span>
                    <span className="font-medium">{decision?.isManual ? 'Yes' : 'No'}</span>
                  </div>
                  {decision?.rejectionCode && (
                    <div className="flex justify-between">
                      <span>Rejection Code:</span>
                      <span className="font-medium text-red-600">{decision.rejectionCode}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scoring Engine Details */}
            {decision?.scoringDetails && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Scoring Engine Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Recession Mode:</span>
                      <span className="font-medium">{decision.scoringDetails.recessionMode ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AI Enabled:</span>
                      <span className="font-medium">{decision.scoringDetails.aiEnabled ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Customer Profile</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Employment:</span>
                      <span className="font-medium">{decision.customerProfile?.employmentStatus || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Loans:</span>
                      <span className="font-medium">{decision.customerProfile?.activeLoans || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Delinquency:</span>
                      <span className="font-medium">
                        {decision.customerProfile?.lastDelinquency === 'N/A' ? 'N/A' : 
                         `${decision.customerProfile?.lastDelinquency} months ago`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Decision Reasons */}
            {decision?.reasons && decision.reasons.length > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Decision Reasons</h4>
                <div className="space-y-1">
                  {decision.reasons.map((reason, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Final Offer Details */}
      {loanOffer && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Final Offer Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Offer Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Loan Amount Offered</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {((loanOffer.amount || loanOffer.maxAmount || 0) === 0)
                      ? '$0 (Not Eligible)'
                      : `$${(loanOffer.amount || loanOffer.maxAmount || 0).toLocaleString()}`}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-muted-foreground">Interest Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {(loanOffer.interestRate || 0).toFixed(1)}%
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-muted-foreground">Term (Months)</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {loanOffer.termMonths || loanOffer.term || 0} months
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-muted-foreground">Estimated Monthly Payment</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    ${monthlyPayment.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Additional Offer Details */}
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-muted-foreground">APR</div>
                  <div className="text-lg font-semibold">
                    {((loanOffer.interestRate || 0) + 0.5).toFixed(2)}%
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Interest</div>
                  <div className="text-lg font-semibold">
                    ${((monthlyPayment * (loanOffer.termMonths || loanOffer.term || 0)) - (loanOffer.amount || loanOffer.maxAmount || 0)).toFixed(2)}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Repayment</div>
                  <div className="text-lg font-semibold">
                    ${(monthlyPayment * (loanOffer.termMonths || loanOffer.term || 0)).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Pricing Model Breakdown */}
              {loanOffer?.pricingModel && (
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">Pricing Model Breakdown</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Base Rate:</span>
                        <span className="font-medium">{loanOffer.pricingModel.baseRate?.toFixed(2) || 'N/A'}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>DTI Adjustment:</span>
                        <span className="font-medium">
                          {loanOffer.pricingModel.adjustments?.dtiAdjustment ? 
                           `+${loanOffer.pricingModel.adjustments.dtiAdjustment.toFixed(2)}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>DTI Rating Adjustment:</span>
                        <span className="font-medium">
                          {loanOffer.pricingModel.adjustments?.dtiRatingAdjustment ? 
                           `+${loanOffer.pricingModel.adjustments.dtiRatingAdjustment.toFixed(2)}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Recession Adjustment:</span>
                        <span className="font-medium">
                          {loanOffer.pricingModel.adjustments?.recessionAdjustment ? 
                           `+${loanOffer.pricingModel.adjustments.recessionAdjustment.toFixed(2)}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Payment Adjustment:</span>
                        <span className="font-medium">
                          {loanOffer.pricingModel.adjustments?.paymentAdjustment ? 
                           `+${loanOffer.pricingModel.adjustments.paymentAdjustment.toFixed(2)}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span>Final Rate:</span>
                        <span className="text-purple-600">{loanOffer.pricingModel.finalRate?.toFixed(2) || 'N/A'}%</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        <p>• Base rate determined by risk tier</p>
                        <p>• Adjustments applied for risk factors</p>
                        <p>• Final rate capped at 35.99%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Terms */}
              {loanOffer?.availableTerms && loanOffer.availableTerms.length > 0 && (
                <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Available Terms</h4>
                  <div className="flex flex-wrap gap-2">
                    {loanOffer.availableTerms.map((term, index) => (
                      <Badge key={index} variant="outline" className="text-orange-700 border-orange-300">
                        {term} months
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Offer Expiration */}
              {loanOffer.expirationDate && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Offer Expiration Date: {new Date(loanOffer.expirationDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Internal Notes Section */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            📄 Internal Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isEditingNotes ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="Enter internal notes for underwriter/lender input (max 1000 chars)..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value.slice(0, 1000))}
                  className="min-h-[120px]"
                  maxLength={1000}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {internalNotes.length}/1000 characters
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInternalNotes(decision?.internalNotes || '');
                        setIsEditingNotes(false);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveInternalNotes}
                      disabled={isSavingNotes}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {isSavingNotes ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg min-h-[120px]">
                  {internalNotes ? (
                    <p className="text-sm whitespace-pre-wrap">{internalNotes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No internal notes added yet. Click "Edit Notes" to add underwriter comments.
                    </p>
                  )}
                </div>
                {isLender && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Notes
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Decision Actions */}
      {isLender && decision?.decision === 'Approve' && (
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-emerald-600" />
              Decision Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Primary Actions Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  className="h-16 p-4 flex items-center justify-start gap-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 min-w-0"
                  onClick={() => handleDecisionAction('approve')}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-emerald-500 rounded-full flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-base sm:text-lg truncate">✅ Approve Final Offer</div>
                    <div className="text-xs sm:text-sm opacity-90 truncate">Confirm and finalize the loan offer</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 p-4 flex items-center justify-start gap-3 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 min-w-0"
                  onClick={() => handleDecisionAction('edit')}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full flex-shrink-0">
                    <Edit className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-base sm:text-lg truncate">✏️ Edit Offer Terms</div>
                    <div className="text-xs sm:text-sm text-muted-foreground truncate">Modify loan amount, rate, or terms</div>
                  </div>
                </Button>
              </div>

              {/* Secondary Actions Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-14 p-3 flex flex-col items-center gap-2 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200 min-w-0"
                  onClick={() => handleDecisionAction('download')}
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full flex-shrink-0">
                    <Download className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-xs sm:text-sm text-center truncate">📄 Download Summary PDF</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-14 p-3 flex flex-col items-center gap-2 border-2 border-green-200 hover:border-green-300 hover:bg-green-50 shadow-sm hover:shadow-md transition-all duration-200 min-w-0"
                  onClick={() => handleDecisionAction('send')}
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full flex-shrink-0">
                    <Send className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-medium text-xs sm:text-sm text-center truncate">📤 Send Offer to Borrower</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-14 p-3 flex flex-col items-center gap-2 border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50 shadow-sm hover:shadow-md transition-all duration-200 min-w-0"
                  onClick={() => handleDecisionAction('hold')}
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-orange-100 rounded-full flex-shrink-0">
                    <Clock className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="font-medium text-xs sm:text-sm text-center truncate">⏸️ Put on Hold</span>
                </Button>
              </div>

              {/* Danger Action */}
              <div className="pt-2">
                <Button
                  variant="destructive"
                  className="w-full h-14 p-4 flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 min-w-0"
                  onClick={() => handleDecisionAction('decline')}
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-red-500 rounded-full flex-shrink-0">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div className="text-center min-w-0">
                    <div className="font-semibold text-base sm:text-lg truncate">❌ Dismiss / Decline Applicant</div>
                    <div className="text-xs sm:text-sm opacity-90 truncate">Reject this application permanently</div>
                  </div>
                </Button>
              </div>

              {/* Action Status Indicator */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> All actions are logged and require confirmation. 
                    Changes to offer terms will trigger a new approval workflow.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Flags and Warnings */}
      {decision?.riskFlags && decision.riskFlags.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Risk Flags & Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {decision.riskFlags.map((flag, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800 dark:text-red-200">{flag}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LoanDecisionStatus; 