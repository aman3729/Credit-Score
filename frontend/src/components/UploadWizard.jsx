import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { 
  CheckCircle, 
  XCircle,
  Rocket,
  Upload,
  FileText,
  Users,
  Settings,
  CheckSquare,
  X
} from 'lucide-react';
import { UploadWizardProvider, useUploadWizard, WIZARD_STEPS } from '../contexts/UploadWizardContext';
import { useChunkedUpload } from '../hooks/useChunkedUpload';
import { useFileValidation } from '../hooks/useFileValidation';
import WizardNavigation from './wizard/WizardNavigation';
import FileUploadCard from './FileUploadCard';
import PartnerMappingCard from './PartnerMappingCard';
import AIFieldMappingStep from './wizard/AIFieldMappingStep';
import UploadProgressCard from './UploadProgressCard';
import styles from './UploadWizard.module.css';
import { getCsrfToken, fetchCsrfToken } from '../services/csrfService';

// Constants
const PARTNER_BANKS = [
  { id: 'CBE', name: 'Commercial Bank of Ethiopia' },
  { id: 'DBE', name: 'Development Bank of Ethiopia' },
  { id: 'AWASH', name: 'Awash Bank' },
  { id: 'DASHEN', name: 'Dashen Bank' },
  { id: 'ABYSSINIA', name: 'Bank of Abyssinia' },
  { id: 'WEGAGEN', name: 'Wegagen Bank' },
  { id: 'NIB', name: 'Nib International Bank' },
  { id: 'HIBRET', name: 'Hibret Bank' },
  { id: 'LION', name: 'Lion International Bank' },
  { id: 'COOP', name: 'Cooperative Bank of Oromia' },
  { id: 'ZEMEN', name: 'Zemen Bank' },
  { id: 'OROMIA', name: 'Oromia International Bank' },
  { id: 'BUNNA', name: 'Bunna Bank' },
  { id: 'BERHAN', name: 'Berhan Bank' },
  { id: 'ABAY', name: 'Abay Bank' },
  { id: 'ADDIS', name: 'Addis International Bank' },
  { id: 'DEBUB', name: 'Debub Global Bank' },
  { id: 'ENAT', name: 'Enat Bank' },
  { id: 'GADAA', name: 'Gadaa Bank' },
  { id: 'HIJRA', name: 'Hijra Bank' },
  { id: 'SHABELLE', name: 'Shabelle Bank' },
  { id: 'SIINQEE', name: 'Siinqee Bank' },
  { id: 'TSEHAY', name: 'Tsehay Bank' },
  { id: 'AMHARA', name: 'Amhara Bank' },
  { id: 'AHADU', name: 'Ahadu Bank' },
  { id: 'GOH', name: 'Goh Bank' },
  { id: 'AMAN', name: 'Aman Bank' }
];

