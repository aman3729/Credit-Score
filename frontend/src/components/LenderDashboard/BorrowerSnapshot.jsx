import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Loader2, User, Edit, TrendingUp, TrendingDown, Shield, CreditCard, DollarSign, Calendar, Target } from 'lucide-react';

const BorrowerSnapshot = ({ userCreditData, selectedUser, closeBorrowerView, loadingCreditData, startEditingIncome, renderDecisionBadge }) => (
  <Card className="mb-8 bg-gradient-to-br from-background via-background to-accent/5 border-2 border-border/50 shadow-elegant hover:shadow-glow transition-all duration-500">
    <CardHeader className="pb-6 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 rounded-t-lg border-b border-border/30">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary to-primary-glow rounded-xl shadow-md">
            <User className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Borrower Snapshot
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Comprehensive credit and risk analysis</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={closeBorrowerView}
          className="hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md"
        >
          Back to Dashboard
        </Button>
      </div>
    </CardHeader>
    <CardContent className="p-8">
      {loadingCreditData ? (
        <div className="flex flex-col justify-center items-center py-16">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
          </div>
          <p className="text-muted-foreground mt-4 font-medium">Loading borrower data...</p>
        </div>
      ) : userCreditData ? (
        <>
          {/* Borrower Header */}
          <div className="mb-8 p-6 bg-gradient-to-r from-accent/10 to-secondary/10 rounded-xl border border-border/30">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center shadow-lg">
                  <User className="h-10 w-10 text-primary-foreground" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
                  <Shield className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground">{selectedUser?.name || 'N/A'}</h3>
                <p className="text-muted-foreground text-lg">{selectedUser?.email || 'N/A'}</p>
                <div className="mt-2">
                  {renderDecisionBadge(userCreditData.lendingDecision?.decision || 'Review', 'large')}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Credit Score Section */}
            <div className="lg:col-span-4">
              <Card className="h-full bg-gradient-to-br from-background to-accent/5 border-2 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="flex items-center justify-center gap-2 text-xl">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Credit Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center pb-8">
                  <div className="flex flex-col items-center">
                    {(() => {
                      const score = userCreditData.creditScore?.fico?.score ?? userCreditData.currentScore ?? null;
                      let bgColor = 'bg-gradient-to-br from-muted to-muted/80';
                      let textColor = 'text-muted-foreground';
                      let rating = 'N/A';
                      let ringColor = 'ring-muted/30';
                      
                      if (typeof score === 'number') {
                        if (score >= 740) { 
                          bgColor = 'bg-gradient-to-br from-emerald-500 to-emerald-600'; 
                          textColor = 'text-white'; 
                          rating = 'Excellent';
                          ringColor = 'ring-emerald-200';
                        }
                        else if (score >= 670) { 
                          bgColor = 'bg-gradient-to-br from-blue-500 to-blue-600'; 
                          textColor = 'text-white'; 
                          rating = 'Good';
                          ringColor = 'ring-blue-200';
                        }
                        else if (score >= 580) { 
                          bgColor = 'bg-gradient-to-br from-amber-400 to-amber-500'; 
                          textColor = 'text-white'; 
                          rating = 'Fair';
                          ringColor = 'ring-amber-200';
                        }
                        else { 
                          bgColor = 'bg-gradient-to-br from-red-500 to-red-600'; 
                          textColor = 'text-white'; 
                          rating = 'Poor';
                          ringColor = 'ring-red-200';
                        }
                      }
                      
                      return (
                        <>
                          <div className={`relative w-32 h-32 ${bgColor} rounded-full flex items-center justify-center shadow-xl ring-4 ${ringColor} transform hover:scale-105 transition-all duration-300`}>
                            <span className={`text-4xl font-bold ${textColor}`}>
                              {score !== null ? score : 'N/A'}
                            </span>
                            <div className="absolute inset-0 bg-white/10 rounded-full blur-sm"></div>
                          </div>
                          <div className="mt-4 space-y-2">
                            <div className="text-xl font-bold text-foreground">{rating}</div>
                            <div className="text-sm text-muted-foreground bg-accent/20 px-3 py-1 rounded-full">
                              Engine: {userCreditData.engine === 'default' ? 'FF Score' : userCreditData.engine === 'creditworthiness' ? 'TF Score' : (userCreditData.engine || 'Unknown')}
                              {userCreditData.engineVersion && (
                                <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded text-xs">
                                  v{userCreditData.engineVersion}
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Assessment Section */}
            <div className="lg:col-span-8">
              <Card className="h-full bg-gradient-to-br from-background to-secondary/5 border-2 border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        label: 'Risk Tier',
                        value: userCreditData.lendingDecision?.riskTierLabel || userCreditData.lendingDecision?.riskTier || 'N/A',
                        type: 'tier'
                      },
                      {
                        label: 'Default Risk',
                        value: userCreditData.lendingDecision?.defaultRiskEstimate || 'N/A',
                        type: 'risk'
                      },
                      {
                        label: 'Classification',
                        value: userCreditData.lendingDecision?.classification || 'N/A',
                        type: 'classification'
                      },
                      {
                        label: 'DTI Ratio',
                        value: (() => {
                          const dti = (userCreditData.lendingDecision?.dti ?? userCreditData.scoreResult?.dtiRatio ?? userCreditData.dti);
                          const computeDtiRating = (v) => {
                            if (typeof v !== 'number') return 'N/A';
                            if (v < 0.15) return 'Excellent';
                            if (v < 0.25) return 'Good';
                            if (v < 0.35) return 'Fair';
                            return 'Poor';
                          };
                          const dtiRating = userCreditData.lendingDecision?.dtiRating || computeDtiRating(dti);
                          if (typeof dti === 'number') {
                            return `${(dti * 100).toFixed(1)}% (${dtiRating})`;
                          }
                          return 'N/A';
                        })(),
                        type: 'dti'
                      }
                    ].map((item, index) => (
                      <div key={index} className="p-4 bg-gradient-to-br from-accent/10 to-secondary/10 rounded-lg border border-border/30 hover:shadow-md transition-all duration-300">
                        <div className="text-sm font-medium text-muted-foreground mb-2">{item.label}</div>
                        <div className="flex items-center gap-2">
                          {(() => {
                            let badgeClass = 'bg-gradient-to-r from-muted to-muted/80 text-muted-foreground';
                            let icon = null;
                            
                            if (item.type === 'tier' && item.value === 'Subprime') {
                              badgeClass = 'bg-gradient-to-r from-red-500 to-red-600 text-white';
                              icon = <TrendingDown className="h-3 w-3" />;
                            } else if (item.type === 'risk' && item.value === 'High') {
                              badgeClass = 'bg-gradient-to-r from-red-500 to-red-600 text-white';
                              icon = <TrendingDown className="h-3 w-3" />;
                            } else if (item.type === 'classification' && item.value === 'Good') {
                              badgeClass = 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white';
                              icon = <TrendingUp className="h-3 w-3" />;
                            } else if (item.type === 'dti' && item.value !== 'N/A') {
                              badgeClass = 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white';
                              icon = <Target className="h-3 w-3" />;
                            }
                            
                            return (
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium shadow-sm ${badgeClass}`}>
                                {icon}
                                {item.value}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Financial Metrics Grid */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Financial Metrics</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[
                { title: 'Monthly Income', value: userCreditData.monthlyIncome !== undefined && userCreditData.monthlyIncome !== null ? `$${userCreditData.monthlyIncome.toLocaleString()}` : 'N/A', editable: true, icon: DollarSign, color: 'emerald' },
                { title: 'Total Debt', value: userCreditData.totalDebt !== undefined && userCreditData.totalDebt !== null ? `$${userCreditData.totalDebt.toLocaleString()}` : 'N/A', icon: CreditCard, color: 'red' },
                { title: 'DTI Ratio', value: typeof userCreditData.dti === 'number' && !isNaN(userCreditData.dti) ? `${(userCreditData.dti * 100).toFixed(1)}%` : 'N/A', icon: Target, color: 'blue' },
                { title: 'Max Loan Amount', value: userCreditData.lendingDecision?.maxLoanAmount !== undefined && userCreditData.lendingDecision?.maxLoanAmount !== null ? (userCreditData.lendingDecision.maxLoanAmount > 0 ? `$${userCreditData.lendingDecision.maxLoanAmount.toLocaleString()}` : 'Not Eligible') : 'N/A', highlight: true, icon: Target, color: 'primary' },
                { title: 'Suggested Rate', value: userCreditData.lendingDecision?.suggestedInterestRate !== undefined && userCreditData.lendingDecision?.suggestedInterestRate !== null ? userCreditData.lendingDecision.suggestedInterestRate : 'N/A', highlight: true, icon: TrendingUp, color: 'primary' },
                { title: 'Missed Payments', value: userCreditData.recentMissedPayments !== undefined && userCreditData.recentMissedPayments !== null ? userCreditData.recentMissedPayments : 0, icon: TrendingDown, color: 'amber' },
                { title: 'Recent Defaults', value: userCreditData.recentDefaults !== undefined && userCreditData.recentDefaults !== null ? userCreditData.recentDefaults : 0, icon: TrendingDown, color: 'red' },
                { title: 'Credit Utilization', value: userCreditData.creditUtilization?.overall !== undefined && userCreditData.creditUtilization?.overall !== null ? `${(userCreditData.creditUtilization.overall * 100).toFixed(1)}%` : 'N/A', icon: CreditCard, color: 'blue' },
                { title: 'Credit Mix', value: userCreditData.creditMix !== undefined && userCreditData.creditMix !== null ? `${(userCreditData.creditMix * 100).toFixed(1)}%` : 'N/A', icon: Shield, color: 'purple' },
                { title: 'Credit Age (months)', value: userCreditData.creditAgeMonths !== undefined && userCreditData.creditAgeMonths !== null ? userCreditData.creditAgeMonths : 'N/A', icon: Calendar, color: 'blue' },
                { title: 'Total Accounts', value: userCreditData.totalAccounts !== undefined && userCreditData.totalAccounts !== null ? userCreditData.totalAccounts : 'N/A', icon: CreditCard, color: 'blue' },
                { title: 'Open Accounts', value: userCreditData.openAccounts !== undefined && userCreditData.openAccounts !== null ? userCreditData.openAccounts : 'N/A', icon: CreditCard, color: 'emerald' },
                { title: 'Collateral Value', value: userCreditData.lendingDecision?.collateralValue !== undefined && userCreditData.lendingDecision?.collateralValue !== null ? (userCreditData.lendingDecision.collateralValue > 0 ? `$${userCreditData.lendingDecision.collateralValue.toLocaleString()}` : 'None') : 'N/A', highlight: userCreditData.lendingDecision?.collateralValue > 0, icon: Shield, color: 'primary' }
              ].map((metric, index) => (
                <Card 
                  key={index} 
                  className={`group hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105 ${
                    metric.highlight 
                      ? 'bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 border-2 border-primary/20 shadow-md' 
                      : 'bg-gradient-to-br from-background to-accent/5 border border-border/50'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl shadow-sm ${
                        metric.color === 'emerald' ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 border border-emerald-300' :
                        metric.color === 'red' ? 'bg-gradient-to-br from-red-100 to-red-200 border border-red-300' :
                        metric.color === 'blue' ? 'bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300' :
                        metric.color === 'amber' ? 'bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300' :
                        metric.color === 'purple' ? 'bg-gradient-to-br from-purple-100 to-purple-200 border border-purple-300' :
                        metric.color === 'primary' ? 'bg-gradient-to-br from-primary/20 to-primary/30 border border-primary/40' :
                        'bg-gradient-to-br from-muted to-muted/80 border border-border'
                      }`}>
                        <metric.icon className={`h-5 w-5 ${
                          metric.color === 'emerald' ? 'text-emerald-600' :
                          metric.color === 'red' ? 'text-red-600' :
                          metric.color === 'blue' ? 'text-blue-600' :
                          metric.color === 'amber' ? 'text-amber-600' :
                          metric.color === 'purple' ? 'text-purple-600' :
                          metric.color === 'primary' ? 'text-primary' :
                          'text-muted-foreground'
                        }`} />
                      </div>
                      {metric.editable && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={startEditingIncome}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-primary hover:text-primary-foreground"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">{metric.title}</h4>
                      <p className={`text-lg font-bold ${
                        metric.highlight 
                          ? 'text-primary' 
                          : 'text-foreground'
                      }`}>
                        {metric.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <div className="p-6 bg-gradient-to-br from-muted/50 to-accent/10 rounded-xl border border-border/50 inline-block">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground font-medium">No credit data available</p>
            <p className="text-sm text-muted-foreground/80 mt-2">Please select a borrower to view their information</p>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

export default BorrowerSnapshot;