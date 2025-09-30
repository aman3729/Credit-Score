import React from 'react';
import { Steps, Button, Progress, Space, Typography, Card } from 'antd';
import { 
  ArrowLeftOutlined, 
  ArrowRightOutlined, 
  CheckCircleOutlined,
  LoadingOutlined 
} from '@ant-design/icons';
import { useUploadWizard, WIZARD_STEPS } from '../../contexts/UploadWizardContext';

const { Step } = Steps;
const { Text } = Typography;

const WizardNavigation = ({ onNext, onPrevious, onComplete, isProcessing }) => {
  const {
    steps,
    currentStep,
    currentStepIndex,
    progress,
    canGoNext,
    canGoPrevious,
    stepValidation,
    isLoading,
    currentStepData
  } = useUploadWizard();

  const getStepIcon = (stepKey, index) => {
    if (index < currentStepIndex) {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
    if (index === currentStepIndex) {
      return isLoading ? <LoadingOutlined /> : null;
    }
    return null;
  };

  const getStepStatus = (stepKey, index) => {
    if (index < currentStepIndex) {
      return 'finish';
    }
    if (index === currentStepIndex) {
      return 'process';
    }
    return 'wait';
  };

  return (
    <Card style={{ marginBottom: 24, borderRadius: 12 }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong>Upload Progress</Text>
          <Text type="secondary">{Math.round(progress)}% Complete</Text>
        </div>
        <Progress 
          percent={progress} 
          status={isProcessing ? 'active' : 'normal'}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          showInfo={false}
        />
      </div>

      {/* Steps */}
      <div style={{ marginBottom: 24 }}>
        <Steps 
          current={currentStepIndex}
          responsive={true}
          size="small"
          style={{ 
            maxWidth: '100%',
            overflowX: 'auto'
          }}
        >
          {steps.map((step, index) => (
            <Step
              key={step.key}
              title={
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  minWidth: 80
                }}>
                  <Text 
                    strong={index === currentStepIndex}
                    style={{ 
                      fontSize: 12,
                      textAlign: 'center',
                      lineHeight: 1.2
                    }}
                  >
                    {step.title}
                  </Text>
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: 10,
                      textAlign: 'center',
                      lineHeight: 1.2
                    }}
                  >
                    {step.description}
                  </Text>
                </div>
              }
              icon={getStepIcon(step.key, index)}
              status={getStepStatus(step.key, index)}
            />
          ))}
        </Steps>
      </div>

      {/* Current Step Info */}
      <div style={{ 
        background: '#f6f8fa', 
        padding: 16, 
        borderRadius: 8, 
        marginBottom: 24,
        border: '1px solid #e1e4e8'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong style={{ fontSize: 16 }}>
              Step {currentStepIndex + 1}: {currentStepData?.title}
            </Text>
            <br />
            <Text type="secondary">
              {currentStepData?.description}
            </Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary">
              {currentStepIndex + 1} of {steps.length}
            </Text>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          {canGoPrevious && (
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={onPrevious}
              disabled={isLoading || isProcessing}
              size="large"
            >
              Previous
            </Button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {currentStep === WIZARD_STEPS.VALIDATION_REVIEW && (
            <Button
              type="default"
              onClick={() => window.print()}
              disabled={isLoading || isProcessing}
              size="large"
            >
              Print Summary
            </Button>
          )}

          {currentStep === WIZARD_STEPS.COMPLETION ? (
            <Button
              type="primary"
              onClick={onComplete}
              size="large"
            >
              Start New Upload
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={onNext}
              disabled={!canGoNext || isLoading || isProcessing}
              loading={isLoading || isProcessing}
              size="large"
            >
              {currentStep === WIZARD_STEPS.UPLOAD_PROCESSING ? 'Processing...' : 'Next'}
            </Button>
          )}
        </div>
      </div>

      {/* Step Validation Status */}
      {currentStep !== WIZARD_STEPS.COMPLETION && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          {stepValidation[currentStep] ? (
            <Text type="success">
              <CheckCircleOutlined /> This step is complete
            </Text>
          ) : (
            <Text type="secondary">
              Please complete this step to continue
            </Text>
          )}
        </div>
      )}
    </Card>
  );
};

export default WizardNavigation; 