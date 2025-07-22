import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Download, Filter, RefreshCw, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "../ui/dropdown-menu";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { format } from 'date-fns';
import { Tooltip } from '../ui/tooltip';

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

const LendingDecisionsPanel = ({
  lendingLoading,
  groupedLendingDecisions = [],
  error,
  onRefresh,
  onUserSelect,
  selectedUserDecisions
}) => {
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedDecision, setExpandedDecision] = useState(null);

  const handleRowClick = (user) => {
    if (expandedUser === user) {
      setExpandedUser(null);
      setExpandedDecision(null);
      onUserSelect && onUserSelect(null);
    } else {
      setExpandedUser(user);
      setExpandedDecision(null);
      const found = groupedLendingDecisions.find(g => g.user === user);
      onUserSelect && onUserSelect(found ? found.all : null);
    }
  };

  const handleDecisionExpand = (decisionId) => {
    setExpandedDecision(expandedDecision === decisionId ? null : decisionId);
  };

  return (
  <Card className="border border-[#1a4a38] overflow-hidden">
    <CardHeader>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-gray-900 dark:text-white">Lending Decision Logs</CardTitle>
          <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
            Review approval/rejection decisions and overrides
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            className="bg-[#9c27b0] hover:bg-[#7b1fa2] text-white flex-1 sm:flex-none"
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="whitespace-nowrap">Export Logs</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-[#9c27b0] text-[#9c27b0] flex-1 sm:flex-none">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Approved</DropdownMenuItem>
              <DropdownMenuItem>Rejected</DropdownMenuItem>
              <DropdownMenuItem>Manual Overrides</DropdownMenuItem>
              <DropdownMenuItem>Recent Decisions</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={onRefresh}
            className="border-[#9c27b0] text-[#9c27b0] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex-1 sm:flex-none"
            disabled={lendingLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-0 sm:p-6">
      {lendingLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <div className="animate-spin h-12 w-12 border-t-4 border-b-4 border-[#9c27b0] rounded-full mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading lending decisions...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-4 mx-4">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-bold">Error:</span>
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <Table className="min-w-full">
            <TableHeader className="bg-[#f0f7f4] dark:bg-[#1a4a38]">
              <TableRow>
                <TableHead className="font-semibold w-[18%]">Applicant</TableHead>
                <TableHead className="font-semibold w-[12%]">Decision</TableHead>
                <TableHead className="font-semibold w-[8%]">Score</TableHead>
                <TableHead className="font-semibold w-[20%]">Reason</TableHead>
                <TableHead className="font-semibold w-[12%]">Officer</TableHead>
                <TableHead className="font-semibold w-[10%]">Bank</TableHead>
                <TableHead className="font-semibold w-[12%]">Date</TableHead>
                <TableHead className="font-semibold w-[8%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedLendingDecisions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center text-gray-500">
                      <Filter className="h-8 w-8 mb-2" />
                      No lending decisions found
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                groupedLendingDecisions.map(({ user, latest, all }) => (
                  <React.Fragment key={user}>
                    <TableRow
                      className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] cursor-pointer"
                      onClick={() => handleRowClick(user)}
                    >
                      <TableCell className="font-medium truncate max-w-[160px]">
                        <div className="flex items-center">
                          {expandedUser === user ? (
                            <ChevronUp className="h-4 w-4 mr-2 text-[#9c27b0]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 mr-2 text-[#9c27b0]" />
                          )}
                          <span className="truncate">{latest.applicant?.name || latest.applicant || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          latest.decision === 'Approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {latest.decision}
                        </span>
                      </TableCell>
                      <TableCell>{latest.score}</TableCell>
                      <TableCell className="truncate max-w-[220px]">{latest.reason}</TableCell>
                      <TableCell className="truncate max-w-[140px]">{latest.officer?.name || latest.officer || 'N/A'}</TableCell>
                      <TableCell className="truncate max-w-[120px]">{latest.bank || 'N/A'}</TableCell>
                      <TableCell>{latest.date ? format(new Date(latest.date), 'MMM d, yyyy') : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {/* Expanded row for details */}
                    {expandedUser === user && selectedUserDecisions && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-[#f9fbe7] dark:bg-[#23291a] p-0">
                          <div className="p-4">
                            <h4 className="font-semibold mb-3 text-[#9c27b0] flex items-center">
                              <ChevronUp className="h-5 w-5 mr-2" />
                              All Lending Decisions for {latest.applicant?.name || latest.applicant || 'this user'}
                            </h4>
                            <div className="border rounded-lg overflow-x-auto">
                              <Table className="min-w-full">
                                <TableHeader className="bg-[#f0f7f4] dark:bg-[#1a4a38]">
                                  <TableRow>
                                    <TableHead className="min-w-[100px]">Decision</TableHead>
                                    <TableHead className="min-w-[120px]">System Decision</TableHead>
                                    <TableHead className="min-w-[80px]">Score</TableHead>
                                    <TableHead className="min-w-[100px]">Amount</TableHead>
                                    <TableHead className="min-w-[110px]">Interest</TableHead>
                                    <TableHead className="min-w-[80px]">Term</TableHead>
                                    <TableHead className="min-w-[120px]">Date</TableHead>
                                    <TableHead className="min-w-[120px]">Officer</TableHead>
                                    <TableHead className="min-w-[60px] text-center">Details</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {selectedUserDecisions.map((d, idx) => {
                                    const amount = d.raw?.raw?.loanDetails?.amount ?? d.raw?.raw?.maxLoanAmount ?? 'N/A';
                                    const interest = d.raw?.raw?.loanDetails?.interestRate ?? d.raw?.raw?.suggestedInterestRate ?? 'N/A';
                                    const term = d.raw?.raw?.loanDetails?.term ?? 'N/A';
                                    const isExpanded = expandedDecision === (d.id || idx);
                                    return (
                                      <React.Fragment key={d.id || idx}>
                                        <TableRow className="cursor-pointer" onClick={() => handleDecisionExpand(d.id || idx)}>
                                          <TableCell>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                              d.decision === 'Approved' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                              {d.decision}
                                            </span>
                                          </TableCell>
                                          <TableCell>{d.raw?.raw?.systemDecision || d.raw?.raw?.autoDecision || '—'}</TableCell>
                                          <TableCell>{d.score}</TableCell>
                                          <TableCell>{typeof amount === 'number' ? `$${amount.toLocaleString()}` : amount}</TableCell>
                                          <TableCell>{typeof interest === 'number' ? `${interest}%` : interest}</TableCell>
                                          <TableCell>{term}</TableCell>
                                          <TableCell>{d.date ? format(new Date(d.date), 'MMM d, yyyy') : 'N/A'}</TableCell>
                                          <TableCell>{d.officer?.name || d.officer || 'N/A'}</TableCell>
                                          <TableCell className="text-center">
                                            {isExpanded ? (
                                              <ChevronUp className="h-4 w-4 text-[#9c27b0] mx-auto" />
                                            ) : (
                                              <ChevronDown className="h-4 w-4 text-[#9c27b0] mx-auto" />
                                            )}
                                          </TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                          <TableRow>
                                            <TableCell colSpan={9} className="bg-[#f3e8fd] dark:bg-[#2d1a38] p-0">
                                              <div className="p-4">
                                                <h5 className="font-semibold mb-2 text-[#9c27b0]">Decision Details</h5>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                                  <div><strong>Decision:</strong> {d.decision}</div>
                                                  <div><strong>Score:</strong> {d.score}</div>
                                                  <div><strong>Reason:</strong> {d.reason || (d.raw?.raw?.reasons?.join(', ') || '—')}</div>
                                                  <div><strong>Date:</strong> {d.date ? format(new Date(d.date), 'MMM d, yyyy, HH:mm') : 'N/A'}</div>
                                                  <div><strong>Bank:</strong> {d.bank || d.raw?.bank || 'N/A'}</div>
                                                  <div><strong>Officer:</strong> {d.officer?.name || d.officer?.email || d.officer || 'N/A'}</div>
                                                  <div><strong>Applicant:</strong> {d.raw?.applicant?.name || d.applicant?.name || d.applicant || 'N/A'}</div>
                                                  <div><strong>Loan Amount:</strong> {d.raw?.raw?.loanDetails?.amount ?? d.raw?.raw?.maxLoanAmount ?? 'N/A'}</div>
                                                  <div><strong>Term:</strong> {d.raw?.raw?.loanDetails?.term ?? 'N/A'}</div>
                                                  <div><strong>Interest Rate:</strong> {d.raw?.raw?.loanDetails?.interestRate ?? d.raw?.raw?.suggestedInterestRate ?? 'N/A'}</div>
                                                  {d.raw?.raw?.loanType && (
                                                    <div><strong>Loan Type:</strong> {loanTypeLabels[d.raw.raw.loanType] || d.raw.raw.loanType}</div>
                                                  )}
                                                  <div><strong>Manual Decision:</strong> {d.raw?.raw?.isManual ? 'Yes' : 'No'}</div>
                                                  <div><strong>Recommendations:</strong> {Array.isArray(d.raw?.raw?.recommendations) && d.raw.raw.recommendations.length > 0 ? d.raw.raw.recommendations.join(', ') : '—'}</div>
                                                  <div><strong>Officer Notes:</strong> {d.raw?.raw?.manualNotes || '—'}</div>
                                                  <div><strong>Rejection Reason:</strong> {d.raw?.raw?.rejectionReason || '—'}</div>
                                                  <div><strong>Flagged for Review:</strong> {d.raw?.raw?.flagForReview ? 'Yes' : 'No'}</div>
                                                  <div><strong>Review Note:</strong> {d.raw?.raw?.reviewNote || '—'}</div>
                                                  <div><strong>Risk Tier Override:</strong> {d.raw?.raw?.riskTierOverride || '—'}</div>
                                                  <div><strong>Override Justification:</strong> {d.raw?.raw?.overrideJustification || '—'}</div>
                                                </div>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                              Showing {selectedUserDecisions.length} decision{selectedUserDecisions.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
  );
};

export default LendingDecisionsPanel;