import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Calculator, 
  TrendingUp, 
  Download, 
  Share2,
  Zap,
  Target
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { useState } from 'react';

const PremiumToolsPanel = ({ user, creditData }) => {
  const [openTool, setOpenTool] = useState(null); // 'score' | 'eligibility' | 'offer' | 'dti' | null
  const [simInput, setSimInput] = useState({ paymentHistory: 0.8, utilization: 0.3, score: 650, income: 4000, debt: 800, collateral: 0 });
  const [simResult, setSimResult] = useState(null);

  const handleSimChange = e => setSimInput(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleScoreSim = async () => {
    try {
      const response = await fetch('/api/score/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentHistory: simInput.paymentHistory,
          utilization: simInput.utilization,
          income: simInput.income,
          debt: simInput.debt
        })
      });
      const data = await response.json();
      if (data.score !== undefined) {
        setSimResult(`Simulated Score: ${data.score}`);
      } else {
        setSimResult('Simulation not available');
      }
    } catch (error) {
      setSimResult('Simulation service unavailable');
    }
  };
  
  const handleEligibility = async () => {
    try {
      const response = await fetch('/api/loan/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: simInput.score,
          income: simInput.income,
          debt: simInput.debt
        })
      });
      const data = await response.json();
      if (data.eligible !== undefined) {
        setSimResult(data.eligible ? 'Eligible for loan' : 'Not eligible for loan');
      } else {
        setSimResult('Eligibility check not available');
      }
    } catch (error) {
      setSimResult('Eligibility service unavailable');
    }
  };
  
  const handleOffer = async () => {
    try {
      const response = await fetch('/api/loan/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: simInput.score,
          income: simInput.income,
          collateral: simInput.collateral
        })
      });
      const data = await response.json();
      if (data.offer) {
        setSimResult(`Offer: $${data.offer.amount} at ${data.offer.rate}% for ${data.offer.term} months`);
      } else {
        setSimResult('No offers available');
      }
    } catch (error) {
      setSimResult('Offer service unavailable');
    }
  };
  
  const handleDTI = async () => {
    try {
      const response = await fetch('/api/loan/dti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          income: simInput.income,
          debt: simInput.debt
        })
      });
      const data = await response.json();
      if (data.dti !== undefined) {
        const dti = data.dti * 100;
    setSimResult(`DTI: ${dti.toFixed(1)}% (${dti < 36 ? 'Good' : 'High'})`);
      } else {
        setSimResult('DTI calculation not available');
      }
    } catch (error) {
      setSimResult('DTI service unavailable');
    }
  };

  const tools = [
    {
      name: 'Credit Simulator',
      description: 'See how actions affect your score',
      icon: Calculator,
      color: 'bg-blue-500',
      available: true
    },
    {
      name: 'Score Projection',
      description: 'Predict your future credit score',
      icon: TrendingUp,
      color: 'bg-green-500',
      available: true
    },
    {
      name: 'Report Download',
      description: 'Get your full credit report',
      icon: Download,
      color: 'bg-purple-500',
      available: true
    },
    {
      name: 'Lender Sharing',
      description: 'Share with approved lenders',
      icon: Share2,
      color: 'bg-orange-500',
      available: user?.preferences?.dataSharing || false
    }
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span>Premium Tools</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          let toolKey = null;
          if (tool.name === 'Credit Simulator') toolKey = 'score';
          if (tool.name === 'Score Projection') toolKey = 'eligibility';
          if (tool.name === 'Report Download') toolKey = 'offer';
          if (tool.name === 'Lender Sharing') toolKey = 'dti';
          return (
            <div key={tool.name} className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${tool.color} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {tool.name}
                    </h3>
                    {tool.available ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                        Available
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {tool.description}
                  </p>
                  <Button 
                    size="sm" 
                    disabled={!tool.available}
                    className="w-full"
                    onClick={() => setOpenTool(toolKey)}
                  >
                    {tool.available ? 'Use Tool' : 'Enable First'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {/* Modals for each tool */}
        <Dialog open={openTool === 'score'} onOpenChange={v => !v && setOpenTool(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Score Simulator</DialogTitle></DialogHeader>
            <label>Payment History (%)<Input name="paymentHistory" type="number" min="0" max="1" step="0.01" value={simInput.paymentHistory} onChange={handleSimChange} /></label>
            <label>Credit Utilization (%)<Input name="utilization" type="number" min="0" max="1" step="0.01" value={simInput.utilization} onChange={handleSimChange} /></label>
            <DialogFooter>
              <Button onClick={handleScoreSim}>Simulate</Button>
            </DialogFooter>
            {simResult && <div className="mt-2 text-green-600">{simResult}</div>}
          </DialogContent>
        </Dialog>
        <Dialog open={openTool === 'eligibility'} onOpenChange={v => !v && setOpenTool(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Loan Eligibility Checker</DialogTitle></DialogHeader>
            <label>Score<Input name="score" type="number" value={simInput.score} onChange={handleSimChange} /></label>
            <label>Monthly Income<Input name="income" type="number" value={simInput.income} onChange={handleSimChange} /></label>
            <label>Monthly Debt<Input name="debt" type="number" value={simInput.debt} onChange={handleSimChange} /></label>
            <DialogFooter>
              <Button onClick={handleEligibility}>Check Eligibility</Button>
            </DialogFooter>
            {simResult && <div className="mt-2 text-green-600">{simResult}</div>}
          </DialogContent>
        </Dialog>
        <Dialog open={openTool === 'offer'} onOpenChange={v => !v && setOpenTool(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Offer Simulator</DialogTitle></DialogHeader>
            <label>Score<Input name="score" type="number" value={simInput.score} onChange={handleSimChange} /></label>
            <label>Monthly Income<Input name="income" type="number" value={simInput.income} onChange={handleSimChange} /></label>
            <label>Collateral Value<Input name="collateral" type="number" value={simInput.collateral} onChange={handleSimChange} /></label>
            <DialogFooter>
              <Button onClick={handleOffer}>Simulate Offer</Button>
            </DialogFooter>
            {simResult && <div className="mt-2 text-green-600">{simResult}</div>}
          </DialogContent>
        </Dialog>
        <Dialog open={openTool === 'dti'} onOpenChange={v => !v && setOpenTool(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>DTI Calculator</DialogTitle></DialogHeader>
            <label>Monthly Debt<Input name="debt" type="number" value={simInput.debt} onChange={handleSimChange} /></label>
            <label>Monthly Income<Input name="income" type="number" value={simInput.income} onChange={handleSimChange} /></label>
            <DialogFooter>
              <Button onClick={handleDTI}>Calculate DTI</Button>
            </DialogFooter>
            {simResult && <div className="mt-2 text-green-600">{simResult}</div>}
          </DialogContent>
        </Dialog>
        
        {/* Quick Stats */}
        <div className="mt-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Quick Stats
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Score Range</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {creditData?.creditScore || 0} / 850
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Updates</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {creditData?.creditHistory?.length || 0} times
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(PremiumToolsPanel); 