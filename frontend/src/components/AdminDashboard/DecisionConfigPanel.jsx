import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Building2, 
  Settings, 
  Brain, 
  DollarSign, 
  Shield, 
  Palette,
  Save,
  RefreshCw,
  Plus,
  Edit,
  Eye,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  CreditCard,
  Calculator,
  Lock,
  Globe,
  Zap
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../hooks/use-toast';

const DecisionConfigPanel = () => {
  const { toast } = useToast();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState(null);
  const [editingBank, setEditingBank] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all banks
  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/partner-banks/admin/with-config');
      setBanks(response.data.data || response.data);
      if (response.data.data?.length > 0) {
        setSelectedBank(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch banks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBank = async (bankData) => {
    try {
      setSaving(true);
      const response = await api.patch(`/partner-banks/${bankData._id}`, bankData);
      
      // Update local state
      setBanks(prev => prev.map(bank => 
        bank._id === bankData._id ? response.data.data : bank
      ));
      setSelectedBank(response.data.data);
      setEditingBank(null);
      
      toast({
        title: 'Success',
        description: `${bankData.name} configuration updated successfully`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error saving bank:', error);
      toast({
        title: 'Error',
        description: 'Failed to save bank configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredBanks = banks.filter(bank => 
    bank.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bank.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getBankStatus = (bank) => {
    if (!bank.engineConfig) return 'Not Configured';
    if (bank.status === 'inactive') return 'Inactive';
    return 'Active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Inactive': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  const getConfigProgress = (bank) => {
    if (!bank.engineConfig) return 0;
    let completed = 0;
    let total = 4;
    
    if (bank.engineConfig?.engine1) completed++;
    if (bank.engineConfig?.engine2) completed++;
    if (bank.lendingPolicy) completed++;
    if (bank.accessControls) completed++;
    
    return Math.round((completed / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading banks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Decision Configuration Control Room</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage scoring engines and lending policies for all partner banks
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchBanks} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Bank
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Search banks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Bank List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Partner Banks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredBanks.map((bank) => (
                  <div
                    key={bank._id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedBank?._id === bank._id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setSelectedBank(bank)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{bank.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{bank.code}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(getBankStatus(bank))}>
                        {getBankStatus(bank)}
                      </Badge>
                    </div>
                    
                    {/* Configuration Progress */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Config</span>
                        <span>{getConfigProgress(bank)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full transition-all"
                          style={{ width: `${getConfigProgress(bank)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bank Configuration */}
        <div className="lg:col-span-3">
          {selectedBank ? (
            <BankConfigurationCard 
              bank={selectedBank}
              onSave={handleSaveBank}
              saving={saving}
              onEdit={() => setEditingBank(selectedBank)}
              editing={editingBank?._id === selectedBank._id}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a Bank
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Choose a bank from the list to configure its decision engine and lending policies
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const BankConfigurationCard = ({ bank, onSave, saving, onEdit, editing }) => {
  const [config, setConfig] = useState(bank);

  useEffect(() => {
    setConfig(bank);
  }, [bank]);

  const handleConfigChange = (section, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    onSave(config);
  };

  const getEngineStatus = (engine) => {
    if (!engine) return { status: 'Not Configured', color: 'text-red-600' };
    return { status: 'Configured', color: 'text-green-600' };
  };

  const engine1Status = getEngineStatus(config.engineConfig?.engine1);
  const engine2Status = getEngineStatus(config.engineConfig?.engine2);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {bank.name} Configuration
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Bank Code: {bank.code} | Status: {bank.status}
            </p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button onClick={() => setConfig(bank)} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Configuration
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engines">Engines</TabsTrigger>
            <TabsTrigger value="lending">Lending</TabsTrigger>
            <TabsTrigger value="access">Access</TabsTrigger>
            <TabsTrigger value="loan-offers">Loan Offers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Engine 1 - Credit Scoring
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                    <Badge variant={engine1Status.status === 'Configured' ? 'default' : 'secondary'}>
                      {engine1Status.status}
                    </Badge>
                  </div>
                  {config.engineConfig?.engine1 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Max Score:</span>
                        <span>{config.engineConfig.engine1.maxScore || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Min Score:</span>
                        <span>{config.engineConfig.engine1.minScore || 'N/A'}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Engine 2 - 5Cs Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                    <Badge variant={engine2Status.status === 'Configured' ? 'default' : 'secondary'}>
                      {engine2Status.status}
                    </Badge>
                  </div>
                  {config.engineConfig?.engine2 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Capacity Weight:</span>
                        <span>{config.engineConfig.engine2.weights?.capacity || 'N/A'}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Character Weight:</span>
                        <span>{config.engineConfig.engine2.weights?.character || 'N/A'}%</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Lending Policy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Base Rate:</span>
                      <span>{config.lendingPolicy?.interestRateRules?.baseRate || 'N/A'}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Max Rate:</span>
                      <span>{config.lendingPolicy?.interestRateRules?.maxRate || 'N/A'}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Max DTI:</span>
                      <span>{config.lendingPolicy?.maxDTI || 'N/A'}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Access Controls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>API Access:</span>
                      <Badge variant={config.accessControls?.apiAccessEnabled ? 'default' : 'secondary'}>
                        {config.accessControls?.apiAccessEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Data Export:</span>
                      <Badge variant={config.accessControls?.canExportData ? 'default' : 'secondary'}>
                        {config.accessControls?.canExportData ? 'Allowed' : 'Blocked'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Max File Size:</span>
                      <span>{config.accessControls?.maxFileSizeMb || 'N/A'} MB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="engines" className="space-y-4">
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                Configure scoring engine weights, penalties, and decision rules for {bank.name}
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Engine 1 - Credit Scoring</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Payment History Weight</label>
                    <Input
                      type="number"
                      value={config.engineConfig?.engine1?.scoringWeights?.paymentHistory || 35}
                      onChange={(e) => handleConfigChange('engineConfig', 'engine1', {
                        ...config.engineConfig?.engine1,
                        scoringWeights: {
                          ...config.engineConfig?.engine1?.scoringWeights,
                          paymentHistory: parseInt(e.target.value)
                        }
                      })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Credit Utilization Weight</label>
                    <Input
                      type="number"
                      value={config.engineConfig?.engine1?.scoringWeights?.creditUtilization || 30}
                      onChange={(e) => handleConfigChange('engineConfig', 'engine1', {
                        ...config.engineConfig?.engine1,
                        scoringWeights: {
                          ...config.engineConfig?.engine1?.scoringWeights,
                          creditUtilization: parseInt(e.target.value)
                        }
                      })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Score</label>
                    <Input
                      type="number"
                      value={config.engineConfig?.engine1?.maxScore || 850}
                      onChange={(e) => handleConfigChange('engineConfig', 'engine1', {
                        ...config.engineConfig?.engine1,
                        maxScore: parseInt(e.target.value)
                      })}
                      disabled={!editing}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Engine 2 - 5Cs Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Capacity Weight</label>
                    <Input
                      type="number"
                      value={config.engineConfig?.engine2?.weights?.capacity || 35}
                      onChange={(e) => handleConfigChange('engineConfig', 'engine2', {
                        ...config.engineConfig?.engine2,
                        weights: {
                          ...config.engineConfig?.engine2?.weights,
                          capacity: parseInt(e.target.value)
                        }
                      })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Character Weight</label>
                    <Input
                      type="number"
                      value={config.engineConfig?.engine2?.weights?.character || 10}
                      onChange={(e) => handleConfigChange('engineConfig', 'engine2', {
                        ...config.engineConfig?.engine2,
                        weights: {
                          ...config.engineConfig?.engine2?.weights,
                          character: parseInt(e.target.value)
                        }
                      })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max DTI Threshold</label>
                    <Input
                      type="number"
                      value={config.engineConfig?.engine2?.behavioralThresholds?.maxDTI || 0.45}
                      onChange={(e) => handleConfigChange('engineConfig', 'engine2', {
                        ...config.engineConfig?.engine2,
                        behavioralThresholds: {
                          ...config.engineConfig?.engine2?.behavioralThresholds,
                          maxDTI: parseFloat(e.target.value)
                        }
                      })}
                      disabled={!editing}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lending" className="space-y-4">
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                Configure loan amounts, interest rates, and lending policies for {bank.name}
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Interest Rate Rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Base Rate (%)</label>
                    <Input
                      type="number"
                      value={config.lendingPolicy?.interestRateRules?.baseRate || 12.5}
                      onChange={(e) => handleConfigChange('lendingPolicy', 'interestRateRules', {
                        ...config.lendingPolicy?.interestRateRules,
                        baseRate: parseFloat(e.target.value)
                      })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Rate (%)</label>
                    <Input
                      type="number"
                      value={config.lendingPolicy?.interestRateRules?.maxRate || 35.99}
                      onChange={(e) => handleConfigChange('lendingPolicy', 'interestRateRules', {
                        ...config.lendingPolicy?.interestRateRules,
                        maxRate: parseFloat(e.target.value)
                      })}
                      disabled={!editing}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Loan Amounts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Excellent Score Amount</label>
                    <Input
                      type="number"
                      value={config.lendingPolicy?.baseLoanAmounts?.EXCELLENT || 100000}
                      onChange={(e) => handleConfigChange('lendingPolicy', 'baseLoanAmounts', {
                        ...config.lendingPolicy?.baseLoanAmounts,
                        EXCELLENT: parseInt(e.target.value)
                      })}
                      disabled={!editing}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Good Score Amount</label>
                    <Input
                      type="number"
                      value={config.lendingPolicy?.baseLoanAmounts?.GOOD || 50000}
                      onChange={(e) => handleConfigChange('lendingPolicy', 'baseLoanAmounts', {
                        ...config.lendingPolicy?.baseLoanAmounts,
                        GOOD: parseInt(e.target.value)
                      })}
                      disabled={!editing}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Configure access controls and security settings for {bank.name}
              </AlertDescription>
            </Alert>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Access Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">API Access</label>
                    <p className="text-xs text-gray-500">Allow API access for automated integrations</p>
                  </div>
                  <Button
                    variant={config.accessControls?.apiAccessEnabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleConfigChange('accessControls', 'apiAccessEnabled', !config.accessControls?.apiAccessEnabled)}
                    disabled={!editing}
                  >
                    {config.accessControls?.apiAccessEnabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Data Export</label>
                    <p className="text-xs text-gray-500">Allow exporting of user data</p>
                  </div>
                  <Button
                    variant={config.accessControls?.canExportData ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleConfigChange('accessControls', 'canExportData', !config.accessControls?.canExportData)}
                    disabled={!editing}
                  >
                    {config.accessControls?.canExportData ? 'Allowed' : 'Blocked'}
                  </Button>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Max File Size (MB)</label>
                  <Input
                    type="number"
                    value={config.accessControls?.maxFileSizeMb || 5}
                    onChange={(e) => handleConfigChange('accessControls', 'maxFileSizeMb', parseInt(e.target.value))}
                    disabled={!editing}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loan-offers" className="space-y-4">
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                Configure loan offer settings and product configurations for {bank.name}
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Personal Loans</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Max Amount (ETB)</label>
                    <Input
                      type="number"
                      value={config.lendingPolicy?.baseLoanAmounts?.EXCELLENT || 100000}
                      onChange={(e) => handleConfigChange('lendingPolicy', 'baseLoanAmounts', {
                        ...config.lendingPolicy?.baseLoanAmounts,
                        EXCELLENT: parseInt(e.target.value)
                      })}
                      disabled={!editing}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Interest Rate Range (%)</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={config.lendingPolicy?.interestRateRules?.baseRate || 12}
                        onChange={(e) => handleConfigChange('lendingPolicy', 'interestRateRules', {
                          ...config.lendingPolicy?.interestRateRules,
                          baseRate: parseFloat(e.target.value)
                        })}
                        disabled={!editing}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={config.lendingPolicy?.interestRateRules?.maxRate || 35.99}
                        onChange={(e) => handleConfigChange('lendingPolicy', 'interestRateRules', {
                          ...config.lendingPolicy?.interestRateRules,
                          maxRate: parseFloat(e.target.value)
                        })}
                        disabled={!editing}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Term Options (months)</label>
                    <Input
                      type="text"
                      placeholder="12,24,36,48"
                      value={config.lendingPolicy?.termOptions?.join(',') || '12,24,36,48'}
                      onChange={(e) => handleConfigChange('lendingPolicy', 'termOptions', 
                        e.target.value.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t))
                      )}
                      disabled={!editing}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Business Loans</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Max Amount (ETB)</label>
                    <Input
                      type="number"
                      value={config.lendingPolicy?.baseLoanAmounts?.EXCELLENT * 2 || 200000}
                      onChange={(e) => handleConfigChange('lendingPolicy', 'baseLoanAmounts', {
                        ...config.lendingPolicy?.baseLoanAmounts,
                        BUSINESS_EXCELLENT: parseInt(e.target.value)
                      })}
                      disabled={!editing}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Collateral Required</label>
                    <select
                      value={config.lendingPolicy?.requireCollateralFor?.includes('FAIR') ? 'yes' : 'no'}
                      onChange={(e) => handleConfigChange('lendingPolicy', 'requireCollateralFor', 
                        e.target.value === 'yes' ? ['FAIR', 'POOR'] : []
                      )}
                      disabled={!editing}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="yes">Yes (for FAIR/POOR scores)</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Auto Approval Limit (ETB)</label>
                    <Input
                      type="number"
                      value={config.lendingPolicy?.autoApprovalLimit || 50000}
                      onChange={(e) => handleConfigChange('lendingPolicy', 'autoApprovalLimit', parseInt(e.target.value))}
                      disabled={!editing}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Risk-Based Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">DTI Adjustment (%)</label>
                    <Input
                      type="number"
                      value={config.lendingPolicy?.interestRateRules?.adjustments?.HIGH_DTI || 3}
                      onChange={(e) => handleConfigChange('lendingPolicy', 'interestRateRules', {
                        ...config.lendingPolicy?.interestRateRules,
                        adjustments: {
                          ...config.lendingPolicy?.interestRateRules?.adjustments,
                          HIGH_DTI: parseFloat(e.target.value)
                        }
                      })}
                      disabled={!editing}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Employment Risk Adjustment (%)</label>
                    <Input
                      type="number"
                      value={config.lendingPolicy?.interestRateRules?.adjustments?.EMPLOYMENT_UNSTABLE || 2}
                      onChange={(e) => handleConfigChange('lendingPolicy', 'interestRateRules', {
                        ...config.lendingPolicy?.interestRateRules,
                        adjustments: {
                          ...config.lendingPolicy?.interestRateRules?.adjustments,
                          EMPLOYMENT_UNSTABLE: parseFloat(e.target.value)
                        }
                      })}
                      disabled={!editing}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Default Risk Adjustment (%)</label>
                    <Input
                      type="number"
                      value={config.lendingPolicy?.interestRateRules?.adjustments?.RECENT_DEFAULT || 5}
                      onChange={(e) => handleConfigChange('lendingPolicy', 'interestRateRules', {
                        ...config.lendingPolicy?.interestRateRules,
                        adjustments: {
                          ...config.lendingPolicy?.interestRateRules?.adjustments,
                          RECENT_DEFAULT: parseFloat(e.target.value)
                        }
                      })}
                      disabled={!editing}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Special Programs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Recession Mode</label>
                      <p className="text-xs text-gray-500">Conservative lending during economic downturns</p>
                    </div>
                    <Button
                      variant={config.lendingPolicy?.recessionMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleConfigChange('lendingPolicy', 'recessionMode', !config.lendingPolicy?.recessionMode)}
                      disabled={!editing}
                    >
                      {config.lendingPolicy?.recessionMode ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Collateral Override</label>
                      <p className="text-xs text-gray-500">Allow manual override of collateral requirements</p>
                    </div>
                    <Button
                      variant={config.lendingPolicy?.allowCollateralOverride ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleConfigChange('lendingPolicy', 'allowCollateralOverride', !config.lendingPolicy?.allowCollateralOverride)}
                      disabled={!editing}
                    >
                      {config.lendingPolicy?.allowCollateralOverride ? 'Allowed' : 'Blocked'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DecisionConfigPanel; 