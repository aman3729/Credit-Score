import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from '../ui/select';
import { Switch } from '../ui/switch';
import { Edit, Save, CheckSquare, Square, Loader2, RefreshCw } from 'lucide-react';

const ManualDecisionForm = ({
  manualDecision,
  handleManualDecision,
  setIsEditingDecision,
  saveManualDecision,
  recalcLoading,
  hasCollateral,
  setHasCollateral,
  collateralValue,
  setCollateralValue,
  recalculateWithCollateral,
  maxLoanAmount // <-- new prop
}) => {
  const amountNum = Number(manualDecision.amount);
  const isAmountInvalid = manualDecision.decision === 'Approve' && maxLoanAmount && amountNum > maxLoanAmount;
  return (
    <div className="space-y-6">
      {/* Decision Type Selection */}
      <div>
        <Label htmlFor="decision-type">Decision Type</Label>
        <Select 
          value={manualDecision.decision} 
          onValueChange={(value) => handleManualDecision('decision', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select decision type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Approve">Approve</SelectItem>
            <SelectItem value="Reject">Reject</SelectItem>
            <SelectItem value="Hold">Hold</SelectItem>
            <SelectItem value="Review">Review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Flag for Manual Review */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => handleManualDecision('flagForReview', !manualDecision.flagForReview)}
          className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50"
        >
          {manualDecision.flagForReview ? (
            <CheckSquare className="h-4 w-4 text-blue-600" />
          ) : (
            <Square className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-sm">Flag for Manual Review</span>
        </button>
      </div>

      {/* Review Note (shown when flagged) */}
      {manualDecision.flagForReview && (
        <div>
          <Label htmlFor="review-note">Review Note</Label>
          <Textarea
            id="review-note"
            placeholder="Enter reason for manual review..."
            value={manualDecision.reviewNote}
            onChange={(e) => handleManualDecision('reviewNote', e.target.value)}
            className="mt-1"
          />
        </div>
      )}

      {/* Custom Rejection Reason (shown when decision is Reject) */}
      {manualDecision.decision === 'Reject' && (
        <div>
          <Label htmlFor="rejection-reason">Custom Rejection Reason</Label>
          <Textarea
            id="rejection-reason"
            placeholder="Enter custom rejection reason..."
            value={manualDecision.rejectionReason}
            onChange={(e) => handleManualDecision('rejectionReason', e.target.value)}
            className="mt-1"
          />
        </div>
      )}

      {/* Loan Type Selection (shown when decision is Approve) */}
      {manualDecision.decision === 'Approve' && (
        <div>
          <Label htmlFor="loan-type">Loan Type</Label>
          <Select
            value={manualDecision.loanType || ''}
            onValueChange={(value) => handleManualDecision('loanType', value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select loan type" />
            </SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              <SelectGroup>
                <SelectLabel>🏠 Mortgage Loans</SelectLabel>
                <SelectItem value="home_purchase">Home Purchase Loan</SelectItem>
                <SelectItem value="refinance">Refinance Loan</SelectItem>
                <SelectItem value="home_equity">Home Equity Loan (HEL)</SelectItem>
                <SelectItem value="heloc">Home Equity Line of Credit (HELOC)</SelectItem>
                <SelectItem value="construction">Construction Loan</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>🚗 Auto Loans</SelectLabel>
                <SelectItem value="new_car">New Car Loan</SelectItem>
                <SelectItem value="used_car">Used Car Loan</SelectItem>
                <SelectItem value="auto_refinance">Auto Refinance</SelectItem>
                <SelectItem value="lease_buyout">Lease Buyout Loan</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>🎓 Student Loans</SelectLabel>
                <SelectItem value="federal_student">Federal Student Loan</SelectItem>
                <SelectItem value="private_student">Private Student Loan</SelectItem>
                <SelectItem value="student_refinance">Student Loan Refinance</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>💳 Credit / Revolving</SelectLabel>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="store_card">Store/Retail Card</SelectItem>
                <SelectItem value="charge_card">Charge Card</SelectItem>
                <SelectItem value="secured_card">Secured Credit Card</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>🧾 Personal Loans</SelectLabel>
                <SelectItem value="personal_unsecured">Unsecured Personal Loan</SelectItem>
                <SelectItem value="personal_secured">Secured Personal Loan</SelectItem>
                <SelectItem value="debt_consolidation">Debt Consolidation</SelectItem>
                <SelectItem value="medical_loan">Medical Loan</SelectItem>
                <SelectItem value="wedding_loan">Wedding or Vacation Loan</SelectItem>
                <SelectItem value="emergency_loan">Emergency Loan</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>🏢 Business Loans</SelectLabel>
                <SelectItem value="business_term">Term Business Loan</SelectItem>
                <SelectItem value="business_line">Line of Credit</SelectItem>
                <SelectItem value="sba_loan">SBA or Government-backed Loan</SelectItem>
                <SelectItem value="equipment_finance">Equipment Financing</SelectItem>
                <SelectItem value="invoice_finance">Invoice Financing</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>🌍 Microfinance & Consumer</SelectLabel>
                <SelectItem value="microfinance">Microfinance Loan</SelectItem>
                <SelectItem value="bnpl">Buy Now, Pay Later (BNPL)</SelectItem>
                <SelectItem value="installment_retail">Installment Purchase Loan</SelectItem>
                <SelectItem value="mobile_loan">Mobile Loan</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>👨‍🌾 Agricultural Loans</SelectLabel>
                <SelectItem value="crop_loan">Crop Loan</SelectItem>
                <SelectItem value="livestock_loan">Livestock Loan</SelectItem>
                <SelectItem value="agri_equipment">Agricultural Equipment Loan</SelectItem>
                <SelectItem value="seasonal_loan">Seasonal Working Capital</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Loan Details (shown when decision is Approve) */}
      {manualDecision.decision === 'Approve' && (
        <div className="space-y-4">
          <h4 className="font-medium">Loan Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loan-amount">Loan Amount</Label>
              <Input
                id="loan-amount"
                type="number"
                placeholder="Enter amount"
                value={manualDecision.amount}
                onChange={(e) => handleManualDecision('amount', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="loan-term">Term (months)</Label>
              <Input
                id="loan-term"
                type="number"
                placeholder="Enter term"
                value={manualDecision.term}
                onChange={(e) => handleManualDecision('term', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="interest-rate">Interest Rate (%)</Label>
              <Input
                id="interest-rate"
                type="number"
                step="0.1"
                placeholder="Enter rate"
                value={manualDecision.interestRate}
                onChange={(e) => handleManualDecision('interestRate', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Collateral Section */}
      <div className="space-y-4">
        <h4 className="font-medium">Collateral Options</h4>
        <div className="space-y-4">
          {/* Collateral Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="collateral-toggle"
              checked={hasCollateral}
              onCheckedChange={setHasCollateral}
            />
            <Label htmlFor="collateral-toggle">Borrower has collateral</Label>
          </div>

          {/* Collateral Value Input (shown when toggle is on) */}
          {hasCollateral && (
            <div className="space-y-2">
              <Label htmlFor="collateral-value">Collateral Value ($)</Label>
              <Input
                id="collateral-value"
                type="number"
                placeholder="Enter collateral value"
                value={collateralValue}
                onChange={(e) => setCollateralValue(Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground">
                Collateral can increase the maximum loan amount by up to 70% of its value.
              </p>
            </div>
          )}

          {/* Recalculate Button */}
          <Button
            type="button"
            variant="outline"
            onClick={recalculateWithCollateral}
            disabled={recalcLoading}
            className="flex items-center gap-2"
          >
            {recalcLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Recalculate with Collateral
          </Button>
        </div>
      </div>

      {/* General Notes */}
      <div>
        <Label htmlFor="decision-notes">Decision Notes</Label>
        <Textarea
          id="decision-notes"
          placeholder="Enter additional notes about this decision..."
          value={manualDecision.notes}
          onChange={(e) => handleManualDecision('notes', e.target.value)}
          className="mt-1"
        />
      </div>

      {/* ✏️ Edit Terms Section (only for Approve) */}
      {manualDecision.decision === 'Approve' && (
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">✏️ Edit Terms <span className="text-xs text-muted-foreground">(Max: ${maxLoanAmount?.toLocaleString?.() || 'N/A'})</span></h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loan-amount">Loan Amount</Label>
              <Input
                id="loan-amount"
                type="number"
                placeholder="Enter amount"
                value={manualDecision.amount}
                onChange={(e) => handleManualDecision('amount', e.target.value)}
                className="mt-1"
                min={0}
                max={maxLoanAmount || undefined}
              />
              {isAmountInvalid && (
                <p className="text-xs text-red-600 mt-1">Amount cannot exceed ${maxLoanAmount?.toLocaleString?.() || 'N/A'} (max offer)</p>
              )}
            </div>
            <div>
              <Label htmlFor="loan-term">Term (months)</Label>
              <Input
                id="loan-term"
                type="number"
                placeholder="Enter term"
                value={manualDecision.term}
                onChange={(e) => handleManualDecision('term', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="interest-rate">Interest Rate (%)</Label>
              <Input
                id="interest-rate"
                type="number"
                step="0.1"
                placeholder="Enter rate"
                value={manualDecision.interestRate}
                onChange={(e) => handleManualDecision('interestRate', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsEditingDecision(false)}
        >
          Cancel
        </Button>
        <Button 
          size="sm" 
          onClick={saveManualDecision}
          className="flex items-center gap-2"
          disabled={isAmountInvalid}
        >
          <Save className="h-4 w-4" />
          Save Decision
        </Button>
      </div>
    </div>
  );
};

export default ManualDecisionForm; 