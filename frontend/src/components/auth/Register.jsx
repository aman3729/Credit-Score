import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

/**
 * Register component with clean UI and proper validation
 */
const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    passwordConfirm: '',
    bankId: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    employmentStatus: '',
    industry: '',
    monthlyIncome: '',
    monthlySavings: '',
    totalDebt: '',
    bankBalance: '',
    agreeTerms: false,
    authorizeCreditChecks: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const bankOptions = [
    'CBE', 'DBE', 'AWASH', 'DASHEN', 'ABYSSINIA', 'WEGAGEN', 'NIB', 'HIBRET', 'LION', 'COOP',
    'ZEMEN', 'OROMIA', 'BUNNA', 'BERHAN', 'ABAY', 'ADDIS', 'DEBUB', 'ENAT', 'GADAA', 'HIJRA',
    'SHABELLE', 'SIINQEE', 'TSEHAY', 'AMHARA', 'AHADU', 'GOH', 'AMAN'
  ];

  const employmentOptions = [
    'employed', 'self-employed', 'unemployed', 'student', 'retired'
  ];

  const industryOptions = [
    'technology', 'finance', 'healthcare', 'education', 'retail', 
    'manufacturing', 'agriculture', 'construction', 'transportation', 'other'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.name.trim()) errors.push('Name is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (!formData.username.trim()) errors.push('Username is required');
    if (!formData.password) errors.push('Password is required');
    if (formData.password !== formData.passwordConfirm) errors.push('Passwords do not match');
    if (!formData.bankId) errors.push('Bank selection is required');
    if (!formData.phone.trim()) errors.push('Phone number is required');
    if (!formData.dateOfBirth) errors.push('Date of birth is required');
    if (!formData.address.trim()) errors.push('Address is required');
    if (!formData.employmentStatus) errors.push('Employment status is required');
    if (!formData.industry) errors.push('Industry is required');
    if (!formData.agreeTerms) errors.push('You must agree to the terms and conditions');
    if (!formData.authorizeCreditChecks) errors.push('You must authorize credit checks');

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const user = await register(formData);
      
      toast({
        title: 'Registration Successful',
        description: 'Please check your email to verify your account.',
      });

      // Redirect based on user role
      if (user.role === 'lender') {
        navigate('/lender');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create Account
          </CardTitle>
          <CardDescription className="text-center">
            Fill in your information to create your account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.passwordConfirm}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Bank and Personal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankId">Bank *</Label>
                <Select 
                  value={formData.bankId} 
                  onValueChange={(value) => handleSelectChange('bankId', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankOptions.map(bank => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Employment Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employmentStatus">Employment Status *</Label>
                <Select 
                  value={formData.employmentStatus} 
                  onValueChange={(value) => handleSelectChange('employmentStatus', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment status" />
                  </SelectTrigger>
                  <SelectContent>
                    {employmentOptions.map(status => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select 
                  value={formData.industry} 
                  onValueChange={(value) => handleSelectChange('industry', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industryOptions.map(industry => (
                      <SelectItem key={industry} value={industry}>
                        {industry.charAt(0).toUpperCase() + industry.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Financial Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyIncome">Monthly Income</Label>
                <Input
                  id="monthlyIncome"
                  name="monthlyIncome"
                  type="number"
                  placeholder="Enter monthly income"
                  value={formData.monthlyIncome}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="monthlySavings">Monthly Savings</Label>
                <Input
                  id="monthlySavings"
                  name="monthlySavings"
                  type="number"
                  placeholder="Enter monthly savings"
                  value={formData.monthlySavings}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="totalDebt">Total Debt</Label>
                <Input
                  id="totalDebt"
                  name="totalDebt"
                  type="number"
                  placeholder="Enter total debt"
                  value={formData.totalDebt}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bankBalance">Bank Balance</Label>
                <Input
                  id="bankBalance"
                  name="bankBalance"
                  type="number"
                  placeholder="Enter bank balance"
                  value={formData.bankBalance}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                name="address"
                type="text"
                placeholder="Enter your address"
                value={formData.address}
                onChange={handleInputChange}
                disabled={isLoading}
                required
              />
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  id="agreeTerms"
                  name="agreeTerms"
                  type="checkbox"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="rounded"
                />
                <Label htmlFor="agreeTerms" className="text-sm">
                  I agree to the terms and conditions *
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  id="authorizeCreditChecks"
                  name="authorizeCreditChecks"
                  type="checkbox"
                  checked={formData.authorizeCreditChecks}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="rounded"
                />
                <Label htmlFor="authorizeCreditChecks" className="text-sm">
                  I authorize credit checks and data processing *
                </Label>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <div className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-primary hover:underline"
              >
                Sign in
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register; 