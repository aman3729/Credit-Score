import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Loader2, User, Edit } from 'lucide-react';

const BorrowerSnapshot = ({ userCreditData, selectedUser, closeBorrowerView, loadingCreditData, startEditingIncome, renderDecisionBadge }) => (
  <Card className="mb-6">
    <CardHeader className="pb-3">
      <div className="flex justify-between items-center">
        <CardTitle>Borrower Snapshot</CardTitle>
        <Button variant="outline" onClick={closeBorrowerView}>
          Back to Dashboard
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      {loadingCreditData ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : userCreditData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - User Info */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-gray-100 dark:bg-[#222325] p-3 rounded-full">
                  <User className="h-8 w-8 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedUser?.name || 'N/A'}</h3>
                  <p className="text-muted-foreground">{selectedUser?.email || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm text-muted-foreground">Credit Score</h4>
                  <div className="flex flex-col items-center mt-2 mb-4">
                    {/* Prominent circular badge for score */}
                      {(() => {
                      const score = userCreditData.creditScore?.fico?.score ?? userCreditData.currentScore ?? null;
                      let color = 'bg-gray-200 text-gray-700';
                      let rating = 'N/A';
                      if (typeof score === 'number') {
                        if (score >= 740) { color = 'bg-green-500 text-white'; rating = 'Excellent'; }
                        else if (score >= 670) { color = 'bg-blue-500 text-white'; rating = 'Good'; }
                        else if (score >= 580) { color = 'bg-yellow-400 text-white'; rating = 'Fair'; }
                        else { color = 'bg-red-500 text-white'; rating = 'Poor'; }
                      }
                      return (
                        <>
                          <div className={`flex items-center justify-center rounded-full ${color}`} style={{ width: 80, height: 80, fontSize: 32, fontWeight: 700 }}>
                            {score !== null ? score : 'N/A'}
                          </div>
                          <div className="mt-2 text-base font-semibold" style={{ fontSize: 16 }}>{rating}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            Engine: {userCreditData.engine === 'default' ? 'FF Score' : userCreditData.engine === 'creditworthiness' ? 'TF Score' : (userCreditData.engine || 'Unknown')}
                            {userCreditData.engineVersion && (
                              <span className="ml-2 px-2 py-1 bg-emerald-700/70 rounded text-xs">v{userCreditData.engineVersion}</span>
                            )}
                          </div>
                        </>
                      );
                      })()}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm text-muted-foreground">Risk Assessment</h4>
                  <div className="flex flex-col gap-1 mt-2">
                    {/* Risk Tier */}
                    <div className="flex items-center gap-2">
                      <span>Risk Tier:</span>
                      {(() => {
                        const tier = userCreditData.lendingDecision?.riskTierLabel || userCreditData.lendingDecision?.riskTier || 'N/A';
                        if (tier === 'Subprime') return <span className="bg-red-500 text-white rounded px-2 py-0.5 text-xs">{tier}</span>;
                        return <span className="bg-gray-200 text-gray-700 rounded px-2 py-0.5 text-xs">{tier}</span>;
                      })()}
                    </div>
                    {/* Default Risk */}
                    <div className="flex items-center gap-2">
                      <span>Default Risk:</span>
                      {(() => {
                        const risk = userCreditData.lendingDecision?.defaultRiskEstimate || 'N/A';
                        if (risk === 'High') return <span className="bg-red-500 text-white rounded px-2 py-0.5 text-xs">{risk}</span>;
                        return <span className="bg-gray-200 text-gray-700 rounded px-2 py-0.5 text-xs">{risk}</span>;
                      })()}
                    </div>
                    {/* Classification */}
                    <div className="flex items-center gap-2">
                      <span>Classification:</span>
                      {(() => {
                        const classification = userCreditData.lendingDecision?.classification || 'N/A';
                        if (classification === 'Good') return <span className="bg-green-500 text-white rounded px-2 py-0.5 text-xs">{classification}</span>;
                        return <span className="bg-gray-200 text-gray-700 rounded px-2 py-0.5 text-xs">{classification}</span>;
                      })()}
                    </div>
                    {/* DTI Ratio */}
                    <div className="flex items-center gap-2">
                      <span>DTI Ratio:</span>
                      {(() => {
                        const dti = userCreditData.lendingDecision?.dti;
                        const dtiRating = userCreditData.lendingDecision?.dtiRating || 'N/A';
                        if (typeof dti === 'number') {
                          return <span className="bg-green-500 text-white rounded px-2 py-0.5 text-xs">{`${(dti * 100).toFixed(1)}%`} ({dtiRating})</span>;
                        }
                        return <span className="bg-gray-200 text-gray-700 rounded px-2 py-0.5 text-xs">N/A</span>;
                      })()}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm text-muted-foreground">Lending Decision</h4>
                  <div className="mt-1">
                    {renderDecisionBadge(userCreditData.lendingDecision?.decision || 'Review', 'large')}
                  </div>
                </div>
              </div>
            </div>
            {/* Right Column - Financial Metrics */}
            <div className="md:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Monthly Income', value: userCreditData.monthlyIncome !== undefined && userCreditData.monthlyIncome !== null ? `$${userCreditData.monthlyIncome.toLocaleString()}` : 'N/A', editable: true },
                  { title: 'Total Debt', value: userCreditData.totalDebt !== undefined && userCreditData.totalDebt !== null ? `$${userCreditData.totalDebt.toLocaleString()}` : 'N/A' },
                  { title: 'DTI Ratio', value: typeof userCreditData.dti === 'number' && !isNaN(userCreditData.dti) ? `${(userCreditData.dti * 100).toFixed(1)}%` : 'N/A' },
                  { title: 'Max Loan Amount', value: userCreditData.lendingDecision?.maxLoanAmount !== undefined && userCreditData.lendingDecision?.maxLoanAmount !== null ? (userCreditData.lendingDecision.maxLoanAmount > 0 ? `$${userCreditData.lendingDecision.maxLoanAmount.toLocaleString()}` : 'Not Eligible') : 'N/A', highlight: true },
                  { title: 'Suggested Rate', value: userCreditData.lendingDecision?.suggestedInterestRate !== undefined && userCreditData.lendingDecision?.suggestedInterestRate !== null ? userCreditData.lendingDecision.suggestedInterestRate : 'N/A', highlight: true },
                  { title: 'Missed Payments', value: userCreditData.recentMissedPayments !== undefined && userCreditData.recentMissedPayments !== null ? userCreditData.recentMissedPayments : 0 },
                  { title: 'Recent Defaults', value: userCreditData.recentDefaults !== undefined && userCreditData.recentDefaults !== null ? userCreditData.recentDefaults : 0 },
                  { title: 'Credit Utilization', value: userCreditData.creditUtilization?.overall !== undefined && userCreditData.creditUtilization?.overall !== null ? `${(userCreditData.creditUtilization.overall * 100).toFixed(1)}%` : 'N/A' },
                  { title: 'Credit Mix', value: userCreditData.creditMix !== undefined && userCreditData.creditMix !== null ? `${(userCreditData.creditMix * 100).toFixed(1)}%` : 'N/A' },
                  { title: 'Credit Age (months)', value: userCreditData.creditAgeMonths !== undefined && userCreditData.creditAgeMonths !== null ? userCreditData.creditAgeMonths : 'N/A' },
                  { title: 'Total Accounts', value: userCreditData.totalAccounts !== undefined && userCreditData.totalAccounts !== null ? userCreditData.totalAccounts : 'N/A' },
                  { title: 'Open Accounts', value: userCreditData.openAccounts !== undefined && userCreditData.openAccounts !== null ? userCreditData.openAccounts : 'N/A' },
                  { title: 'Collateral Value', value: userCreditData.lendingDecision?.collateralValue !== undefined && userCreditData.lendingDecision?.collateralValue !== null ? (userCreditData.lendingDecision.collateralValue > 0 ? `$${userCreditData.lendingDecision.collateralValue.toLocaleString()}` : 'None') : 'N/A', highlight: userCreditData.lendingDecision?.collateralValue > 0 }
                ].map((metric, index) => (
                  <div key={index} className={`p-4 rounded-lg ${metric.highlight ? 'bg-blue-50 dark:bg-blue-900/40' : 'bg-gray-50 dark:bg-[#222325]'}`}>
                    <h4 className="text-sm text-muted-foreground">{metric.title}</h4>
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-lg font-semibold ${metric.highlight ? 'text-blue-600 dark:text-blue-300' : 'dark:text-gray-100'}`}>{metric.value}</p>
                      {metric.editable && (
                        <Button variant="ghost" size="icon" onClick={startEditingIncome}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No credit data available
        </div>
      )}
    </CardContent>
  </Card>
);

export default BorrowerSnapshot; 