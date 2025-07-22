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
import { Separator } from './ui/separator';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  User, 
  Phone, 
  Calendar, 
  CreditCard, 
  MapPin,
  Briefcase,
  Shield,
  Mail,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import authService from '../services/authService';

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
    if (strength <= 1) return 'bg-red-500';
    if (strength <= 2) return 'bg-orange-500';
    if (strength <= 3) return 'bg-yellow-500';
    if (strength <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strength <= 1) return 'Very Weak';
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Fair';
    if (strength <= 4) return 'Good';
    return 'Strong';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Password Strength</span>
        <span className={`font-medium ${
          strength <= 1 ? 'text-red-600' : 
          strength <= 2 ? 'text-orange-600' : 
          strength <= 3 ? 'text-yellow-600' : 
          strength <= 4 ? 'text-blue-600' : 'text-green-600'
        }`}>
          {getStrengthText()}
        </span>
      </div>
      <Progress value={percentage} className={`h-2 ${getStrengthColor()}`} />
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
    email: '',
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    nationalId: '',
    address: '',
    gender: '',
    role: initialRole,
    employmentStatus: '',
    employerName: '',
    industry: '',
    agreeTerms: false,
    authorizeCreditChecks: false,
    bankId: '' // <-- Add bankId to formData
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
      
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
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
        const today = new Date();
        const birthDate = new Date(value);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
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
      
      case 'bankId':
        if (!value) return 'Bank selection is required';
        return null;
      
      default:
        return null;
    }
  };

  const handleChange = (name, value) => {
    console.log(`handleChange called for ${name} with value:`, value);
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
      'username', 'email', 'fullName', 'phone', 'dateOfBirth', 'nationalId', 
      'address', 'role', 'employmentStatus', 'industry', 'password', 
      'confirmPassword', 'agreeTerms', 'authorizeCreditChecks', 'bankId' // <-- Add bankId
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
        email: formData.email.trim(),
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
        bankId: formData.bankId // <-- Add bankId to payload
      };

      // Use authService.register to ensure CSRF token is set
      const user = await authService.register(payload);

      toast({
        title: 'Registration Successful',
        description: showPendingMessage 
          ? 'Your account has been created and is pending verification. Please visit our branch to complete the verification process.'
          : 'Account created successfully!',
        variant: 'success'
      });

      if (onSuccess) {
        onSuccess(user);
      } else if (isAdmin) {
        if (onClose) onClose();
      } else {
        setTimeout(() => {
          if (user?.role === 'lender') {
            navigate('/lender');
          } else if (user?.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }, 3000);
      }
    } catch (error) {
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
    <div className="min-h-screen flex items-center justify-center p-2 animate-fade-in-slow">
      <Card className="w-full max-w-4xl border border-[#6B5B95] bg-white dark:bg-[rgba(245,245,245,0.10)] text-[#1A3C5E] dark:text-[#F5F5F5] shadow-[0_0_15px_rgba(46,185,223,0.3)] backdrop-blur-lg animate-fade-in">
        <CardHeader className="p-8 border-b border-[#6B5B95] bg-white dark:bg-transparent">
          <div className="text-center">
            <div className="mx-auto bg-[#F8F9FA] dark:bg-[#18191a] rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-[#1A3C5E] dark:text-[#F5F5F5]" />
            </div>
            <CardTitle className="text-2xl font-bold text-[#1A3C5E] dark:text-[#F5F5F5]">
              {isAdmin ? 'Create New User Account' : 'Create Your Account'}
            </CardTitle>
            <CardDescription className="text-[#6B5B95] dark:text-[#CCCCCC] mt-2">
              {isAdmin 
                ? 'Register a new user with comprehensive information'
                : 'Join our credit scoring platform with complete verification'
              }
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 sm:p-8 space-y-8 bg-white dark:bg-transparent">
            {/* Data Accuracy Notice */}
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    ⚠️ Important: Complete and Accurate Information Required
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-100 leading-relaxed">
                    Please ensure all information provided is accurate and up-to-date. 
                    <strong className="font-semibold"> This information will be used for account verification and credit assessment.</strong> 
                    Inaccurate information may affect your account verification process.
                  </p>
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-200">
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
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-[#1A3C5E] dark:text-[#F5F5F5]">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="block text-[#1A3C5E] dark:text-[#F5F5F5] text-lg font-bold mb-1">Username *</Label>
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
                    className="w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors"
                  />
                  {errors.username && <div className="text-[#DC3545] text-sm italic mt-1 animate-slide-in-top">{errors.username}</div>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="block text-[#1A3C5E] text-lg font-bold mb-1">Email *</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={e => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="your@email.com"
                      className={`pl-10 w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors ${errors.email ? 'border-red-500' : ''}`}
                      required
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.email && <div className="text-[#DC3545] text-sm italic mt-1 animate-slide-in-top">{errors.email}</div>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="block text-[#1A3C5E] text-lg font-bold mb-1">
                    Full Name *
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    onBlur={() => handleBlur('fullName')}
                    placeholder="Enter your full name"
                    className={`w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors ${errors.fullName ? 'border-red-500' : ''}`}
                    disabled={loading}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top">{errors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="block text-[#1A3C5E] text-lg font-bold mb-1">
                    Phone Number *
                  </Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                      placeholder="+1 (555) 123-4567"
                      className={`pl-10 w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors ${errors.phone ? 'border-red-500' : ''}`}
                      disabled={loading}
                    />
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="block text-[#1A3C5E] text-lg font-bold mb-1">
                    Date of Birth *
                  </Label>
                  <div className="relative">
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                      onBlur={() => handleBlur('dateOfBirth')}
                      className={`pl-10 w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                      disabled={loading}
                    />
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.dateOfBirth && (
                    <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top">{errors.dateOfBirth}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationalId" className="block text-[#1A3C5E] text-lg font-bold mb-1">
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
                      className={`pl-10 w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors ${errors.nationalId ? 'border-red-500' : ''}`}
                      disabled={loading}
                    />
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.nationalId && (
                    <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top">{errors.nationalId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="block text-[#1A3C5E] text-lg font-bold mb-1">
                    Gender
                  </Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleChange('gender', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankId" className="block text-[#1A3C5E] dark:text-[#F5F5F5] text-lg font-bold mb-1">Bank *</Label>
                  <Select
                    value={formData.bankId}
                    onValueChange={value => handleChange('bankId', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className={`h-12 w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors ${errors.bankId ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select your bank" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="CBE">Commercial Bank of Ethiopia</SelectItem>
                      <SelectItem value="DBE">Development Bank of Ethiopia</SelectItem>
                      <SelectItem value="AWASH">Awash Bank</SelectItem>
                      <SelectItem value="DASHEN">Dashen Bank</SelectItem>
                      <SelectItem value="ABYSSINIA">Bank of Abyssinia</SelectItem>
                      <SelectItem value="WEGAGEN">Wegagen Bank</SelectItem>
                      <SelectItem value="NIB">Nib International Bank</SelectItem>
                      <SelectItem value="HIBRET">Hibret Bank</SelectItem>
                      <SelectItem value="LION">Lion International Bank</SelectItem>
                      <SelectItem value="COOP">Cooperative Bank of Oromia</SelectItem>
                      <SelectItem value="ZEMEN">Zemen Bank</SelectItem>
                      <SelectItem value="OROMIA">Oromia International Bank</SelectItem>
                      <SelectItem value="BUNNA">Bunna Bank</SelectItem>
                      <SelectItem value="BERHAN">Berhan Bank</SelectItem>
                      <SelectItem value="ABAY">Abay Bank</SelectItem>
                      <SelectItem value="ADDIS">Addis International Bank</SelectItem>
                      <SelectItem value="DEBUB">Debub Global Bank</SelectItem>
                      <SelectItem value="ENAT">Enat Bank</SelectItem>
                      <SelectItem value="GADAA">Gadaa Bank</SelectItem>
                      <SelectItem value="HIJRA">Hijra Bank</SelectItem>
                      <SelectItem value="SHABELLE">Shabelle Bank</SelectItem>
                      <SelectItem value="SIINQEE">Siinqee Bank</SelectItem>
                      <SelectItem value="TSEHAY">Tsehay Bank</SelectItem>
                      <SelectItem value="AMHARA">Amhara Bank</SelectItem>
                      <SelectItem value="AHADU">Ahadu Bank</SelectItem>
                      <SelectItem value="GOH">Goh Betoch Bank</SelectItem>
                      <SelectItem value="AMAN">AMAN Bank</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.bankId && (
                    <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.bankId}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="block text-[#1A3C5E] text-lg font-bold mb-1">
                  Address *
                </Label>
                <div className="relative">
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    onBlur={() => handleBlur('address')}
                    placeholder="Enter your full address"
                    className={`w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors ${errors.address ? 'border-red-500' : ''}`}
                    disabled={loading}
                  />
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {errors.address && (
                  <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top">{errors.address}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Account Type Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-[#1A3C5E] dark:text-[#F5F5F5]">Account Type</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="role" className="block text-[#1A3C5E] dark:text-[#F5F5F5] text-lg font-bold mb-1">
                    Select Account Type *
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleChange('role', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className={`h-12 w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors ${errors.role ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Choose your account type" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="user">Borrower - Basic</SelectItem>
                      <SelectItem value="premium">Premium User - Advanced</SelectItem>
                      <SelectItem value="lender">Lender - Professional</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.role}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Employment Details Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-[#1A3C5E] dark:text-[#F5F5F5]">Employment Details</h3>
              </div>
              
              <div className="space-y-6">
                {/* Employment Status */}
                <div className="space-y-3">
                  <Label htmlFor="employmentStatus" className="block text-[#1A3C5E] dark:text-[#F5F5F5] text-lg font-bold mb-1">
                    Employment Status *
                  </Label>
                  <Select
                    value={formData.employmentStatus}
                    onValueChange={(value) => handleChange('employmentStatus', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className={`h-12 w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors ${errors.employmentStatus ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select your employment status" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self-employed">Self-Employed</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.employmentStatus && (
                    <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.employmentStatus}</span>
                    </p>
                  )}
                </div>

                {/* Employer Name and Industry */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="employerName" className="block text-[#1A3C5E] dark:text-[#F5F5F5] text-lg font-bold mb-1">
                      Employer Name
                    </Label>
                    <Input
                      id="employerName"
                      value={formData.employerName}
                      onChange={(e) => handleChange('employerName', e.target.value)}
                      placeholder="Enter company name"
                      className="h-12 border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="industry" className="block text-[#1A3C5E] dark:text-[#F5F5F5] text-lg font-bold mb-1">
                      Industry *
                    </Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) => handleChange('industry', value)}
                      disabled={loading}
                    >
                      <SelectTrigger className={`h-12 w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors ${errors.industry ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
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
                      <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>{errors.industry}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Security Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-[#1A3C5E] dark:text-[#F5F5F5]">Security & Legal</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="block text-[#1A3C5E] dark:text-[#F5F5F5] text-lg font-bold mb-1">
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
                      className={`pr-10 w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors ${errors.password ? 'border-red-500' : ''}`}
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
                    <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top">{errors.password}</p>
                  )}
                  <PasswordStrengthMeter password={formData.password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="block text-[#1A3C5E] dark:text-[#F5F5F5] text-lg font-bold mb-1">
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
                      className={`pr-10 w-full border border-[#2EB9DF] rounded-lg px-4 py-3 text-base bg-white dark:bg-[#22232b] text-[#1A3C5E] dark:text-[#F5F5F5] placeholder-[#6B5B95] dark:placeholder-[#CCCCCC] focus:border-[#FFD700] focus:ring-2 focus:ring-[#FFD700] transition-colors ${errors.confirmPassword ? 'border-red-500' : ''}`}
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
                    <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top">{errors.confirmPassword}</p>
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
                  <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top">{errors.authorizeCreditChecks}</p>
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
                  <p className="text-xs text-[#DC3545] italic mt-1 animate-slide-in-top">{errors.agreeTerms}</p>
                )}
              </div>
            </div>

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

          <CardFooter className="p-4 sm:p-6 border-t border-[#6B5B95] bg-white dark:bg-transparent">
            <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
              {onClose && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="w-full sm:w-auto border border-[#CED4DA] text-[#1A3C5E] font-bold rounded-lg py-2 px-6"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                className="w-full bg-[#2EB9DF] hover:bg-[#138496] text-white text-lg font-bold rounded-lg py-3 transition-colors disabled:bg-[#6C757D] flex items-center justify-center"
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