// Step Components
const FileUploadStep = () => {
  const { wizardData, updateWizardData, setStepValidation } = useUploadWizard();
  const { validationState, validateFile } = useFileValidation();

  useEffect(() => {
    // Validate file when it changes
    if (wizardData.file) {
      validateFile(wizardData.file).then(validation => {
        updateWizardData({ fileValidation: validation });
        setStepValidation(WIZARD_STEPS.FILE_UPLOAD, validation.isValid);
      });
    }
  }, [wizardData.file, validateFile, updateWizardData, setStepValidation]);

  const handleFileChange = useCallback((file) => {
    updateWizardData({ file });
  }, [updateWizardData]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Upload className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          📁 Upload Your Data File
        </CardTitle>
        <p className="text-gray-600 dark:text-gray-300">
          Select and validate your credit data file. Supported formats: CSV, XLSX, JSON.
        </p>
      </div>

      <FileUploadCard
        file={wizardData.file}
        onFileChange={handleFileChange}
        validationErrors={validationState.errors}
        filePreview={wizardData.fileValidation?.fileInfo?.sampleData}
      />

      {wizardData.fileValidation && (
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">File Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryItem label="File Type" value={wizardData.fileValidation.fileInfo?.type} />
              <SummaryItem label="Records" value={wizardData.fileValidation.fileInfo?.recordCount} />
              <SummaryItem 
                label="Fields" 
                value={wizardData.fileValidation.fileInfo?.fields?.length || 0} 
              />
              <SummaryItem 
                label="Data Quality" 
                value={wizardData.fileValidation.dataQuality?.qualityScore 
                  ? `${wizardData.fileValidation.dataQuality.qualityScore}%` 
                  : 'N/A'
                } 
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const PartnerSelectionStep = () => {
  const { wizardData, updateWizardData, setStepValidation } = useUploadWizard();

  const handlePartnerChange = (partner) => {
    updateWizardData({ 
      selectedPartner: partner,
      selectedMappingProfile: null 
    });
    setStepValidation(WIZARD_STEPS.PARTNER_SELECTION, true);
  };

  const handleProfileChange = (profileId) => {
    updateWizardData({ selectedMappingProfile: profileId });
  };

  const selectedPartner = wizardData.selectedPartner;
  const mappingProfiles = selectedPartner ? generateFallbackProfiles(selectedPartner.id) : [];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Users className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🏦 Select Partner Bank
        </CardTitle>
        <p className="text-gray-600 dark:text-gray-300">
          Choose the partner bank and mapping profile for your data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PARTNER_BANKS.map((bank) => (
          <Card 
            key={bank.id}
            className={`cursor-pointer transition-all border-2 ${
              selectedPartner?.id === bank.id 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            } bg-white dark:bg-gray-900`}
            onClick={() => handlePartnerChange(bank)}
          >
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">{bank.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">ID: {bank.id}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedPartner && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Mapping Profiles for {selectedPartner.name}
          </h3>
          
          <div className="space-y-2">
            {mappingProfiles.map((profile) => (
              <Card 
                key={profile.id}
                className={`cursor-pointer transition-all border-2 ${
                  wizardData.selectedMappingProfile === profile.id 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } bg-white dark:bg-gray-900`}
                onClick={() => handleProfileChange(profile.id)}
              >
                <CardContent className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">{profile.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{profile.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button 
            variant="outline"
            onClick={() => updateWizardData({ selectedMappingProfile: 'new' })}
            className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Settings className="h-4 w-4 mr-2" />
            Create Custom Mapping
          </Button>
        </div>
      )}
    </div>
  );
};

const ValidationReviewStep = () => {
  const { wizardData, updateWizardData, setStepValidation } = useUploadWizard();

  const handleSaveMappingProfile = async () => {
    try {
      // Ensure we have a CSRF token
      await fetchCsrfToken();
      const csrfToken = getCsrfToken();
      
      // Save mapping profile logic here
      const response = await fetch('/api/mapping-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          partnerId: wizardData.selectedPartner.id,
          profileName: `Custom Profile for ${wizardData.selectedPartner.name}`,
          mappings: wizardData.fieldMappings
        })
      });
      
      if (response.ok) {
        setStepValidation(WIZARD_STEPS.VALIDATION_REVIEW, true);
      } else {
        console.error('Failed to save mapping profile');
      }
    } catch (error) {
      console.error('Failed to save mapping profile:', error);
    }
  };

  // Must have either explicit field mappings or a selected mapping profile to proceed
  const canContinue = Array.isArray(wizardData.fieldMappings) && wizardData.fieldMappings.length > 0
    || Boolean(wizardData.selectedProfileId);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <CheckSquare className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          ✅ Review & Validate
        </CardTitle>
        <p className="text-gray-600 dark:text-gray-300">
          Review your field mappings and validation results before proceeding.
        </p>
      </div>

      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Field Mapping Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(wizardData.fieldMappings) && wizardData.fieldMappings.length > 0 ? (
              wizardData.fieldMappings.map((mapping, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-300">{mapping.sourceField}</span>
                  <span className="text-gray-500 dark:text-gray-400">→</span>
                  <span className="text-gray-900 dark:text-white font-medium">{mapping.targetField}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No field mappings defined yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button 
          variant="outline"
          onClick={handleSaveMappingProfile}
          className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Save Mapping Profile
        </Button>
        <Button 
          className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          disabled={!canContinue}
          onClick={() => setStepValidation(WIZARD_STEPS.VALIDATION_REVIEW, canContinue)}
        >
          Continue to Upload
        </Button>
      </div>
    </div>
  );
};

const UploadProcessingStep = () => {
  const { wizardData } = useUploadWizard();
  const { uploadProgress, uploadStatus, startUpload } = useChunkedUpload();
  // Prevent double invocation in React.StrictMode or re-renders
  const startedRef = useRef(false);

  useEffect(() => {
    // Start upload automatically when reaching this step
    if (startedRef.current) return;
    if (wizardData.file && wizardData.selectedPartner?.id) {
      startedRef.current = true;
      // startUpload(file, partnerId, profileId, scoringEngine)
      startUpload(
        wizardData.file,
        wizardData.selectedPartner.id,
        wizardData.selectedMappingProfile || null,
        'default'
      );
    }
  }, [wizardData, startUpload]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <Rocket className="h-12 w-12 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🚀 Processing Upload
        </CardTitle>
        <p className="text-gray-600 dark:text-gray-300">
          Your file is being processed with advanced validation and AI-powered analysis.
        </p>
      </div>

      <UploadProgressCard 
        progress={uploadProgress}
        status={uploadStatus}
        file={wizardData.file}
        mappings={wizardData.fieldMappings}
      />
    </div>
  );
};

const CompletionStep = () => {
  const { wizardData, resetWizard } = useUploadWizard();

  const handleDownload = () => {
    // Create a download link for the results
    const data = JSON.stringify(wizardData.uploadResults, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upload-results-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFinish = () => {
    resetWizard();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          {wizardData.uploadResults?.errorCount > 0 ? (
            <XCircle className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          )}
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {wizardData.uploadResults?.errorCount > 0 ? '⚠️ Upload Complete with Warnings' : '🎉 Upload Complete!'}
        </CardTitle>
        <p className="text-gray-600 dark:text-gray-300">
          {wizardData.uploadResults?.errorCount > 0 
            ? 'Your data has been processed with some warnings. Please review the results.'
            : 'Your data has been successfully processed and uploaded.'}
        </p>
      </div>

      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryItem label="Total Records" value={wizardData.uploadResults?.totalRecords} />
            <SummaryItem label="Successfully Processed" value={wizardData.uploadResults?.successCount} />
            <SummaryItem label="Errors" value={wizardData.uploadResults?.errorCount} />
            <SummaryItem 
              label="Processing Time" 
              value={wizardData.uploadResults?.processingTime 
                ? `${wizardData.uploadResults.processingTime} seconds` 
                : 'N/A'
              } 
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button 
          variant="outline"
          onClick={handleDownload}
          className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Download Results
        </Button>
        <Button 
          className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          onClick={handleFinish}
        >
          {wizardData.uploadResults?.errorCount > 0 ? 'Review Issues' : 'View in Dashboard'}
        </Button>
      </div>
    </div>
  );
};

const UploadWizardContent = ({ onClose }) => {
  const { currentStep, nextStep, previousStep, canGoNext, canGoPrevious, resetWizard } = useUploadWizard();

  const renderCurrentStep = () => {
    switch (currentStep) {
      case WIZARD_STEPS.FILE_UPLOAD:
        return <FileUploadStep />;
      case WIZARD_STEPS.PARTNER_SELECTION:
        return <PartnerSelectionStep />;
      case WIZARD_STEPS.MAPPING_SETUP:
        return <AIFieldMappingStep />;
      case WIZARD_STEPS.VALIDATION_REVIEW:
        return <ValidationReviewStep />;
      case WIZARD_STEPS.UPLOAD_PROCESSING:
        return <UploadProcessingStep />;
      case WIZARD_STEPS.COMPLETION:
        return <CompletionStep />;
      default:
        return <FileUploadStep />;
    }
  };

  const getStepButtonLabel = () => {
    if (currentStep === WIZARD_STEPS.COMPLETION) return 'Finish';
    if (currentStep === WIZARD_STEPS.VALIDATION_REVIEW) return 'Start Upload';
    return 'Next';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Enhanced Upload Wizard</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
        
        {/* Navigation */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <WizardNavigation />
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {renderCurrentStep()}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={!canGoPrevious || currentStep === WIZARD_STEPS.UPLOAD_PROCESSING}
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Previous
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={!canGoNext && currentStep !== WIZARD_STEPS.UPLOAD_PROCESSING}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {getStepButtonLabel()}
          </Button>
        </div>
      </div>
    </div>
  );
};

const SummaryItem = ({ label, value }) => (
  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
    <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    <div className="text-lg font-semibold text-gray-900 dark:text-white">{value || 'N/A'}</div>
  </div>
);

const generateFallbackProfiles = (partnerId) => [
  {
    id: `${partnerId}_default`,
    name: 'Default Mapping',
    description: 'Standard field mapping for credit data'
  },
  {
    id: `${partnerId}_advanced`,
    name: 'Advanced Mapping',
    description: 'Enhanced mapping with additional fields'
  }
];

const UploadWizard = ({ onClose, onComplete }) => {
  return (
    <UploadWizardProvider onComplete={onComplete}>
      <UploadWizardContent onClose={onClose} />
    </UploadWizardProvider>
  );
};

export default UploadWizard;