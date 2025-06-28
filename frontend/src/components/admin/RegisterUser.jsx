// RegisterUser.jsx
import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Button, 
  Grid,
  FormHelperText,
  Snackbar,
  Alert,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  InputAdornment,
  Tooltip,
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import { 
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  Lock as LockIcon,
  Work as WorkIcon,
  CreditCard as CreditCardIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';

// Enhanced role definitions with icons and descriptions
const ROLES = [
  {
    value: 'user',
    label: 'Standard User',
    icon: <PersonIcon />,
    description: 'Basic access to view your credit score and reports',
    permissions: ['view_own_score', 'basic_report']
  },
  {
    value: 'premium',
    label: 'Premium User',
    icon: <CreditCardIcon />,
    description: 'Advanced credit monitoring and simulation tools',
    permissions: ['full_report', 'score_simulations', 'credit_monitoring']
  },
  {
    value: 'lender',
    label: 'Lender',
    icon: <WorkIcon />,
    description: 'Access to applicant scoring and lending tools',
    permissions: ['view_applicants', 'bulk_score_check', 'lender_dashboard']
  },
  {
    value: 'admin',
    label: 'Administrator',
    icon: <AdminIcon />,
    description: 'Full system access and user management',
    permissions: ['manage_users', 'system_config', 'audit_logs', 'override_scores']
  },
  {
    value: 'analyst',
    label: 'Credit Analyst',
    icon: <BadgeIcon />,
    description: 'Manual review capabilities and score adjustments',
    permissions: ['manual_reviews', 'fraud_detection', 'score_adjustments']
  }
];

// National ID mask with validation
const NationalIdInput = ({ value, onChange, error, helperText }) => {
  const formatId = (input) => {
    const digits = input.replace(/\D/g, '');
    return digits.match(/.{1,4}/g)?.join('-') || '';
  };

  const handleChange = (e) => {
    const formatted = formatId(e.target.value);
    onChange(formatted);
  };

  return (
    <TextField
      fullWidth
      label="National ID"
      value={value}
      onChange={handleChange}
      error={error}
      helperText={helperText}
      placeholder="XXXX-XXXX-XXXX-XXXX"
      inputProps={{ maxLength: 19 }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <BadgeIcon color="action" />
          </InputAdornment>
        )
      }}
    />
  );
};

// Password strength indicator
const PasswordStrength = ({ password }) => {
  const getStrength = () => {
    if (!password) return 0;
    let strength = 0;
    
    // Length contributes up to 40% strength
    strength += Math.min(password.length / 12, 1) * 40;
    
    // Character diversity contributes up to 60%
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    const diversity = [hasLower, hasUpper, hasNumber, hasSpecial]
      .filter(Boolean).length;
    
    strength += (diversity / 4) * 60;
    
    return Math.min(Math.round(strength), 100);
  };

  const strength = getStrength();
  const getColor = () => {
    if (strength < 40) return 'error';
    if (strength < 80) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ width: '100%', mt: 1 }}>
      <Box sx={{ 
        height: 6, 
        backgroundColor: 'divider', 
        borderRadius: 3,
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          width: `${strength}%`, 
          height: '100%', 
          backgroundColor: getColor() === 'error' ? '#f44336' : 
                          getColor() === 'warning' ? '#ff9800' : '#4caf50'
        }} />
      </Box>
      <Typography variant="caption" color="textSecondary">
        {strength < 40 ? 'Weak' : strength < 80 ? 'Moderate' : 'Strong'} password
      </Typography>
    </Box>
  );
};

