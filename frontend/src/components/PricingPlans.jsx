import React, { useState } from 'react';

const PricingPlans = ({ onSelectPlan }) => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const plans = {
    starter: {
      name: 'Starter Plan',
      price: billingCycle === 'monthly' ? '99' : '990',
      description: 'Perfect for first-time credit users who want basic insights',
      features: [
        { text: 'Score from 1 major Ethiopian bank', included: true },
        { text: 'One credit report per month', included: true },
        { text: 'Limited credit monitoring (60-day alerts)', included: true },
        { text: 'SMS summary (Amharic optional)', included: true },
        { text: 'Loan-readiness insights', included: false },
        { text: 'PDF reports', included: false },
        { text: 'Identity theft coverage', included: false }
      ],
      cta: 'Start your credit journey',
      color: 'blue'
    },
    premium: {
      name: 'Premium Plan',
      price: billingCycle === 'monthly' ? '249' : '2490',
      description: 'Full access for loan seekers, professionals & businesses',
      features: [
        { text: 'Scores from 3+ sources', included: true },
        { text: 'Monthly reports + PDF export', included: true },
        { text: '12-month credit trend graph', included: true },
        { text: 'Loan insights (mortgage, car, business)', included: true },
        { text: '24/7 monitoring + SMS alerts', included: true },
        { text: 'Identity theft insurance (1M ETB)', included: true },
        { text: 'Monthly financial coach call', included: true },
        { text: 'Amharic + English support', included: true },
        { text: 'Loan officer letter generation', included: true }
      ],
      cta: 'Upgrade to Premium',
      color: 'purple'
    }
  };

  const handlePayment = async (plan) => {
    try {
      setProcessing(true);
      setError(null);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          plan,
          billingCycle,
          paymentMethod: 'telebirr'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      // Start polling for payment status
      const paymentId = data.paymentId;
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/status/${paymentId}`, {
          credentials: 'include'
        });

        const statusData = await statusResponse.json();

        if (statusData.status === 'completed') {
          clearInterval(pollInterval);
          onSelectPlan(plan);
        } else if (statusData.status === 'failed') {
          clearInterval(pollInterval);
          setError('Payment failed. Please try again.');
          setProcessing(false);
        }
      }, 5000); // Poll every 5 seconds

      // Open Telebirr payment URL in new window
      if (data.paymentUrl) {
        window.open(data.paymentUrl, '_blank');
      }

    } catch (error) {
      setError(error.message);
      setProcessing(false);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    onSelectPlan(plan);
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-dark-primary min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Choose Your Credit Score Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
            Start building your financial future with our tailored plans
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-12 flex justify-center">
          <div className="relative bg-white dark:bg-dark-card rounded-lg p-1 flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300'
              } relative py-2 px-6 rounded-md text-sm font-medium transition-all duration-200`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300'
              } relative py-2 px-6 rounded-md text-sm font-medium transition-all duration-200`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {Object.entries(plans).map(([key, plan]) => (
            <div
              key={key}
              className={`relative bg-white dark:bg-dark-card rounded-2xl shadow-xl overflow-hidden transition-transform duration-300 hover:scale-105 ${
                key === 'premium' ? 'border-2 border-purple-500' : ''
              }`}
            >
              {key === 'premium' && (
                <div className="absolute top-0 right-0 bg-purple-500 text-white px-4 py-1 rounded-bl-lg text-sm font-semibold">
                  Most Popular
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                <p className="mt-4 text-gray-600 dark:text-gray-400">{plan.description}</p>
                
                <div className="mt-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">
                      {plan.price}
                    </span>
                    <span className="ml-1 text-xl text-gray-600 dark:text-gray-400">ETB</span>
                    <span className="ml-2 text-gray-500 dark:text-gray-400">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                        feature.included ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {feature.included ? (
                          <i className="fas fa-check text-green-600 dark:text-green-400"></i>
                        ) : (
                          <i className="fas fa-times text-gray-400 dark:text-gray-500"></i>
                        )}
                      </span>
                      <span className="ml-3 text-gray-600 dark:text-gray-300">{feature.text}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePayment(key)}
                  disabled={processing}
                  className={`mt-8 w-full py-3 px-6 rounded-lg text-white font-medium transition-colors duration-200 ${
                    processing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : key === 'premium'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {processing ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Processing...
                    </>
                  ) : (
                    plan.cta
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <div className="mt-4 flex justify-center space-x-4">
            <span className="flex items-center text-gray-500 dark:text-gray-400">
              <i className="fas fa-lock mr-2"></i>
              Secure payment
            </span>
            <span className="flex items-center text-gray-500 dark:text-gray-400">
              <i className="fas fa-headset mr-2"></i>
              24/7 support
            </span>
            <span className="flex items-center text-gray-500 dark:text-gray-400">
              <i className="fas fa-shield-alt mr-2"></i>
              Money-back guarantee
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans; 