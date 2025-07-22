import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Shield, AlertTriangle } from 'lucide-react';

const RiskTierOverridePanel = ({ userCreditData, isEditingDecision, manualDecision, handleManualDecision, user }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Risk Tier Override
          </CardTitle>
          {(user?.role === 'admin' || user?.role === 'lender') ? (
            <Badge variant="outline" className="text-xs text-green-600 border-green-600">
              Senior Underwriter Access
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-gray-500">
              Senior Underwriter Only
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Risk Tier Display */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-600">Current Risk Tier:</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={userCreditData?.lendingDecision?.riskTier === 'low' ? 'default' : 
                               userCreditData?.lendingDecision?.riskTier === 'medium' ? 'secondary' : 'destructive'}>
                  {userCreditData?.lendingDecision?.riskTierLabel || userCreditData?.lendingDecision?.riskTier || 'Not Assigned'}
                </Badge>
                {userCreditData?.lendingDecision?.riskTierOverride && (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Overridden
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-600">Score:</span>
              <div className="text-lg font-bold">{userCreditData?.lendingDecision?.score || 'N/A'}</div>
            </div>
          </div>

          {/* Override Controls */}
          {isEditingDecision && (user?.role === 'admin' || user?.role === 'lender') && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="risk-tier-override">Override Risk Tier</Label>
                <Select 
                  value={manualDecision.riskTierOverride} 
                  onValueChange={(value) => handleManualDecision('riskTierOverride', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select risk tier override" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                    <SelectItem value="none">No Override</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {manualDecision.riskTierOverride && (
                <div>
                  <Label htmlFor="override-justification">Override Justification</Label>
                  <Textarea
                    id="override-justification"
                    placeholder="Explain the reason for this risk tier override..."
                    value={manualDecision.overrideJustification}
                    onChange={(e) => handleManualDecision('overrideJustification', e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}

          {/* Override History */}
          {userCreditData?.lendingDecision?.overrideJustification && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Risk Tier Override Applied</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {userCreditData.lendingDecision.overrideJustification}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskTierOverridePanel; 