import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '../../hooks/use-toast';
import { api } from '../../lib/api';
import { 
  Settings, 
  Brain, 
  DollarSign, 
  Shield, 
  Palette, 
  Save, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

const DecisionConfigPanel = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('engines');
  const [validationErrors, setValidationErrors] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    loadBankConfig();
  }, []);

  const loadBankConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/partner-banks/my/complete-config');
      setConfig(response.data.config);
      setValidationErrors([]);
    } catch (error) {
      console.error('Failed to load bank config:', error);
      toast({
        title: "Error",
        description: "Failed to load bank configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      
      // Validate configuration before saving
      const errors = validateConfiguration(config);
      if (errors.length > 0) {
        setValidationErrors(errors);
        toast({
          title: "Validation Error",
          description: `Configuration has ${errors.length} validation errors`,
          variant: "destructive"
        });
        return;
      }

      // Save each section separately
      const savePromises = [];

      if (config.engineConfig) {
        savePromises.push(
          api.patch('/partner-banks/my/engine-config', {
            engineConfig: config.engineConfig
          })
        );
      }

      if (config.lendingPolicy) {
        savePromises.push(
          api.patch('/partner-banks/my/lending-policy', {
            lendingPolicy: config.lendingPolicy
          })
        );
      }

      if (config.accessControls) {
        savePromises.push(
          api.patch('/partner-banks/my/access-controls', {
            accessControls: config.accessControls
          })
        );
      }

      if (config.branding) {
        savePromises.push(
          api.patch('/partner-banks/my/branding', {
            branding: config.branding
          })
        );
      }

      await Promise.all(savePromises);

      toast({
        title: "Success",
        description: "Bank configuration saved successfully",
      });
      setValidationErrors([]);
    } catch (error) {
      console.error('Failed to save config:', error);
      toast({
        title: "Error",
        description: "Failed to save bank configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const validateConfiguration = (config) => {
    const errors = [];

    // Validate engine1 weights sum to 100
    if (config.engineConfig?.engine1?.scoringWeights) {
      const weights = config.engineConfig.engine1.scoringWeights;
      const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      if (Math.abs(weightSum - 100) > 1) {
        errors.push(`Engine1 scoring weights must sum to 100 (current: ${weightSum})`);
      }
    }

    // Validate engine2 weights sum to 100
    if (config.engineConfig?.engine2?.weights) {
      const weights = config.engineConfig.engine2.weights;
      const weightSum = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      if (Math.abs(weightSum - 100) > 1) {
        errors.push(`Engine2 weights must sum to 100 (current: ${weightSum})`);
      }
    }

    // Validate interest rates
    if (config.lendingPolicy?.interestRateRules) {
      const rates = config.lendingPolicy.interestRateRules;
      if (rates.baseRate > rates.maxRate) {
        errors.push('Base rate cannot be higher than max rate');
      }
    }

    return errors;
  };

  const updateConfig = (section, subsection, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section]?.[subsection],
          [field]: value
        }
      }
    }));
  };

  const updateNestedConfig = (section, path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig[section];
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading bank configuration...</span>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bank configuration not found. Please contact your administrator.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bank Configuration</h2>
          <p className="text-muted-foreground">
            Configure your bank's scoring engines, lending policies, and system settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadBankConfig} disabled={saving}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Configuration Validation Errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="engines" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Engines
          </TabsTrigger>
          <TabsTrigger value="lending" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Lending
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Access
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="legacy" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Legacy
          </TabsTrigger>
        </TabsList>

        {/* Engine Configuration Tab */}
        <TabsContent value="engines" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engine 1: Credit-Based Scoring */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Engine 1: Credit-Based Scoring
                </CardTitle>
                <CardDescription>
                  Configure weights, penalties, and bonuses for credit-based scoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Scoring Weights (%)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(config.engineConfig?.engine1?.scoringWeights || {}).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => updateConfig('engineConfig', 'engine1', 'scoringWeights', {
                            ...config.engineConfig.engine1.scoringWeights,
                            [key]: parseFloat(e.target.value)
                          })}
                          min="0"
                          max="100"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium">Penalties</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Recent Defaults</Label>
                      <Input
                        type="number"
                        value={config.engineConfig?.engine1?.penalties?.recentDefaults || 0}
                        onChange={(e) => updateConfig('engineConfig', 'engine1', 'penalties', {
                          ...config.engineConfig.engine1.penalties,
                          recentDefaults: parseFloat(e.target.value)
                        })}
                        className="w-20"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium">Rejection Rules</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Allow Consecutive Missed Payments</Label>
                      <Switch
                        checked={config.engineConfig?.engine1?.rejectionRules?.allowConsecutiveMissedPayments || false}
                        onCheckedChange={(checked) => updateConfig('engineConfig', 'engine1', 'rejectionRules', {
                          ...config.engineConfig.engine1.rejectionRules,
                          allowConsecutiveMissedPayments: checked
                        })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engine 2: 5 Cs Creditworthiness */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Engine 2: 5 Cs Creditworthiness
                </CardTitle>
                <CardDescription>
                  Configure weights for Capacity, Capital, Collateral, Conditions, and Character
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">5 Cs Weights (%)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(config.engineConfig?.engine2?.weights || {}).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs capitalize">{key}</Label>
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => updateConfig('engineConfig', 'engine2', 'weights', {
                            ...config.engineConfig.engine2.weights,
                            [key]: parseFloat(e.target.value)
                          })}
                          min="0"
                          max="100"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium">Behavioral Thresholds</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Max DTI</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={config.engineConfig?.engine2?.behavioralThresholds?.maxDTI || 0.45}
                        onChange={(e) => updateConfig('engineConfig', 'engine2', 'behavioralThresholds', {
                          ...config.engineConfig.engine2.behavioralThresholds,
                          maxDTI: parseFloat(e.target.value)
                        })}
                        className="w-20"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Stable Employment Required</Label>
                      <Switch
                        checked={config.engineConfig?.engine2?.behavioralThresholds?.stableEmploymentRequired || false}
                        onCheckedChange={(checked) => updateConfig('engineConfig', 'engine2', 'behavioralThresholds', {
                          ...config.engineConfig.engine2.behavioralThresholds,
                          stableEmploymentRequired: checked
                        })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lending Policy Tab */}
        <TabsContent value="lending" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Base Loan Amounts */}
            <Card>
              <CardHeader>
                <CardTitle>Base Loan Amounts</CardTitle>
                <CardDescription>
                  Maximum loan amounts by credit classification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(config.lendingPolicy?.baseLoanAmounts || {}).map(([classification, amount]) => (
                  <div key={classification} className="flex items-center justify-between">
                    <Label className="text-sm capitalize">{classification.replace(/_/g, ' ')}</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => updateConfig('lendingPolicy', 'baseLoanAmounts', classification, parseFloat(e.target.value))}
                      className="w-32"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Interest Rate Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Interest Rate Rules</CardTitle>
                <CardDescription>
                  Base rates and adjustments for different risk factors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Base Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.lendingPolicy?.interestRateRules?.baseRate || 12.5}
                    onChange={(e) => updateConfig('lendingPolicy', 'interestRateRules', 'baseRate', parseFloat(e.target.value))}
                    className="w-24"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Max Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.lendingPolicy?.interestRateRules?.maxRate || 35.99}
                    onChange={(e) => updateConfig('lendingPolicy', 'interestRateRules', 'maxRate', parseFloat(e.target.value))}
                    className="w-24"
                  />
                </div>
                <Separator />
                <Label className="text-sm font-medium">Rate Adjustments (%)</Label>
                {Object.entries(config.lendingPolicy?.interestRateRules?.adjustments || {}).map(([factor, adjustment]) => (
                  <div key={factor} className="flex items-center justify-between">
                    <Label className="text-xs capitalize">{factor.replace(/_/g, ' ')}</Label>
                    <Input
                      type="number"
                      value={adjustment}
                      onChange={(e) => updateConfig('lendingPolicy', 'interestRateRules', 'adjustments', {
                        ...config.lendingPolicy.interestRateRules.adjustments,
                        [factor]: parseFloat(e.target.value)
                      })}
                      className="w-20"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Term Options and Other Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Recession Mode</Label>
                <Switch
                  checked={config.lendingPolicy?.recessionMode || false}
                  onCheckedChange={(checked) => updateConfig('lendingPolicy', 'recessionMode', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Allow Collateral Override</Label>
                <Switch
                  checked={config.lendingPolicy?.allowCollateralOverride || false}
                  onCheckedChange={(checked) => updateConfig('lendingPolicy', 'allowCollateralOverride', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Controls Tab */}
        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Controls</CardTitle>
              <CardDescription>
                Configure system access and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Can Export Data</Label>
                <Switch
                  checked={config.accessControls?.canExportData || false}
                  onCheckedChange={(checked) => updateConfig('accessControls', 'canExportData', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">API Access Enabled</Label>
                <Switch
                  checked={config.accessControls?.apiAccessEnabled || false}
                  onCheckedChange={(checked) => updateConfig('accessControls', 'apiAccessEnabled', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Max File Size (MB)</Label>
                <Input
                  type="number"
                  value={config.accessControls?.maxFileSizeMb || 5}
                  onChange={(e) => updateConfig('accessControls', 'maxFileSizeMb', parseInt(e.target.value))}
                  className="w-24"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Branding Configuration</CardTitle>
              <CardDescription>
                Customize the appearance and localization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Primary Color</Label>
                <Input
                  type="color"
                  value={config.branding?.primaryColor || '#004aad'}
                  onChange={(e) => updateConfig('branding', 'primaryColor', e.target.value)}
                  className="w-20"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Theme</Label>
                <Select
                  value={config.branding?.theme || 'light'}
                  onValueChange={(value) => updateConfig('branding', 'theme', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Currency</Label>
                <Select
                  value={config.branding?.currency || 'ETB'}
                  onValueChange={(value) => updateConfig('branding', 'currency', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETB">ETB</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Language</Label>
                <Select
                  value={config.branding?.language || 'en'}
                  onValueChange={(value) => updateConfig('branding', 'language', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="am">Amharic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legacy Configuration Tab */}
        <TabsContent value="legacy" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This tab shows the legacy lending configuration for backward compatibility. 
              Consider migrating to the new engine-based configuration above.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Legacy Lending Configuration</CardTitle>
              <CardDescription>
                Original lending configuration (read-only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(config.legacyConfig, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DecisionConfigPanel; 