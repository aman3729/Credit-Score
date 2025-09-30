import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Upload, 
  Download,
  Info,
  Rocket,
  Bot,
  Shield,
  Zap,
  BarChart3,
  X
} from 'lucide-react';
import UploadWizard from './UploadWizard';

const AdminBatchUpload = ({ onUploadComplete }) => {
  const [showWizard, setShowWizard] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);

  const handleWizardComplete = useCallback((results) => {
    setShowWizard(false);
    onUploadComplete?.(results);
  }, [onUploadComplete]);

  const handleWizardClose = useCallback(() => {
    setShowWizard(false);
  }, []);

  const downloadTemplate = useCallback(() => {
    // Create and download template
    const template = {
      headers: [
        'phoneNumber',
        'monthlyIncome',
        'monthlyDebtPayments',
        'paymentHistory',
        'creditUtilization',
        'creditAge',
        'creditMix',
        'inquiries',
        'totalDebt',
        'recentMissedPayments',
        'recentDefaults',
        'lastActiveDate',
        'activeLoanCount',
        'oldestAccountAge',
        'transactionsLast90Days',
        'onTimePaymentRate',
        'onTimeRateLast6Months',
        'missedPaymentsLast12',
        'recentLoanApplications',
        'defaultCountLast3Years',
        'consecutiveMissedPayments',
        'monthsSinceLastDelinquency'
      ],
      sampleData: [
        {
          phoneNumber: '+251911234567',
          monthlyIncome: 50000,
          monthlyDebtPayments: 15000,
          paymentHistory: 0.85,
          creditUtilization: 0.45,
          creditAge: 5,
          creditMix: 0.7,
          inquiries: 2,
          totalDebt: 200000,
          recentMissedPayments: 0,
          recentDefaults: 0,
          lastActiveDate: '2024-01-15',
          activeLoanCount: 1,
          oldestAccountAge: 60,
          transactionsLast90Days: 25,
          onTimePaymentRate: 0.95,
          onTimeRateLast6Months: 0.92,
          missedPaymentsLast12: 1,
          recentLoanApplications: 1,
          defaultCountLast3Years: 0,
          consecutiveMissedPayments: 0,
          monthsSinceLastDelinquency: 24
        }
      ]
    };

    const csvContent = [
      template.headers.join(','),
      ...template.sampleData.map(row => 
        template.headers.map(header => row[header]).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'credit-data-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="space-y-6">
      {/* Enhanced Upload Options */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Rocket className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Enhanced Batch Upload
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-300 text-lg mb-8">
              Upload and process credit data with AI-powered field mapping, advanced validation, and real-time progress tracking.
            </p>

            <div className="space-y-4">
              <Button 
                size="lg"
                onClick={() => setShowWizard(true)}
                className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Upload className="h-5 w-5 mr-2" />
                Start Enhanced Upload Wizard
              </Button>

              <div className="flex gap-4 justify-center flex-wrap">
                <Button 
                  variant="outline"
                  onClick={downloadTemplate}
                  size="lg"
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setShowLegacy(true)}
                  size="lg"
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Use Legacy Upload
                </Button>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <div className="text-center p-4">
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI-Powered Mapping</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Automatic field detection and mapping suggestions</p>
            </div>
            
            <div className="text-center p-4">
              <div className="text-2xl mb-2">🔒</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Advanced Security</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">File validation and security scanning</p>
            </div>
            
            <div className="text-center p-4">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Chunked Uploads</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Handle files up to 100MB with progress tracking</p>
            </div>
            
            <div className="text-center p-4">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Real-time Analytics</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Live progress and detailed reporting</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <div className="font-semibold mb-2">Enhanced Upload Features</div>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Step-by-step wizard</strong> with guided field mapping</li>
            <li><strong>AI suggestions</strong> for automatic field detection</li>
            <li><strong>Advanced validation</strong> with data quality analysis</li>
            <li><strong>Chunked uploads</strong> for large files (up to 100MB)</li>
            <li><strong>Real-time progress</strong> tracking and error handling</li>
            <li><strong>Security scanning</strong> and malware detection</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Wizard Modal */}
      {showWizard && (
        <UploadWizard onClose={handleWizardClose} onComplete={handleWizardComplete} />
      )}

      {/* Legacy Upload Modal */}
      {showLegacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Legacy Upload</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLegacy(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Legacy upload functionality will be implemented here.
            </p>
            <Button onClick={() => setShowLegacy(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBatchUpload;