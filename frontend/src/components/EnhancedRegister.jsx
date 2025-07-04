import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard, 
  MapPin, 
  Building,
  DollarSign,
  Shield,
  FileText,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

// Password strength meter component
const PasswordStrengthMeter = ({ password }) => {
  const calculateStrength = (password) => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min(score, 5);
  };

  const strength = calculateStrength(password);
  const percentage = (strength / 5) * 100;
  
  const getStrengthColor = () => {
    if (percentage <= 20) return 'bg-red-500';
    if (percentage <= 40) return 'bg-orange-500';
    if (percentage <= 60) return 'bg-yellow-500';
    if (percentage <= 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (percentage <= 20) return 'Very Weak';
    if (percentage <= 40) return 'Weak';
    if (percentage <= 60) return 'Fair';
    if (percentage <= 80) return 'Good';
    return 'Strong';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Password Strength</span>
        <span className={`font-medium ${
          percentage <= 40 ? 'text-red-600' : 
          percentage <= 60 ? 'text-yellow-600' : 
          percentage <= 80 ? 'text-blue-600' : 'text-green-600'
        }`}>
          {getStrengthText()}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Include uppercase, lowercase, numbers, and special characters
      </div>
    </div>
  );
};

// Masked input for National ID/SSN
const MaskedInput = ({ value, onChange, placeholder, mask, ...props }) => {
  const formatValue = (input) => {
    const numbers = input.replace(/\D/g, '');
    let result = '';
    let numberIndex = 0;
    
    for (let i = 0; i < mask.length && numberIndex < numbers.length; i++) {
      if (mask[i] === '#') {
        result += numbers[numberIndex];
        numberIndex++;
      } else {
        result += mask[i];
      }
    }
    
    return result;
  };

  const handleChange = (e) => {
    const formatted = formatValue(e.target.value);
    onChange(formatted);
  };

  return (
    <Input
      {...props}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
};

// Financial input with validation
const FinancialInput = ({ label, value, onChange, error, helperText, ...props }) => {
  const validateAmount = (amount) => {
    if (amount < 0) return "Cannot be negative";
    if (amount > 1000000) return "Unrealistic value";
    return null;
  };

  const handleChange = (e) => {
    const value = parseFloat(e.target.value) || 0;
    const validationError = validateAmount(value);
    onChange(value, validationError);
  };

  return (
    <div className="space-y-2">
      <Label className="text-gray-700 dark:text-gray-300">{label}</Label>
      <div className="relative">
        <Input
          {...props}
          type="number"
          value={value || ''}
          onChange={handleChange}
          className={`pr-8 ${error ? 'border-red-500' : ''}`}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <DollarSign className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      {(error || helperText) && (
        <p className={`text-xs ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

const EnhancedRegister = ({ 
  isAdmin = false, 
  onSuccess, 
  onClose,
  initialRole = 'user',
  showPendingMessage = true 
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    nationalId: '',
    address: '',
    gender: '',
    
    // Account Type
    role: initialRole,
    badgeTier: 'basic',
    
    // Employment Details (keeping only this from financial section)
    employmentStatus: '',
    employerName: '',
    industry: '',
    
    // Legal
    agreeTerms: false,
    authorizeCreditChecks: false,
    
    // Admin Only
    initialCreditScore: '',
    sourceNotes: '',
    branchVerification: false
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateField = (name, value) => {
    switch (name) {
      case 'username':
        if (!value.trim()) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (value.length > 30) return 'Username cannot be more than 30 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain alphanumeric characters and underscores';
        return null;
      
      case 'fullName':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return null;
      
      case 'phone':
        if (!value) return 'Phone number is required';
        if (!/^\+?[\d\s\-\(\)]+$/.test(value)) return 'Please enter a valid phone number';
        return null;
      
      case 'dateOfBirth':
        if (!value) return 'Date of birth is required';
        const age = new Date().getFullYear() - new Date(value).getFullYear();
        if (age < 18) return 'Must be at least 18 years old';
        if (age > 120) return 'Please enter a valid date of birth';
        return null;
      
      case 'nationalId':
        if (!value) return 'National ID is required';
        if (value.replace(/\D/g, '').length !== 16) return 'National ID must be exactly 16 digits';
        return null;
      
      case 'address':
        if (!value.trim()) return 'Address is required';
        return null;
      
      case 'role':
        if (!value) return 'Account type is required';
        return null;
      
      case 'employmentStatus':
        if (!value) return 'Employment status is required';
        return null;
      
      case 'industry':
        if (!value) return 'Industry is required';
        return null;
      
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/[a-z]/.test(value)) return 'Password must contain lowercase letter';
        if (!/[A-Z]/.test(value)) return 'Password must contain uppercase letter';
        if (!/[0-9]/.test(value)) return 'Password must contain number';
        return null;
      
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return null;
      
      case 'agreeTerms':
        if (!value) return 'You must accept the terms and conditions';
        return null;
      
      case 'authorizeCreditChecks':
        if (!value) return 'You must authorize credit report pulls';
        return null;
      
      default:
        return null;
    }
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleBlur = (name) => {
    const error = validateField(name, formData[name]);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'username', 'fullName', 'phone', 'dateOfBirth', 'nationalId', 'address', 'role', 'employmentStatus', 'industry',
      'password', 'confirmPassword', 'agreeTerms', 'authorizeCreditChecks'
    ];

    requiredFields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        username: formData.username.trim(),
        name: formData.fullName,
        phoneNumber: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth,
        nationalId: formData.nationalId.replace(/\D/g, ''),
        address: formData.address,
        gender: formData.gender,
        role: formData.role,
        password: formData.password,
        passwordConfirm: formData.confirmPassword,
        employmentStatus: formData.employmentStatus,
        employerName: formData.employerName,
        industry: formData.industry,
        agreeTerms: formData.agreeTerms,
        authorizeCreditChecks: formData.authorizeCreditChecks,
        badgeTier: formData.badgeTier,
        ...(isAdmin && {
          adminFields: {
            initialCreditScore: formData.initialCreditScore || undefined,
            sourceNotes: formData.sourceNotes || undefined,
            branchVerification: formData.branchVerification
          }
        })
      };

      // Debug logging
      console.log('Sending registration payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      // Debug logging
      console.log('Registration response status:', response.status);
      console.log('Registration response data:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('Registration failed with status:', response.status);
        console.error('Error data:', data);
        
        // Show detailed validation errors
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map(err => {
            if (typeof err === 'string') return err;
            if (err.message) return err.message;
            if (err.msg) return err.msg;
            return JSON.stringify(err);
          }).join(', ');
          throw new Error(`Validation failed: ${errorMessages}`);
        } else if (data.message) {
          throw new Error(data.message);
        } else {
          throw new Error('Registration failed');
        }
      }

      console.log('Registration successful!');
      console.log('User data:', data.user);
      console.log('Full response data:', data);

      console.log('About to show success toast...');
      toast({
        title: 'Registration Successful',
        description: showPendingMessage 
          ? 'Your account has been created and is pending verification. Please visit our branch to complete the verification process.'
          : 'Account created successfully!',
        variant: 'success'
      });
      console.log('Success toast should be displayed');

      if (onSuccess) {
        console.log('Calling onSuccess callback');
        onSuccess(data);
      } else if (isAdmin) {
        console.log('Admin mode - staying in dashboard');
        // Stay in admin dashboard
        if (onClose) onClose();
      } else {
        console.log('Regular user - will redirect in 5 seconds');
        // Wait a moment to show the success message, then redirect
        setTimeout(() => {
          console.log('Redirecting now...');
          // Redirect based on role - try both possible user data locations
          const userData = data.user || data.data?.user;
          console.log('User data for redirect:', userData);
          if (userData?.role === 'lender') {
            navigate('/lender');
          } else if (userData?.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }, 5000); // Show success message for 5 seconds
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-4xl shadow-xl rounded-2xl overflow-hidden border-0 dark:border dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-gray-800 dark:to-gray-900 text-white p-8">
          <div className="text-center">
            <div className="mx-auto bg-white dark:bg-gray-700 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {isAdmin ? 'Create New User Account' : 'Create Your Account'}
            </CardTitle>
            <CardDescription className="text-blue-100 dark:text-gray-300 mt-2">
              {isAdmin 
                ? 'Register a new user with comprehensive information'
                : 'Join our credit scoring platform with complete verification'
              }
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-8 space-y-8">
            {/* Data Accuracy Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-800 mb-1">
                    ⚠️ Important: Complete and Accurate Information Required
                  </h3>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    Please ensure all information provided is accurate and up-to-date. 
                    <strong className="font-semibold"> This information will be used for account verification and credit assessment.</strong> 
                    Inaccurate information may affect your account verification process.
                  </p>
                  <div className="mt-2 text-xs text-amber-600">
                    <p>• Provide your real full name and contact information</p>
                    <p>• Use a valid email address for verification</p>
                    <p>• Ensure your National ID is correct</p>
                    <p>• Select the appropriate employment status</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={e => handleChange('username', e.target.value)}
                    onBlur={() => handleBlur('username')}
                    placeholder="Choose a unique username"
                    autoComplete="username"
                    required
                  />
                  {errors.username && <div className="text-red-600 text-xs mt-1">{errors.username}</div>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-gray-700 dark:text-gray-300">
                    Full Name *
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    onBlur={() => handleBlur('fullName')}
                    placeholder="Enter your full name"
                    className={errors.fullName ? 'border-red-500' : ''}
                    disabled={loading}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-600">{errors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">
                    Phone Number *
                  </Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                      placeholder="+1 (555) 123-4567"
                      className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                      disabled={loading}
                    />
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-red-600">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-gray-700 dark:text-gray-300">
                    Date of Birth *
                  </Label>
                  <div className="relative">
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                      onBlur={() => handleBlur('dateOfBirth')}
                      className={`pl-10 ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                      disabled={loading}
                    />
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.dateOfBirth && (
                    <p className="text-xs text-red-600">{errors.dateOfBirth}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationalId" className="text-gray-700 dark:text-gray-300">
                    National ID *
                  </Label>
                  <div className="relative">
                    <MaskedInput
                      id="nationalId"
                      value={formData.nationalId}
                      onChange={(value) => handleChange('nationalId', value)}
                      onBlur={() => handleBlur('nationalId')}
                      placeholder="1234-5678-9012-3456"
                      mask="####-####-####-####"
                      className={`pl-10 ${errors.nationalId ? 'border-red-500' : ''}`}
                      disabled={loading}
                    />
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.nationalId && (
                    <p className="text-xs text-red-600">{errors.nationalId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-gray-700 dark:text-gray-300">
                    Gender
                  </Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleChange('gender', value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-700 dark:text-gray-300">
                  Address *
                </Label>
                <div className="relative">
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    onBlur={() => handleBlur('address')}
                    placeholder="Enter your full address"
                    className={`pl-10 ${errors.address ? 'border-red-500' : ''}`}
                    disabled={loading}
                  />
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {errors.address && (
                  <p className="text-xs text-red-600">{errors.address}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Account Type Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Account Type</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-gray-700 dark:text-gray-300">
                    Account Type *
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleChange('role', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        <div className="flex items-center space-x-2">
                          <span>Borrower</span>
                          <Badge variant="secondary">Check credit score</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="premium">
                        <div className="flex items-center space-x-2">
                          <span>Premium User</span>
                          <Badge variant="premium">Advanced tools</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="lender">
                        <div className="flex items-center space-x-2">
                          <span>Lender</span>
                          <Badge variant="outline">Scoring tools</Badge>
                        </div>
                      </SelectItem>
                      {isAdmin && (
                        <SelectItem value="admin">
                          <div className="flex items-center space-x-2">
                            <span>Administrator</span>
                            <Badge variant="destructive">Full access</Badge>
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-xs text-red-600">{errors.role}</p>
                  )}
                </div>

                {isAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="badgeTier" className="text-gray-700 dark:text-gray-300">
                      Badge Tier
                    </Label>
                    <Select
                      value={formData.badgeTier}
                      onValueChange={(value) => handleChange('badgeTier', value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select badge tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Employment Details Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Employment Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="employmentStatus" className="text-gray-700 dark:text-gray-300">
                    Employment Status *
                  </Label>
                  <Select
                    value={formData.employmentStatus}
                    onValueChange={(value) => handleChange('employmentStatus', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className={errors.employmentStatus ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select employment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self-employed">Self-Employed</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.employmentStatus && (
                    <p className="text-xs text-red-600">{errors.employmentStatus}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employerName" className="text-gray-700 dark:text-gray-300">
                    Employer Name
                  </Label>
                  <Input
                    id="employerName"
                    value={formData.employerName}
                    onChange={(e) => handleChange('employerName', e.target.value)}
                    placeholder="Company name"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry" className="text-gray-700 dark:text-gray-300">
                  Industry *
                </Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => handleChange('industry', value)}
                  disabled={loading}
                >
                  <SelectTrigger className={errors.industry ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="agriculture">Agriculture</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.industry && (
                  <p className="text-xs text-red-600">{errors.industry}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Security Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Security & Legal</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                    Password *
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      onBlur={() => handleBlur('password')}
                      placeholder="••••••••"
                      className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-600">{errors.password}</p>
                  )}
                  <PasswordStrengthMeter password={formData.password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300">
                    Confirm Password *
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      onBlur={() => handleBlur('confirmPassword')}
                      placeholder="••••••••"
                      className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="authorizeCreditChecks"
                    checked={formData.authorizeCreditChecks}
                    onCheckedChange={(checked) => handleChange('authorizeCreditChecks', checked)}
                    disabled={loading}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="authorizeCreditChecks" className="text-sm font-medium">
                      I authorize credit report pulls (FCRA compliance) *
                    </Label>
                    <p className="text-xs text-gray-500">
                      You authorize us to pull your credit report for scoring and verification purposes
                    </p>
                  </div>
                </div>
                {errors.authorizeCreditChecks && (
                  <p className="text-xs text-red-600">{errors.authorizeCreditChecks}</p>
                )}

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreeTerms"
                    checked={formData.agreeTerms}
                    onCheckedChange={(checked) => handleChange('agreeTerms', checked)}
                    disabled={loading}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="agreeTerms" className="text-sm font-medium">
                      I agree to the Terms of Service and Privacy Policy *
                    </Label>
                    <p className="text-xs text-gray-500">
                      By checking this box, you agree to our terms and privacy policy
                    </p>
                  </div>
                </div>
                {errors.agreeTerms && (
                  <p className="text-xs text-red-600">{errors.agreeTerms}</p>
                )}
              </div>
            </div>

            {/* Admin Only Section */}
            {isAdmin && (
              <>
                <Separator />
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Administrative Settings</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="initialCreditScore" className="text-gray-700 dark:text-gray-300">
                        Initial Credit Score
                      </Label>
                      <Input
                        id="initialCreditScore"
                        type="number"
                        value={formData.initialCreditScore}
                        onChange={(e) => handleChange('initialCreditScore', e.target.value)}
                        placeholder="750"
                        min="300"
                        max="850"
                        disabled={loading}
                      />
                      <p className="text-xs text-gray-500">Range: 300-850</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sourceNotes" className="text-gray-700 dark:text-gray-300">
                        Source Notes
                      </Label>
                      <Input
                        id="sourceNotes"
                        value={formData.sourceNotes}
                        onChange={(e) => handleChange('sourceNotes', e.target.value)}
                        placeholder="e.g., Came from branch office"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="branchVerification"
                      checked={formData.branchVerification}
                      onCheckedChange={(checked) => handleChange('branchVerification', checked)}
                      disabled={loading}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="branchVerification" className="text-sm font-medium">
                        Branch Verification Completed
                      </Label>
                      <p className="text-xs text-gray-500">
                        Check if user has completed in-person verification at branch
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Pending Verification Notice */}
            {showPendingMessage && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Account Verification Required
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      After registration, you must visit our branch office to verify your identity and documents. 
                      Your account will remain pending until verification is complete.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center w-full">
              {onClose && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}
              
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 px-8"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default EnhancedRegister; 