const RegisterUser = ({ open = false, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const steps = ['Personal Info', 'Account Type', 'Financial Details', 'Confirmation'];

  const validationSchema = Yup.object({
    username: Yup.string()
      .required('Username is required')
      .min(3, 'Must be at least 3 characters')
      .max(30, 'Must be 30 characters or less')
      .matches(/^[a-zA-Z0-9_]+$/, 'Can only contain letters, numbers, and underscores'),
    name: Yup.string()
      .required('Full name is required')
      .min(3, 'Must be at least 3 characters'),
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    password: Yup.string()
      .required('Password is required')
      .min(8, 'Must be at least 8 characters')
      .matches(/[a-z]/, 'Must contain lowercase letter')
      .matches(/[A-Z]/, 'Must contain uppercase letter')
      .matches(/[0-9]/, 'Must contain number'),
    nationalId: Yup.string()
      .required('National ID is required')
      .test('len', 'Must be exactly 16 digits', 
        val => val.replace(/\D/g, '').length === 16),
    role: Yup.string()
      .required('Account type is required')
      .oneOf(ROLES.map(r => r.value), 'Invalid account type'),
    monthlyIncome: Yup.number()
      .min(0, 'Cannot be negative')
      .required('Monthly income is required'),
    totalDebt: Yup.number().min(0, 'Cannot be negative'),
    totalCredit: Yup.number().min(0, 'Cannot be negative'),
    creditFactors: Yup.object().when('role', {
      is: role => ['admin', 'analyst'].includes(role),
      then: Yup.object({
        overrideScore: Yup.number()
          .min(300, 'Must be at least 300')
          .max(850, 'Cannot exceed 850'),
        riskAdjustment: Yup.number()
          .min(-50, 'Cannot be less than -50')
          .max(50, 'Cannot exceed 50')
      })
    }),
    agreeTerms: Yup.boolean()
      .oneOf([true], 'You must accept the terms and conditions')
      .required('Required')
  });

  const formik = useFormik({
    initialValues: {
      username: '',
      name: '',
      email: '',
      password: '',
      nationalId: '',
      role: 'user',
      monthlyIncome: '',
      totalDebt: '',
      totalCredit: '',
      creditFactors: {},
      agreeTerms: false
    },
    enableReinitialize: true,
    validateOnMount: true,
    validateOnChange: true,
    validateOnBlur: true,
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        setIsSubmitting(true);
        console.log('Form submission started with values:', values);
        
        const cleanId = values.nationalId.replace(/\D/g, '');
        const payload = {
          ...values,
          nationalId: cleanId,
          creditFactors: ['admin', 'analyst'].includes(values.role) ? values.creditFactors : undefined,
          passwordConfirm: values.password,
          role: values.role || 'user'
        };
        
        console.log('Sending registration request...');
        const response = await axios.post('/api/v1/auth/register', payload);
        console.log('Registration successful, response:', response.data);
        
        setSuccessOpen(true);
        resetForm();
        if (onSuccess) onSuccess();
      } catch (err) {
        console.error('Registration error:', err);
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      } finally {
        setIsSubmitting(false);
        setSubmitting(false);
      }
    }
  });

  // Handle dialog close
  const handleClose = () => {
    onClose();
  };

  // Handle closing success message
  const handleSuccessClose = () => {
    setSuccessOpen(false);
    onClose();
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Handle next step in the form
  const handleNext = () => {
    // Define fields to validate for each step
    const stepFields = {
      0: ['name', 'email', 'password', 'nationalId'],
      1: ['role'],
      2: ['monthlyIncome', 'totalDebt', 'totalCredit']
    };

    // Get fields for current step
    const currentStepFields = stepFields[activeStep] || [];
    
    // Create touched object for current fields
    const touchedFields = currentStepFields.reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    
    // Set touched state
    formik.setTouched(touchedFields);
    
    // Check for errors in current step fields
    const hasErrors = currentStepFields.some(field => formik.errors[field]);
    
    if (!hasErrors) {
      setActiveStep(prevStep => prevStep + 1);
    }
  };

  // Handle previous step in the form
  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  // Reset form when dialog is opened
  useEffect(() => {
    if (open) {
      formik.resetForm();
      setError(null);
      setSuccessOpen(false);
      setActiveStep(0);
    }
  }, [open]);

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body1" color="textSecondary" mb={2}>
                Please provide your personal information
              </Typography>
            </Grid>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formik.values.username}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.username && Boolean(formik.errors.username)}
                  helperText={formik.touched.username ? formik.errors.username : 'Will be used for login'}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                  required
                />
              </Grid>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon color="action" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={togglePasswordVisibility} edge="end">
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <PasswordStrength password={formik.values.password} />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <NationalIdInput
                value={formik.values.nationalId}
                onChange={(val) => formik.setFieldValue('nationalId', val)}
                error={formik.touched.nationalId && Boolean(formik.errors.nationalId)}
                helperText={formik.touched.nationalId && formik.errors.nationalId}
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="body1" color="textSecondary" mb={2}>
                Select your account type
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth error={formik.touched.role && Boolean(formik.errors.role)}>
                <InputLabel>Account Type</InputLabel>
                <Select
                  name="role"
                  value={formik.values.role}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  label="Account Type"
                >
                  {ROLES.map(role => (
                    <MenuItem key={role.value} value={role.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 2 }}>{role.icon}</Box>
                        <Box>
                          <Typography>{role.label}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {role.description}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {formik.touched.role && formik.errors.role}
                </FormHelperText>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Permissions for {ROLES.find(r => r.value === formik.values.role)?.label}
                  </Typography>
                  <ul style={{ paddingLeft: 20, margin: 0 }}>
                    {ROLES.find(r => r.value === formik.values.role)?.permissions.map((perm, i) => (
                      <li key={i}>
                        <Typography variant="body2">{perm.replace(/_/g, ' ')}</Typography>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="body1" color="textSecondary" mb={2}>
                Provide your financial details for accurate credit scoring
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Monthly Income ($)"
                name="monthlyIncome"
                type="number"
                value={formik.values.monthlyIncome}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.monthlyIncome && Boolean(formik.errors.monthlyIncome)}
                helperText={formik.touched.monthlyIncome && formik.errors.monthlyIncome}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Total Debt ($)"
                name="totalDebt"
                type="number"
                value={formik.values.totalDebt}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.totalDebt && Boolean(formik.errors.totalDebt)}
                helperText={formik.touched.totalDebt && formik.errors.totalDebt}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Total Credit ($)"
                name="totalCredit"
                type="number"
                value={formik.values.totalCredit}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.totalCredit && Boolean(formik.errors.totalCredit)}
                helperText={formik.touched.totalCredit && formik.errors.totalCredit}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  )
                }}
              />
            </Grid>
            
            {['admin', 'analyst'].includes(formik.values.role) && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box display="flex" alignItems="center" mb={2}>
                    <AdminIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Administrative Settings</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Override Score"
                    name="creditFactors.overrideScore"
                    type="number"
                    value={formik.values.creditFactors?.overrideScore || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.creditFactors?.overrideScore && Boolean(formik.errors.creditFactors?.overrideScore)}
                    helperText={formik.touched.creditFactors?.overrideScore && formik.errors.creditFactors?.overrideScore || "Manually set initial credit score"}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Risk Adjustment"
                    name="creditFactors.riskAdjustment"
                    type="number"
                    value={formik.values.creditFactors?.riskAdjustment || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.creditFactors?.riskAdjustment && Boolean(formik.errors.creditFactors?.riskAdjustment)}
                    helperText={formik.touched.creditFactors?.riskAdjustment && formik.errors.creditFactors?.riskAdjustment || "Adjustment to risk calculation (-50 to 50)"}
                  />
                </Grid>
              </>
            )}
          </Grid>
        );
      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Registration Summary
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Name</Typography>
                      <Typography>{formik.values.name}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Email</Typography>
                      <Typography>{formik.values.email}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Account Type</Typography>
                      <Typography>{ROLES.find(r => r.value === formik.values.role)?.label}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Monthly Income</Typography>
                      <Typography>${formik.values.monthlyIncome || '0'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Total Debt</Typography>
                      <Typography>${formik.values.totalDebt || '0'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Total Credit</Typography>
                      <Typography>${formik.values.totalCredit || '0'}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formik.values.agreeTerms}
                    onChange={formik.handleChange}
                    name="agreeTerms"
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    I agree to the Terms of Service and Privacy Policy
                  </Typography>
                }
              />
              {formik.touched.agreeTerms && formik.errors.agreeTerms && (
                <Typography variant="caption" color="error" display="block">
                  {formik.errors.agreeTerms}
                </Typography>
              )}
            </Grid>
          </Grid>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ m: 0, p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="div">
            Create New Account
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <form onSubmit={formik.handleSubmit} noValidate>
        <DialogContent dividers>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4, mt: 1 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {renderStepContent(activeStep)}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button
            type="button"
            onClick={handleBack}
            disabled={activeStep === 0 || isSubmitting}
            variant="outlined"
          >
            Back
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting || !formik.values.agreeTerms || !formik.isValid}
              sx={{ minWidth: 150 }}
            >
              {isSubmitting ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Creating...
                </>
              ) : 'Create Account'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="contained"
              color="primary"
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </DialogActions>
      </form>

      {/* Notifications */}
      <Snackbar
        open={successOpen}
        autoHideDuration={6000}
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSuccessClose} severity="success" sx={{ width: '100%' }}>
          Account created successfully!
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default RegisterUser;