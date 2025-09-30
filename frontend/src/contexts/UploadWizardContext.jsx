import React, { createContext, useContext, useReducer, useCallback } from 'react';

const UploadWizardContext = createContext();

// Wizard steps
export const WIZARD_STEPS = {
  FILE_UPLOAD: 'file-upload',
  PARTNER_SELECTION: 'partner-selection',
  MAPPING_SETUP: 'mapping-setup',
  VALIDATION_REVIEW: 'validation-review',
  UPLOAD_PROCESSING: 'upload-processing',
  COMPLETION: 'completion'
};

// Initial state
const initialState = {
  currentStep: WIZARD_STEPS.FILE_UPLOAD,
  steps: [
    { key: WIZARD_STEPS.FILE_UPLOAD, title: 'Upload File', description: 'Select and validate your data file' },
    { key: WIZARD_STEPS.PARTNER_SELECTION, title: 'Select Partner', description: 'Choose your organization' },
    { key: WIZARD_STEPS.MAPPING_SETUP, title: 'Field Mapping', description: 'Map your data fields' },
    { key: WIZARD_STEPS.VALIDATION_REVIEW, title: 'Review & Validate', description: 'Review settings and validate data' },
    { key: WIZARD_STEPS.UPLOAD_PROCESSING, title: 'Processing', description: 'Upload and process your data' },
    { key: WIZARD_STEPS.COMPLETION, title: 'Complete', description: 'Upload completed successfully' }
  ],
  wizardData: {
    file: null,
    fileValidation: null,
    selectedPartner: null,
    selectedProfileId: null,
    fieldMappings: [],
    aiSuggestions: [],
    scoringEngine: 'default',
    uploadResults: null,
    errors: [],
    warnings: [],
    createNewMapping: false,
    mappingProfile: null
  },
  stepValidation: {
    [WIZARD_STEPS.FILE_UPLOAD]: false,
    [WIZARD_STEPS.PARTNER_SELECTION]: false,
    [WIZARD_STEPS.MAPPING_SETUP]: false,
    [WIZARD_STEPS.VALIDATION_REVIEW]: false,
    [WIZARD_STEPS.UPLOAD_PROCESSING]: false,
    [WIZARD_STEPS.COMPLETION]: false
  },
  isLoading: false,
  error: null
};

// Action types
const ACTIONS = {
  SET_CURRENT_STEP: 'SET_CURRENT_STEP',
  UPDATE_WIZARD_DATA: 'UPDATE_WIZARD_DATA',
  SET_STEP_VALIDATION: 'SET_STEP_VALIDATION',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  RESET_WIZARD: 'RESET_WIZARD',
  NEXT_STEP: 'NEXT_STEP',
  PREVIOUS_STEP: 'PREVIOUS_STEP',
  GO_TO_STEP: 'GO_TO_STEP'
};

// Reducer
const wizardReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_CURRENT_STEP:
      return {
        ...state,
        currentStep: action.payload
      };
    
    case ACTIONS.UPDATE_WIZARD_DATA:
      return {
        ...state,
        wizardData: {
          ...state.wizardData,
          ...action.payload
        }
      };
    
    case ACTIONS.SET_STEP_VALIDATION:
      return {
        ...state,
        stepValidation: {
          ...state.stepValidation,
          [action.payload.step]: action.payload.isValid
        }
      };
    
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
    
    case ACTIONS.RESET_WIZARD:
      return {
        ...initialState,
        currentStep: WIZARD_STEPS.FILE_UPLOAD
      };
    
    case ACTIONS.NEXT_STEP:
      const currentIndex = state.steps.findIndex(step => step.key === state.currentStep);
      const nextStep = state.steps[currentIndex + 1];
      return {
        ...state,
        currentStep: nextStep ? nextStep.key : state.currentStep
      };
    
    case ACTIONS.PREVIOUS_STEP:
      const prevIndex = state.steps.findIndex(step => step.key === state.currentStep);
      const prevStep = state.steps[prevIndex - 1];
      return {
        ...state,
        currentStep: prevStep ? prevStep.key : state.currentStep
      };
    
    case ACTIONS.GO_TO_STEP:
      return {
        ...state,
        currentStep: action.payload
      };
    
    default:
      return state;
  }
};

// Provider component
export const UploadWizardProvider = ({ children }) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  // Actions
  const setCurrentStep = useCallback((step) => {
    dispatch({ type: ACTIONS.SET_CURRENT_STEP, payload: step });
  }, []);

  const updateWizardData = useCallback((data) => {
    dispatch({ type: ACTIONS.UPDATE_WIZARD_DATA, payload: data });
  }, []);

  const setStepValidation = useCallback((step, isValid) => {
    dispatch({ type: ACTIONS.SET_STEP_VALIDATION, payload: { step, isValid } });
  }, []);

  const setLoading = useCallback((isLoading) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: isLoading });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: ACTIONS.SET_ERROR, payload: error });
  }, []);

  const resetWizard = useCallback(() => {
    dispatch({ type: ACTIONS.RESET_WIZARD });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: ACTIONS.NEXT_STEP });
  }, []);

  const previousStep = useCallback(() => {
    dispatch({ type: ACTIONS.PREVIOUS_STEP });
  }, []);

  const goToStep = useCallback((step) => {
    dispatch({ type: ACTIONS.GO_TO_STEP, payload: step });
  }, []);

  // Computed values
  const currentStepIndex = state.steps.findIndex(step => step.key === state.currentStep);
  const currentStepData = state.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === state.steps.length - 1;
  const canGoNext = state.stepValidation[state.currentStep];
  const canGoPrevious = !isFirstStep;

  // Progress calculation
  const progress = ((currentStepIndex + 1) / state.steps.length) * 100;

  const value = {
    // State
    ...state,
    currentStepIndex,
    currentStepData,
    isFirstStep,
    isLastStep,
    canGoNext,
    canGoPrevious,
    progress,
    
    // Actions
    setCurrentStep,
    updateWizardData,
    setStepValidation,
    setLoading,
    setError,
    resetWizard,
    nextStep,
    previousStep,
    goToStep
  };

  return (
    <UploadWizardContext.Provider value={value}>
      {children}
    </UploadWizardContext.Provider>
  );
};

// Custom hook
export const useUploadWizard = () => {
  const context = useContext(UploadWizardContext);
  if (!context) {
    throw new Error('useUploadWizard must be used within an UploadWizardProvider');
  }
  return context;
};