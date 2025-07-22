import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Calculator, AlertOctagon } from 'lucide-react';

const LoanSimulationPanel = ({
  loanSimulation,
  setLoanSimulation,
  showLoanSimulation,
  setShowLoanSimulation,
  updateLoanSimulation,
  handleManualDecision,
  toast,
  userCreditData,
  logDTIOverride
}) => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-green-600" />
          Loan Offer Simulation
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowLoanSimulation(!showLoanSimulation)}
        >
          {showLoanSimulation ? 'Hide' : 'Show'} Simulation
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      {showLoanSimulation ? (
        <div className="space-y-6">
          {/* Dynamic Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Loan Amount</Label>
                <span className="text-sm font-medium">${loanSimulation.amount.toLocaleString()}</span>
              </div>
              <Slider
                value={[loanSimulation.amount]}
                onValueChange={(value) => updateLoanSimulation('amount', value[0])}
                max={100000}
                min={1000}
                step={1000}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Term (months)</Label>
                <span className="text-sm font-medium">{loanSimulation.term} months</span>
              </div>
              <Slider
                value={[loanSimulation.term]}
                onValueChange={(value) => updateLoanSimulation('term', value[0])}
                max={84}
                min={12}
                step={6}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Interest Rate</Label>
                <span className="text-sm font-medium">{loanSimulation.rate}%</span>
              </div>
              <Slider
                value={[loanSimulation.rate]}
                onValueChange={(value) => updateLoanSimulation('rate', value[0])}
                max={25}
                min={3}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
          {/* Real-time Projections */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">Monthly Payment</div>
              <div className="text-lg font-bold text-green-600">
                ${loanSimulation.monthlyPayment.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Interest</div>
              <div className="text-lg font-bold text-red-600">
                ${loanSimulation.totalInterest.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">APR</div>
              <div className="text-lg font-bold">
                {loanSimulation.apr.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">DTI Ratio</div>
              <div className={`text-lg font-bold ${loanSimulation.dti > 60 ? 'text-red-600' : 'text-green-600'}`}> 
                {loanSimulation.dti.toFixed(1)}%
              </div>
            </div>
          </div>
          {/* Auto-reject Warning */}
          {loanSimulation.autoReject && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertOctagon className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-red-800">Auto-Reject Flagged</div>
                  <div className="text-sm text-red-700 mt-1">
                    DTI ratio of {loanSimulation.dti.toFixed(1)}% exceeds 60% threshold. 
                    This loan would be automatically rejected unless manually overridden.
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={logDTIOverride}
                    className="mt-2"
                  >
                    Log Override Request
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Apply Simulation to Decision */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                handleManualDecision('amount', loanSimulation.amount);
                handleManualDecision('term', loanSimulation.term);
                handleManualDecision('interestRate', loanSimulation.rate);
                toast && toast({
                  title: "Simulation Applied",
                  description: "Loan terms have been applied to the decision form.",
                  variant: "default",
                });
              }}
            >
              Apply to Decision
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setLoanSimulation({
                  amount: 10000,
                  term: 36,
                  rate: 8.5,
                  monthlyPayment: 0,
                  totalInterest: 0,
                  apr: 0,
                  dti: 0,
                  autoReject: false
                });
                updateLoanSimulation('amount', 10000);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          Click "Show Simulation" to access dynamic loan offer tools
        </div>
      )}
    </CardContent>
  </Card>
);

export default LoanSimulationPanel; 